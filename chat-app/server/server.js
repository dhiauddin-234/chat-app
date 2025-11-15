require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const auth = require('./auth');
const roomManager = require('./roomManager');

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://chat-app-gmfn.onrender.com',
  'https://68d63bf0b8a9bc00089b64ec--orbitz-2.netlify.app',
  'https://3001-firebase-chat-app-1762949997760.cluster-isls3qj2gbd5qs4jkjqvhahfv6.cloudworkstations.dev',
  // Local development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

// Enable CORS for all routes
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list or is a subdomain
    if (allowedOrigins.includes(origin) || 
        allowedOrigins.some(allowed => origin.startsWith(allowed.replace('https://', 'http://')))) {
      return callback(null, true);
    }
    
    // Log unauthorized requests for debugging
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));

// Handle preflight requests
app.options('*', cors());
app.options('*', cors());

app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.warn(`Socket.IO CORS blocked request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
    credentials: true,
    exposedHeaders: ['Authorization']
  },
  // Enable WebSocket transport only for better performance
  transports: ['websocket', 'polling'], // Add polling as fallback
  // Enable connection state recovery
  connectionStateRecovery: {
    // The backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // Whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  }
});

// Connect to MongoDB (optional - fallback to in-memory storage)
connectDB().catch(err => {
  console.log('MongoDB connection failed, using in-memory storage for development');
});

const PORT = process.env.PORT || 5000;

// Authentication routes
app.post('/api/auth/register', auth.validateRegistration, auth.register);
app.post('/api/auth/login', auth.validateLogin, auth.login);
app.get('/api/auth/profile', auth.authenticateToken, auth.getProfile);

// Room management routes
app.post('/api/rooms', auth.authenticateToken, roomManager.validateRoomCreation, roomManager.createRoom);
app.get('/api/rooms', auth.authenticateToken, roomManager.getRooms);
app.post('/api/rooms/:roomId/join', auth.authenticateToken, roomManager.joinRoom);
app.post('/api/rooms/:roomId/leave', auth.authenticateToken, roomManager.leaveRoom);
app.delete('/api/rooms/:roomId', auth.authenticateToken, roomManager.deleteRoom);

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle authentication
  socket.on('authenticate', (token) => {
    const decoded = auth.verifyToken(token);
    if (!decoded) {
      socket.emit('auth_error', 'Invalid token');
      socket.disconnect();
      return;
    }

    const user = auth.users.get(decoded.userId);
    if (!user) {
      socket.emit('auth_error', 'User not found');
      socket.disconnect();
      return;
    }

    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.username = user.username;
    
    users.set(socket.id, { 
      userId: decoded.userId,
      username: user.username,
      email: decoded.email,
      currentRoom: null
    });

    // Join default room
    const defaultRoom = roomManager.DEFAULT_ROOM;
    socket.join(defaultRoom);
    roomManager.setUserRoom(decoded.userId, defaultRoom);
    users.get(socket.id).currentRoom = defaultRoom;

    socket.emit('authenticated', {
      userId: decoded.userId,
      username: user.username,
      email: decoded.email,
      currentRoom: defaultRoom
    });

    // Notify room about new user
    socket.to(defaultRoom).emit('user_joined', { 
      userId: socket.id, 
      username: user.username,
      roomId: defaultRoom
    });

    // Send room info to user
    socket.emit('room_users', {
      roomId: defaultRoom,
      users: Array.from(users.values())
        .filter(u => u.currentRoom === defaultRoom)
        .map(u => ({ id: u.userId, username: u.username }))
    });
  });

  // Handle room switching
  socket.on('join_room', async (roomId) => {
    if (!socket.userId) {
      socket.emit('auth_error', 'Please authenticate first');
      return;
    }

    const user = users.get(socket.id);
    if (!user) return;

    // Leave current room
    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      socket.to(user.currentRoom).emit('user_left', {
        userId: socket.id,
        username: user.username,
        roomId: user.currentRoom
      });
      await roomManager.removeUserFromRoom(socket.userId);
    }

    // Join new room
    socket.join(roomId);
    await roomManager.setUserRoom(socket.userId, roomId);
    user.currentRoom = roomId;

    // Notify new room about user joining
    socket.to(roomId).emit('user_joined', {
      userId: socket.id,
      username: user.username,
      roomId: roomId
    });

    // Send room info to user
    socket.emit('room_joined', {
      roomId: roomId,
      users: Array.from(users.values())
        .filter(u => u.currentRoom === roomId)
        .map(u => ({ id: u.userId, username: u.username })),
      messages: await roomManager.getRoomMessages(roomId)
    });
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    const user = users.get(socket.id);
    if (user && user.currentRoom) {
      const messageData = {
        content: data.message,
        sender: socket.userId,
        isSystem: false
      };

      // Save message to room and get message with ID
      const savedMessage = await roomManager.addMessageToRoom(user.currentRoom, messageData);

      // Broadcast to room
      if (savedMessage) {
        io.to(user.currentRoom).emit('receive_message', savedMessage);
      }
    }
  });

  // Handle message deletion
  socket.on('delete_message', async (data) => {
    const user = users.get(socket.id);
    if (user && user.currentRoom && data.messageId) {
      const success = await roomManager.deleteMessage(user.currentRoom, data.messageId, socket.userId);
      
      if (success) {
        // Broadcast message deletion to room
        io.to(user.currentRoom).emit('message_deleted', {
          messageId: data.messageId,
          roomId: user.currentRoom,
          deletedBy: user.username
        });
      } else {
        socket.emit('delete_error', { message: 'Cannot delete message' });
      }
    }
  });

  // Handle message editing
  socket.on('edit_message', async (data) => {
    const user = users.get(socket.id);
    if (user && user.currentRoom && data.messageId && data.newMessage) {
      const editedMessage = await roomManager.editMessage(user.currentRoom, data.messageId, data.newMessage, socket.userId);
      
      if (editedMessage) {
        // Broadcast message edit to room
        io.to(user.currentRoom).emit('message_edited', editedMessage);
      } else {
        socket.emit('edit_error', { message: 'Cannot edit message' });
      }
    }
  });

  // Handle typing indicators
  socket.on('typing_start', () => {
    const user = users.get(socket.id);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('user_typing', {
        userId: socket.id,
        username: user.username,
        roomId: user.currentRoom
      });
    }
  });

  socket.on('typing_stop', () => {
    const user = users.get(socket.id);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('user_stopped_typing', {
        userId: socket.id,
        username: user.username,
        roomId: user.currentRoom
      });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', async () => {
    const user = users.get(socket.id);
    if (user) {
      // Remove from current room
      if (user.currentRoom) {
        socket.to(user.currentRoom).emit('user_left', {
          userId: socket.id,
          username: user.username,
          roomId: user.currentRoom
        });
      }
      
      // Clean up
      await roomManager.removeUserFromRoom(socket.userId);
      users.delete(socket.id);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

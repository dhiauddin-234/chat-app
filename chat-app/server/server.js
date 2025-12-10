
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomManager = require('./roomManager');
const jwt = require('jsonwebtoken');

const app = express();

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
});

const PORT = process.env.PORT || 3001;

// Mock database for storing users and OTPs
const users = new Map();
const otps = new Map();

// Authentication routes
app.post('/api/auth/otp', (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(phoneNumber, otp);

  // In a real application, you would send this OTP via SMS
  console.log(`OTP for ${phoneNumber}: ${otp}`);

  res.json({ success: true, message: 'OTP sent successfully' });
});

app.post('/api/auth/verify', (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
  }

  const storedOtp = otps.get(phoneNumber);
  if (storedOtp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // Create a new user or find an existing one
  let user = users.get(phoneNumber);
  if (!user) {
    const userId = `user_${users.size + 1}`;
    user = { id: userId, phoneNumber };
    users.set(phoneNumber, user);
  }

  // Generate a JWT token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });

  res.json({ success: true, token });
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret', (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Failed to authenticate token' });
        }
        req.userId = decoded.userId;
        next();
    });
};

// Room management routes (protected)
app.post('/api/rooms', verifyToken, roomManager.validateRoomCreation, roomManager.createRoom);
app.get('/api/rooms', verifyToken, roomManager.getRooms);
app.post('/api/rooms/:roomId/join', verifyToken, roomManager.joinRoom);
app.post('/api/rooms/:roomId/leave', verifyToken, roomManager.leaveRoom);
app.delete('/api/rooms/:roomId', verifyToken, roomManager.deleteRoom);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Simplified user identification
  const userId = socket.id;
  const username = `User-${socket.id.substring(0, 5)}`;
  socket.userId = userId;
  socket.username = username;

  users.set(socket.id, {
    userId: userId,
    username: username,
    currentRoom: null
  });

  // Automatically join a default room
  const defaultRoom = roomManager.DEFAULT_ROOM;
  socket.join(defaultRoom);
  roomManager.setUserRoom(userId, defaultRoom);
  users.get(socket.id).currentRoom = defaultRoom;

  // Notify room about new user
  socket.to(defaultRoom).emit('user_joined', {
    userId: socket.id,
    username: username,
    roomId: defaultRoom
  });

  // Send room info to user
  socket.emit('room_users', {
    roomId: defaultRoom,
    users: Array.from(users.values())
      .filter(u => u.currentRoom === defaultRoom)
      .map(u => ({ id: u.userId, username: u.username }))
  });


  // Handle room switching
  socket.on('join_room', async (roomId) => {
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
      const savedMessage = await roomManager.addMessageToRoom(user.currentRoom, messageData);
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
    if (user.currentRoom) {
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
      if (user.currentRoom) {
        socket.to(user.currentRoom).emit('user_left', {
          userId: socket.id,
          username: user.username,
          roomId: user.currentRoom
        });
      }
      await roomManager.removeUserFromRoom(socket.userId);
      users.delete(socket.id);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

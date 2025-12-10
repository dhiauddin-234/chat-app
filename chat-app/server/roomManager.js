const { body, validationResult } = require('express-validator');

// In-memory storage for rooms and messages
const rooms = new Map();
const messages = new Map(); // roomId -> array of messages
const userRooms = new Map(); // Track which room each user is in
let roomIdCounter = 1;
let messageIdCounter = 1;

// Default room
const DEFAULT_ROOM = 'general';

// Initialize default room in memory
const initializeDefaultRoom = () => {
  const defaultRoom = {
    id: DEFAULT_ROOM,
    name: 'General',
    description: 'Default chat room for everyone',
    creator: null, // System room
    isPrivate: false,
    members: [],
    createdAt: new Date()
  };
  rooms.set(DEFAULT_ROOM, defaultRoom);
  messages.set(DEFAULT_ROOM, []);
  console.log('Default room created in memory');
};

// Call initialization
initializeDefaultRoom();

// Validation middleware
const validateRoomCreation = [
  body('name')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Room name must be 1-50 characters long'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .trim()
    .withMessage('Description must be less than 200 characters'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
];

// Create a new room
const createRoom = (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description = '', isPrivate = false } = req.body;
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const roomName = name.trim();
    const existingRoom = Array.from(rooms.values()).find(
      room => room.name.toLowerCase() === roomName.toLowerCase()
    );

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'A room with this name already exists'
      });
    }

    const roomId = 'room_' + roomIdCounter++;
    const newRoom = {
      id: roomId,
      name: roomName,
      description: description.trim(),
      creator: userId,
      isPrivate,
      members: [userId],
      createdAt: new Date()
    };

    rooms.set(roomId, newRoom);
    messages.set(roomId, []);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: newRoom.id,
        name: newRoom.name,
        description: newRoom.description,
        createdBy: userId,
        createdAt: newRoom.createdAt,
        isPrivate: newRoom.isPrivate,
        memberCount: newRoom.members.length
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all public rooms and user's private rooms
const getRooms = (req, res) => {
    try {
        const userId = req.user ? req.user.userId : null;

        const roomList = Array.from(rooms.values())
            .filter(room => {
                if (room.isPrivate) {
                    return userId && room.members.includes(userId);
                } else {
                    return true;
                }
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(room => ({
                id: room.id,
                name: room.name,
                description: room.description,
                createdBy: room.creator || 'system',
                createdByUsername: room.creator ? 'User' : 'System',
                createdAt: room.createdAt,
                isPrivate: room.isPrivate,
                memberCount: room.members.length,
                isMember: userId && room.members.includes(userId)
            }));

        res.json({
            success: true,
            rooms: roomList
        });

    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Join a room
const joinRoom = (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.isPrivate && !room.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to private room'
      });
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }

    userRooms.set(userId, roomId);

    res.json({
      success: true,
      message: 'Joined room successfully',
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        memberCount: room.members.length
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Leave a room
const leaveRoom = (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const room = rooms.get(roomId);
    if (room) {
        room.members = room.members.filter(memberId => memberId !== userId);
    }

    if (userRooms.get(userId) === roomId) {
      userRooms.delete(userId);
    }

    res.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUserRoom = (userId) => {
  return userRooms.get(userId) || DEFAULT_ROOM;
};

const setUserRoom = (userId, roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      if (!room.members.includes(userId)) {
        room.members.push(userId);
      }
      userRooms.set(userId, roomId);
      return true;
    }
    return false;
};

const removeUserFromRoom = (userId) => {
  const roomId = userRooms.get(userId);
  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.members = room.members.filter(memberId => memberId !== userId);
    }
    userRooms.delete(userId);
  }
};

const getRoomMembers = (roomId) => {
    const room = rooms.get(roomId);
    return room ? room.members : [];
};

const addMessageToRoom = (roomId, message) => {
    const messageId = 'msg_' + messageIdCounter++;
    const newMessage = {
      id: messageId,
      ...message,
      timestamp: new Date(),
    };

    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(newMessage);
    messages.set(roomId, roomMessages);
    
    return newMessage;
};

const getRoomMessages = (roomId) => {
    const roomMessages = messages.get(roomId) || [];
    return roomMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100); // Last 100 messages
};

const deleteMessage = (roomId, messageId, userId) => {
  const roomMessages = messages.get(roomId);
  if (!roomMessages) return false;

  const messageIndex = roomMessages.findIndex(m => m.id === messageId);
  if (messageIndex === -1) return false;

  const message = roomMessages[messageIndex];
  const room = rooms.get(roomId);

  if (message.sender !== userId && room.creator && room.creator !== userId) {
    return false;
  }

  roomMessages.splice(messageIndex, 1);
  messages.set(roomId, roomMessages);
  return true;
};

const editMessage = (roomId, messageId, newContent, userId) => {
  const roomMessages = messages.get(roomId);
  if (!roomMessages) return false;

  const message = roomMessages.find(m => m.id === messageId);
  if (!message) return false;

  if (message.sender !== userId) return false;

  message.content = newContent;
  message.isEdited = true;
  message.editedAt = new Date();

  return message;
};

const deleteRoom = (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.id === DEFAULT_ROOM) {
      return res.status(403).json({ success: false, message: 'Cannot delete the default room' });
    }

    if (room.creator && room.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the room creator can delete this room'
      });
    }

    messages.delete(roomId);
    rooms.delete(roomId);

    res.json({
      success: true,
      message: 'Room deleted successfully',
      movedToRoom: DEFAULT_ROOM
    });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  joinRoom,
  leaveRoom,
  deleteRoom,
  validateRoomCreation,
  getUserRoom,
  setUserRoom,
  removeUserFromRoom,
  getRoomMembers,
  addMessageToRoom,
  getRoomMessages,
  deleteMessage,
  editMessage,
  userRooms,
  rooms,
  messages,
  DEFAULT_ROOM
};

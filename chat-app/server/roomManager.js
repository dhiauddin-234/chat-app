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

// Generate unique room ID
const generateRoomId = () => {
  return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Generate unique message ID
const generateMessageId = () => {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Create a new room
const createRoom = async (req, res) => {
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
    const userId = req.user.userId;

    // Check if room name already exists
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

    // Create room
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
const getRooms = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find rooms that are either public or user is a member of
    const roomList = Array.from(rooms.values())
      .filter(room => !room.isPrivate || room.members.includes(userId))
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
        isMember: room.members.includes(userId)
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
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

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

    // Add user to room if not already a member
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
const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Remove user from room members
    room.members = room.members.filter(memberId => memberId.toString() !== userId);
    await room.save();
    
    // If user was in this room, remove them from tracking
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

// Helper functions for socket operations
const getUserRoom = (userId) => {
  return userRooms.get(userId) || DEFAULT_ROOM;
};

const setUserRoom = async (userId, roomId) => {
  try {
    const room = rooms.get(roomId);
    if (room) {
      if (!room.members.includes(userId)) {
        room.members.push(userId);
      }
      userRooms.set(userId, roomId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting user room:', error);
    return false;
  }
};

const removeUserFromRoom = async (userId) => {
  const roomId = userRooms.get(userId);
  if (roomId) {
    try {
      const room = await Room.findById(roomId);
      if (room) {
        room.members = room.members.filter(memberId => memberId.toString() !== userId);
        await room.save();
      }
    } catch (error) {
      console.error('Error removing user from room:', error);
    }
    userRooms.delete(userId);
  }
};

const getRoomMembers = async (roomId) => {
  try {
    const room = rooms.get(roomId);
    return room ? room.members : [];
  } catch (error) {
    console.error('Error getting room members:', error);
    return [];
  }
};

const addMessageToRoom = async (roomId, message) => {
  try {
    const messageId = 'msg_' + messageIdCounter++;
    const newMessage = {
      id: messageId,
      content: message.content,
      sender: message.sender,
      username: message.username,
      room: roomId,
      isSystem: message.isSystem || false,
      timestamp: new Date(),
      isEdited: false
    };

    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(newMessage);
    messages.set(roomId, roomMessages);
    
    return {
      id: newMessage.id,
      content: newMessage.content,
      sender: newMessage.sender,
      username: newMessage.username,
      timestamp: newMessage.timestamp,
      isSystem: newMessage.isSystem,
      isEdited: newMessage.isEdited
    };
  } catch (error) {
    console.error('Error adding message to room:', error);
    return null;
  }
};

const getRoomMessages = async (roomId) => {
  try {
    const roomMessages = messages.get(roomId) || [];
    return roomMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100); // Last 100 messages
  } catch (error) {
    console.error('Error getting room messages:', error);
    return [];
  }
};

const deleteMessage = async (roomId, messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message || message.room.toString() !== roomId) return false;

    const room = await Room.findById(roomId);
    if (!room) return false;

    // Check if user can delete (message sender or room creator)
    if (message.sender.toString() !== userId && room.creator && room.creator.toString() !== userId) {
      return false;
    }

    await Message.findByIdAndDelete(messageId);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

const editMessage = async (roomId, messageId, newContent, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message || message.room.toString() !== roomId) return false;

    // Check if user can edit (only message sender)
    if (message.sender.toString() !== userId) return false;

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    
    await message.save();
    await message.populate('sender', 'username');

    return {
      id: message._id,
      content: message.content,
      sender: message.sender._id,
      username: message.sender.username,
      timestamp: message.createdAt,
      isSystem: message.isSystem,
      isEdited: message.isEdited,
      editedAt: message.editedAt
    };
  } catch (error) {
    console.error('Error editing message:', error);
    return false;
  }
};

// Delete a room (only by creator)
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Check if room exists
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Prevent deletion of default room
    if (room.id === DEFAULT_ROOM || room.name === 'General') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete the default room'
      });
    }

    // Check if user is the creator
    if (room.creator && room.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the room creator can delete this room'
      });
    }

    // Move all members to default room
    const members = room.members;
    const defaultRoom = rooms.get(DEFAULT_ROOM);
    
    if (defaultRoom) {
      // Add all room members to default room if not already there
      for (const memberId of members) {
        if (!defaultRoom.members.includes(memberId)) {
          defaultRoom.members.push(memberId);
        }
        userRooms.set(memberId.toString(), DEFAULT_ROOM);
      }
    }

    // Delete all messages in the room
    messages.delete(roomId);
    
    // Delete the room
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

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

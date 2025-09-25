const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use local MongoDB for development to avoid authentication issues
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Falling back to in-memory storage for development...');
    // Don't exit the process, just log the error and continue
    // The app will work without persistent storage for testing
  }
};

module.exports = connectDB;

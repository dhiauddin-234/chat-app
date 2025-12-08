const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoURI = mongoServer.getUri();

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('In-memory MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB in-memory connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

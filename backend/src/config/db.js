const mongoose = require('mongoose');

let dbMode = 'memory';

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log('MongoDB URI not found. Running in demo memory mode.');
    dbMode = 'memory';
    return dbMode;
  }

  try {
    await mongoose.connect(uri);
    dbMode = 'mongo';
    console.log('MongoDB connected successfully.');
    return dbMode;
  } catch (error) {
    console.warn('MongoDB connection failed. Falling back to demo memory mode.');
    console.warn(error.message);
    dbMode = 'memory';
    return dbMode;
  }
}

function getDbMode() {
  return dbMode;
}

module.exports = { connectDB, getDbMode };

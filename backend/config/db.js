// config/db.js
const mongoose = require('mongoose');

// Cấu hình MongoDB connection với các tùy chọn được tối ưu cho Railway deployment
const mongooseOptions = {
  maxPoolSize: 20, // 🚀 Tăng pool size để handle concurrent requests
  minPoolSize: 5,
  serverSelectionTimeoutMS: 30000, // 🚀 Tăng timeout cho Railway (30s)
  socketTimeoutMS: 60000, // 🚀 Tăng timeout để phù hợp với API timeout
  connectTimeoutMS: 30000, // 🚀 Tăng connect timeout cho Railway (30s)
  family: 4,
  maxIdleTimeMS: 30000, // 🚀 Close connections after 30s idle
  compressors: 'zlib', // 🚀 Enable compression to reduce data transfer
  retryWrites: true, // 🚀 Enable retry writes for better reliability
  w: 'majority', // 🚀 Write concern for data safety
  // XÓA BỎ CÁC TÙY CHỌN CŨ GÂY LỖI
  // bufferMaxEntries: 0,
  // bufferCommands: false,
};

const setupConnectionEvents = () => {
  mongoose.connection.on('connected', () => console.log(`✅ MongoDB connected: ${mongoose.connection.name}`));
  mongoose.connection.on('error', (err) => console.error('❌ Mongoose connection error:', err));
  mongoose.connection.on('disconnected', () => console.log('💔 Mongoose disconnected'));
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔒 Mongoose connection closed due to app termination');
    process.exit(0);
  });
};

// Hàm kết nối database - Sửa lại để throw error thay vì retry
const connectDB = async () => {
  // Bỏ try...catch để lỗi được ném ra ngoài cho server.js xử lý
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined');
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, mongooseOptions);
  setupConnectionEvents(); // Setup các event sau khi kết nối
  return mongoose.connection;
};

const getConnectionStatus = () => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return { state: states[mongoose.connection.readyState], name: mongoose.connection.name };
};

module.exports = { connectDB, getConnectionStatus };
// server/server.js - Updated MongoDB connection
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendors.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/analytics', analyticsRoutes);

// MongoDB Atlas Connection - FIXED VERSION
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password
    
    // Remove deprecated options - Mongoose 6+ handles these automatically
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔌 Mongoose connected to DB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from DB');
    });
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Check your MONGODB_URI format in .env file');
    console.error('2. Make sure your IP is whitelisted in MongoDB Atlas');
    console.error('3. Verify username/password are correct');
    console.error('4. Try removing special characters from password');
    console.error('5. Check if database name exists: "leskew"');
    
    // For development, we'll continue without DB
    console.log('⚠️ Continuing in development mode without database...');
    return null;
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('join-vendor-queue', (vendorId) => {
    socket.join(`vendor-${vendorId}`);
    console.log(`👥 Socket ${socket.id} joined vendor-${vendorId}`);
  });
  
  socket.on('leave-vendor-queue', (vendorId) => {
    socket.leave(`vendor-${vendorId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'ok',
    message: 'Leskew API is running',
    database: {
      state: states[dbState],
      connected: dbState === 1,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database connection status
app.get('/api/db-status', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    connected: dbState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`,
    error: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
      🚀 Server running on port ${PORT}
      🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
      📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected to MongoDB Atlas' : 'Not connected'}
      📅 Started at: ${new Date().toLocaleString()}
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
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
import serviceRoutes from './routes/services.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling with authentication
io.use((socket, next) => {
  // Basic middleware - you can add JWT verification here if needed
  console.log('🔐 Socket middleware for:', socket.id);
  next();
});

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  console.log('Socket handshake:', socket.handshake.headers);
  
  // Store vendor rooms that this socket is in
  const vendorRooms = new Set();
  
  // Join vendor queue room
  socket.on('join-vendor-queue', (vendorId) => {
    if (!vendorId) {
      console.log('❌ Invalid vendorId for join:', vendorId);
      return;
    }
    
    const roomName = `vendor-${vendorId}`;
    socket.join(roomName);
    vendorRooms.add(vendorId);
    
    console.log(`👥 Socket ${socket.id} joined ${roomName}`);
    console.log(`📊 Currently in rooms:`, Array.from(vendorRooms));
    
    // Acknowledge join
    socket.emit('room-joined', { 
      vendorId, 
      roomName,
      success: true 
    });
  });
  
  // Leave vendor queue room
  socket.on('leave-vendor-queue', (vendorId) => {
    if (!vendorId) return;
    
    const roomName = `vendor-${vendorId}`;
    socket.leave(roomName);
    vendorRooms.delete(vendorId);
    
    console.log(`👋 Socket ${socket.id} left ${roomName}`);
    
    // Acknowledge leave
    socket.emit('room-left', { 
      vendorId, 
      roomName,
      success: true 
    });
  });
  
  // Handle customer joining queue
  socket.on('customer-join-queue', (data) => {
    const { vendorId, customerId, queueEntry } = data;
    
    if (!vendorId || !customerId) {
      console.log('❌ Missing vendorId or customerId for customer-join-queue');
      return;
    }
    
    console.log(`📝 Customer ${customerId} joined queue for vendor ${vendorId}`);
    
    // Notify vendor room
    io.to(`vendor-${vendorId}`).emit('queue-updated', {
      action: 'customer-joined',
      vendorId,
      customerId,
      queueEntry,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle vendor calling next customer
  socket.on('call-next-customer', (data) => {
    const { vendorId, customerId, queueEntry } = data;
    
    if (!vendorId) {
      console.log('❌ Missing vendorId for call-next-customer');
      return;
    }
    
    console.log(`📢 Vendor ${vendorId} calling customer ${customerId || 'unknown'}`);
    
    // Notify vendor room
    io.to(`vendor-${vendorId}`).emit('customer-called', {
      action: 'called',
      vendorId,
      customerId,
      queueEntry,
      calledAt: new Date().toISOString()
    });
    
    // Also notify specific customer if they're connected
    if (customerId) {
      io.emit(`customer-${customerId}-called`, {
        action: 'your-turn',
        vendorId,
        queueEntry,
        message: 'Your turn has come!'
      });
    }
  });
  
  // Handle customer leaving queue
  socket.on('customer-left-queue', (data) => {
    const { vendorId, customerId, queueId } = data;
    
    if (!vendorId || !customerId) {
      console.log('❌ Missing vendorId or customerId for customer-left-queue');
      return;
    }
    
    console.log(`🚶 Customer ${customerId} left queue for vendor ${vendorId}`);
    
    // Notify vendor room
    io.to(`vendor-${vendorId}`).emit('customer-left', {
      action: 'left',
      vendorId,
      customerId,
      queueId,
      leftAt: new Date().toISOString()
    });
  });
  
  // Heartbeat/ping
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
  
  // Debug: List all rooms
  socket.on('debug-rooms', () => {
    const rooms = Array.from(vendorRooms);
    socket.emit('debug-response', {
      socketId: socket.id,
      rooms,
      totalRooms: rooms.length
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`);
    
    // Clean up - leave all vendor rooms
    vendorRooms.forEach(vendorId => {
      socket.leave(`vendor-${vendorId}`);
    });
    vendorRooms.clear();
    
    // Notify if needed
    if (reason === 'transport close') {
      console.log('⚠️ Transport closed, client might reconnect');
    }
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error.message);
  });
  
  // Send connection confirmation
  socket.emit('connected', {
    socketId: socket.id,
    message: 'Connected to Leskew real-time server',
    timestamp: new Date().toISOString(),
    serverTime: Date.now()
  });
});

// Helper function to emit to specific vendor room
const emitToVendorRoom = (vendorId, event, data) => {
  if (!vendorId) {
    console.error('Cannot emit to vendor room: missing vendorId');
    return;
  }
  
  const roomName = `vendor-${vendorId}`;
  io.to(roomName).emit(event, {
    ...data,
    vendorId,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📤 Emitted ${event} to ${roomName}`);
};

// Helper function to emit to specific customer
const emitToCustomer = (customerId, event, data) => {
  if (!customerId) return;
  
  io.emit(`customer-${customerId}-${event}`, {
    ...data,
    customerId,
    timestamp: new Date().toISOString()
  });
};

// Make helpers available to routes
app.set('emitToVendorRoom', emitToVendorRoom);
app.set('emitToCustomer', emitToCustomer);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/services', serviceRoutes);

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
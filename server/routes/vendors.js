// server/routes/vendors.js - COMPLETE VERSION
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Vendor from '../models/Vendor.js';
import Appointment from '../models/Appointment.js';
import QueueEntry from '../models/QueueEntry.js';
import Analytics from '../models/Analytics.js';
import mongoose from 'mongoose';
import MongoUtils from '../utils/mongoUtils.js';

const vendorRoutes = express.Router();

// ================ PUBLIC ROUTES ================

// @route   GET /api/vendors
// @desc    Get all approved vendors (public)
vendorRoutes.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find({ isApproved: true })
      .populate('userId', 'name email phone')
      .select('-__v');
    
    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vendors/:id
// @desc    Get vendor by ID (public)
vendorRoutes.get('/:id', async (req, res) => {
  try {
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
    const vendor = await Vendor.findById(req.params.id)
      .populate('userId', 'name email phone');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================ PROTECTED ROUTES ================

// @route   POST /api/vendors
// @desc    Create or update vendor profile (THIS IS THE MISSING ROUTE!)
vendorRoutes.post('/', protect, authorize('vendor'), async (req, res) => {
  try {
    console.log('📝 POST /api/vendors - Creating/Updating vendor profile');
    console.log('User ID:', req.user._id);
    console.log('Request body:', req.body);
    
    // Validate required fields
    const { businessName, address, contactInfo } = req.body;
    if (!businessName || !address || !contactInfo) {
      return res.status(400).json({ 
        message: 'Business name, address, and contact info are required' 
      });
    }
    
    // Check if vendor already exists for this user
    let vendor = await Vendor.findOne({ userId: req.user._id });
    
    if (vendor) {
      console.log('🔄 Updating existing vendor:', vendor._id);
      
      // Update existing vendor
      vendor = await Vendor.findByIdAndUpdate(
        vendor._id,
        { 
          $set: {
            ...req.body,
            updatedAt: Date.now()
          }
        },
        { new: true, runValidators: true }
      );
      
      console.log('✅ Vendor updated:', vendor.businessName);
    } else {
      console.log('🆕 Creating new vendor profile');
      
      // Create new vendor
      vendor = new Vendor({
        userId: req.user._id,
        ...req.body,
        isApproved: false // New vendors need admin approval
      });
      
      await vendor.save();
      console.log('✅ New vendor created:', vendor.businessName);
    }
    
    res.json({
      success: true,
      message: vendor.isApproved ? 'Profile updated successfully' : 'Profile created successfully - pending admin approval',
      vendor
    });
  } catch (error) {
    console.error('❌ Save vendor error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vendors/profile/me
// @desc    Get current vendor's profile
vendorRoutes.get('/profile/me', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone avatar');
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        message: 'Vendor profile not found. Please create a profile first.' 
      });
    }
    
    res.json({
      success: true,
      vendor
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET /api/vendors/me/dashboard
// @desc    Get vendor dashboard data
vendorRoutes.get('/me/dashboard', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's appointments
    const appointments = await Appointment.find({
      vendorId: vendor._id,
      date: { $gte: today },
      status: 'booked'
    }).sort({ date: 1, 'timeSlot.start': 1 });
    
    // Get today's queue
    const queue = await QueueEntry.find({
      vendorId: vendor._id,
      status: 'waiting'
    })
    .populate('customerId', 'name phone')
    .sort({ position: 1 });
    
    // Get basic stats
    const appointmentsToday = await Appointment.countDocuments({
      vendorId: vendor._id,
      date: { $gte: today },
      status: 'booked'
    });
    
    const queueToday = await QueueEntry.countDocuments({
      vendorId: vendor._id,
      createdAt: { $gte: today },
      status: 'waiting'
    });
    
    res.json({
      vendor: {
        businessName: vendor.businessName,
        isApproved: vendor.isApproved,
        serviceCategories: vendor.serviceCategories
      },
      dashboard: {
        appointmentsToday,
        queueToday,
        upcomingAppointments: appointments.slice(0, 5),
        currentQueue: queue,
        totalCustomersServed: await QueueEntry.countDocuments({
          vendorId: vendor._id,
          status: 'served'
        }),
        totalBookings: await Appointment.countDocuments({
          vendorId: vendor._id,
          status: { $in: ['booked', 'completed'] }
        })
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vendors/:vendorId/analytics
// @desc    Get vendor analytics
vendorRoutes.get('/:vendorId/analytics', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(vendorId)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Check authorization
    if (req.user.role === 'vendor') {
      const vendorProfile = await Vendor.findOne({ userId: req.user._id });
      if (!vendorProfile || !MongoUtils.areIdsEqual(vendorProfile._id, vendorId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const vendorObjectId = MongoUtils.aggregateId(vendorId);

    // 1. Get today's queue stats
    const todayQueueStats = await QueueEntry.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          createdAt: { $gte: today },
          status: { $in: ['served', 'waiting'] }
        }
      },
      {
        $group: {
          _id: null,
          totalQueue: { $sum: 1 },
          totalServed: { 
            $sum: { $cond: [{ $eq: ['$status', 'served'] }, 1, 0] }
          },
          avgWaitTime: { $avg: '$estimatedWaitTime' }
        }
      }
    ]);

    // 2. Get today's appointments
    const todayAppointmentStats = await Appointment.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          date: { $gte: today },
          status: { $in: ['booked', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // 3. Get 7-day trend data
    const sevenDayTrends = await Analytics.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          avgDailyBookings: { $avg: '$totalBookings' },
          avgQueueLength: { $avg: '$peakQueueLength' },
          avgWaitTime: { $avg: '$averageWaitTime' }
        }
      }
    ]);

    res.json({
      todayStats: {
        queue: todayQueueStats[0] || { totalQueue: 0, totalServed: 0, avgWaitTime: 0 },
        appointments: todayAppointmentStats[0] || { totalAppointments: 0, completedAppointments: 0 }
      },
      trends: sevenDayTrends[0] || {
        avgDailyBookings: 0,
        avgQueueLength: 0,
        avgWaitTime: 0
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vendors/:vendorId/queue
// @desc    Get current queue for vendor
vendorRoutes.get('/:vendorId/queue', protect, async (req, res) => {
  try {
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(req.params.vendorId)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
    const queue = await QueueEntry.find({
      vendorId: MongoUtils.toObjectId(req.params.vendorId),
      status: 'waiting'
    })
    .populate('customerId', 'name phone')
    .sort({ position: 1 });
    
    res.json(queue);
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vendors/:vendorId/appointments
// @desc    Get vendor appointments
vendorRoutes.get('/:vendorId/appointments', protect, async (req, res) => {
  try {
    const { date } = req.query;
    
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(req.params.vendorId)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
    const query = { vendorId: MongoUtils.toObjectId(req.params.vendorId) };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const appointments = await Appointment.find(query)
      .populate('customerId', 'name email phone')
      .sort({ date: 1, 'timeSlot.start': 1 });
    
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/vendors/me/status
// @desc    Update vendor status (open/closed)
vendorRoutes.put('/me/status', protect, authorize('vendor'), async (req, res) => {
  try {
    const { isOpen, customMessage } = req.body;
    const vendor = await Vendor.findOne({ userId: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    vendor.isOpen = isOpen;
    if (customMessage) vendor.customMessage = customMessage;
    vendor.updatedAt = Date.now();
    
    await vendor.save();
    
    res.json({
      success: true,
      message: `Vendor is now ${isOpen ? 'open' : 'closed'}`,
      vendor: {
        isOpen: vendor.isOpen,
        customMessage: vendor.customMessage
      }
    });
  } catch (error) {
    console.error('Update vendor status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default vendorRoutes;
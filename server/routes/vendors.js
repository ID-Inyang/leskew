// server/routes/vendors.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Vendor from '../models/Vendor.js';
import Appointment from '../models/Appointment.js';
import QueueEntry from '../models/QueueEntry.js';

const router = express.Router();

// @route   GET /api/vendors
// @desc    Get all approved vendors
router.get('/', async (req, res) => {
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
// @desc    Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
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

// @route   POST /api/vendors
// @desc    Create/update vendor profile (protected)
router.post('/', protect, authorize('vendor'), async (req, res) => {
  try {
    let vendor = await Vendor.findOne({ userId: req.user._id });
    
    if (vendor) {
      // Update existing vendor
      vendor = await Vendor.findByIdAndUpdate(
        vendor._id,
        { $set: req.body, updatedAt: Date.now() },
        { new: true }
      );
    } else {
      // Create new vendor
      vendor = new Vendor({
        userId: req.user._id,
        ...req.body
      });
      await vendor.save();
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Save vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/vendors/:vendorId/appointments
// @desc    Get vendor appointments (protected)
router.get('/:vendorId/appointments', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const query = { vendorId: req.params.vendorId };
    
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

// @route   GET /api/vendors/:vendorId/queue
// @desc    Get current queue for vendor
router.get('/:vendorId/queue', protect, async (req, res) => {
  try {
    const queue = await QueueEntry.find({
      vendorId: req.params.vendorId,
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

// @route   GET /api/vendors/:vendorId/analytics
// @desc    Get vendor analytics
router.get('/:vendorId/analytics', protect, authorize('vendor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's queue stats
    const queueStats = await QueueEntry.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(req.params.vendorId),
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalQueue: { $sum: 1 },
          avgWaitTime: { $avg: '$estimatedWaitTime' }
        }
      }
    ]);
    
    // Get today's appointments
    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(req.params.vendorId),
          date: { $gte: today },
          status: 'booked'
        }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      queueStats: queueStats[0] || { totalQueue: 0, avgWaitTime: 0 },
      appointmentStats: appointmentStats[0] || { totalAppointments: 0 }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this to server/routes/vendors.js
// @route   GET /api/vendors/profile
// @desc    Get vendor profile for current user
router.get('/profile', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
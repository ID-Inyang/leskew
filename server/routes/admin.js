// server/routes/admin.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/vendors/pending
// @desc    Get pending vendor approvals
router.get('/vendors/pending', async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ isApproved: false })
      .populate('userId', 'name email phone createdAt');
    
    res.json(pendingVendors);
  } catch (error) {
    console.error('Get pending vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/vendors/:id/approve
// @desc    Approve vendor
router.put('/vendors/:id/approve', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, updatedAt: Date.now() },
      { new: true }
    ).populate('userId', 'name email');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.json({ 
      message: 'Vendor approved successfully',
      vendor 
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/vendors/:id/suspend
// @desc    Suspend vendor
router.put('/vendors/:id/suspend', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isApproved: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.json({ 
      message: 'Vendor suspended successfully',
      vendor 
    });
  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVendors = await Vendor.countDocuments({ isApproved: true });
    const totalPendingVendors = await Vendor.countDocuments({ isApproved: false });
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    res.json({
      totalUsers,
      totalVendors,
      totalPendingVendors,
      newUsersToday
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
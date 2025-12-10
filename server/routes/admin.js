// server/routes/admin.js - Fixed ObjectId handling
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import MongoUtils from '../utils/mongoUtils.js'; // Add this import

const adminRoutes = express.Router();

// All admin routes require admin role
adminRoutes.use(protect);
adminRoutes.use(authorize('admin'));

// @route   PUT /api/admin/vendors/:id/approve
// @desc    Approve vendor
adminRoutes.put('/vendors/:id/approve', async (req, res) => {
  try {
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
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
adminRoutes.put('/vendors/:id/suspend', async (req, res) => {
  try {
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
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

export default adminRoutes;
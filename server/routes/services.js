// server/routes/services.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import MongoUtils from '../utils/mongoUtils.js';
import { body, validationResult } from 'express-validator';

const serviceRoutes = express.Router();

// @route   POST /api/services
// @desc    Create a new service (vendor only)
serviceRoutes.post('/', 
  protect, 
  authorize('vendor'),
  [
    body('name').notEmpty().withMessage('Service name is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
    body('price').isNumeric({ min: 0 }).withMessage('Price must be a positive number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    try {
      // Get vendor profile
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({ 
          success: false,
          message: 'Vendor profile not found' 
        });
      }

      const { name, description, duration, price, category } = req.body;

      // Create service
      const service = new Service({
        vendorId: vendor._id,
        name,
        description,
        duration,
        price,
        category,
        isActive: true
      });

      await service.save();

      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        service
      });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// @route   GET /api/services/vendor/:vendorId
// @desc    Get all services for a vendor (public)
serviceRoutes.get('/vendor/:vendorId', async (req, res) => {
  try {
    if (!MongoUtils.isValidObjectId(req.params.vendorId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid vendor ID' 
      });
    }

    const services = await Service.find({
      vendorId: MongoUtils.toObjectId(req.params.vendorId),
      isActive: true
    }).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET /api/services/me
// @desc    Get all services for current vendor
serviceRoutes.get('/me', protect, authorize('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        message: 'Vendor profile not found' 
      });
    }

    const services = await Service.find({ vendorId: vendor._id })
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get my services error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get service by ID (public)
serviceRoutes.get('/:id', async (req, res) => {
  try {
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid service ID' 
      });
    }

    const service = await Service.findById(req.params.id)
      .populate('vendorId', 'businessName');

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    res.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update service (vendor only)
serviceRoutes.put('/:id', 
  protect, 
  authorize('vendor'),
  async (req, res) => {
    try {
      if (!MongoUtils.isValidObjectId(req.params.id)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid service ID' 
        });
      }

      // Get vendor profile
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({ 
          success: false,
          message: 'Vendor profile not found' 
        });
      }

      // Find service
      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: 'Service not found' 
        });
      }

      // Check authorization
      if (!MongoUtils.areIdsEqual(service.vendorId, vendor._id)) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to update this service' 
        });
      }

      // Update allowed fields
      const { name, description, duration, price, category, isActive } = req.body;
      if (name !== undefined) service.name = name;
      if (description !== undefined) service.description = description;
      if (duration !== undefined) service.duration = duration;
      if (price !== undefined) service.price = price;
      if (category !== undefined) service.category = category;
      if (isActive !== undefined) service.isActive = isActive;

      await service.save();

      res.json({
        success: true,
        message: 'Service updated successfully',
        service
      });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// @route   DELETE /api/services/:id
// @desc    Delete service (vendor only) - soft delete
serviceRoutes.delete('/:id', protect, authorize('vendor'), async (req, res) => {
  try {
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid service ID' 
      });
    }

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        message: 'Vendor profile not found' 
      });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    // Check authorization
    if (!MongoUtils.areIdsEqual(service.vendorId, vendor._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this service' 
        });
    }

    // Soft delete - just mark as inactive
    service.isActive = false;
    await service.save();

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default serviceRoutes;
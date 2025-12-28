// server/routes/appointments.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import Vendor from '../models/Vendor.js';
import MongoUtils from '../utils/mongoUtils.js'; 

const appointmentRoutes = express.Router();

// @route   POST /api/appointments
// @desc    Book appointment
appointmentRoutes.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { vendorId, serviceId, date, timeSlot } = req.body;
    
    // Validate vendorId
    if (!MongoUtils.isValidObjectId(vendorId)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }
    
    // Check vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({ message: 'Vendor not found or not approved' });
    }
    
    // Check for overlapping appointments with ObjectId comparison
    const existingAppointment = await Appointment.findOne({
      vendorId: MongoUtils.toObjectId(vendorId), // Use ObjectId
      date: new Date(date),
      'timeSlot.start': timeSlot.start,
      status: 'booked'
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }
    
    // Create appointment
    const appointment = new Appointment({
      customerId: req.user._id, // Already ObjectId from middleware
      vendorId: MongoUtils.toObjectId(vendorId),
      serviceId,
      date: new Date(date),
      timeSlot,
      status: 'booked'
    });
    
    await appointment.save();
    
    // Populate customer info
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('customerId', 'name email phone');
    
    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment
appointmentRoutes.put('/:id/cancel', protect, async (req, res) => {
  try {
    // Validate appointment ID
    if (!MongoUtils.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid appointment ID' 
      });
    }
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('vendorId', 'businessName');
    
    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found' 
      });
    }
    
    // Check authorization using ObjectId.equals()
    if (req.user.role === 'customer') {
      if (!MongoUtils.areIdsEqual(appointment.customerId, req.user._id)) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to cancel this appointment' 
        });
      }
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor || !MongoUtils.areIdsEqual(vendor._id, appointment.vendorId)) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to cancel this appointment' 
        });
      }
    }
    
    // Check if already canceled
    if (appointment.status === 'canceled') {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment is already canceled' 
      });
    }
    
    const oldStatus = appointment.status;
    appointment.status = 'canceled';
    appointment.canceledAt = new Date();
    await appointment.save();
    
    // Get updated appointment with populated data
    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('vendorId', 'businessName')
      .populate('customerId', 'name');
    
    res.json({ 
      success: true,
      message: 'Appointment canceled successfully',
      appointment: updatedAppointment,
      canceledAt: appointment.canceledAt,
      previousStatus: oldStatus
    });
    
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/appointments/user
// @desc    Get user appointments
appointmentRoutes.get('/user', protect, async (req, res) => {
  try {
    let appointments;
    
    if (req.user.role === 'customer') {
      appointments = await Appointment.find({ 
        customerId: req.user._id // ObjectId from middleware
      })
        .populate('vendorId', 'businessName address')
        .sort({ date: -1 });
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (vendor) {
        appointments = await Appointment.find({ 
          vendorId: vendor._id // ObjectId from query
        })
          .populate('customerId', 'name email phone')
          .sort({ date: -1 });
      } else {
        appointments = [];
      }
    }
    
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default appointmentRoutes;
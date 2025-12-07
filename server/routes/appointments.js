// server/routes/appointments.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();

// @route   POST /api/appointments
// @desc    Book appointment
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { vendorId, serviceId, date, timeSlot } = req.body;
    
    // Check vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.isApproved) {
      return res.status(404).json({ message: 'Vendor not found or not approved' });
    }
    
    // Check for overlapping appointments
    const existingAppointment = await Appointment.findOne({
      vendorId,
      date: new Date(date),
      'timeSlot.start': timeSlot.start,
      status: 'booked'
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }
    
    // Create appointment
    const appointment = new Appointment({
      customerId: req.user._id,
      vendorId,
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
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check authorization
    if (req.user.role === 'customer' && 
        appointment.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor || vendor._id.toString() !== appointment.vendorId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    appointment.status = 'canceled';
    await appointment.save();
    
    res.json({ message: 'Appointment canceled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/user
// @desc    Get user appointments
router.get('/user', protect, async (req, res) => {
  try {
    let appointments;
    
    if (req.user.role === 'customer') {
      appointments = await Appointment.find({ customerId: req.user._id })
        .populate('vendorId', 'businessName address')
        .sort({ date: -1 });
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (vendor) {
        appointments = await Appointment.find({ vendorId: vendor._id })
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

export default router;
// server/routes/queue.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import QueueEntry from '../models/QueueEntry.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();

// Add this to server/routes/queue.js (or create a new route)
// @route   GET /api/queue/user
// @desc    Get user's queue entries
router.get('/user', protect, authorize('customer'), async (req, res) => {
  try {
    const queueEntries = await QueueEntry.find({ 
      customerId: req.user._id,
      status: 'waiting'
    })
    .populate('vendorId', 'businessName address')
    .sort({ createdAt: -1 });
    
    res.json(queueEntries);
  } catch (error) {
    console.error('Get user queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/queue/join
// @desc    Join vendor queue
router.post('/join', protect, authorize('customer'), async (req, res) => {
  try {
    const { vendorId } = req.body;
    
    // Get vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Check if already in queue
    const existingEntry = await QueueEntry.findOne({
      vendorId,
      customerId: req.user._id,
      status: 'waiting'
    });
    
    if (existingEntry) {
      return res.status(400).json({ message: 'Already in queue' });
    }
    
    // Get last position
    const lastEntry = await QueueEntry.findOne({ vendorId, status: 'waiting' })
      .sort({ position: -1 });
    
    const position = lastEntry ? lastEntry.position + 1 : 1;
    
    // Calculate estimated wait time
    const estimatedWaitTime = position * 10; // Simplified: 10 minutes per person
    
    // Create queue entry
    const queueEntry = new QueueEntry({
      vendorId,
      customerId: req.user._id,
      position,
      estimatedWaitTime
    });
    
    await queueEntry.save();
    
    // Populate customer info
    const populatedEntry = await QueueEntry.findById(queueEntry._id)
      .populate('customerId', 'name phone');
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`vendor-${vendorId}`).emit('queue-updated', populatedEntry);
    
    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/queue/:queueId/call
// @desc    Vendor calls next customer
router.put('/:queueId/call', protect, authorize('vendor'), async (req, res) => {
  try {
    const queueEntry = await QueueEntry.findById(req.params.queueId)
      .populate('customerId', 'name phone');
    
    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }
    
    // Check if vendor owns this queue
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || vendor._id.toString() !== queueEntry.vendorId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update queue entry
    queueEntry.status = 'served';
    queueEntry.servedAt = new Date();
    await queueEntry.save();
    
    // Update positions of remaining customers
    await QueueEntry.updateMany(
      {
        vendorId: queueEntry.vendorId,
        status: 'waiting',
        position: { $gt: queueEntry.position }
      },
      { $inc: { position: -1 } }
    );
    
    // Recalculate wait times
    const waitingEntries = await QueueEntry.find({
      vendorId: queueEntry.vendorId,
      status: 'waiting'
    }).sort({ position: 1 });
    
    for (let i = 0; i < waitingEntries.length; i++) {
      waitingEntries[i].estimatedWaitTime = (i + 1) * 10;
      await waitingEntries[i].save();
    }
    
    // Emit real-time updates
    const io = req.app.get('io');
    io.to(`vendor-${queueEntry.vendorId}`).emit('customer-called', {
      queueEntry,
      waitingEntries
    });
    
    res.json({ 
      message: 'Customer called successfully',
      servedCustomer: queueEntry.customerId.name
    });
  } catch (error) {
    console.error('Call customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/queue/:queueId/status
// @desc    Update queue entry status
router.put('/:queueId/status', protect, authorize('vendor'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['served', 'skipped', 'left'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const queueEntry = await QueueEntry.findById(req.params.queueId);
    
    if (!queueEntry) {
      return res.status(404).json({ message: 'Queue entry not found' });
    }
    
    // Check if vendor owns this queue
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor || vendor._id.toString() !== queueEntry.vendorId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update status
    queueEntry.status = status;
    if (status === 'served') {
      queueEntry.servedAt = new Date();
    } else if (status === 'left') {
      queueEntry.leftAt = new Date();
    }
    
    await queueEntry.save();
    
    // If skipped or left, update positions
    if (status === 'skipped' || status === 'left') {
      await QueueEntry.updateMany(
        {
          vendorId: queueEntry.vendorId,
          status: 'waiting',
          position: { $gt: queueEntry.position }
        },
        { $inc: { position: -1 } }
      );
    }
    
    // Emit update
    const io = req.app.get('io');
    io.to(`vendor-${queueEntry.vendorId}`).emit('queue-status-updated', queueEntry);
    
    res.json(queueEntry);
  } catch (error) {
    console.error('Update queue status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
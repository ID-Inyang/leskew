// server/models/Analytics.js
import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    index: true 
  },
  
  // Queue Metrics
  totalQueueEntries: { type: Number, default: 0 },
  queueEntriesServed: { type: Number, default: 0 },
  queueEntriesSkipped: { type: Number, default: 0 },
  queueEntriesLeft: { type: Number, default: 0 },
  peakQueueLength: { type: Number, default: 0 },
  averageWaitTime: { type: Number, default: 0 }, // in minutes
  averageActualWaitTime: { type: Number, default: 0 }, // in minutes
  maxWaitTime: { type: Number, default: 0 },
  
  // Appointment Metrics
  totalBookings: { type: Number, default: 0 },
  bookingsCompleted: { type: Number, default: 0 },
  bookingsCanceled: { type: Number, default: 0 },
  bookingsNoShow: { type: Number, default: 0 },
  averageServiceDuration: { type: Number, default: 0 }, // in minutes
  
  // Revenue Metrics (if you add payment later)
  estimatedRevenue: { type: Number, default: 0 },
  averageBookingValue: { type: Number, default: 0 },
  
  // Performance Metrics
  customerSatisfactionScore: { type: Number, default: 0, min: 0, max: 100 },
  efficiencyScore: { type: Number, default: 0, min: 0, max: 100 },
  
  // Hourly breakdown
  peakHour: { type: Number, default: 0 }, // 0-23
  peakHourCount: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for fast queries by vendor and date
analyticsSchema.index({ vendorId: 1, date: 1 }, { unique: true });

// Pre-save middleware to update timestamps
analyticsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Analytics', analyticsSchema);
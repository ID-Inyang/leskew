// server/models/Analytics.js
import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  date: { type: Date, required: true },
  totalBookings: { type: Number, default: 0 },
  peakQueueLength: { type: Number, default: 0 },
  averageWaitTime: { type: Number, default: 0 }, // in minutes
  createdAt: { type: Date, default: Date.now }
});

analyticsSchema.index({ vendorId: 1, date: 1 });

export default mongoose.model("Analytics", analyticsSchema);
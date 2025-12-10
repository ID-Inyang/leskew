// server/models/Appointment.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    serviceId: { type: String, required: true },
    serviceName: { type: String },
    serviceDuration: { type: Number }, // in minutes
    date: { type: Date, required: true },
    timeSlot: {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["booked", "canceled", "completed"],
      default: "booked",
    },
    actualStartTime: { type: Date }, // When service actually started
    actualEndTime: { type: Date },   // When service actually ended
    actualDuration: { type: Number }, // Actual service duration in minutes
    notes: { type: String },
  },
  { timestamps: true }
);

appointmentSchema.index({ vendorId: 1, date: 1 });

export default mongoose.model("Appointment", appointmentSchema);

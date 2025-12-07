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
    serviceName: { type: String }, // Add this for easier reference
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
    notes: { type: String },
  },
  { timestamps: true }
);

appointmentSchema.index({ vendorId: 1, date: 1 });

export default mongoose.model("Appointment", appointmentSchema);

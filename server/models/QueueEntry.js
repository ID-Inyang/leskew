// server/models/QueueEntry.js
import mongoose from "mongoose";

const queueEntrySchema = new mongoose.Schema(
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
    joinTime: { type: Date, default: Date.now },
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ["waiting", "served", "skipped", "left"],
      default: "waiting",
    },
    estimatedWaitTime: { type: Number, default: 0 }, // in minutes
    servedAt: { type: Date },
    leftAt: { type: Date },
  },
  { timestamps: true }
);

queueEntrySchema.index({ vendorId: 1, status: 1, position: 1 });

export default mongoose.model("QueueEntry", queueEntrySchema);

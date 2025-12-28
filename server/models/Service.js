// server/models/Service.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true }, // in minutes
    price: { type: Number, required: true },
    category: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ vendorId: 1, isActive: 1 });

export default mongoose.model("Service", serviceSchema);
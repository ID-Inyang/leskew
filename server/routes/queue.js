// server/routes/queue.js - COMPLETE FIXED VERSION
import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import QueueEntry from "../models/QueueEntry.js";
import Vendor from "../models/Vendor.js";
import {
  calculateWaitTime,
  recalculateAllWaitTimes,
  getQueueStatistics,
} from "../utils/queueCalculator.js";
import AnalyticsService from "../services/analyticsService.js";
import MongoUtils from "../utils/mongoUtils.js";
import {
  validateObjectId,
  validateBodyObjectIds,
} from "../middleware/validateObjectId.js";

const queueRoutes = express.Router();

// @route   POST /api/queue/join
// @desc    Join vendor queue with realistic wait time
queueRoutes.post(
  "/join",
  protect,
  authorize("customer"),
  validateBodyObjectIds(["vendorId"]),
  async (req, res) => {
    try {
      const { vendorId } = req.body;

      // Convert to ObjectId for queries
      const vendorObjectId = MongoUtils.toObjectId(vendorId);

      // Get vendor using ObjectId
      const vendor = await Vendor.findById(vendorObjectId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Check if vendor is open (optional business logic)
      if (!isVendorOpen(vendor)) {
        return res.status(400).json({ message: "Vendor is currently closed" });
      }

      // Check if already in queue with proper ObjectId comparison
      const existingEntry = await QueueEntry.findOne({
        vendorId: vendorObjectId,
        customerId: req.user._id,
        status: "waiting",
      });

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: "Already in queue",
          position: existingEntry.position,
        });
      }

      // Get last position with ObjectId
      const lastEntry = await QueueEntry.findOne({
        vendorId: vendorObjectId,
        status: "waiting",
      }).sort({ position: -1 });

      const position = lastEntry ? lastEntry.position + 1 : 1;

      // Calculate realistic wait time using our new utility
      const estimatedWaitTime = await calculateWaitTime(
        vendorObjectId,
        position
      );

      // Create queue entry with ObjectIds
      const queueEntry = new QueueEntry({
        vendorId: vendorObjectId,
        customerId: req.user._id,
        position,
        estimatedWaitTime,
        joinTime: new Date(),
        status: "waiting",
      });

      await queueEntry.save();
      await AnalyticsService.recordDailyAnalytics(vendorObjectId);

      // Recalculate wait times for all waiting customers
      await recalculateAllWaitTimes(vendorObjectId);

      // Populate customer info
      const populatedEntry = await QueueEntry.findById(queueEntry._id)
        .populate("customerId", "name phone avatar")
        .populate("vendorId", "businessName");

      // Get updated queue statistics
      const queueStats = await getQueueStatistics(vendorObjectId);

      // Emit real-time update with more information
      // In your POST /api/queue/join endpoint, after saving:
      const io = req.app.get("io");
      if (io) {
        // Use the helper or emit directly
        io.to(`vendor-${vendorId}`).emit("queue-updated", {
          success: true,
          action: "customer-joined",
          queueEntry: populatedEntry.toObject(),
          queueStats,
          timestamp: new Date().toISOString(),
        });

        // Also emit to the specific customer
        io.emit(`customer-${req.user._id}-queue-update`, {
          success: true,
          message: "You joined the queue",
          position: position,
          estimatedWaitTime: estimatedWaitTime,
        });
      }

      res.status(201).json({
        success: true,
        message: "Successfully joined queue",
        queueEntry: populatedEntry,
        queueStats,
        position,
      });
    } catch (error) {
      console.error("Join queue error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// Helper function to check if vendor is open
const isVendorOpen = (vendor) => {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const workingHours = vendor.workingHours[dayOfWeek];

  if (!workingHours || !workingHours.open || !workingHours.close) {
    return false; // Vendor closed on this day
  }

  const [openHour, openMinute] = workingHours.open.split(":").map(Number);
  const [closeHour, closeMinute] = workingHours.close.split(":").map(Number);

  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const openTimeInMinutes = openHour * 60 + openMinute;
  const closeTimeInMinutes = closeHour * 60 + closeMinute;

  return (
    currentTimeInMinutes >= openTimeInMinutes &&
    currentTimeInMinutes <= closeTimeInMinutes
  );
};

// @route   PUT /api/queue/:queueId/call
// @desc    Vendor calls next customer - with updated wait times
queueRoutes.put(
  "/:queueId/call",
  protect,
  authorize("vendor"),
  validateObjectId("queueId"),
  async (req, res) => {
    try {
      const queueId = req.params.queueId;
      const queueObjectId = MongoUtils.toObjectId(queueId);

      // Find vendor first to verify ownership
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor profile not found",
        });
      }

      // Find queue entry
      const queueEntry = await QueueEntry.findById(queueObjectId)
        .populate("customerId", "name phone avatar")
        .populate("vendorId", "businessName userId");

      console.log(
        "Found queue entry:",
        queueEntry
          ? {
              _id: queueEntry._id,
              status: queueEntry.status,
              vendorId: queueEntry.vendorId?._id,
              vendorUserId: queueEntry.vendorId?.userId,
              customerId: queueEntry.customerId?._id,
              position: queueEntry.position,
            }
          : "No queue entry found"
      );

      if (!queueEntry) {
        return res.status(404).json({
          success: false,
          message: "Queue entry not found",
        });
      }

      // CRITICAL AUTHORIZATION FIX:
      // Compare vendor._id from queueEntry.vendorId with current vendor's _id
      const queueEntryVendorId = queueEntry.vendorId?._id;
      const currentVendorId = vendor._id;

      console.log("Authorization check:");
      console.log("Queue Entry Vendor ID:", queueEntryVendorId);
      console.log("Current Vendor ID:", currentVendorId);
      console.log(
        "Are they equal?",
        MongoUtils.areIdsEqual(queueEntryVendorId, currentVendorId)
      );

      // Check if the queue entry belongs to this vendor's business
      if (
        !queueEntryVendorId ||
        !MongoUtils.areIdsEqual(queueEntryVendorId, currentVendorId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Not authorized. This queue entry does not belong to your business.",
          details: {
            queueVendorId: queueEntryVendorId,
            yourVendorId: currentVendorId,
          },
        });
      }

      // Check if customer is still waiting
      if (queueEntry.status !== "waiting") {
        return res.status(400).json({
          success: false,
          message: `Customer already ${queueEntry.status}`,
          currentStatus: queueEntry.status,
        });
      }

      console.log("Proceeding to serve customer...");

      // Update queue entry
      queueEntry.status = "served";
      queueEntry.servedAt = new Date();

      // Calculate actual service duration for analytics
      if (queueEntry.joinTime) {
        const serviceDuration = Math.round(
          (queueEntry.servedAt - queueEntry.joinTime) / (1000 * 60)
        );
        queueEntry.actualServiceDuration = serviceDuration;
        console.log("Service duration:", serviceDuration, "minutes");
      }

      await queueEntry.save();
      console.log("Queue entry saved as served");

      await AnalyticsService.recordDailyAnalytics(currentVendorId);
      console.log("Analytics recorded");

      // Update positions of remaining customers (move them up)
      const positionUpdate = await QueueEntry.updateMany(
        {
          vendorId: currentVendorId,
          status: "waiting",
          position: { $gt: queueEntry.position },
        },
        { $inc: { position: -1 } }
      );

      console.log(
        "Positions updated:",
        positionUpdate.modifiedCount,
        "customers moved up"
      );

      // Recalculate wait times for all waiting customers
      await recalculateAllWaitTimes(currentVendorId);
      console.log("Wait times recalculated");

      // Get updated queue statistics
      const queueStats = await getQueueStatistics(currentVendorId);
      console.log("Queue stats:", queueStats);

      // Get updated waiting queue for response
      const waitingEntries = await QueueEntry.find({
        vendorId: currentVendorId,
        status: "waiting",
      })
        .populate("customerId", "name phone avatar")
        .sort({ position: 1 });

      console.log("Updated waiting entries:", waitingEntries.length);

      // Update vendor's average service duration
      if (queueEntry.actualServiceDuration) {
        await updateVendorServiceDuration(
          currentVendorId,
          queueEntry.actualServiceDuration
        );
      }

      // Emit real-time updates
      const io = req.app.get("io");
      if (io) {
        io.to(`vendor-${currentVendorId}`).emit("customer-called", {
          success: true,
          action: "served",
          servedCustomer: queueEntry.customerId?.name || "Customer",
          queueStats,
          waitingEntries: waitingEntries.map((entry) => ({
            _id: entry._id,
            customerId: entry.customerId,
            position: entry.position,
            estimatedWaitTime: entry.estimatedWaitTime,
            joinTime: entry.joinTime,
          })),
        });

        console.log("Socket event emitted to vendor room");
      }

      res.json({
        success: true,
        message: "Customer called successfully",
        servedCustomer: queueEntry.customerId?.name || "Customer",
        queueStats,
        waitingEntries: waitingEntries,
        // Include the called customer for reference
        calledCustomer: {
          id: queueEntry.customerId?._id,
          name: queueEntry.customerId?.name,
          phone: queueEntry.customerId?.phone,
        },
        // Debug info
        debug: {
          vendorId: currentVendorId,
          queueLengthBefore: queueEntry.position,
          queueLengthAfter: waitingEntries.length,
          timestamp: new Date().toISOString(),
        },
      });

      console.log("=== CALL CUSTOMER COMPLETE ===");
    } catch (error) {
      console.error("❌ Call customer error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// @route   PUT /api/queue/:queueId/status
// @desc    Update queue entry status
queueRoutes.put(
  "/:queueId/status",
  protect,
  authorize("vendor"),
  validateObjectId("queueId"),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["served", "skipped", "left"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be: served, skipped, or left",
        });
      }

      const queueId = req.params.queueId;
      const queueObjectId = MongoUtils.toObjectId(queueId);

      // Find vendor first
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor profile not found",
        });
      }

      const queueEntry = await QueueEntry.findById(queueObjectId).populate(
        "customerId",
        "name phone"
      );

      if (!queueEntry) {
        return res.status(404).json({
          success: false,
          message: "Queue entry not found",
        });
      }

      // Check authorization
      if (
        !MongoUtils.areIdsEqual(
          vendor._id.toString(),
          queueEntry.vendorId.toString()
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this queue entry",
        });
      }

      // Update status
      const oldStatus = queueEntry.status;
      queueEntry.status = status;

      if (status === "served") {
        queueEntry.servedAt = new Date();
      } else if (status === "left") {
        queueEntry.leftAt = new Date();
      }

      await queueEntry.save();
      await AnalyticsService.recordDailyAnalytics(queueEntry.vendorId);

      // If skipped or left and was waiting, update positions
      if (
        (status === "skipped" || status === "left") &&
        oldStatus === "waiting"
      ) {
        await QueueEntry.updateMany(
          {
            vendorId: queueEntry.vendorId,
            status: "waiting",
            position: { $gt: queueEntry.position },
          },
          { $inc: { position: -1 } }
        );
      }

      // Recalculate wait times
      await recalculateAllWaitTimes(queueEntry.vendorId);

      // Get updated queue
      const waitingEntries = await QueueEntry.find({
        vendorId: queueEntry.vendorId,
        status: "waiting",
      })
        .populate("customerId", "name phone")
        .sort({ position: 1 });

      // Get updated stats
      const queueStats = await getQueueStatistics(queueEntry.vendorId);

      // Emit update
      const io = req.app.get("io");
      if (io) {
        io.to(`vendor-${queueEntry.vendorId}`).emit("queue-status-updated", {
          queueEntry: queueEntry.toObject(),
          queueStats,
          waitingEntries: waitingEntries.map((entry) => entry.toObject()),
        });
      }

      res.json({
        success: true,
        message: `Customer marked as ${status}`,
        queueEntry,
        queueStats,
        waitingEntries,
      });
    } catch (error) {
      console.error("Update queue status error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/queue/user
// @desc    Get user's queue entries
queueRoutes.get("/user", protect, authorize("customer"), async (req, res) => {
  try {
    const queueEntries = await QueueEntry.find({
      customerId: req.user._id,
      status: "waiting",
    })
      .populate({
        path: "vendorId",
        select: "businessName address contactInfo serviceCategories",
        populate: {
          path: "userId",
          select: "name avatar",
        },
      })
      .sort({ position: 1 });

    res.json({
      success: true,
      queueEntries,
    });
  } catch (error) {
    console.error("Get user queue error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Helper to update vendor's average service duration
const updateVendorServiceDuration = async (vendorId, newDuration) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return;

    // Simple moving average: blend new duration with existing average
    const currentAvg = vendor.averageServiceDuration || 30;
    const updatedAvg = Math.round(currentAvg * 0.8 + newDuration * 0.2);

    vendor.averageServiceDuration = updatedAvg;
    await vendor.save();
  } catch (error) {
    console.error("Update vendor service duration error:", error);
  }
};

// @route   GET /api/queue/:vendorId/stats
// @desc    Get queue statistics for a vendor
queueRoutes.get(
  "/:vendorId/stats",
  validateObjectId("vendorId"),
  async (req, res) => {
    try {
      const vendorId = req.params.vendorId;
      const vendorObjectId = MongoUtils.toObjectId(vendorId);

      const stats = await getQueueStatistics(vendorObjectId);
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Get queue stats error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/vendors/:vendorId/queue
// @desc    Get vendor's current queue (IMPORTANT: Your frontend calls this!)
queueRoutes.get("/vendors/:vendorId/queue", async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const vendorObjectId = MongoUtils.toObjectId(vendorId);

    const queueEntries = await QueueEntry.find({
      vendorId: vendorObjectId,
      status: "waiting",
    })
      .populate("customerId", "name phone avatar")
      .sort({ position: 1 });

    res.json(queueEntries);
  } catch (error) {
    console.error("Get vendor queue error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/queue/debug/:vendorId
// @desc    Debug endpoint to check queue data
queueRoutes.get(
  "/debug/:vendorId",
  protect,
  authorize("vendor"),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ userId: req.user._id });

      if (!vendor) {
        return res.json({
          success: false,
          message: "No vendor profile found for user",
          userId: req.user._id,
        });
      }

      // Check if requested vendor ID matches user's vendor
      const requestedVendorId = req.params.vendorId;
      if (!MongoUtils.areIdsEqual(vendor._id, requestedVendorId)) {
        return res.json({
          success: false,
          message: "Vendor ID mismatch",
          yourVendorId: vendor._id,
          requestedVendorId: requestedVendorId,
        });
      }

      // Get all queue entries for this vendor
      const allEntries = await QueueEntry.find({ vendorId: vendor._id })
        .populate("customerId", "name phone")
        .sort({ position: 1 });

      // Get waiting entries only
      const waitingEntries = allEntries.filter(
        (entry) => entry.status === "waiting"
      );

      // Get today's served entries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const servedToday = allEntries.filter(
        (entry) => entry.status === "served" && entry.servedAt >= today
      );

      res.json({
        success: true,
        vendor: {
          _id: vendor._id,
          businessName: vendor.businessName,
          userId: vendor.userId,
        },
        queue: {
          allEntries: allEntries.map((entry) => ({
            _id: entry._id,
            customer: entry.customerId?.name,
            status: entry.status,
            position: entry.position,
            estimatedWaitTime: entry.estimatedWaitTime,
            joinTime: entry.joinTime,
            servedAt: entry.servedAt,
          })),
          waiting: waitingEntries.length,
          waitingEntries: waitingEntries.map((entry) => ({
            _id: entry._id,
            customer: entry.customerId?.name,
            position: entry.position,
            estimatedWaitTime: entry.estimatedWaitTime,
          })),
          servedToday: servedToday.length,
        },
        user: {
          _id: req.user._id,
          name: req.user.name,
          role: req.user.role,
        },
      });
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Debug error",
        error: error.message,
      });
    }
  }
);

// Add these routes to your queue.js file

// @route   PUT /api/queue/:queueId/leave
// @desc    Customer leaves a queue (CUSTOMER ONLY)
queueRoutes.put(
  "/:queueId/leave",
  protect,
  authorize("customer"), // Only customers can leave
  validateObjectId("queueId"),
  async (req, res) => {
    try {
      const queueId = req.params.queueId;
      const queueObjectId = MongoUtils.toObjectId(queueId);

      console.log("Customer leaving queue:", {
        queueId,
        customerId: req.user._id,
        customerName: req.user.name,
      });

      // Find queue entry
      const queueEntry = await QueueEntry.findById(queueObjectId).populate(
        "vendorId",
        "businessName"
      );

      if (!queueEntry) {
        return res.status(404).json({
          success: false,
          message: "Queue entry not found",
        });
      }

      // Verify customer owns this queue entry
      if (!MongoUtils.areIdsEqual(queueEntry.customerId, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized. This queue entry does not belong to you.",
        });
      }

      // Check if already left or served
      if (queueEntry.status !== "waiting") {
        return res.status(400).json({
          success: false,
          message: `Cannot leave queue. Status is already: ${queueEntry.status}`,
        });
      }

      // Update status to 'left'
      const oldPosition = queueEntry.position;
      queueEntry.status = "left";
      queueEntry.leftAt = new Date();

      await queueEntry.save();
      console.log("Queue entry marked as left by customer");

      // Update positions of remaining customers
      const positionUpdate = await QueueEntry.updateMany(
        {
          vendorId: queueEntry.vendorId,
          status: "waiting",
          position: { $gt: oldPosition },
        },
        { $inc: { position: -1 } }
      );

      console.log(
        "Positions updated:",
        positionUpdate.modifiedCount,
        "customers moved up"
      );

      // Recalculate wait times
      await recalculateAllWaitTimes(queueEntry.vendorId);

      // Get updated queue statistics
      const queueStats = await getQueueStatistics(queueEntry.vendorId);

      // Emit real-time update to vendor
      const io = req.app.get("io");
      if (io) {
        io.to(`vendor-${queueEntry.vendorId}`).emit("customer-left", {
          success: true,
          action: "left",
          customerName: req.user.name,
          queueStats,
          leftQueueId: queueEntry._id,
          oldPosition,
        });
      }

      res.json({
        success: true,
        message: "Successfully left the queue",
        queueEntry: {
          _id: queueEntry._id,
          vendor: queueEntry.vendorId?.businessName,
          oldPosition,
          leftAt: queueEntry.leftAt,
        },
        queueStats,
      });
    } catch (error) {
      console.error("Leave queue error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/queue/:queueId/cancel
// @desc    Customer cancels their own queue entry (CUSTOMER ONLY)
queueRoutes.put(
  "/:queueId/cancel",
  protect,
  authorize("customer"),
  validateObjectId("queueId"),
  async (req, res) => {
    try {
      const queueId = req.params.queueId;
      const queueObjectId = MongoUtils.toObjectId(queueId);

      const queueEntry = await QueueEntry.findById(queueObjectId);

      if (!queueEntry) {
        return res.status(404).json({
          success: false,
          message: "Queue entry not found",
        });
      }

      // Verify ownership
      if (!MongoUtils.areIdsEqual(queueEntry.customerId, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      // Update status
      queueEntry.status = "left";
      queueEntry.leftAt = new Date();
      await queueEntry.save();

      // Update positions
      await QueueEntry.updateMany(
        {
          vendorId: queueEntry.vendorId,
          status: "waiting",
          position: { $gt: queueEntry.position },
        },
        { $inc: { position: -1 } }
      );

      // Recalculate wait times
      await recalculateAllWaitTimes(queueEntry.vendorId);

      res.json({
        success: true,
        message: "Queue entry cancelled",
      });
    } catch (error) {
      console.error("Cancel queue error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET /api/queue/user/check/:vendorId
// @desc    Check if user is in a specific vendor's queue
queueRoutes.get(
  "/user/check/:vendorId",
  protect,
  authorize("customer"),
  validateObjectId("vendorId"),
  async (req, res) => {
    try {
      const vendorId = req.params.vendorId;
      const vendorObjectId = MongoUtils.toObjectId(vendorId);

      const queueEntry = await QueueEntry.findOne({
        vendorId: vendorObjectId,
        customerId: req.user._id,
        status: "waiting",
      });

      res.json({
        success: true,
        isInQueue: !!queueEntry,
        queueEntry: queueEntry || null,
        position: queueEntry?.position,
      });
    } catch (error) {
      console.error("Check queue error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

export default queueRoutes;

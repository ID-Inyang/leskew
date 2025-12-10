// server/routes/analytics.js
import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import AnalyticsService from "../services/analyticsService.js";
import Vendor from "../models/Vendor.js";

const analyticsRoutes = express.Router();

// @route   GET /api/analytics/vendor/:vendorId
// @desc    Get vendor analytics
analyticsRoutes.get(
  "/vendor/:vendorId",
  protect,
  authorize("vendor", "admin"),
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { period = "7d" } = req.query;

      // Check authorization
      if (req.user.role === "vendor") {
        const vendor = await Vendor.findOne({ userId: req.user._id });
        if (!vendor || vendor._id.toString() !== vendorId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }

      const analytics = await AnalyticsService.getVendorAnalytics(
        vendorId,
        period
      );
      res.json(analytics);
    } catch (error) {
      console.error("Get vendor analytics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics for vendor
analyticsRoutes.get("/dashboard", protect, authorize("vendor"), async (req, res) => {
  try {
    // Get vendor for current user
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's real-time stats
    const queueEntries = await QueueEntry.find({
      vendorId: vendor._id,
      createdAt: { $gte: today },
    });

    const appointments = await Appointment.find({
      vendorId: vendor._id,
      date: { $gte: today },
    });

    // Calculate current stats
    const currentStats = {
      activeInQueue: queueEntries.filter((e) => e.status === "waiting").length,
      servedToday: queueEntries.filter((e) => e.status === "served").length,
      appointmentsToday: appointments.length,
      completedAppointments: appointments.filter(
        (a) => a.status === "completed"
      ).length,
      estimatedRevenue: appointments.reduce(
        (sum, a) => sum + (a.price || 0),
        0
      ),
    };

    // Get historical analytics
    const analytics = await AnalyticsService.getVendorAnalytics(
      vendor._id,
      "7d"
    );

    res.json({
      vendor: {
        name: vendor.businessName,
        categories: vendor.serviceCategories,
      },
      currentStats,
      historical: analytics,
      insights: generateInsights(currentStats, analytics.summary),
    });
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to generate insights
const generateInsights = (current, historical) => {
  const insights = [];

  if (current.activeInQueue > historical.avgQueueEntries * 1.5) {
    insights.push({
      type: "warning",
      message: `Queue is ${Math.round(
        (current.activeInQueue / historical.avgQueueEntries - 1) * 100
      )}% longer than average`,
      suggestion: "Consider adding staff or optimizing service times",
    });
  }

  if (current.servedToday > 0 && historical.avgEfficiency < 70) {
    insights.push({
      type: "info",
      message: "Wait time accuracy can be improved",
      suggestion: "Review service durations and update vendor settings",
    });
  }

  if (
    current.completedAppointments > 0 &&
    current.completedAppointments / current.appointmentsToday < 0.7
  ) {
    insights.push({
      type: "warning",
      message: "Low appointment completion rate",
      suggestion: "Send reminders and follow up with customers",
    });
  }

  return insights.length > 0
    ? insights
    : [
        {
          type: "success",
          message: "All metrics are within normal ranges",
          suggestion: "Continue current operations",
        },
      ];
};

// @route   POST /api/analytics/record/:vendorId
// @desc    Manually trigger analytics recording (admin only)
analyticsRoutes.post(
  "/record/:vendorId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      await AnalyticsService.recordDailyAnalytics(req.params.vendorId);
      res.json({ message: "Analytics recorded successfully" });
    } catch (error) {
      console.error("Record analytics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default analyticsRoutes;

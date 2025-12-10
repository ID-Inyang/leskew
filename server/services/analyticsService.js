// server/services/analyticsService.js - CORRECTED VERSION
import mongoose from 'mongoose'; // ADD THIS IMPORT
import Analytics from '../models/Analytics.js';
import QueueEntry from '../models/QueueEntry.js';
import Appointment from '../models/Appointment.js';
import Vendor from '../models/Vendor.js'; // ADD THIS IMPORT
import MongoUtils from '../utils/mongoUtils.js'; // ADD THIS IMPORT

class AnalyticsService {
  /**
   * Record analytics for a specific vendor and date
   */
  static async recordDailyAnalytics(vendorId, date = new Date()) {
    try {
      // Validate vendorId
      if (!MongoUtils.isValidObjectId(vendorId)) {
        throw new Error(`Invalid vendor ID: ${vendorId}`);
      }
      
      // Convert to ObjectId for aggregation queries
      const vendorObjectId = MongoUtils.aggregateId(vendorId);
      
      // Set date to start of day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // 1. Queue Analytics with proper ObjectId
      const queueStats = await QueueEntry.aggregate([
        {
          $match: {
            vendorId: vendorObjectId, // USE ObjectId
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalQueueEntries: { $sum: 1 },
            queueEntriesServed: { 
              $sum: { $cond: [{ $eq: ['$status', 'served'] }, 1, 0] }
            },
            queueEntriesSkipped: { 
              $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] }
            },
            queueEntriesLeft: { 
              $sum: { $cond: [{ $eq: ['$status', 'left'] }, 1, 0] }
            },
            peakQueueLength: { $max: '$position' },
            averageWaitTime: { $avg: '$estimatedWaitTime' },
            averageActualWaitTime: {
              $avg: {
                $cond: [
                  { $and: [
                    { $eq: ['$status', 'served'] },
                    { $ne: ['$servedAt', null] },
                    { $ne: ['$joinTime', null] }
                  ]},
                  { $divide: [
                    { $subtract: ['$servedAt', '$joinTime'] },
                    60000
                  ]},
                  null
                ]
              }
            },
            maxWaitTime: {
              $max: {
                $cond: [
                  { $and: [
                    { $eq: ['$status', 'served'] },
                    { $ne: ['$servedAt', null] },
                    { $ne: ['$joinTime', null] }
                  ]},
                  { $divide: [
                    { $subtract: ['$servedAt', '$joinTime'] },
                    60000
                  ]},
                  0
                ]
              }
            }
          }
        }
      ]);

      // 2. Appointment Analytics with proper ObjectId
      const appointmentStats = await Appointment.aggregate([
        {
          $match: {
            vendorId: vendorObjectId, // USE ObjectId
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            bookingsCompleted: { 
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            bookingsCanceled: { 
              $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] }
            },
            bookingsNoShow: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$status', 'booked'] },
                    { $lt: ['$date', new Date()] }
                  ]},
                  1,
                  0
                ]
              }
            },
            averageServiceDuration: { $avg: '$serviceDuration' }
          }
        }
      ]);

      // 3. Find peak hour with proper ObjectId
      const peakHourStats = await QueueEntry.aggregate([
        {
          $match: {
            vendorId: vendorObjectId, // USE ObjectId
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'served'
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 1
        }
      ]);

      // 4. Calculate efficiency score
      const queueData = queueStats[0] || {};
      const appointmentData = appointmentStats[0] || {};
      
      const efficiencyScore = this.calculateEfficiencyScore(
        queueData.averageActualWaitTime || 0,
        queueData.averageWaitTime || 0
      );

      // 5. Create or update analytics record
      const analyticsData = {
        vendorId: vendorObjectId, // USE ObjectId
        date: startDate,
        totalQueueEntries: queueData.totalQueueEntries || 0,
        queueEntriesServed: queueData.queueEntriesServed || 0,
        queueEntriesSkipped: queueData.queueEntriesSkipped || 0,
        queueEntriesLeft: queueData.queueEntriesLeft || 0,
        peakQueueLength: queueData.peakQueueLength || 0,
        averageWaitTime: Math.round(queueData.averageWaitTime || 0),
        averageActualWaitTime: Math.round(queueData.averageActualWaitTime || 0),
        maxWaitTime: Math.round(queueData.maxWaitTime || 0),
        totalBookings: appointmentData.totalBookings || 0,
        bookingsCompleted: appointmentData.bookingsCompleted || 0,
        bookingsCanceled: appointmentData.bookingsCanceled || 0,
        bookingsNoShow: appointmentData.bookingsNoShow || 0,
        averageServiceDuration: Math.round(appointmentData.averageServiceDuration || 0),
        efficiencyScore: efficiencyScore,
        peakHour: peakHourStats[0]?._id || 0,
        peakHourCount: peakHourStats[0]?.count || 0
      };

      // Upsert the analytics record with ObjectId
      await Analytics.findOneAndUpdate(
        { vendorId: vendorObjectId, date: startDate }, // USE ObjectId
        analyticsData,
        { upsert: true, new: true }
      );

      console.log(`✅ Analytics recorded for vendor ${vendorId} on ${startDate.toISOString()}`);
      return analyticsData;
    } catch (error) {
      console.error('Error recording analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate efficiency score (0-100)
   */
  static calculateEfficiencyScore(actualWait, estimatedWait) {
    if (!estimatedWait || estimatedWait === 0) return 100;
    const accuracy = Math.abs(actualWait - estimatedWait) / estimatedWait;
    const score = Math.max(0, 100 - (accuracy * 100));
    return Math.round(score);
  }

  /**
   * Get analytics summary for a vendor
   */
  static async getVendorAnalytics(vendorId, period = '7d') {
    try {
      // Validate vendorId
      if (!MongoUtils.isValidObjectId(vendorId)) {
        throw new Error(`Invalid vendor ID: ${vendorId}`);
      }
      
      const vendorObjectId = MongoUtils.aggregateId(vendorId);
      const startDate = new Date();
      
      switch (period) {
        case '1d':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
      
      startDate.setHours(0, 0, 0, 0);

      const analytics = await Analytics.find({
        vendorId: vendorObjectId, // USE ObjectId
        date: { $gte: startDate }
      }).sort({ date: 1 });

      return {
        period,
        totalDays: analytics.length,
        summary: this.calculateSummary(analytics),
        dailyData: analytics.map(day => ({
          date: day.date,
          queueEntries: day.totalQueueEntries,
          bookings: day.totalBookings,
          avgWaitTime: day.averageWaitTime,
          efficiencyScore: day.efficiencyScore
        }))
      };
    } catch (error) {
      console.error('Error getting vendor analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate summary from analytics data
   */
  static calculateSummary(analytics) {
    if (analytics.length === 0) {
      return {
        avgQueueEntries: 0,
        avgBookings: 0,
        avgWaitTime: 0,
        avgEfficiency: 0,
        totalQueueEntries: 0,
        totalBookings: 0
      };
    }

    const totals = analytics.reduce((acc, day) => ({
      queueEntries: acc.queueEntries + day.totalQueueEntries,
      bookings: acc.bookings + day.totalBookings,
      waitTime: acc.waitTime + day.averageWaitTime,
      efficiency: acc.efficiency + day.efficiencyScore
    }), { queueEntries: 0, bookings: 0, waitTime: 0, efficiency: 0 });

    return {
      avgQueueEntries: Math.round(totals.queueEntries / analytics.length),
      avgBookings: Math.round(totals.bookings / analytics.length),
      avgWaitTime: Math.round(totals.waitTime / analytics.length),
      avgEfficiency: Math.round(totals.efficiency / analytics.length),
      totalQueueEntries: totals.queueEntries,
      totalBookings: totals.bookings
    };
  }

  /**
   * Trigger analytics recording for all vendors (cron job)
   */
  static async recordAllVendorsAnalytics() {
    try {
      // Get all approved vendors
      const vendors = await Vendor.find({ isApproved: true });
      
      console.log(`📊 Recording analytics for ${vendors.length} vendors...`);
      
      for (const vendor of vendors) {
        try {
          await this.recordDailyAnalytics(vendor._id);
        } catch (error) {
          console.error(`Failed to record analytics for vendor ${vendor._id}:`, error);
          // Continue with other vendors
        }
      }
      
      console.log('✅ All vendor analytics recorded');
    } catch (error) {
      console.error('Error recording all vendors analytics:', error);
      throw error;
    }
  }
}

// Test function to verify analytics service works
const testAnalyticsService = async () => {
  console.log('🧪 Testing Analytics Service...');
  
  // Test 1: Calculate efficiency score
  console.log('Test 1 - Efficiency Score:');
  console.log('  Actual 30min, Estimated 30min:', AnalyticsService.calculateEfficiencyScore(30, 30)); // Should be 100
  console.log('  Actual 45min, Estimated 30min:', AnalyticsService.calculateEfficiencyScore(45, 30)); // Should be 50
  console.log('  Actual 15min, Estimated 30min:', AnalyticsService.calculateEfficiencyScore(15, 30)); // Should be 50
  
  // Test 2: Validate ObjectId handling
  console.log('\nTest 2 - ObjectId Validation:');
  const validId = '507f1f77bcf86cd799439011';
  const invalidId = 'not-an-id';
  console.log(`  "${validId}" valid:`, MongoUtils.isValidObjectId(validId));
  console.log(`  "${invalidId}" valid:`, MongoUtils.isValidObjectId(invalidId));
  
  // Test 3: Summary calculation
  console.log('\nTest 3 - Summary Calculation:');
  const testAnalytics = [
    { totalQueueEntries: 10, totalBookings: 5, averageWaitTime: 20, efficiencyScore: 80 },
    { totalQueueEntries: 15, totalBookings: 8, averageWaitTime: 25, efficiencyScore: 75 }
  ];
  const summary = AnalyticsService.calculateSummary(testAnalytics);
  console.log('  Average queue entries:', summary.avgQueueEntries); // Should be 12.5 -> 13
  console.log('  Average bookings:', summary.avgBookings); // Should be 6.5 -> 7
  console.log('  Average wait time:', summary.avgWaitTime); // Should be 22.5 -> 23
  console.log('  Average efficiency:', summary.avgEfficiency); // Should be 77.5 -> 78
};

export default AnalyticsService;
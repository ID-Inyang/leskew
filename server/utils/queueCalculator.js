// server/utils/queueCalculator.js - CORRECTED VERSION
import mongoose from 'mongoose'; // ADD THIS IMPORT
import QueueEntry from "../models/QueueEntry.js";
import Appointment from "../models/Appointment.js";
import Vendor from "../models/Vendor.js";
import MongoUtils from "./mongoUtils.js"; // ADD THIS IMPORT

/**
 * Calculate realistic wait time for a queue position
 * @param {ObjectId|string} vendorId - Vendor ID (ObjectId or string)
 * @param {Number} position - Queue position (1-based)
 * @returns {Promise<Number>} - Estimated wait time in minutes
 */
export const calculateWaitTime = async (vendorId, position) => {
  try {
    // Convert to ObjectId if needed
    const vendorObjectId = MongoUtils.toObjectId(vendorId);
    if (!vendorObjectId) {
      console.error('Invalid vendor ID in calculateWaitTime:', vendorId);
      return position * 15; // Fallback
    }
    
    // Get vendor configuration
    const vendor = await Vendor.findById(vendorObjectId);
    if (!vendor) {
      console.warn(`Vendor not found for ID: ${vendorId}`);
      return position * 15; // Fallback
    }

    const {
      maxConcurrentAppointments = 1,
      averageServiceDuration = 30,
      estimatedPerPersonWait = 15
    } = vendor;

    // METHOD 1: Simple calculation based on concurrent capacity
    const effectivePosition = Math.ceil(position / maxConcurrentAppointments);
    let waitTime = effectivePosition * averageServiceDuration;

    // METHOD 2: Check if we have recent actual data
    // FIXED: Use find() instead of findOne() for multiple documents
    const lastServedEntries = await QueueEntry.find({
      vendorId: vendorObjectId,
      status: "served",
      servedAt: { $ne: null }
    })
      .sort({ servedAt: -1 })
      .limit(5);

    if (lastServedEntries && lastServedEntries.length > 0) {
      // Calculate average actual service time from recent served customers
      let totalServiceTime = 0;
      let count = 0;

      for (const entry of lastServedEntries) {
        if (entry.servedAt && entry.joinTime) {
          const serviceTime = (entry.servedAt - entry.joinTime) / (1000 * 60); // minutes
          if (serviceTime > 0 && serviceTime < 180) { // Reasonable bounds
            totalServiceTime += serviceTime;
            count++;
          }
        }
      }

      if (count > 0) {
        const avgActualServiceTime = totalServiceTime / count;
        // Blend actual data with default (70% actual, 30% default)
        waitTime = (waitTime * 0.3) + (effectivePosition * avgActualServiceTime * 0.7);
      }
    }

    // Add buffer for uncertainty (20% more time)
    waitTime = Math.round(waitTime * 1.2);

    // Cap at reasonable maximum (4 hours)
    return Math.min(waitTime, 240);
  } catch (error) {
    console.error("Wait time calculation error:", error);
    // Fallback calculation
    return position * 15;
  }
};

/**
 * Recalculate wait times for all waiting customers
 * @param {ObjectId|string} vendorId - Vendor ID (ObjectId or string)
 */
export const recalculateAllWaitTimes = async (vendorId) => {
  try {
    // Convert to ObjectId if needed
    const vendorObjectId = MongoUtils.toObjectId(vendorId);
    if (!vendorObjectId) {
      console.error('Invalid vendor ID in recalculateAllWaitTimes:', vendorId);
      return [];
    }
    
    const waitingEntries = await QueueEntry.find({
      vendorId: vendorObjectId,
      status: "waiting"
    }).sort({ position: 1 });

    for (let i = 0; i < waitingEntries.length; i++) {
      const queueEntry = waitingEntries[i];
      const newWaitTime = await calculateWaitTime(vendorObjectId, i + 1);
      
      // Only update if significantly different (more than 2 minutes)
      if (Math.abs(queueEntry.estimatedWaitTime - newWaitTime) > 2) {
        queueEntry.estimatedWaitTime = newWaitTime;
        await queueEntry.save();
      }
    }

    return waitingEntries;
  } catch (error) {
    console.error("Recalculate wait times error:", error);
    throw error;
  }
};

/**
 * Get queue statistics for a vendor
 * @param {ObjectId|string} vendorId - Vendor ID (ObjectId or string)
 */
export const getQueueStatistics = async (vendorId) => {
  try {
    // Convert to ObjectId if needed
    const vendorObjectId = MongoUtils.toObjectId(vendorId);
    if (!vendorObjectId) {
      console.error('Invalid vendor ID in getQueueStatistics:', vendorId);
      return {
        totalWaiting: 0,
        averageWaitTime: 0,
        servedToday: 0,
        currentThroughput: 1,
        nextAvailablePosition: 1
      };
    }
    
    const vendor = await Vendor.findById(vendorObjectId);
    
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const waitingEntries = await QueueEntry.find({
      vendorId: vendorObjectId,
      status: "waiting"
    }).sort({ position: 1 });

    const servedToday = await QueueEntry.countDocuments({
      vendorId: vendorObjectId,
      status: "served",
      servedAt: { $gte: today }
    });

    const avgWaitTime = waitingEntries.length > 0 
      ? waitingEntries.reduce((sum, entry) => sum + entry.estimatedWaitTime, 0) / waitingEntries.length
      : 0;

    return {
      totalWaiting: waitingEntries.length,
      averageWaitTime: Math.round(avgWaitTime),
      servedToday,
      currentThroughput: vendor?.maxConcurrentAppointments || 1,
      nextAvailablePosition: waitingEntries.length + 1,
      vendorName: vendor?.businessName || 'Unknown'
    };
  } catch (error) {
    console.error("Queue statistics error:", error);
    throw error;
  }
};

/**
 * Get historical wait time accuracy for analytics
 * @param {ObjectId|string} vendorId - Vendor ID
 * @returns {Promise<Object>} - Accuracy metrics
 */
export const getWaitTimeAccuracy = async (vendorId) => {
  try {
    const vendorObjectId = MongoUtils.toObjectId(vendorId);
    if (!vendorObjectId) {
      return { accuracy: 0, totalComparisons: 0 };
    }
    
    // Get served entries with both estimated and actual times
    const servedEntries = await QueueEntry.find({
      vendorId: vendorObjectId,
      status: "served",
      servedAt: { $ne: null },
      joinTime: { $ne: null },
      estimatedWaitTime: { $gt: 0 }
    }).limit(50); // Last 50 served entries

    if (servedEntries.length === 0) {
      return { accuracy: 0, totalComparisons: 0 };
    }

    let totalAccuracy = 0;
    let comparisons = 0;

    for (const entry of servedEntries) {
      if (entry.servedAt && entry.joinTime) {
        const actualWait = (entry.servedAt - entry.joinTime) / (1000 * 60); // minutes
        const estimatedWait = entry.estimatedWaitTime;
        
        if (estimatedWait > 0 && actualWait > 0) {
          const accuracy = 100 - (Math.abs(actualWait - estimatedWait) / estimatedWait * 100);
          totalAccuracy += Math.max(0, accuracy); // Don't allow negative accuracy
          comparisons++;
        }
      }
    }

    const avgAccuracy = comparisons > 0 ? totalAccuracy / comparisons : 0;
    
    return {
      accuracy: Math.round(avgAccuracy),
      totalComparisons: comparisons,
      sampleSize: servedEntries.length
    };
  } catch (error) {
    console.error("Wait time accuracy error:", error);
    return { accuracy: 0, totalComparisons: 0 };
  }
};

// Remove or comment out the test code at the bottom for production
// Test function (run separately if needed)
export const testQueueCalculator = async () => {
  console.log('🧪 Testing Queue Calculator...');
  
  const testId = '507f1f77bcf86cd799439011';
  console.log('1. Is valid ObjectId?', MongoUtils.isValidObjectId(testId));
  console.log('2. Converted to ObjectId:', MongoUtils.toObjectId(testId));
  console.log('3. Same IDs equal?', MongoUtils.areIdsEqual(testId, testId));
  
  // Test calculation with mock data
  console.log('\n4. Wait time calculations:');
  console.log('   Position 1:', await calculateWaitTime(testId, 1));
  console.log('   Position 3:', await calculateWaitTime(testId, 3));
  console.log('   Position 5:', await calculateWaitTime(testId, 5));
  
  console.log('✅ Queue calculator tests completed');
};

// Uncomment to run tests:
// testQueueCalculator().catch(console.error);
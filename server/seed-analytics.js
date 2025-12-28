// server/seed-analytics.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AnalyticsService from './services/analyticsService.js';
import Vendor from './models/Vendor.js';

dotenv.config();

const seedHistoricalAnalytics = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const vendors = await Vendor.find({ isApproved: true });
    console.log(`Seeding historical analytics for ${vendors.length} vendors...`);

    // Generate 30 days of historical data for each vendor
    for (const vendor of vendors) {
      console.log(`\nVendor: ${vendor.businessName}`);
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        try {
          await AnalyticsService.recordDailyAnalytics(vendor._id, date);
          console.log(`  Day ${i}: ${date.toISOString().split('T')[0]}`);
        } catch (error) {
          console.log(`   Day ${i}: Skipped (no data)`);
        }
      }
    }

    console.log('\nHistorical analytics seeding completed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedHistoricalAnalytics();
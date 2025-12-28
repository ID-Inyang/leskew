// server/jobs/analyticsCron.js
import cron from 'node-cron';
import AnalyticsService from '../services/analyticsService.js';

// Run every day at 11:59 PM
const analyticsCronJob = cron.schedule('59 23 * * *', async () => {
  console.log('Running daily analytics collection...');
  try {
    await AnalyticsService.recordAllVendorsAnalytics();
    console.log('Daily analytics collection completed');
  } catch (error) {
    console.error('Daily analytics collection failed:', error);
  }
});

// Start the cron job
analyticsCronJob.start();

export default analyticsCronJob;
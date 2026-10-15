import cron from 'node-cron';
import { updateCoinPrices } from './services/coinGeckoService';
import { fetchNewsArticles } from './services/newsService';

export function startScheduler(): void {
  console.log('⏰ Starting Task Scheduler (node-cron)...');

  // Task A: Run price ingestion and alert checks every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running scheduled Task A: CoinGecko price update...');
    try {
      await updateCoinPrices();
    } catch (error) {
      console.error('❌ Error in scheduled Task A (updateCoinPrices):', error);
    }
  });

  // Task B: Run RSS news ingestion and Gemini analysis every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ Running scheduled Task B: RSS news feed ingestion...');
    try {
      await fetchNewsArticles();
    } catch (error) {
      console.error('❌ Error in scheduled Task B (fetchNewsArticles):', error);
    }
  });

  console.log('✅ Background tasks successfully scheduled.');
}

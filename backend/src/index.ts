import dotenv from 'dotenv';
dotenv.config();

import { app, prisma } from './app';
import { updateCoinPrices } from './services/coinGeckoService';
import { fetchNewsArticles } from './services/newsService';
import { startScheduler } from './scheduler';
import { startTelegramPolling } from './services/telegramBotService';

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);

  console.log('🏁 Initializing scheduled ingestion services...');
  updateCoinPrices();
  fetchNewsArticles();

  startScheduler();

  startTelegramPolling();
});

const shutdown = async () => {
  console.log('🏁 Shutting down gracefully...');
  server.close(async () => {
    console.log('🔌 HTTP server closed.');
    await prisma.$disconnect();
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⚠️ Forcefully shutting down (timeout)...');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

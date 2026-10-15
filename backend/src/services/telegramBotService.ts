import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let lastUpdateId = 0;

export async function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('token_here') || token === '') {
    console.warn('⚠️ Telegram bot token is not configured in .env. Skipping telegram polling.');
    return;
  }

  console.log('🤖 Telegram Bot Polling started...');

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId}&timeout=30`;
      const response = await axios.get(url);
      
      const updates = response.data.result;
      
      if (updates && updates.length > 0) {
        for (const update of updates) {
          lastUpdateId = update.update_id + 1;
          
          if (update.message) {
            const chatId = String(update.message.chat.id);
            const username = update.message.from?.username;
            const firstName = update.message.from?.first_name || '';
            const text = update.message.text || '';
            
            console.log(`📩 [Telegram Bot] Received message from chat ${chatId}: "${text}" by @${username || 'N/A'} (${firstName})`);
            
            if (username) {
              // Sanitize username to ensure no '@' symbol is included when searching
              const sanitizedUsername = username.replace(/^@/, '').trim().toLowerCase();
              
              // Find users that have this telegramUsername set, and haven't linked their chatId yet
              // Or just update any user with this username
              const users = await prisma.user.findMany({
                where: {
                  telegramUsername: {
                    equals: sanitizedUsername,
                    mode: 'insensitive' // handle case-insensitivity
                  }
                }
              });

              for (const user of users) {
                let isNewLink = false;
                if (user.telegramChatId !== chatId) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { telegramChatId: chatId }
                  });
                  console.log(`✅ Linked Telegram Chat ID ${chatId} for user ${user.email} (@${username})`);
                  isNewLink = true;
                }
                
                // Always send the welcome photo and text if it's a new link OR if the user sent /start
                if (isNewLink || text === '/start') {
                  // Determine welcome message language based on user profile settings
                  let caption = `⚡ <b>Welcome to CryptoSynapse!</b>\n\nYour profile has been successfully linked to Telegram. From now on, you will receive real-time price alerts and analysis updates here!`;
                  if (user.language === 'pl') {
                    caption = `⚡ <b>Witaj w CryptoSynapse!</b>\n\nTwój profil został pomyślnie powiązany z Telegramem. Od teraz będziesz otrzymywać tutaj powiadomienia o alertach cenowych i analizach!`;
                  } else if (user.language === 'uk') {
                    caption = `⚡ <b>Ласкаво просимо до CryptoSynapse!</b>\n\nВаш профіль успішно підключено до Telegram. Відтепер ви отримуватимете тут сповіщення про цінові алерти та аналітику!`;
                  }

                  try {
                    await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, {
                      chat_id: chatId,
                      photo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
                      caption: caption,
                      parse_mode: 'HTML'
                    });
                  } catch (e) {
                    console.error('Failed to send welcome photo message', e);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error in Telegram Polling:', error.message);
    } finally {
      // Poll again after a short delay
      setTimeout(poll, 3000);
    }
  };

  poll();
}

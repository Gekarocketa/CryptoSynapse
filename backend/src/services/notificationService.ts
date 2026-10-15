import axios from 'axios';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper to retry a promise-returning function with a delay on failure.
 */
async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    console.log(`⚠️ Network request failed. Retrying in ${delayMs}ms... (${retries - 1} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retry(fn, retries - 1, delayMs);
  }
}

/**
 * Sends a Telegram message to a specific Chat ID.
 */
export async function sendTelegramAlert(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('token_here') || token === '') {
    console.warn('⚠️ Telegram bot token is not configured in .env. Notification simulated in console:');
    console.log(`[Simulated Telegram to ${chatId}]: ${message.replace(/<[^>]*>/g, '')}`);
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  
  const executeSend = async () => {
    await axios.post(url, {
      chat_id: chatId,
      photo: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=600&auto=format&fit=crop',
      caption: message,
      parse_mode: 'HTML',
    });
  };

  try {
    await retry(executeSend, 3, 2000);
    console.log(`✅ Telegram alert photo successfully sent to chat: ${chatId}`);
  } catch (error: any) {
    console.error(`❌ Failed to send Telegram alert to ${chatId} after retries:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Sends an email notification using Nodemailer SMTP settings.
 */
export async function sendEmailAlert(toEmail: string, subject: string, htmlContent: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !portStr || !user || !pass || host.includes('smtp.mailtrap') && user.includes('your_')) {
    console.warn('⚠️ SMTP settings are not configured in .env. Notification simulated in console:');
    console.log(`[Simulated Email to ${toEmail}] Subject: ${subject}`);
    return;
  }

  const port = parseInt(portStr, 10);
  const secure = port === 465;

  const executeSend = async () => {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"CryptoSynapse Alerts" <${user}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    });
  };

  try {
    await retry(executeSend, 3, 2000);
    console.log(`✅ Email alert successfully sent to: ${toEmail}`);
  } catch (error: any) {
    console.error(`❌ Failed to send Email alert to ${toEmail} after retries:`, error.message || error);
    throw error;
  }
}

/**
 * Helper to generate a beautiful responsive HTML email layout with localized text
 */
function getEmailHtml(
  coinName: string,
  targetPrice: number,
  currentPrice: number,
  greeting: string,
  intro: string,
  coinLabel: string,
  targetLabel: string,
  currentLabel: string,
  footer: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b1329;
          color: #f8fafc;
          margin: 0;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }
        .header {
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
          margin: 0;
        }
        .content {
          line-height: 1.6;
          font-size: 16px;
          color: #cbd5e1;
        }
        .alert-details {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .detail-row:last-child {
          margin-bottom: 0;
        }
        .label {
          font-weight: 600;
          color: #94a3b8;
          }
        .value {
          font-weight: bold;
          color: #ffffff;
        }
        .highlight {
          color: #10b981;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">🔔 CryptoSynapse</h1>
        </div>
        <div class="content">
          <p>${greeting}</p>
          <p>${intro}</p>
          
          <div class="alert-details">
            <div class="detail-row">
              <span class="label">${coinLabel}</span>
              <span class="value">${coinName}</span>
            </div>
            <div class="detail-row">
              <span class="label">${targetLabel}</span>
              <span class="value">$${targetPrice.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">${currentLabel}</span>
              <span class="value highlight">$${currentPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>${footer}</p>
          <p>&copy; 2026 CryptoSynapse. Wszelkie prawa zastrzeżone.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Evaluates user settings and dispatches localized alerts via the chosen channels.
 * Uses fallback translations to ensure notifications are delivered in the user's preferred language.
 * Returns true if all dispatched notifications succeeded, false if any failed.
 * 
 * @param {Object} user - The user object containing notification preferences and language.
 * @param {string} coinName - The name of the asset.
 * @param {number} targetPrice - The alert threshold price.
 * @param {number} currentPrice - The current market price.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
// TODO: Consider moving this to a message broker (e.g., RabbitMQ) or adding a dead-letter queue for failed emails.
export async function triggerAlertNotifications(
  user: { 
    email: string; 
    telegramChatId?: string | null; 
    notificationEmail?: string | null;
    telegramAlertsActive?: boolean;
    emailAlertsActive?: boolean;
    language?: string;
  },
  coinName: string,
  targetPrice: number,
  currentPrice: number
): Promise<boolean> {
  const isUp = currentPrice >= targetPrice;
  const lang = user.language || 'en';

  let telegramMessage = '';
  let emailSubject = '';
  let emailHtml = '';

  if (lang === 'pl') {
    const direction = isUp ? 'wzrosła do/powyżej' : 'spadła do/poniżej';
    telegramMessage = `🔔 <b>CryptoSynapse Alert Cenowy!</b>\n\n` +
      `Kryptowaluta: <b>${coinName}</b>\n` +
      `Cena docelowa: <b>$${targetPrice.toLocaleString()}</b>\n` +
      `Aktualna cena: <b>$${currentPrice.toLocaleString()}</b> (cena ${direction} celu).`;
    emailSubject = `🔔 CryptoSynapse Alert Cenowy: ${coinName} osiągnął $${targetPrice}`;
    emailHtml = getEmailHtml(coinName, targetPrice, currentPrice, 'Witaj,', 'Twój alert cenowy został aktywowany! Kurs kryptowaluty przekroczył wyznaczoną wartość progową.', 'Kryptowaluta:', 'Cena docelowa:', 'Aktualna cena:', 'To jest automatyczna wiadomość wysłana przez CryptoSynapse.');
  } else if (lang === 'uk') {
    const direction = isUp ? 'піднялася до/вище' : 'впала до/нижче';
    telegramMessage = `🔔 <b>CryptoSynapse Ціновий Алерт!</b>\n\n` +
      `Криптовалюта: <b>${coinName}</b>\n` +
      `Цільова ціна: <b>$${targetPrice.toLocaleString()}</b>\n` +
      `Поточна ціна: <b>$${currentPrice.toLocaleString()}</b> (ціна ${direction} цілі).`;
    emailSubject = `🔔 CryptoSynapse Ціновий Алерт: ${coinName} досяг $${targetPrice}`;
    emailHtml = getEmailHtml(coinName, targetPrice, currentPrice, 'Вітаємо,', 'Ваш ціновий алерт був активований! Курс криптовалюти перетнув встановлене порогове значення.', 'Криптовалюта:', 'Цільова ціна:', 'Поточна ціна:', 'Це автоматичне повідомлення, надіслане CryptoSynapse.');
  } else {
    const direction = isUp ? 'rose to/above' : 'dropped to/below';
    telegramMessage = `🔔 <b>CryptoSynapse Price Alert!</b>\n\n` +
      `Asset: <b>${coinName}</b>\n` +
      `Target Price: <b>$${targetPrice.toLocaleString()}</b>\n` +
      `Current Price: <b>$${currentPrice.toLocaleString()}</b> (price went ${direction} target).`;
    emailSubject = `🔔 CryptoSynapse Price Alert: ${coinName} reached $${targetPrice}`;
    emailHtml = getEmailHtml(coinName, targetPrice, currentPrice, 'Hello,', 'Your price alert has been triggered! The cryptocurrency course crossed your target threshold.', 'Asset:', 'Target Price:', 'Current Price:', 'This is an automated message sent by CryptoSynapse.');
  }

  const promises: Promise<void>[] = [];

  if (user.telegramChatId && user.telegramAlertsActive !== false) {
    promises.push(sendTelegramAlert(user.telegramChatId, telegramMessage));
  }

  if (user.notificationEmail && user.emailAlertsActive !== false) {
    promises.push(sendEmailAlert(user.notificationEmail, emailSubject, emailHtml));
  }

  if (promises.length === 0) {
    console.log(`ℹ️ No custom notification settings for user ${user.email}. Skip sending alert alerts.`);
    return true;
  }

  try {
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notifications for user ${user.email} on one or more channels.`);
    return false;
  }
}

/**
 * Executes a notification dispatch with automatic retry logic.
 * Updates the Alert entity's deliveryStatus to 'DELIVERED' on success,
 * or 'FAILED' if all retry attempts are exhausted.
 *
 * @param {string} alertId - ID of the target alert in the database.
 * @param {() => Promise<void>} sendFn - The asynchronous function that sends the notification.
 * @param {number} maxRetries - Maximum number of attempts (default 3).
 * @param {number} delayMs - Delay between attempts in milliseconds (default 50).
 * @returns {Promise<boolean>} True if delivered, false if all retries failed.
 */
export async function sendNotificationWithRetry(
  alertId: string,
  sendFn: () => Promise<void>,
  maxRetries = 3,
  delayMs = 50
): Promise<boolean> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      await sendFn();
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          deliveryStatus: 'DELIVERED',
          isTriggered: true,
        },
      });
      return true;
    } catch (error) {
      if (attempt >= maxRetries) {
        await prisma.alert.update({
          where: { id: alertId },
          data: {
            deliveryStatus: 'FAILED',
            isTriggered: true,
          },
        });
        return false;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}


import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { triggerAlertNotifications } from './notificationService';

const prisma = new PrismaClient();

interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

/**
 * Fetches the current spot price and 24h change for a single coin.
 * Uses Binance -> Coinbase -> CoinGecko fallback.
 */
export async function fetchSinglePrice(symbol: string, id: string): Promise<{ price: number; change24h: number }> {
  const normSym = symbol.toUpperCase().trim();
  // 1. Try Binance USDT pair
  try {
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${normSym}USDT`, { timeout: 4000 });
    if (res.data?.lastPrice) {
      return {
        price: parseFloat(res.data.lastPrice),
        change24h: parseFloat(res.data.priceChangePercent) || 0.0,
      };
    }
  } catch {}

  // 1b. Try Binance FDUSD or USDC pair
  try {
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${normSym}USDC`, { timeout: 4000 });
    if (res.data?.lastPrice) {
      return {
        price: parseFloat(res.data.lastPrice),
        change24h: parseFloat(res.data.priceChangePercent) || 0.0,
      };
    }
  } catch {}

  // 2. Try Coinbase Spot Price
  try {
    const res = await axios.get(`https://api.coinbase.com/v2/prices/${normSym}-USD/spot`, { timeout: 4000 });
    if (res.data?.data?.amount) {
      return {
        price: parseFloat(res.data.data.amount),
        change24h: 0.0,
      };
    }
  } catch {}

  // 3. Try CoinGecko as fallback
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id.toLowerCase()}&vs_currencies=usd&include_24hr_change=true`;
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 4000
    });
    if (res.data?.[id]) {
      return {
        price: res.data[id].usd || 0.0,
        change24h: res.data[id].usd_24h_change || 0.0,
      };
    }
  } catch {}

  return { price: 0, change24h: 0 };
}

/**
 * Synchronizes local cryptocurrency assets with real-time market data (Binance + Coinbase + CoinGecko fallback).
 * Iterates over tracked assets, updates prices and 24h change percentages, and evaluates
 * all active user alerts to dispatch cross-threshold notifications.
 */
export async function updateCoinPrices(): Promise<void> {
  console.log('🔄 Initiating market price update...');
  try {
    const coins = await prisma.coin.findMany();
    if (coins.length === 0) {
      console.log('ℹ️ No tracked assets found in database. Skip price update.');
      return;
    }

    // Attempt to batch fetch 24h tickers from Binance for ultra-fast update
    let binanceMap = new Map<string, any>();
    try {
      const bRes = await axios.get('https://api.binance.com/api/v3/ticker/24hr', { timeout: 5000 });
      if (Array.isArray(bRes.data)) {
        binanceMap = new Map(bRes.data.map((t: any) => [t.symbol, t]));
      }
    } catch (e: any) {
      console.warn('⚠️ Binance batch ticker fetch failed, falling back to per-coin lookup:', e.message || e);
    }

    for (const coin of coins) {
      const normSym = coin.symbol.toUpperCase().trim();
      let price = 0;
      let change24h = 0;

      const binanceTicker = binanceMap.get(normSym + 'USDT') || binanceMap.get(normSym + 'USDC');
      if (binanceTicker) {
        price = parseFloat(binanceTicker.lastPrice);
        change24h = parseFloat(binanceTicker.priceChangePercent) || 0.0;
      } else {
        const fetched = await fetchSinglePrice(coin.symbol, coin.id);
        price = fetched.price;
        change24h = fetched.change24h;
      }

      if (price > 0) {
        const oldPrice = coin.currentPrice || 0;
        await prisma.coin.update({
          where: { id: coin.id },
          data: {
            currentPrice: price,
            priceChange24h: change24h,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Updated price for ${coin.name} (${normSym}): $${price} (${change24h.toFixed(2)}%)`);

        // Check active alerts
        const activeAlerts = await prisma.alert.findMany({
          where: {
            coinId: coin.id,
            isTriggered: false
          },
          include: {
            user: true,
            coin: true
          }
        });

        for (const alert of activeAlerts) {
          const target = alert.targetPrice;
          let triggered = false;

          if (oldPrice > 0) {
            const roseAbove = oldPrice < target && price >= target;
            const droppedBelow = oldPrice > target && price <= target;
            if (roseAbove || droppedBelow) {
              triggered = true;
            }
          } else {
            if (price === target) {
              triggered = true;
            }
          }

          if (triggered) {
            console.log(`🔔 ALERT TRIGGERED: Alert [${alert.id}] for ${coin.id} crossed target price of $${target} (Current: $${price})`);
            let success = false;
            try {
              success = await triggerAlertNotifications(
                alert.user,
                alert.coin.name,
                alert.targetPrice,
                price
              );
            } catch (notiError) {
              console.error(`❌ Failed to send notifications for alert ${alert.id}:`, notiError);
            }

            await prisma.alert.update({
              where: { id: alert.id },
              data: {
                isTriggered: true,
                deliveryStatus: success ? 'SENT' : 'FAILED'
              }
            });
          }
        }
      } else {
        console.warn(`⚠️ Warning: No price data returned for ${coin.id} (${normSym})`);
      }
    }
    console.log('✨ Market price update completed.');
  } catch (error: any) {
    console.error('❌ Error updating prices:', error.message || error);
  }
}

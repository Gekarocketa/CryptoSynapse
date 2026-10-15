import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { updateCoinPrices, fetchSinglePrice } from '../services/coinGeckoService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/coins
router.get('/', async (req: Request, res: Response) => {
  try {
    const coins = await prisma.coin.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(coins);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve coins',
      details: error.message || String(error)
    });
  }
});

// POST /api/coins/sync
router.post('/sync', async (req: Request, res: Response) => {
  try {
    await updateCoinPrices();
    const coins = await prisma.coin.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(coins);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to sync prices with CoinGecko',
      details: error.message || String(error)
    });
  }
});

// GET /api/coins/search
router.get('/search', async (req: Request, res: Response) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(String(query))}`;
    const cgRes = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoSynapse/1.0.0'
      },
      timeout: 5000
    });

    const coinsList = (cgRes.data?.coins || []).slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol
    }));

    res.json(coinsList);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to search coins on CoinGecko',
      details: error.message || String(error)
    });
  }
});

// POST /api/coins
router.post('/', async (req: Request, res: Response) => {
  const { id, name, symbol } = req.body;
  if (!id || !name || !symbol) {
    return res.status(400).json({ error: 'Coin id, name, and symbol are required.' });
  }

  const normalizedId = id.toLowerCase().trim();
  const normalizedSymbol = symbol.toLowerCase().trim();

  try {
    // Check if already exists
    const existing = await prisma.coin.findUnique({
      where: { id: normalizedId }
    });

    if (existing) {
      return res.status(400).json({ error: `Coin with ID "${normalizedId}" already exists.` });
    }

    // Fetch initial price and 24h change (Binance -> Coinbase -> CoinGecko fallback)
    let price = 0.0;
    let change24h = 0.0;
    try {
      const fetched = await fetchSinglePrice(normalizedSymbol, normalizedId);
      price = fetched.price;
      change24h = fetched.change24h;
    } catch (err: any) {
      console.warn(`⚠️ Failed to fetch initial price for ${normalizedId}:`, err.message || err);
    }

    const coin = await prisma.coin.create({
      data: {
        id: normalizedId,
        name: name.trim(),
        symbol: normalizedSymbol,
        currentPrice: price,
        priceChange24h: change24h
      }
    });

    res.status(201).json(coin);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create new coin',
      details: error.message || String(error)
    });
  }
});

// DELETE /api/coins/:id
router.delete('/:id', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  try {
    const coin = await prisma.coin.findUnique({
      where: { id }
    });

    if (!coin) {
      return res.status(404).json({ error: 'Coin not found' });
    }

    await prisma.coin.delete({
      where: { id }
    });

    res.json({ message: `Coin ${coin.name} (${coin.symbol.toUpperCase()}) deleted successfully` });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete coin',
      details: error.message || String(error)
    });
  }
});

export default router;

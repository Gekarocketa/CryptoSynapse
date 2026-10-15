import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// POST /api/alerts - Create alert
router.post('/', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  const { coinId, targetPrice } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  if (!coinId || targetPrice === undefined) {
    return res.status(400).json({ error: 'coinId and targetPrice are required' });
  }

  const parsedPrice = parseFloat(targetPrice);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'targetPrice must be a positive number' });
  }

  try {
    // Check if coin exists
    const coin = await prisma.coin.findUnique({
      where: { id: coinId }
    });

    if (!coin) {
      return res.status(404).json({ error: `Coin with ID ${coinId} not found` });
    }

    const alert = await prisma.alert.create({
      data: {
        userId: req.user.id,
        coinId: coinId,
        targetPrice: parsedPrice,
        isTriggered: false
      },
      include: {
        coin: {
          select: {
            id: true,
            symbol: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(alert);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create alert',
      details: error.message || String(error)
    });
  }
});

// GET /api/alerts - Get all user's alerts
router.get('/', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        coin: {
          select: {
            id: true,
            symbol: true,
            name: true
          }
        }
      }
    });

    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      details: error.message || String(error)
    });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  try {
    // Find alert first to check ownership
    const alert = await prisma.alert.findUnique({
      where: { id }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this alert' });
    }

    await prisma.alert.delete({
      where: { id }
    });

    res.json({ message: 'Alert deleted successfully' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete alert',
      details: error.message || String(error)
    });
  }
});

export default router;

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'cryptosynapse_jwt_secret_key_2026';

// Helper to sign JWT
const signToken = (id: string, email: string) => {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      }
    });

    const token = signToken(user.id, user.email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Registration failed',
      details: error.message || String(error)
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Login failed',
      details: error.message || String(error)
    });
  }
});

// GET /api/auth/me (Protected)
router.get('/me', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        telegramUsername: true,
        telegramChatId: true,
        notificationEmail: true,
        telegramAlertsActive: true,
        emailAlertsActive: true,
        language: true,
        showSentimentChart: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve user profile',
      details: error.message || String(error)
    });
  }
});

// PUT /api/auth/profile (Protected)
router.put('/profile', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User payload missing' });
  }

  const { telegramUsername, notificationEmail, telegramAlertsActive, emailAlertsActive, language, showSentimentChart } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        telegramUsername: telegramUsername !== undefined ? telegramUsername : undefined,
        notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
        telegramAlertsActive: telegramAlertsActive !== undefined ? telegramAlertsActive : undefined,
        emailAlertsActive: emailAlertsActive !== undefined ? emailAlertsActive : undefined,
        language: language !== undefined ? language : undefined,
        showSentimentChart: showSentimentChart !== undefined ? showSentimentChart : undefined,
      },
      select: {
        id: true,
        email: true,
        telegramUsername: true,
        telegramChatId: true,
        notificationEmail: true,
        telegramAlertsActive: true,
        emailAlertsActive: true,
        language: true,
        showSentimentChart: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update profile settings',
      details: error.message || String(error)
    });
  }
});

export default router;

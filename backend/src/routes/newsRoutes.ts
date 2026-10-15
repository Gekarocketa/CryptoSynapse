import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translateText, expandArticleContent, generateAiRecommendations } from '../services/geminiService';
import { deepResearchNews } from '../services/newsService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/news
router.get('/', async (req: Request, res: Response) => {
  const { filter } = req.query;
  try {
    let whereClause: any = {};
    if (filter === 'watchlist') {
      whereClause.coinId = { not: null };
    } else if (filter && filter !== 'all') {
      whereClause.coinId = String(filter);
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: 50,
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
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve news articles',
      details: error.message || String(error)
    });
  }
});

// POST /api/news/translate
router.post('/translate', async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Text and targetLanguage are required.' });
  }

  try {
    const translated = await translateText(text, targetLanguage);
    res.json({ translatedText: translated });
  } catch (error: any) {
    res.status(500).json({
      error: 'Translation failed',
      details: error.message || String(error)
    });
  }
});

// POST /api/news/:id/expand
router.post('/:id/expand', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language } = req.body;

  if (!language) {
    return res.status(400).json({ error: 'Language is required.' });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Return cached expanded content if it exists (saves Gemini API quota)
    if (article.expandedContent) {
      console.log(`📦 Returning cached expanded content for article: "${article.title}"`);
      res.json({ expandedText: article.expandedContent });
      return;
    }

    // Call Gemini to generate new expanded content
    console.log(`🤖 Calling Gemini to expand article: "${article.title}"`);
    const expanded = await expandArticleContent(article.title, article.content, language);

    // Cache the result in the database for future requests
    await prisma.article.update({
      where: { id },
      data: { expandedContent: expanded }
    });

    res.json({ expandedText: expanded });
  } catch (error: any) {
    res.status(500).json({
      error: 'Context expansion failed',
      details: error.message || String(error)
    });
  }
});

// POST /api/news/deep-research
router.post('/deep-research', async (req: Request, res: Response) => {
  const { coinId, recency } = req.body;
  try {
    const articles = await deepResearchNews(coinId || null, recency || 'all');
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({
      error: 'Deep Research failed',
      details: error.message || String(error)
    });
  }
});

// POST /api/news/ai-insights
router.post('/ai-insights', async (req: Request, res: Response) => {
  const { filter, language } = req.body;
  if (!language) {
    return res.status(400).json({ error: 'Language is required.' });
  }

  try {
    let whereClause: any = {};
    if (filter === 'watchlist') {
      whereClause.coinId = { not: null };
    } else if (filter && filter !== 'all') {
      whereClause.coinId = String(filter);
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        title: true,
        summary: true,
        sentiment: true
      }
    });

    if (articles.length === 0) {
      const emptyMsg = language === 'pl'
        ? 'Brak wystarczającej ilości artykułów w wybranym filtrze do wygenerowania rekomendacji AI.'
        : language === 'uk'
        ? 'Недостатньо статей у вибраному фільтрі для генерації рекомендацій AI.'
        : 'Not enough news articles matching the selected filter to generate AI recommendations.';
      return res.json({ insights: emptyMsg });
    }

    const insights = await generateAiRecommendations(articles, language);
    res.json({ insights });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to generate AI recommendations',
      details: error.message || String(error)
    });
  }
});

export default router;

import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';
import { analyzeArticle } from './geminiService';

const prisma = new PrismaClient();
const parser = new Parser();

// Broad list of crypto/blockchain keywords for relevance filtering
const CRYPTO_KEYWORDS = [
  // Core terms
  'crypto', 'cryptocurrency', 'blockchain', 'bitcoin', 'ethereum', 'altcoin',
  'defi', 'nft', 'token', 'coin', 'wallet', 'exchange', 'dex', 'cefi',
  // Technology
  'smart contract', 'solidity', 'web3', 'layer 2', 'layer2', 'l2', 'zk-rollup',
  'proof of work', 'proof of stake', 'consensus', 'hash rate', 'hashrate',
  'mining', 'staking', 'validator', 'node', 'mainnet', 'testnet', 'fork', 'hardfork',
  'airdrop', 'dao', 'dapp', 'protocol', 'bridge', 'liquidity', 'yield',
  // Market
  'btc', 'eth', 'satoshi', 'altseason', 'bull run', 'bear market', 'fud', 'fomo',
  'market cap', 'trading pair', 'spot trading', 'futures', 'derivatives', 'leverage',
  'long position', 'short position', 'whale', 'pump', 'dump', 'rekt',
  // Ecosystem
  'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin', 'uniswap',
  'opensea', 'metamask', 'ledger', 'trezor', 'cold wallet', 'hot wallet',
  'sec', 'cftc', 'etf', 'regulation', 'regulatory',
  // Specific coins
  'monero', 'xmr', 'solana', 'sol', 'cardano', 'ada', 'polkadot', 'dot',
  'avalanche', 'avax', 'chainlink', 'link', 'litecoin', 'ltc', 'ripple', 'xrp',
  'dogecoin', 'doge', 'shiba', 'matic', 'polygon', 'arbitrum', 'optimism',
];

/**
 * Check whether an article (title + content) is actually crypto-related.
 * Also accepts coinName and coinSymbol to include coin-specific matches.
 */
function isCryptoRelevant(
  title: string,
  content: string,
  coinName?: string,
  coinSymbol?: string
): boolean {
  const haystack = `${title} ${content}`.toLowerCase();

  // If the article mentions the specific coin we searched for → always relevant
  if (coinName && haystack.includes(coinName.toLowerCase())) return true;
  if (coinSymbol && haystack.includes(coinSymbol.toLowerCase())) return true;

  // Check against broad keyword list (at least 1 match required)
  return CRYPTO_KEYWORDS.some(keyword => haystack.includes(keyword));
}


/**
 * Ingests the latest cryptocurrency news from CoinDesk RSS.
 * Parses the feed, evaluates relevance to tracked assets, and leverages the Gemini AI service
 * to generate localized summaries and market sentiment scores before persisting them to the database.
 * 
 * @returns {Promise<void>} Resolves when the batch of articles has been successfully ingested.
 */
export async function fetchNewsArticles(): Promise<void> {
  console.log('📰 Initiating RSS news articles ingest...');
  try {
    const feedUrl = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    const feed = await parser.parseURL(feedUrl);

    if (!feed.items || feed.items.length === 0) {
      console.warn('⚠️ Warning: No feed items retrieved from RSS source');
      return;
    }

    // Query active database coins for dynamic matching
    const dbCoins = await prisma.coin.findMany({
      select: {
        id: true,
        symbol: true,
        name: true
      }
    });

    // Limit to latest 10 items to prevent overload
    const itemsToProcess = feed.items.slice(0, 10);
    let importedCount = 0;

    for (const item of itemsToProcess) {
      if (!item.link || !item.title) {
        continue;
      }

      const existing = await prisma.article.findFirst({
        where: { url: item.link }
      });

      if (existing) {
        continue;
      }

      const titleLower = item.title.toLowerCase();
      const contentLower = (item.contentSnippet || item.content || '').toLowerCase();
      let matchedCoinId: string | null = null;

      // Scan dynamic coins database
      for (const coin of dbCoins) {
        // Build regexes for name and symbol matching word boundaries
        const nameRegex = new RegExp(`\\b${coin.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        const symbolRegex = new RegExp(`\\b${coin.symbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        
        if (
          nameRegex.test(titleLower) || 
          symbolRegex.test(titleLower) || 
          nameRegex.test(contentLower) || 
          symbolRegex.test(contentLower)
        ) {
          matchedCoinId = coin.id;
          break; // Stop at first match
        }
      }

      // Parse published date or fallback to now
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

      const content = item.contentSnippet || item.content || '';
      
      let summary = content.length > 150 ? `${content.substring(0, 147)}...` : content;
      if (!summary) summary = 'No description provided.';
      let sentiment: 'STRONG_POSITIVE' | 'MODERATE_POSITIVE' | 'NEUTRAL' | 'MODERATE_NEGATIVE' | 'STRONG_NEGATIVE' = 'NEUTRAL';

      try {
        console.log(`🤖 Requesting Gemini AI analysis for: "${item.title}"`);
        const analysis = await analyzeArticle(item.title, content);
        summary = analysis.summary;
        sentiment = analysis.sentiment;
        console.log(`✨ Gemini analysis success: [Sentiment: ${sentiment}] [Summary: ${summary}]`);
      } catch (err: any) {
        console.error(`⚠️ Gemini analysis failed for "${item.title}". Using fallback (NEUTRAL). Error:`, err.message || err);
      }

      await prisma.article.create({
        data: {
          title: item.title,
          content: content,
          url: item.link,
          summary: summary,
          sentiment: sentiment,
          publishedAt: publishedAt,
          coinId: matchedCoinId // could be null
        }
      });
      importedCount++;
    }

    console.log(`✅ RSS news articles ingest completed. Imported ${importedCount} new articles.`);
  } catch (error: any) {
    console.error('❌ Error fetching RSS articles:', error.message || error);
    // Silent fail to prevent server crashes
  }
}

/**
 * Executes an on-demand, deep research query against Google News RSS.
 * Filters articles using a strict crypto-relevance gate and runs them through AI analysis to provide
 * contextualized intelligence for the requested asset or general market.
 * 
 * @param {string | null} coinId - Optional UUID of the specific coin to research.
 * @param {string} recency - Timeframe filter (e.g., '24h', '7d', '30d').
 * @returns {Promise<any[]>} An array of processed article records.
 */
export async function deepResearchNews(coinId: string | null, recency: string): Promise<any[]> {
  console.log(`🔍 Deep Research initiated. Coin ID: ${coinId}, Recency: ${recency}`);
  
  let coinName = '';
  let coinSymbol = '';
  let coinDbId: string | null = null;
  
  if (coinId) {
    const coin = await prisma.coin.findUnique({
      where: { id: coinId }
    });
    if (coin) {
      coinName = coin.name;
      coinSymbol = coin.symbol;
      coinDbId = coin.id;
    }
  }

  let query = '';
  if (coinName && coinSymbol) {
    query = `"${coinName}" OR "${coinSymbol}"`;
  } else if (coinName) {
    query = `"${coinName}"`;
  } else {
    query = 'cryptocurrency';
  }

  if (recency === '24h') {
    query += ' when:1d';
  } else if (recency === '7d') {
    query += ' when:7d';
  } else if (recency === '30d') {
    query += ' when:30d';
  }

  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  console.log(`🌐 Fetching Google News RSS from: ${feedUrl}`);
  
  const feed = await parser.parseURL(feedUrl);
  if (!feed.items || feed.items.length === 0) {
    console.warn(`⚠️ Deep Research returned no articles for query: ${query}`);
    return [];
  }

  // Limit items to process to avoid overloading Gemini API
  const itemsToProcess = feed.items.slice(0, 5);
  const newArticles: any[] = [];

  for (const item of itemsToProcess) {
    if (!item.link || !item.title) continue;

    let existing = await prisma.article.findFirst({
      where: { url: item.link },
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

    if (existing) {
      if (coinDbId && !existing.coinId) {
        existing = await prisma.article.update({
          where: { id: existing.id },
          data: { coinId: coinDbId },
          include: {
            coin: {
              select: {
                id: true,
                symbol: true,
                name: true
              }
            }
          }
        }) as any;
      }
      newArticles.push(existing);
      continue;
    }

    const content = item.contentSnippet || item.content || '';

    // ── Crypto-relevance gate ──────────────────────────────────────────────
    // Skip articles that are clearly not about crypto/blockchain.
    // This prevents niche-coin deep searches from pulling in irrelevant content.
    if (!isCryptoRelevant(item.title, content, coinName, coinSymbol)) {
      console.log(`🚫 Skipping non-crypto article: "${item.title}"`);
      continue;
    }
    // ──────────────────────────────────────────────────────────────────────

    let summary = content.length > 150 ? `${content.substring(0, 147)}...` : content;
    if (!summary) summary = 'No description provided.';
    let sentiment: 'STRONG_POSITIVE' | 'MODERATE_POSITIVE' | 'NEUTRAL' | 'MODERATE_NEGATIVE' | 'STRONG_NEGATIVE' = 'NEUTRAL';

    try {
      console.log(`🤖 Requesting Gemini AI analysis for Deep Research item: "${item.title}"`);
      const analysis = await analyzeArticle(item.title, content);
      summary = analysis.summary;
      sentiment = analysis.sentiment;
    } catch (err: any) {
      console.error('⚠️ Deep Research Gemini analysis failed:', err.message || err);
    }

    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

    const createdArticle = await prisma.article.create({
      data: {
        title: item.title,
        content: content,
        url: item.link,
        summary: summary,
        sentiment: sentiment,
        publishedAt: publishedAt,
        coinId: coinDbId
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

    newArticles.push(createdArticle);
  }

  return newArticles;
}

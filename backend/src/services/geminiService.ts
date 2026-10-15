import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY || 'default_gemini_api_key';
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

// Model priority list: cheapest first, most capable last
// On 429 quota errors, the next model in line is tried automatically
const MODEL_FALLBACK_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

/**
 * Check if an error is a 429 quota/rate-limit error from the Gemini API
 */
function isQuotaError(err: any): boolean {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  return msg.includes('429') || msg.includes('quota') || msg.includes('too many requests');
}

/**
 * Generic Gemini runner with automatic model fallback.
 * Tries each model in MODEL_FALLBACK_CHAIN from cheapest to most capable.
 * If a model returns a 429 quota error, it moves to the next one automatically.
 */
async function runWithFallback<T>(
  systemInstruction: string,
  buildPromptAndRun: (modelName: string) => Promise<T>
): Promise<T> {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Google Generative AI is not initialized. GEMINI_API_KEY is missing.');
  }

  let lastError: any;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`🔄 Trying Gemini model: ${modelName}`);
      const result = await buildPromptAndRun(modelName);
      console.log(`✅ Gemini model succeeded: ${modelName}`);
      return result;
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn(`⚠️ Quota exceeded for model [${modelName}], trying next model in chain...`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  // FIXME: Add a more robust fallback mechanism or switch to a local LLM if the Gemini API is completely down.
  console.error('❌ All Gemini models have exceeded their quota.');
  throw new Error(
    `All Gemini models quota exhausted. Last error: ${lastError?.message || String(lastError)}`
  );
}

export interface AnalysisResult {
  summary: string;
  sentiment: 'STRONG_POSITIVE' | 'MODERATE_POSITIVE' | 'NEUTRAL' | 'MODERATE_NEGATIVE' | 'STRONG_NEGATIVE';
}

const VALID_SENTIMENTS = ['STRONG_POSITIVE', 'MODERATE_POSITIVE', 'NEUTRAL', 'MODERATE_NEGATIVE', 'STRONG_NEGATIVE'];

export async function analyzeArticle(title: string, content: string): Promise<AnalysisResult> {
  const systemInstruction =
    "Analyze the provided cryptocurrency news article (title and content).\n" +
    "Generate a concise summary of the article in Polish (1-2 sentences max).\n" +
    "Classify the market sentiment on a 5-level scale:\n" +
    "  - STRONG_NEGATIVE: Global-scale catastrophic events causing market panic (FUD). Examples: major protocol hack (hundreds of millions), government crypto ban, exchange bankruptcy like FTX.\n" +
    "  - MODERATE_NEGATIVE: Local or temporary negative news: SEC delays, regulator fines, minor hashrate dips, technical corrections.\n" +
    "  - NEUTRAL: Technical updates, planned maintenance, dry factual info without clear price impact. Examples: testnet launch, scheduled hardfork, developer interview.\n" +
    "  - MODERATE_POSITIVE: Positive local news building trust: exchange integration, successful network upgrade, positive fund analysis.\n" +
    "  - STRONG_POSITIVE: Fundamental industry victories that can trigger bull trends (FOMO). Examples: spot ETF approval, Bitcoin as legal tender in a new country, halving event.\n" +
    "Return the result strictly in this JSON format: { \"summary\": \"string\", \"sentiment\": \"STRONG_POSITIVE|MODERATE_POSITIVE|NEUTRAL|MODERATE_NEGATIVE|STRONG_NEGATIVE\" }";

  const prompt = `Title: ${title}\n\nContent: ${content}`;

  try {
    return await runWithFallback<AnalysisResult>(systemInstruction, async (modelName) => {
      const ai = getGenAI();
      const model = ai.getGenerativeModel({ model: modelName, systemInstruction });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const responseText = response.response.text();
      if (!responseText) {
        throw new Error('Received empty response from Gemini API');
      }

      const parsed: AnalysisResult = JSON.parse(responseText.trim());

      if (
        typeof parsed.summary !== 'string' ||
        !VALID_SENTIMENTS.includes(parsed.sentiment)
      ) {
        throw new Error(`Invalid structured response format from Gemini: ${responseText}`);
      }

      return parsed;
    });
  } catch (err: any) {
    console.warn(`⚠️ Gemini analyzeArticle failed: ${err?.message || err}. Falling back to NEUTRAL.`);
    const truncated = content && content.length > 150 ? `${content.substring(0, 147)}...` : (content || title || 'No description provided.');
    return {
      summary: truncated,
      sentiment: 'NEUTRAL'
    };
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const systemInstruction =
    "You are an expert translator. Translate the provided text into the target language. " +
    "Maintain the exact tone, formatting, and brevity of the original text. " +
    "Do not include any headers, preambles, or conversational filler. Return only the translated text.";

  const langName = mapLangCodeToName(targetLanguage);
  const prompt = `Target Language: ${langName}\nText to translate:\n${text}`;

  return runWithFallback<string>(systemInstruction, async (modelName) => {
    const model = genAI!.getGenerativeModel({ model: modelName, systemInstruction });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = response.response.text();
    if (!responseText) {
      throw new Error('Received empty response from Gemini translation API');
    }

    return responseText.trim();
  });
}

export async function expandArticleContent(
  title: string,
  content: string,
  language: string
): Promise<string> {
  const systemInstruction =
    "You are a professional cryptocurrency analyst. Analyze the provided news article (title and content) " +
    "and generate a detailed context expansion / detailed bulleted analysis of about 100-150 words in the requested language.\n" +
    "Generate 3-5 clear, insightful bullet points outlining the core news, its technical details, and potential market impacts on related assets.\n" +
    "Do not start with greetings, conversational filler, or repeat the title. Begin directly with the bullet points.";

  const langName = mapLangCodeToName(language);
  const prompt = `Target Language: ${langName}\nTitle: ${title}\nContent: ${content}`;

  return runWithFallback<string>(systemInstruction, async (modelName) => {
    const model = genAI!.getGenerativeModel({ model: modelName, systemInstruction });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = response.response.text();
    if (!responseText) {
      throw new Error('Received empty response from Gemini context expansion API');
    }

    return responseText.trim();
  });
}

function mapLangCodeToName(code: string): string {
  const normalized = (code || '').substring(0, 2).toLowerCase();
  switch (normalized) {
    case 'pl': return 'Polish';
    case 'uk': return 'Ukrainian';
    case 'en':
    default:
      return 'English';
  }
}

export async function generateAiRecommendations(
  articlesData: { title: string; summary: string | null; sentiment: string | null }[],
  language: string
): Promise<string> {
  const systemInstruction =
    "You are a professional cryptocurrency trading advisor and market analyst. " +
    "You will be given a list of recent news articles along with their AI-evaluated sentiment scores.\n" +
    "Analyze the general sentiment direction, identify key trends/risks, and write a professional trading advisor report " +
    "in the requested language. It should look like an expert intelligence report for a thesis project.\n" +
    "Your response should be structured as follows:\n" +
    "1. **Market Overview** (1-2 sentences summarizing the general climate/mood).\n" +
    "2. **Key Signals** (2-3 bullet points pointing out specific news items or sentiment signals).\n" +
    "3. **Trading Advisory** (Concise tactical advice: support/resistance focus, volatility expectation, or risk status: e.g. High Volatility, Neutral Wait, Positive Accumulation).\n\n" +
    "Do not include conversational filler or meta-preambles. Keep the text concise (100-150 words max).";

  const langName = mapLangCodeToName(language);
  const articlesPrompt = articlesData
    .map((art, idx) => `${idx + 1}. Title: "${art.title}" (Sentiment: ${art.sentiment})\nSummary: ${art.summary || 'None'}`)
    .join('\n\n');
  const prompt = `Target Language: ${langName}\n\nList of articles:\n${articlesPrompt}`;

  return runWithFallback<string>(systemInstruction, async (modelName) => {
    const model = genAI!.getGenerativeModel({ model: modelName, systemInstruction });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = response.response.text();
    if (!responseText) {
      throw new Error('Received empty response from Gemini recommendations API');
    }

    return responseText.trim();
  });
}

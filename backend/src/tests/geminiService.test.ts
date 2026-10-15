import { analyzeArticle } from '../services/geminiService';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe('Gemini AI Service - analyzeArticle and Fallback Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully returns structured summary and sentiment when API responds with valid JSON', async () => {
    const mockJson = {
      summary: 'Bitcoin osiągnął nowy rekord cenowy.',
      sentiment: 'STRONG_POSITIVE',
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockJson),
      },
    });

    const result = await analyzeArticle(
      'Bitcoin Hits Record High',
      'Bitcoin has surged past $85,000 following ETF inflows.'
    );

    expect(result).toEqual(mockJson);
    expect(mockGetGenerativeModel).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('gracefully falls back to NEUTRAL sentiment and truncated original content on Rate Limit (429) error', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('429 Quota exceeded: Resource has been exhausted')
    );

    const longContent = 'X'.repeat(200);
    const result = await analyzeArticle('Regulatory Concerns', longContent);

    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.summary).toBe('X'.repeat(147) + '...');
  });

  it('gracefully falls back to NEUTRAL sentiment on Network error without crashing', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('FetchError: getaddrinfo ENOTFOUND generativelanguage.googleapis.com')
    );

    const content = 'Ethereum developers discuss future network scalability upgrades.';
    const result = await analyzeArticle('Ethereum Network Upgrade', content);

    expect(result).toEqual({
      summary: content,
      sentiment: 'NEUTRAL',
    });
  });
});

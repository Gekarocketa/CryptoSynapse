import { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';
import { AuthContext } from './context/AuthContext';
import { Header } from './components/Header';
import { StatsStrip } from './components/StatsStrip';
import { PriceChart } from './components/PriceChart';
import { Watchlist } from './components/Watchlist';
import { SentimentSummary } from './components/SentimentSummary';
import { AlertsPanel } from './components/AlertsPanel';
import { AiCompanion } from './components/AiCompanion';
import { NewsFeed } from './components/NewsFeed';
import { LoginModal, RegisterModal, SettingsModal } from './components/modals';
import { getPriceSeries } from './lib/chartData';
import type { Article } from './components/NewsFeed';
import type { Alert } from './components/AlertsPanel';

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  updatedAt: string;
}

export interface HealthStatus {
  status: string;
  message: string;
  database: string;
  timestamp: string;
}

export function App() {
  const { t, i18n } = useTranslation();

  const getNormalizedLanguage = (): string => {
    if (!i18n.language) return 'en';
    const lang = i18n.language.substring(0, 2).toLowerCase();
    if (['pl', 'uk', 'en'].includes(lang)) {
      return lang;
    }
    return 'en';
  };

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, token, login, register, logout, loading: authLoading } = authContext;

  // Settings & App state
  const [showSentimentChart, setShowSentimentChart] = useState<boolean>(() => {
    try {
      return localStorage.getItem('showSentimentChart') !== 'false';
    } catch {
      return true;
    }
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [coins, setCoins] = useState<Coin[]>([]);
  const [news, setNews] = useState<Article[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedCoinId, setSelectedCoinId] = useState<string>('bitcoin');

  // Modals Visibility
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Timeframe and News Filters
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [newsFilter, setNewsFilter] = useState<string>('all');
  const [deepResearchRecency, setDeepResearchRecency] = useState<string>('7d');
  const [deepResearchLoading, setDeepResearchLoading] = useState<boolean>(false);
  const [visibleNewsCount, setVisibleNewsCount] = useState<number>(5);

  // Trading Companion insights
  const [tradingInsights, setTradingInsights] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Add Custom Coin Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSearchCoin, setSelectedSearchCoin] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Dynamic Translations & AI Expand
  const [translatedSummaries, setTranslatedSummaries] = useState<Record<string, string>>({});
  const [translatingArticleIds, setTranslatingArticleIds] = useState<Record<string, boolean>>({});
  const [expandedArticles, setExpandedArticles] = useState<Record<string, string>>({});
  const [expandingArticleIds, setExpandingArticleIds] = useState<Record<string, boolean>>({});

  // Sync user language preference
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem('i18nextLng', user.language);
    }
    if (user?.showSentimentChart !== undefined) {
      setShowSentimentChart(user.showSentimentChart);
    }
  }, [user, i18n]);

  // Debounced Coin Search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (
      selectedSearchCoin &&
      searchQuery === `${selectedSearchCoin.symbol.toUpperCase()} \\ ${selectedSearchCoin.name}`
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get<any[]>(
          `http://localhost:5001/api/coins/search?query=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search coins:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSearchCoin]);

  // Auto-translate news summaries for EN and UK
  const translateSummary = async (articleId: string, text: string, targetLanguage: string) => {
    const cacheKey = `${articleId}-${targetLanguage}`;
    if (translatedSummaries[cacheKey] || translatingArticleIds[cacheKey]) return;

    setTranslatingArticleIds((prev) => ({ ...prev, [cacheKey]: true }));
    try {
      const res = await axios.post<{ translatedText: string }>('http://localhost:5001/api/news/translate', {
        text,
        targetLanguage,
      });
      setTranslatedSummaries((prev) => ({ ...prev, [cacheKey]: res.data.translatedText }));
    } catch (err) {
      console.error('Failed to translate news summary:', err);
    } finally {
      setTranslatingArticleIds((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  useEffect(() => {
    const lang = getNormalizedLanguage();
    if (lang === 'pl' || news.length === 0) return;

    news.forEach((article) => {
      if (!article.summary) return;
      const cacheKey = `${article.id}-${lang}`;
      if (!translatedSummaries[cacheKey] && !translatingArticleIds[cacheKey]) {
        translateSummary(article.id, article.summary, lang);
      }
    });
  }, [news, i18n.language]);

  useEffect(() => {
    setVisibleNewsCount(5);
    setTradingInsights('');
    setInsightsError(null);
  }, [newsFilter]);

  // Expand / Collapse AI Context Analysis
  const handleToggleExpandArticle = async (articleId: string) => {
    if (expandedArticles[articleId]) {
      setExpandedArticles((prev) => {
        const copy = { ...prev };
        delete copy[articleId];
        return copy;
      });
      return;
    }

    setExpandingArticleIds((prev) => ({ ...prev, [articleId]: true }));
    try {
      const res = await axios.post<{ expandedText: string }>(
        `http://localhost:5001/api/news/${articleId}/expand`,
        { language: getNormalizedLanguage() }
      );
      setExpandedArticles((prev) => ({ ...prev, [articleId]: res.data.expandedText }));
    } catch (err: any) {
      console.error('Failed to expand article context:', err);
    } finally {
      setExpandingArticleIds((prev) => ({ ...prev, [articleId]: false }));
    }
  };

  // Dashboard Data Ingestion
  const fetchDashboardData = async (_currentFilter?: string, triggerLiveSync: boolean = false) => {
    try {
      if (triggerLiveSync) {
        setLoading(true);
        try {
          await axios.post('http://localhost:5001/api/coins/sync');
        } catch (syncErr) {
          console.warn('Live price sync failed, falling back to database cache:', syncErr);
        }
      }

      const healthRes = await axios.get<HealthStatus>('http://localhost:5001/api/health');
      setHealth(healthRes.data);

      const coinsRes = await axios.get<Coin[]>('http://localhost:5001/api/coins');
      setCoins(coinsRes.data);

      const newsRes = await axios.get<Article[]>('http://localhost:5001/api/news?filter=all');
      setNews(newsRes.data);

      // Prepopulate expanded cache from database
      setExpandedArticles((prev) => {
        const updates: Record<string, string> = {};
        newsRes.data.forEach((article) => {
          if (article.expandedContent && !prev[article.id]) {
            updates[article.id] = article.expandedContent;
          }
        });
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch dashboard data.');
      setHealth(null);
    } finally {
      if (triggerLiveSync) setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    if (!token) return;
    try {
      const res = await axios.get<Alert[]>('http://localhost:5001/api/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load user alerts:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData(newsFilter);
    if (token) fetchAlerts();
  }, [token, newsFilter]);

  // Periodic Polling (every 12 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(newsFilter);
      if (token) fetchAlerts();
    }, 12000);
    return () => clearInterval(interval);
  }, [token, newsFilter]);

  // User Actions
  const handleAddCoin = async (coin: { id: string; name: string; symbol: string }) => {
    await axios.post('http://localhost:5001/api/coins', coin);
    fetchDashboardData();
  };

  const handleDeleteCoin = async (coinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('confirmDeleteCoin'))) return;
    try {
      await axios.delete(`http://localhost:5001/api/coins/${coinId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedCoinId === coinId) {
        const remaining = coins.filter((c) => c.id !== coinId);
        setSelectedCoinId(remaining[0]?.id || '');
      }
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete asset.');
    }
  };

  const handleCreateAlert = async (coinId: string, targetPrice: string) => {
    await axios.post('http://localhost:5001/api/alerts', {
      coinId,
      targetPrice: parseFloat(targetPrice),
    });
    fetchAlerts();
  };

  const handleDeleteAlert = async (id: string) => {
    await axios.delete(`http://localhost:5001/api/alerts/${id}`);
    fetchAlerts();
  };

  const handleDeepResearch = async () => {
    setDeepResearchLoading(true);
    try {
      const activeFilterCoinId = newsFilter !== 'all' && newsFilter !== 'watchlist' ? newsFilter : null;
      if (activeFilterCoinId) {
        setSelectedCoinId(activeFilterCoinId);
      }
      const res = await axios.post<Article[]>('http://localhost:5001/api/news/deep-research', {
        coinId: activeFilterCoinId,
        recency: deepResearchRecency,
      });

      if (res.data && res.data.length > 0) {
        setNews((prev) => {
          const newItems = res.data.filter((n) => !prev.some((old) => old.url === n.url));
          return [...newItems, ...prev];
        });
      }
    } catch (err: any) {
      console.error('Deep Research error:', err);
    } finally {
      setDeepResearchLoading(false);
    }
  };

  const fetchTradingInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await axios.post<{ insights: string }>('http://localhost:5001/api/news/ai-insights', {
        filter: newsFilter,
        language: getNormalizedLanguage(),
      });
      setTradingInsights(res.data.insights);
    } catch (err: any) {
      setInsightsError(err.response?.data?.error || 'Failed to fetch AI insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSaveSettings = async (
    telegramUsername: string | null,
    notificationEmail: string | null,
    telegramAlertsActive: boolean,
    emailAlertsActive: boolean,
    showSentiment: boolean
  ) => {
    await authContext.updateProfile(
      telegramUsername,
      notificationEmail,
      telegramAlertsActive,
      emailAlertsActive,
      i18n.language,
      showSentiment
    );
    setShowSentimentChart(showSentiment);
  };

  // Active Coin & Chart Data calculation (using isolated getPriceSeries)
  const activeCoin = useMemo(() => {
    return coins.find((c) => c.id === selectedCoinId) || coins[0] || null;
  }, [coins, selectedCoinId]);

  const chartData = useMemo(() => {
    if (!activeCoin || activeCoin.currentPrice <= 0) return [];

    const coinNews = news.filter((a) => {
      if (a.coinId === activeCoin.id) return true;
      const titleLower = a.title.toLowerCase();
      if (activeCoin.name && titleLower.includes(activeCoin.name.toLowerCase())) return true;
      if (activeCoin.symbol && titleLower.includes(activeCoin.symbol.toLowerCase())) return true;
      return false;
    });

    const baseSeries = getPriceSeries(activeCoin.currentPrice, timeframe, i18n.language);

    return baseSeries.map((point) => {
      const relevantArticles = coinNews.filter(
        (a) => new Date(a.publishedAt).getTime() <= point.timestamp
      );

      // Render sentiment ONLY if real articles exist for this point (no mock sine wave!)
      let pointSentiment: number | null = null;
      if (relevantArticles.length > 0) {
        let weightedSum = 0;
        relevantArticles.forEach((article) => {
          switch (article.sentiment) {
            case 'STRONG_POSITIVE':
              weightedSum += 2;
              break;
            case 'MODERATE_POSITIVE':
            case 'POSITIVE':
              weightedSum += 1;
              break;
            case 'STRONG_NEGATIVE':
              weightedSum -= 2;
              break;
            case 'MODERATE_NEGATIVE':
            case 'NEGATIVE':
              weightedSum -= 1;
              break;
            default:
              weightedSum += 0;
          }
        });
        const avg = weightedSum / relevantArticles.length;
        pointSentiment = Math.round(((avg + 2) / 4) * 100);
      }

      return {
        ...point,
        sentiment: pointSentiment,
      };
    });
  }, [activeCoin, timeframe, news, i18n.language]);

  // Filtered Articles
  const displayedNews = useMemo(() => {
    const sorted = [...news].sort((a, b) => {
      const aCoin = a.coinId ? 1 : 0;
      const bCoin = b.coinId ? 1 : 0;
      if (aCoin !== bCoin) return bCoin - aCoin;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return sorted.filter((article) => {
      if (newsFilter === 'all') return true;
      if (newsFilter === 'watchlist') return article.coinId !== null;
      return article.coinId === newsFilter;
    });
  }, [news, newsFilter]);

  // Overall Market Sentiment Score
  const sentimentScore = useMemo(() => {
    if (displayedNews.length === 0) return 50;
    let weightedSum = 0;
    displayedNews.forEach((article) => {
      switch (article.sentiment) {
        case 'STRONG_POSITIVE':
          weightedSum += 2;
          break;
        case 'MODERATE_POSITIVE':
        case 'POSITIVE':
          weightedSum += 1;
          break;
        case 'STRONG_NEGATIVE':
          weightedSum -= 2;
          break;
        case 'MODERATE_NEGATIVE':
        case 'NEGATIVE':
          weightedSum -= 1;
          break;
        default:
          weightedSum += 0;
      }
    });
    const raw = weightedSum / displayedNews.length;
    return Math.round(((raw + 2) / 4) * 100);
  }, [displayedNews]);

  const activeAlertsCount = alerts.filter((a) => !a.isTriggered).length;

  const activeFilterName =
    newsFilter === 'all'
      ? 'Global Market Filter'
      : newsFilter === 'watchlist'
      ? 'Watchlist Assets Filter'
      : `${coins.find((c) => c.id === newsFilter)?.name || newsFilter} Filter`;

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col selection:bg-accent/15 selection:text-accent">
      {/* 1. Slim Sticky Top Bar */}
      <Header
        user={user}
        authLoading={authLoading}
        loading={loading}
        health={health?.status === 'ok'}
        onSync={() => fetchDashboardData(undefined, true)}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={logout}
        onLanguageChange={(newLang) => {
          i18n.changeLanguage(newLang);
          localStorage.setItem('i18nextLng', newLang);
          if (user) {
            authContext.updateProfile(
              user.telegramUsername || null,
              user.notificationEmail || null,
              user.telegramAlertsActive !== false,
              user.emailAlertsActive !== false,
              newLang
            );
          }
        }}
      />

      {/* Main Container: max-w-[1360px], 24px gutters, 16px gap between blocks */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-6 space-y-4">
        {/* Error notification if database disconnected */}
        {error && (
          <div className="p-3.5 rounded bg-down/10 border border-down/20 text-down text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">{t('dbConnectionFailed')}</span> {error}
            </div>
          </div>
        )}

        {/* 2. Stats Strip (4 unified stats in one container) */}
        <StatsStrip
          coins={coins}
          articleCount={news.length}
          activeAlertsCount={activeAlertsCount}
          hasUser={!!user}
          sentimentScore={sentimentScore}
        />

        {/* 3. Main Row (12-col grid): Chart (col-span 8) + Watchlist (col-span 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-8">
            <PriceChart
              coin={activeCoin}
              chartData={chartData}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onSync={() => fetchDashboardData(undefined, true)}
              showSentimentOverlay={showSentimentChart}
              onToggleSentimentOverlay={() => {
                setShowSentimentChart((prev) => {
                  const next = !prev;
                  try {
                    localStorage.setItem('showSentimentChart', String(next));
                  } catch (e) {
                    console.warn('Failed to save sentiment setting:', e);
                  }
                  return next;
                });
              }}
            />
          </div>

          <div className="lg:col-span-4">
            <Watchlist
              coins={coins}
              selectedCoinId={selectedCoinId}
              onSelectCoin={(coinId) => {
                setSelectedCoinId(coinId);
                setNewsFilter(coinId);
              }}
              hasUser={!!user}
              onDeleteCoin={handleDeleteCoin}
              onAddCoin={handleAddCoin}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              selectedSearchCoin={selectedSearchCoin}
              setSelectedSearchCoin={setSelectedSearchCoin}
            />
          </div>
        </div>

        {/* 4. Second Row (12-col grid): News Feed (col-span 8) + Right Column (col-span 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-2">
          {/* Left Column: News Feed */}
          <div className="lg:col-span-8">
            <NewsFeed
              articles={displayedNews}
              coins={coins}
              newsFilter={newsFilter}
              onFilterChange={(newFilter) => {
                setNewsFilter(newFilter);
                if (newFilter !== 'all' && newFilter !== 'watchlist') {
                  setSelectedCoinId(newFilter);
                }
              }}
              recency={deepResearchRecency}
              onRecencyChange={setDeepResearchRecency}
              deepResearchLoading={deepResearchLoading}
              onDeepResearch={handleDeepResearch}
              visibleCount={visibleNewsCount}
              onLoadMore={() => setVisibleNewsCount((prev) => prev + 5)}
              expandedArticles={expandedArticles}
              expandingIds={expandingArticleIds}
              onToggleExpand={handleToggleExpandArticle}
              translatedSummaries={translatedSummaries}
              translatingIds={translatingArticleIds}
            />
          </div>

          {/* Right Column: Sentiment Summary, Price Alerts, AI Companion */}
          <div className="lg:col-span-4 space-y-4">
            <SentimentSummary
              score={sentimentScore}
              articleCount={displayedNews.length}
            />

            <AlertsPanel
              alerts={alerts}
              coins={coins}
              hasUser={!!user}
              onOpenLogin={() => setShowLoginModal(true)}
              onCreateAlert={handleCreateAlert}
              onDeleteAlert={handleDeleteAlert}
            />

            <AiCompanion
              filterName={activeFilterName}
              insights={tradingInsights}
              loading={insightsLoading}
              error={insightsError}
              onGenerateInsights={fetchTradingInsights}
            />
          </div>
        </div>
      </main>

      {/* 5. Restrained Footer */}
      <footer className="py-5 px-6 border-t border-border bg-surface text-center text-xs text-muted">
        <p>{t('footerText')}</p>
      </footer>

      {/* Auth & Settings Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        onLogin={login}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
        onRegister={register}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onSave={handleSaveSettings}
        onToggleSentimentOverlay={(val) => {
          setShowSentimentChart(val);
          try {
            localStorage.setItem('showSentimentChart', String(val));
          } catch (e) {
            console.warn('Failed to save sentiment setting:', e);
          }
        }}
      />
    </div>
  );
}

export default App;

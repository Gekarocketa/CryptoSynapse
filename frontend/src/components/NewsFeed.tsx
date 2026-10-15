import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { Button, Select, Badge } from './ui';
import { formatRelative, formatDate } from '../lib/format';
import type { Coin } from '../App';

export interface Article {
  id: string;
  title: string;
  content: string;
  url: string;
  summary: string | null;
  sentiment:
    | 'STRONG_POSITIVE'
    | 'MODERATE_POSITIVE'
    | 'NEUTRAL'
    | 'MODERATE_NEGATIVE'
    | 'STRONG_NEGATIVE'
    | 'POSITIVE'
    | 'NEGATIVE'
    | null;
  expandedContent?: string | null;
  publishedAt: string;
  coinId?: string | null;
  coin?: {
    id: string;
    symbol: string;
    name: string;
  } | null;
}

export interface NewsFeedProps {
  articles: Article[];
  coins: Coin[];
  newsFilter: string;
  onFilterChange: (filter: string) => void;
  recency: string;
  onRecencyChange: (recency: string) => void;
  deepResearchLoading: boolean;
  onDeepResearch: () => void;
  visibleCount: number;
  onLoadMore: () => void;
  expandedArticles: Record<string, string>;
  expandingIds: Record<string, boolean>;
  onToggleExpand: (articleId: string) => void;
  translatedSummaries: Record<string, string>;
  translatingIds: Record<string, boolean>;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  articles,
  coins,
  newsFilter,
  onFilterChange,
  recency,
  onRecencyChange,
  deepResearchLoading,
  onDeepResearch,
  visibleCount,
  onLoadMore,
  expandedArticles,
  expandingIds,
  onToggleExpand,
  translatedSummaries,
  translatingIds,
}) => {
  const { t, i18n } = useTranslation();

  const getSentimentVariant = (sentiment: Article['sentiment']): 'up' | 'down' | 'neutral' => {
    switch (sentiment) {
      case 'STRONG_POSITIVE':
      case 'MODERATE_POSITIVE':
      case 'POSITIVE':
        return 'up';
      case 'STRONG_NEGATIVE':
      case 'MODERATE_NEGATIVE':
      case 'NEGATIVE':
        return 'down';
      default:
        return 'neutral';
    }
  };

  const getSentimentLabel = (sentiment: Article['sentiment']): string => {
    switch (sentiment) {
      case 'STRONG_POSITIVE':
        return t('sentimentStrongPositive');
      case 'MODERATE_POSITIVE':
      case 'POSITIVE':
        return t('sentimentModeratePositive');
      case 'STRONG_NEGATIVE':
        return t('sentimentStrongNegative');
      case 'MODERATE_NEGATIVE':
      case 'NEGATIVE':
        return t('sentimentModerateNegative');
      default:
        return t('sentimentNeutral');
    }
  };

  const recencyOptions = [
    { value: 'all', label: t('anytime') },
    { value: '24h', label: t('past24h') },
    { value: '7d', label: t('past7d') },
    { value: '30d', label: t('past30d') },
  ];

  const filterOptions = [
    { value: 'all', label: t('filterAllNews') },
    { value: 'watchlist', label: t('filterWatchlistNews') },
    ...coins.map((c) => ({ value: c.id, label: c.name, badge: c.symbol.toUpperCase() })),
  ];

  const currentLang = i18n.language?.substring(0, 2).toLowerCase() || 'en';

  return (
    <div className="space-y-4">
      {/* Section Title Row (No card wrapper) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-fg tracking-tight">
            {t('newsFeed')}
          </h2>
          <span className="text-xs text-muted font-normal">
            {articles.length} updates
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Age Filter */}
          <div className="w-32">
            <Select
              size="sm"
              value={recency}
              options={recencyOptions}
              onChange={onRecencyChange}
            />
          </div>

          {/* Asset Filter */}
          <div className="w-36">
            <Select
              size="sm"
              value={newsFilter}
              options={filterOptions}
              onChange={onFilterChange}
            />
          </div>

          {/* Deep Research Button */}
          <Button
            size="sm"
            variant="secondary"
            onClick={onDeepResearch}
            loading={deepResearchLoading}
            icon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
          >
            {t('deepResearchBtn')}
          </Button>
        </div>
      </div>

      {/* Divided Flat Article List */}
      <div className="divide-y divide-border">
        {articles.slice(0, visibleCount).map((article) => {
          const cacheKey = `${article.id}-${currentLang}`;
          const isTranslated = currentLang !== 'pl' && translatedSummaries[cacheKey];
          const isTranslating = currentLang !== 'pl' && translatingIds[cacheKey];
          const summaryText = isTranslated ? translatedSummaries[cacheKey] : article.summary;

          const isExpanded = !!expandedArticles[article.id];
          const isExpanding = !!expandingIds[article.id];

          return (
            <article key={article.id} className="py-4 space-y-2 text-left">
              {/* Line 1: Source/ticker chip + published time + sentiment badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-raised border border-border text-fg uppercase">
                    {article.coin ? article.coin.symbol : t('generalCategory')}
                  </span>
                  <span className="text-xs text-muted">
                    {formatRelative(article.publishedAt, i18n.language) ||
                      formatDate(article.publishedAt, i18n.language)}
                  </span>
                </div>

                <Badge variant={getSentimentVariant(article.sentiment)} size="sm">
                  {getSentimentLabel(article.sentiment)}
                </Badge>
              </div>

              {/* Line 2: Headline (15px, 500, max 2 lines) */}
              <h3 className="text-[15px] font-medium text-fg leading-snug hover:text-accent transition-colors">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h3>

              {/* Line 3: Clean summary in regular (NOT italic) muted text, 2-line clamp */}
              {summaryText && (
                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                  {isTranslating ? (
                    <span className="text-subtle inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      {t('translatingSummary')}
                    </span>
                  ) : (
                    summaryText
                  )}
                </p>
              )}

              {/* Expanded AI Context Analysis */}
              {isExpanded && (
                <div className="mt-2 p-3.5 rounded bg-raised border border-border text-xs text-fg leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-accent font-semibold text-[11px] uppercase tracking-wide">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Context Analysis</span>
                  </div>
                  <div className="text-muted text-xs leading-relaxed whitespace-pre-line">
                    {expandedArticles[article.id]}
                  </div>
                </div>
              )}

              {/* Line 4: Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpand(article.id)}
                  disabled={isExpanding}
                  icon={
                    isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )
                  }
                  loading={isExpanding}
                >
                  {isExpanded ? t('collapseContextBtn') : t('expandContextBtn')}
                </Button>

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg font-medium transition-colors"
                >
                  <span>{t('readMore')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full-width Ghost Load More Button */}
      {articles.length > visibleCount && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="md"
            onClick={onLoadMore}
            className="w-full border border-border hover:border-border-strong text-muted hover:text-fg"
          >
            {t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
};

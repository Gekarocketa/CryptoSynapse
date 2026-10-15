import React from 'react';
import { useTranslation } from 'react-i18next';
import { Stat } from './ui';
import type { Coin } from '../App';

export interface StatsStripProps {
  coins: Coin[];
  articleCount: number;
  activeAlertsCount: number;
  hasUser: boolean;
  sentimentScore: number;
}

export const StatsStrip: React.FC<StatsStripProps> = ({
  coins,
  articleCount,
  activeAlertsCount,
  hasUser,
  sentimentScore,
}) => {
  const { t } = useTranslation();

  const getSentimentText = (score: number) => {
    if (score >= 60) return t('bullish');
    if (score <= 40) return t('bearish');
    return t('neutral');
  };

  const getSentimentColor = (score: number) => {
    if (score >= 60) return 'text-up';
    if (score <= 40) return 'text-down';
    return 'text-muted';
  };

  return (
    <div className="w-full bg-surface border border-border rounded-md grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
      {/* 1. Tracked Assets */}
      <Stat
        label={t('trackedAssets')}
        value={coins.length || 0}
        subline={<span className="text-muted">{t('liveSeedApplied')}</span>}
        className="p-4"
      />

      {/* 2. News / Articles */}
      <Stat
        label={t('totalArticles')}
        value={articleCount || 0}
        subline={<span className="text-muted">{t('geminiIngested')}</span>}
        className="p-4"
      />

      {/* 3. Active Alerts */}
      <Stat
        label={t('activeAlertsCount')}
        value={hasUser ? activeAlertsCount : '—'}
        subline={
          <span className="text-muted">
            {hasUser ? t('managedSchemas') : t('logInToViewAlerts')}
          </span>
        }
        className="p-4"
      />

      {/* 4. Market Sentiment Score */}
      <Stat
        label={t('sentimentScore')}
        value={<span className="tabular-nums">{sentimentScore}/100</span>}
        subline={
          <span className={`font-medium ${getSentimentColor(sentimentScore)}`}>
            {getSentimentText(sentimentScore)}
          </span>
        }
        className="p-4"
      />
    </div>
  );
};

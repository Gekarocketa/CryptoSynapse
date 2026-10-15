import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from './ui';

export interface SentimentSummaryProps {
  score: number;
  articleCount: number;
}

export const SentimentSummary: React.FC<SentimentSummaryProps> = ({ score, articleCount }) => {
  const { t } = useTranslation();

  // Zone index: 0 = Strong Neg (0-20), 1 = Mod Neg (20-40), 2 = Neutral (40-60), 3 = Mod Pos (60-80), 4 = Strong Pos (80-100)
  const getActiveZone = (s: number): number => {
    if (s < 20) return 0;
    if (s < 40) return 1;
    if (s < 60) return 2;
    if (s < 80) return 3;
    return 4;
  };

  const activeZone = getActiveZone(score);

  const getStatusBadge = (zone: number) => {
    switch (zone) {
      case 0:
        return <Badge variant="down">{t('bearish')} −−</Badge>;
      case 1:
        return <Badge variant="down">{t('bearish')} −</Badge>;
      case 2:
        return <Badge variant="neutral">{t('neutral')}</Badge>;
      case 3:
        return <Badge variant="up">{t('bullish')} +</Badge>;
      case 4:
        return <Badge variant="up">{t('bullish')} ++</Badge>;
      default:
        return <Badge variant="neutral">{t('neutral')}</Badge>;
    }
  };

  // 5 discrete visual scale tiers with symbols (+, -, •) and distinct tones
  const tiers = [
    {
      id: 0,
      symbol: '−−',
      range: '0–20',
      name: 'Strong Negative',
      trackActive: 'bg-[#F0616D]',
      trackInactive: 'bg-[#F0616D]/20 border border-[#F0616D]/30',
      pipActive: 'bg-[#F0616D] text-white border-[#F0616D] shadow-sm shadow-[#F0616D]/40 ring-2 ring-[#F0616D]/30',
      pipInactive: 'bg-[#F0616D]/10 text-[#F0616D] border border-[#F0616D]/30 hover:bg-[#F0616D]/20',
    },
    {
      id: 1,
      symbol: '−',
      range: '20–40',
      name: 'Moderate Negative',
      trackActive: 'bg-[#F0616D]/85',
      trackInactive: 'bg-[#F0616D]/15 border border-[#F0616D]/20',
      pipActive: 'bg-[#F0616D]/90 text-white border-[#F0616D] shadow-sm shadow-[#F0616D]/30 ring-2 ring-[#F0616D]/20',
      pipInactive: 'bg-[#F0616D]/5 text-[#F0616D]/80 border border-[#F0616D]/20 hover:bg-[#F0616D]/15',
    },
    {
      id: 2,
      symbol: '●',
      range: '40–60',
      name: 'Neutral',
      trackActive: 'bg-muted',
      trackInactive: 'bg-border/60 border border-border',
      pipActive: 'bg-muted text-bg border-muted shadow-sm ring-2 ring-muted/30',
      pipInactive: 'bg-surface text-muted border border-border hover:border-border-strong hover:text-fg',
    },
    {
      id: 3,
      symbol: '+',
      range: '60–80',
      name: 'Moderate Positive',
      trackActive: 'bg-[#2EBD85]/85',
      trackInactive: 'bg-[#2EBD85]/15 border border-[#2EBD85]/20',
      pipActive: 'bg-[#2EBD85]/90 text-white border-[#2EBD85] shadow-sm shadow-[#2EBD85]/30 ring-2 ring-[#2EBD85]/20',
      pipInactive: 'bg-[#2EBD85]/5 text-[#2EBD85]/80 border border-[#2EBD85]/20 hover:bg-[#2EBD85]/15',
    },
    {
      id: 4,
      symbol: '++',
      range: '80–100',
      name: 'Strong Positive',
      trackActive: 'bg-[#2EBD85]',
      trackInactive: 'bg-[#2EBD85]/20 border border-[#2EBD85]/30',
      pipActive: 'bg-[#2EBD85] text-white border-[#2EBD85] shadow-sm shadow-[#2EBD85]/40 ring-2 ring-[#2EBD85]/30',
      pipInactive: 'bg-[#2EBD85]/10 text-[#2EBD85] border border-[#2EBD85]/30 hover:bg-[#2EBD85]/20',
    },
  ];

  return (
    <Card className="space-y-4">
      {/* Top Header: Title & Count left, Score & Badge right */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-fg tracking-tight">
            {t('sentimentScore')}
          </h3>
          <p className="text-xs text-muted font-normal mt-0.5">
            {t('sentimentBasedOn', { count: articleCount })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-fg tabular-nums tracking-tight">
            {score}<span className="text-sm font-normal text-muted">/100</span>
          </span>
          {getStatusBadge(activeZone)}
        </div>
      </div>

      {/* 5-segment Visual Scale Bar */}
      <div className="space-y-2.5 pt-1">
        {/* Track Bar with 5 zones */}
        <div className="grid grid-cols-5 gap-1.5 h-3 p-0.5 bg-raised rounded-md border border-border">
          {tiers.map((tier) => {
            const isActive = tier.id === activeZone;
            return (
              <div
                key={tier.id}
                className={`h-full rounded-sm transition-all duration-200 ${
                  isActive
                    ? `${tier.trackActive} ring-1 ring-offset-1 ring-offset-surface ring-fg/20 shadow-sm`
                    : tier.trackInactive
                }`}
                title={`${tier.name} (${tier.range})`}
              />
            );
          })}
        </div>

        {/* Visual Circles / Pips (+, -, •) */}
        <div className="grid grid-cols-5 items-center justify-items-center pt-1.5 select-none">
          {tiers.map((tier) => {
            const isActive = tier.id === activeZone;
            return (
              <div
                key={tier.id}
                title={`${tier.name} (${tier.range})`}
                className="flex flex-col items-center gap-1 group cursor-default"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? `${tier.pipActive} scale-110`
                      : `${tier.pipInactive} group-hover:scale-105`
                  }`}
                >
                  {tier.symbol}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums transition-colors ${
                    isActive ? 'text-fg font-semibold' : 'text-subtle'
                  }`}
                >
                  {tier.range}
                </span>
              </div>
            );
          })}
        </div>

        {/* Muted Bookends at bottom */}
        <div className="flex justify-between items-center text-[11px] text-muted font-normal pt-2 border-t border-border">
          <span className={activeZone <= 1 ? 'text-down font-medium' : 'text-muted'}>
            {t('bearish')}
          </span>
          <span className={activeZone === 2 ? 'text-fg font-medium' : 'text-muted'}>
            {t('neutral')}
          </span>
          <span className={activeZone >= 3 ? 'text-up font-medium' : 'text-muted'}>
            {t('bullish')}
          </span>
        </div>
      </div>
    </Card>
  );
};

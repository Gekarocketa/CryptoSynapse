import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Card, Button } from './ui';

export interface AiCompanionProps {
  filterName: string;
  insights: string;
  loading: boolean;
  error: string | null;
  onGenerateInsights: () => void;
}

export const AiCompanion: React.FC<AiCompanionProps> = ({
  filterName,
  insights,
  loading,
  error,
  onGenerateInsights,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg tracking-tight">
              {t('aiTradingCompanion')}
            </h3>
          </div>
          <p className="text-xs text-muted font-normal mt-0.5">
            {filterName}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onGenerateInsights}
          loading={loading}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        >
          {t('generateInsightsBtn')}
        </Button>
      </div>

      {error && (
        <div className="p-3 text-xs rounded bg-down/10 border border-down/20 text-down flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {insights && (
        <div className="p-4 rounded bg-raised border border-border text-xs text-fg leading-relaxed space-y-2 whitespace-pre-wrap">
          {insights.split('\n').map((line, idx) => {
            const isHeader =
              line.startsWith('###') ||
              line.startsWith('**') ||
              line.startsWith('1.') ||
              line.startsWith('2.') ||
              line.startsWith('3.');
            return (
              <p
                key={idx}
                className={
                  isHeader
                    ? 'font-semibold text-fg text-xs mt-2 first:mt-0'
                    : 'text-muted text-xs'
                }
              >
                {line.replace(/^###\s*/, '')}
              </p>
            );
          })}
        </div>
      )}
    </Card>
  );
};

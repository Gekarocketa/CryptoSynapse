import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Lock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Select, Badge } from './ui';
import { formatPrice } from '../lib/format';
import type { Coin } from '../App';

export interface Alert {
  id: string;
  coinId: string;
  targetPrice: number;
  isTriggered: boolean;
  deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: string;
  coin: {
    id: string;
    symbol: string;
    name: string;
  };
}

export interface AlertsPanelProps {
  alerts: Alert[];
  coins: Coin[];
  hasUser: boolean;
  onOpenLogin: () => void;
  onCreateAlert: (coinId: string, targetPrice: string) => Promise<void>;
  onDeleteAlert: (id: string) => Promise<void>;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  coins,
  hasUser,
  onOpenLogin,
  onCreateAlert,
  onDeleteAlert,
}) => {
  const { t, i18n } = useTranslation();
  const [selectedCoinId, setSelectedCoinId] = useState(coins[0]?.id || 'bitcoin');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice) return;
    setLoading(true);
    setError(null);
    try {
      await onCreateAlert(selectedCoinId, targetPrice);
      setSuccess(true);
      setTargetPrice('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  if (!hasUser) {
    return (
      <Card className="flex flex-col items-center justify-center text-center p-8">
        <div className="h-9 w-9 rounded-full bg-hover flex items-center justify-center text-muted mb-3">
          <Lock className="h-4 w-4 text-subtle" />
        </div>
        <h3 className="text-sm font-semibold text-fg tracking-tight">
          {t('alertsManager')}
        </h3>
        <p className="text-xs text-muted max-w-xs mt-1 leading-relaxed">
          {t('alertTip')}
        </p>
        <Button variant="primary" size="sm" onClick={onOpenLogin} className="mt-4">
          {t('authRequired')}
        </Button>
      </Card>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.isTriggered);
  const triggeredAlerts = alerts.filter((a) => a.isTriggered);

  const coinOptions = coins.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.symbol.toUpperCase()})`,
  }));

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg tracking-tight">
            {t('alertsManager')}
          </h3>
        </div>
        <span className="text-[11px] text-muted font-normal">
          {activeAlerts.length} active
        </span>
      </div>

      {/* Creation form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select
            size="md"
            value={selectedCoinId}
            options={coinOptions}
            onChange={setSelectedCoinId}
            placeholder={t('selectCoin')}
          />
          <Input
            type="number"
            step="any"
            required
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={t('targetPrice', 'Target price ($)')}
          />
        </div>

        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="w-full"
          loading={loading}
          disabled={!targetPrice || loading}
        >
          {t('setAlertBtn')}
        </Button>

        {error && (
          <p className="text-[11px] text-down flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
        {success && (
          <p className="text-[11px] text-up flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {t('alertSetSuccess')}
          </p>
        )}
      </form>

      {/* Alerts Lists */}
      <div className="space-y-3 pt-2">
        {/* Active list */}
        <div>
          <span className="text-xs font-medium text-muted block mb-2">
            {t('activeAlerts')} ({activeAlerts.length})
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2 rounded bg-raised border border-border text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-fg">{alert.coin.name}</span>
                    <span className="text-[11px] text-muted tabular-nums">
                      Target: {formatPrice(alert.targetPrice, i18n.language)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1 text-subtle hover:text-down rounded transition-subtle cursor-pointer"
                    title="Delete alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-subtle py-1">{t('noActiveAlerts')}</p>
            )}
          </div>
        </div>

        {/* Triggered list */}
        {triggeredAlerts.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs font-medium text-muted block mb-2">
              {t('triggeredAlerts')} ({triggeredAlerts.length})
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {triggeredAlerts.map((alert) => {
                const isSent = alert.deliveryStatus === 'SENT';
                const isPending = alert.deliveryStatus === 'PENDING';
                const badgeVariant = isSent ? 'up' : isPending ? 'warning' : 'down';
                const badgeLabel = isSent
                  ? t('alertDelivered')
                  : isPending
                  ? t('alertSending')
                  : t('alertFailed');

                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2 rounded bg-raised border border-border text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-fg">{alert.coin.name}</span>
                      <span className="text-[11px] text-muted tabular-nums">
                        Triggered: {formatPrice(alert.targetPrice, i18n.language)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant} size="sm">
                        {badgeLabel}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1 text-subtle hover:text-down rounded transition-subtle cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

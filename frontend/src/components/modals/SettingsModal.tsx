import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Modal, Input, Button, Toggle } from '../ui';
import type { User } from '../../context/AuthContext';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (
    telegramUsername: string | null,
    notificationEmail: string | null,
    telegramActive: boolean,
    emailActive: boolean,
    showSentiment: boolean
  ) => Promise<void>;
  onToggleSentimentOverlay?: (show: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onToggleSentimentOverlay,
}) => {
  const { t } = useTranslation();
  const [telegramUsername, setTelegramUsername] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [telegramAlertsActive, setTelegramAlertsActive] = useState(true);
  const [emailAlertsActive, setEmailAlertsActive] = useState(true);
  const [showSentimentChart, setShowSentimentChart] = useState(() => localStorage.getItem('showSentimentChart') !== 'false');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setTelegramUsername(user.telegramUsername || '');
      setNotificationEmail(user.notificationEmail || '');
      setTelegramAlertsActive(user.telegramAlertsActive !== false);
      setEmailAlertsActive(user.emailAlertsActive !== false);
      if (user.showSentimentChart !== undefined) {
        setShowSentimentChart(user.showSentimentChart);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave(
        telegramUsername.trim() || null,
        notificationEmail.trim() || null,
        telegramAlertsActive,
        emailAlertsActive,
        showSentimentChart
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('notificationSettings')}
      subtitle={user?.email}
      maxWidth="md"
    >
      {error && (
        <div className="p-3 text-xs rounded bg-down/10 border border-down/20 text-down flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 text-xs rounded bg-up/10 border border-up/20 text-up flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t('settingsSavedSuccess')}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Telegram Section */}
        <div className="space-y-2 p-3.5 rounded bg-raised border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">
              {t('telegramChatId', 'Telegram')}
            </span>
            <Toggle
              checked={telegramAlertsActive}
              onChange={setTelegramAlertsActive}
              size="sm"
            />
          </div>

          <Input
            value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
            disabled={!telegramAlertsActive}
            placeholder="username"
            leftIcon={<span className="font-mono font-medium text-muted">@</span>}
            className="h-8 text-xs"
          />

          <div className="text-[11px] text-muted space-y-1 pt-1 border-t border-border">
            <div className="flex items-start gap-1.5">
              <Info className="h-3 w-3 text-accent shrink-0 mt-0.5" />
              <span>{t('telegramImportantText')}</span>
            </div>
            <p>
              1. {t('telegramStep1')}
              <br />
              2. {t('telegramStep2')}
              <br />
              3. {t('telegramStep3')}
              <a
                href="https://t.me/CryptoSyncTestBot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-mono ml-1"
              >
                {t('telegramStep3BotLink')}
              </a>
              {t('telegramStep3End')}
            </p>
          </div>
        </div>

        {/* Email Section */}
        <div className="space-y-2 p-3.5 rounded bg-raised border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">
              {t('notificationEmail')}
            </span>
            <Toggle
              checked={emailAlertsActive}
              onChange={setEmailAlertsActive}
              size="sm"
            />
          </div>

          <Input
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            disabled={!emailAlertsActive}
            placeholder="alerts@domain.com"
            leftIcon={<Mail className="h-3.5 w-3.5" />}
            className="h-8 text-xs"
          />
        </div>

        {/* Chart Sentiment Overlay Toggle */}
        <div className="p-3.5 rounded bg-raised border border-border">
          <Toggle
            label={t('showSentimentChartLabel')}
            description="Overlays AI news sentiment correlation on historical price charts"
            checked={showSentimentChart}
            onChange={(val) => {
              setShowSentimentChart(val);
              localStorage.setItem('showSentimentChart', String(val));
              onToggleSentimentOverlay?.(val);
            }}
            size="sm"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          loading={loading}
        >
          {t('saveSettingsBtn')}
        </Button>
      </form>
    </Modal>
  );
};

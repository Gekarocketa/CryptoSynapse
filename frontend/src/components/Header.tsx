import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, RefreshCw, Sun, Moon, LogIn, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button, SegmentedControl } from './ui';
import type { User } from '../context/AuthContext';

export interface HeaderProps {
  user: User | null;
  authLoading: boolean;
  loading: boolean;
  health: boolean;
  onSync: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onLanguageChange: (lang: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  authLoading,
  loading,
  health,
  onSync,
  onOpenLogin,
  onOpenRegister,
  onOpenSettings,
  onLogout,
  onLanguageChange,
}) => {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', nextTheme);
  };

  const currentLang = i18n.language?.substring(0, 2).toLowerCase() || 'en';
  const validLang = ['en', 'pl', 'uk'].includes(currentLang) ? currentLang : 'en';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-border bg-surface/90 backdrop-blur px-6 py-2.5">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="h-7 w-7 rounded bg-accent flex items-center justify-center text-white shrink-0">
            <Activity className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-fg tracking-tight">
              {t('appName')}
            </span>
            <span className="text-xs text-muted font-normal hidden sm:inline">
              {t('intelHub')}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={loading}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />}
            title={t('syncData')}
          >
            <span className="hidden md:inline">{t('syncData')}</span>
          </Button>

          {/* Live indicator dot */}
          <div
            className="flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted"
            title={health ? t('backendLive') : t('backendOffline')}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                health ? 'bg-up shadow-[0_0_6px_rgba(46,189,133,0.6)]' : 'bg-down'
              }`}
            />
            <span className="text-[11px] text-muted hidden lg:inline">
              {health ? t('backendLive') : t('backendOffline')}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-border mx-0.5" />

          {/* Language Segmented Control: EN | PL | UK */}
          <SegmentedControl
            size="sm"
            value={validLang}
            onChange={onLanguageChange}
            options={[
              { value: 'en', label: 'EN' },
              { value: 'pl', label: 'PL' },
              { value: 'uk', label: 'UK' },
            ]}
          />

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('themeToggle')}
            title={t('themeToggle')}
            className="h-7 w-7 rounded border border-border bg-surface hover:bg-hover text-muted hover:text-fg flex items-center justify-center transition-subtle cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="h-4 w-[1px] bg-border mx-0.5" />

          {/* Auth Controls */}
          {!authLoading && (
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-xs text-fg font-medium max-w-[140px] truncate hidden md:inline">
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    title={t('notificationSettings')}
                    className="p-1.5 rounded hover:bg-hover text-muted hover:text-fg transition-subtle cursor-pointer"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    icon={<LogOut className="h-3.5 w-3.5" />}
                  >
                    <span className="hidden sm:inline">{t('logOut')}</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={onOpenLogin} icon={<LogIn className="h-3.5 w-3.5" />}>
                    {t('logIn')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={onOpenRegister}>
                    {t('signUp')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

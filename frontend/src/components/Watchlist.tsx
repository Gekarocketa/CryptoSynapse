import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Trash2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Delta } from './ui';
import { formatPrice } from '../lib/format';
import type { Coin } from '../App';

export interface WatchlistProps {
  coins: Coin[];
  selectedCoinId: string;
  onSelectCoin: (coinId: string) => void;
  hasUser: boolean;
  onDeleteCoin: (coinId: string, e: React.MouseEvent) => void;
  onAddCoin: (coin: { id: string; name: string; symbol: string }) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
  selectedSearchCoin: any | null;
  setSelectedSearchCoin: (coin: any | null) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  coins,
  selectedCoinId,
  onSelectCoin,
  hasUser,
  onDeleteCoin,
  onAddCoin,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  selectedSearchCoin,
  setSelectedSearchCoin,
}) => {
  const { t, i18n } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCoinFromSearch = (coin: any) => {
    setSelectedSearchCoin(coin);
    setSearchQuery(`${coin.name} (${coin.symbol.toUpperCase()})`);
    setIsDropdownOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSearchCoin) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await onAddCoin({
        id: selectedSearchCoin.id.toLowerCase().trim(),
        name: selectedSearchCoin.name.trim(),
        symbol: selectedSearchCoin.symbol.toLowerCase().trim(),
      });
      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddForm(false);
        setSearchQuery('');
        setSelectedSearchCoin(null);
        setIsDropdownOpen(false);
      }, 1000);
    } catch (err: any) {
      setAddError(err.response?.data?.error || err.message || 'Failed to add asset');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-fg tracking-tight">
            {t('watchlist')}
          </h2>
          <p className="text-xs text-muted font-normal">
            {t('watchlistTip')}
          </p>
        </div>

        {hasUser && (
          <Button
            size="sm"
            variant={showAddForm ? 'secondary' : 'ghost'}
            onClick={() => {
              setShowAddForm(!showAddForm);
              setAddError(null);
              setIsDropdownOpen(false);
            }}
            icon={showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            title={t('addCoinTitle')}
          />
        )}
      </div>

      {/* Add Coin Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="pt-3 pb-2 border-b border-border space-y-2">
          <div ref={searchContainerRef} className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
                if (selectedSearchCoin && e.target.value !== `${selectedSearchCoin.name} (${selectedSearchCoin.symbol.toUpperCase()})`) {
                  setSelectedSearchCoin(null);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0 && !selectedSearchCoin) {
                  setIsDropdownOpen(true);
                }
              }}
              placeholder={t('searchCoinPlaceholder', 'Search e.g. Monero, ADA...')}
              leftIcon={<Search className="h-3.5 w-3.5" />}
              rightIcon={
                isSearching ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                ) : selectedSearchCoin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSearchCoin(null);
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className="p-0.5 rounded text-muted hover:text-fg cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />

            {/* Dropdown search results */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-surface border border-border-strong rounded shadow-2xl py-1">
                {searchResults.map((coin) => (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => handleSelectCoinFromSearch(coin)}
                    className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-hover flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">{coin.name}</span>
                    <span className="font-mono text-[10px] text-muted uppercase">
                      {coin.symbol}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected coin banner */}
          {selectedSearchCoin && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-accent-subtle border border-accent/20 text-xs">
              <span className="text-fg font-medium">{selectedSearchCoin.name}</span>
              <span className="text-[10px] font-mono uppercase text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                {selectedSearchCoin.symbol}
              </span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-full"
            disabled={!selectedSearchCoin || addLoading}
            loading={addLoading}
          >
            {selectedSearchCoin ? `${t('addBtn', 'Add')} ${selectedSearchCoin.symbol.toUpperCase()}` : t('addBtn', 'Add Asset')}
          </Button>

          {addError && (
            <p className="text-[11px] text-down flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" /> {addError}
            </p>
          )}
          {addSuccess && (
            <p className="text-[11px] text-up flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 shrink-0" /> Asset added!
            </p>
          )}
        </form>
      )}

      {/* Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border -mx-5 px-5">
        {coins.map((coin) => {
          const isSelected = coin.id === selectedCoinId;
          return (
            <div
              key={coin.id}
              onClick={() => onSelectCoin(coin.id)}
              className={`flex items-center justify-between py-2.5 px-3 -mx-3 rounded transition-subtle cursor-pointer select-none ${
                isSelected
                  ? 'bg-accent/10 border-l-2 border-accent text-fg font-medium'
                  : 'hover:bg-hover text-fg'
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-sm font-medium text-fg truncate">
                  {coin.name}
                </span>
                <span className="text-[11px] font-mono text-muted uppercase truncate">
                  {coin.symbol}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-fg tabular-nums">
                    {formatPrice(coin.currentPrice, i18n.language)}
                  </span>
                  <Delta value={coin.priceChange24h} lang={i18n.language} size="sm" />
                </div>

                {hasUser && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteCoin(coin.id, e)}
                    className="p-1 text-subtle hover:text-down rounded transition-subtle cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info line */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted font-normal">
        <span>{t('syncCoinGecko')}</span>
        <span className="font-mono text-[10px] text-subtle">
          {coins.length} assets
        </span>
      </div>
    </Card>
  );
};

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { StatsCards } from '@/components/StatsCards';
import { VelocityComparisonChart } from '@/components/VelocityComparisonChart';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import {
  type TimeRange, TIME_RANGE_BUCKETS, TIME_RANGE_LABELS,
  getCandlestickData, getMarketOverviewData,
} from '@/analytics/analyticsService';
import { formatCurrencyMc } from '@/lib/calculations';

export function Analytics() {
  const navigate = useNavigate();
  const { businesses } = useStore();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1d');
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState<Array<{
    timestamp: string; totalLiquidity: number; activeBusinesses: number;
    totalInvestors: number; avgHealthScore: number; marketStatus: string;
  }>>([]);
  const [candlestickData, setCandlestickData] = useState<Array<{
    timestamp: string; businessId: string; businessName: string;
    open: number; high: number; low: number; close: number; volume: number;
  }>>([]);


  const selectedBusiness = useMemo(() =>
    businesses.length > 0 ? businesses[0].id : null,
  [businesses]);

  const loadData = useCallback(async (range: TimeRange) => {
    setIsLoading(true);
    try {
      const [market, candles] = await Promise.all([
        getMarketOverviewData(range),
        getCandlestickData(null, range),
      ]);
      setMarketData(market);
      setCandlestickData(candles);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    loadData(selectedRange);
  }, [selectedRange, loadData]);

  // Compute summary from market data
  const marketSummary = useMemo(() => {
    if (marketData.length === 0) return null;
    const latest = marketData[marketData.length - 1];
    const first = marketData[0];
    const liquidityChange = first ? ((latest.totalLiquidity - first.totalLiquidity) / Math.max(first.totalLiquidity, 1) * 100) : 0;
    return { ...latest, liquidityChange };
  }, [marketData]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold">Market Analytics</h1>
              <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">
                Historical data powered by Google Apps Script
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex flex-wrap gap-1">
            {TIME_RANGE_BUCKETS.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedRange === range
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] hover:border-[var(--card-border-hover)]'
                }`}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>

        {/* Historical Market Summary */}
        {marketSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Period Liquidity</div>
              <div className="text-xl font-bold text-[var(--app-fg)] font-mono">{formatCurrencyMc(Math.round(marketSummary.totalLiquidity * 1000))}</div>
              <div className={`text-[10px] mt-1 ${marketSummary.liquidityChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marketSummary.liquidityChange >= 0 ? '+' : ''}{marketSummary.liquidityChange.toFixed(2)}%
              </div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Active Businesses</div>
              <div className="text-xl font-bold text-[var(--app-fg)] font-mono">{marketSummary.activeBusinesses}</div>
              <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{TIME_RANGE_LABELS[selectedRange]} period</div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Avg Health Score</div>
              <div className="text-xl font-bold text-[var(--app-fg)] font-mono">{marketSummary.avgHealthScore.toFixed(1)}</div>
              <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">/ 100 max</div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Data Points</div>
              <div className="text-xl font-bold text-[var(--app-fg)] font-mono">{marketData.length}</div>
              <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">snapshots stored</div>
            </div>
          </div>
        )}

        {/* Live Stats */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Live Market Data</span>
          </div>
          <StatsCards businesses={businesses} />
        </div>

        {/* Charts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-emerald-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Velocity Chart */}
            <div className="lg:col-span-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] h-[300px] lg:h-[400px] overflow-hidden">
              <VelocityComparisonChart businesses={businesses} />
            </div>

            {/* Leaderboard */}
            <div className="lg:col-span-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] h-[300px] lg:h-[400px] overflow-hidden">
              <LeaderboardTable businesses={businesses} />
            </div>
          </div>
        )}

        {/* Historical Data Table */}
        {marketData.length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <h3 className="text-sm font-bold text-[var(--app-fg)] mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Market Overview History ({TIME_RANGE_LABELS[selectedRange]})
            </h3>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase">Timestamp</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Liquidity</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Businesses</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Investors</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.slice(-20).reverse().map((row, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg-hover)]">
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg-dim)] font-mono">
                        {new Date(row.timestamp).toLocaleString('en-ZA')}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg)] font-mono text-right">
                        {formatCurrencyMc(Math.round(row.totalLiquidity * 1000))}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg-dim)] text-right">{row.activeBusinesses}</td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg-dim)] text-right">{row.totalInvestors}</td>
                      <td className="px-3 py-2 text-[11px] text-right">
                        <span className={row.avgHealthScore >= 70 ? 'text-emerald-400' : row.avgHealthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                          {row.avgHealthScore.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Candlestick Data Preview */}
        {candlestickData.length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <h3 className="text-sm font-bold text-[var(--app-fg)] mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M7 7v10"/><path d="M17 7v10"/></svg>
              Candlestick Data ({candlestickData.length} records)
            </h3>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase">Business</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Open</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">High</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Low</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Close</th>
                    <th className="px-3 py-2 text-[10px] text-white/25 font-semibold uppercase text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {candlestickData.slice(-20).map((c, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg-hover)]">
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg)]">{c.businessName}</td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg-dim)] font-mono text-right">{c.open.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[11px] text-emerald-400 font-mono text-right">{c.high.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[11px] text-red-400 font-mono text-right">{c.low.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg)] font-mono text-right">{c.close.toFixed(2)}</td>
                      <td className="px-3 py-2 text-[11px] text-[var(--app-fg-dim)] font-mono text-right">{c.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <div>
            <p className="text-xs text-blue-400 font-medium mb-1">How Analytics Data Works</p>
            <p className="text-[11px] text-[var(--app-fg-muted)]">
              Market data is captured every 30 seconds and stored in both localStorage and Google Apps Script.
              Select different time ranges above to view historical snapshots. When Supabase is connected,
              data will also persist in your PostgreSQL database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

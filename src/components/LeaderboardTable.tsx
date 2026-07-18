import { useMemo, memo } from 'react';
import { generateLeaderboard, formatCurrency, formatPercent } from '@/lib/calculations';
import type { Business } from '@/types';

interface LeaderboardTableProps {
  businesses: Business[];
}

function LeaderboardTableInner({ businesses }: LeaderboardTableProps) {
  const leaderboard = useMemo(() => {
    if (businesses.length === 0) return [];
    return generateLeaderboard(businesses);
  }, [businesses]);

  if (businesses.length === 0) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              Top 10 Financially Liquid Sovereigns
            </h3>
            <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5">
              Ranked by Composite Liquidity Index (CLI)
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--app-fg-subtle)] mx-auto mb-2 opacity-40"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            <p className="text-xs text-[var(--app-fg-muted)]">No businesses ranked yet</p>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">Leaderboard will populate once businesses go live</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            Top 10 Financially Liquid Sovereigns
          </h3>
          <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5">
            Ranked by Composite Liquidity Index (CLI)
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-[var(--app-bg)]">
            <tr className="border-b border-[var(--card-border)]">
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Rank</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Business</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">CLI Score</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Liquidity</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Velocity</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Confidence</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Margin</th>
              <th className="px-4 py-2 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr
                key={entry.businessId}
                className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)] transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        entry.rank === 1
                          ? 'rgba(251,191,36,0.15)'
                          : entry.rank === 2
                            ? 'rgba(192,192,192,0.1)'
                            : entry.rank === 3
                              ? 'rgba(205,127,50,0.1)'
                              : 'rgba(255,255,255,0.03)',
                      color:
                        entry.rank === 1
                          ? '#fbbf24'
                          : entry.rank === 2
                            ? '#c0c0c0'
                            : entry.rank === 3
                              ? '#cd7f32'
                              : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {entry.rank}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: entry.color,
                        boxShadow: `0 0 6px ${entry.color}40`,
                      }}
                    />
                    <span className="text-xs font-medium text-[var(--app-fg)] truncate max-w-[120px]">
                      {entry.businessName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className="text-xs font-bold"
                    style={{
                      color:
                        entry.compositeScore >= 70
                          ? '#22c55e'
                          : entry.compositeScore >= 50
                            ? '#f59e0b'
                            : '#ef4444',
                    }}
                  >
                    {entry.compositeScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-[11px] text-[var(--app-fg-dim)] font-mono">
                    {entry.liquidityScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-[11px] text-[var(--app-fg-dim)] font-mono">
                    {entry.velocityScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-[11px] text-[var(--app-fg-dim)] font-mono">
                    {entry.confidenceScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className="text-[11px] font-mono"
                    style={{
                      color: entry.profitScore >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {formatPercent(entry.profitScore)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-[11px] text-[var(--app-fg-dim)] font-mono">
                    {formatCurrency(entry.totalVolume)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula Footer */}
      <div className="px-4 py-2 border-t border-[var(--card-border)] text-[9px] text-[var(--app-fg-subtle)] text-center">
        CLI = 30% Liquidity + 25% Velocity + 25% Confidence + 20% Profitability
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export const LeaderboardTable = memo(LeaderboardTableInner);

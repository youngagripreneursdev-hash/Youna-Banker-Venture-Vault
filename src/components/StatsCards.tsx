import { useMemo } from 'react';
import { formatCurrency, calculateTotalMarketCap } from '@/lib/calculations';
import type { Business } from '@/types';

interface StatsCardsProps {
  businesses: Business[];
}

export function StatsCards({ businesses }: StatsCardsProps) {
  const cards = useMemo(() => {
    const totalLiquidity = calculateTotalMarketCap(businesses);
    const settledBets = businesses.reduce((sum, b) => sum + b.settledBets, 0);
    const currentBets = businesses.reduce((sum, b) => sum + b.currentBets, 0);
    const netProfit = businesses.reduce((sum, b) => sum + b.netProfit, 0);
    const avgHealth = businesses.length > 0
      ? businesses.reduce((sum, b) => sum + b.healthScore, 0) / businesses.length
      : 0;

    return [
      {
        label: 'Total Market Liquidity', value: formatCurrency(totalLiquidity),
        sub: `${businesses.length} active businesses`,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/></svg>,
        color: '#3b82f6', bgColor: 'rgba(59,130,246,0.08)',
      },
      {
        label: 'Settled Assets (Paid)', value: formatCurrency(settledBets / 1000),
        sub: 'Investor payouts completed',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
        color: '#22c55e', bgColor: 'rgba(34,197,94,0.08)',
      },
      {
        label: 'Live Active Risk', value: formatCurrency(currentBets / 1000),
        sub: 'Current open positions',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.48 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
        color: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)',
      },
      {
        label: 'Net Business Profit', value: formatCurrency(netProfit / 1000),
        sub: `Avg health: ${avgHealth.toFixed(1)}/100`,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
        color: netProfit >= 0 ? '#22c55e' : '#ef4444',
        bgColor: netProfit >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      },
    ];
  }, [businesses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold">{card.label}</span>
            <span className="p-1.5 rounded-lg" style={{ color: card.color, backgroundColor: card.bgColor }}>{card.icon}</span>
          </div>
          <div className="text-xl font-bold text-[var(--app-fg)]" style={{ fontFamily: 'monospace' }}>{card.value}</div>
          <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

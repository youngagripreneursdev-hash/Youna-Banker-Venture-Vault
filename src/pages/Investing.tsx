import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { TRANCHE_CONFIGS, formatCurrencyMc } from '@/lib/calculations';

export function Investing() {
  const navigate = useNavigate();
  const { currentUser, investments, businesses } = useStore();

  if (!currentUser) return null;

  const userInvestments = investments.filter((i) => i.userId === currentUser.id);

  // Group by business
  const byBusiness = userInvestments.reduce((acc, inv) => {
    const key = inv.businessId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, typeof userInvestments>);

  // Summary calculations
  const totalInvested = userInvestments.reduce((s, i) => s + i.depositedMillicents, 0);
  const totalPotentialProfit = userInvestments.reduce((s, i) => {
    const tc = TRANCHE_CONFIGS[i.trancheId];
    return s + tc.profitPerUnit * i.units;
  }, 0);
  const totalPotentialLoss = userInvestments.reduce((s, i) => {
    const tc = TRANCHE_CONFIGS[i.trancheId];
    return s + tc.lossPerUnit * i.units;
  }, 0);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">My Investments</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Portfolio Overview</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Invested</p>
            <p className="text-lg font-bold font-mono text-[var(--app-fg)]">{formatCurrencyMc(totalInvested)}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Potential Gain</p>
            <p className="text-lg font-bold font-mono text-emerald-400">+{formatCurrencyMc(totalPotentialProfit)}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Potential Risk</p>
            <p className="text-lg font-bold font-mono text-red-400">-{formatCurrencyMc(totalPotentialLoss)}</p>
          </div>
        </div>

        {/* Individual Holdings */}
        {Object.entries(byBusiness).length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[var(--app-fg)] uppercase tracking-wider">Individual Holdings</h3>
            {Object.entries(byBusiness).map(([bizId, invs]) => {
              const biz = businesses.find((b) => b.id === bizId);
              const bizInvested = invs.reduce((s, i) => s + i.depositedMillicents, 0);
              return (
                <div key={bizId} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: biz?.color || '#666' }} />
                    <span className="text-sm font-bold">{biz?.name || 'Unknown'}</span>
                  </div>
                  <div className="space-y-2">
                    {invs.map((inv) => {
                      const tc = TRANCHE_CONFIGS[inv.trancheId];
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: `${tc.color}20`, color: tc.color }}>{tc.unitName}</span>
                            <span className="text-xs text-[var(--app-fg-muted)]">x{inv.units}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono text-[var(--app-fg)]">{formatCurrencyMc(inv.depositedMillicents)}</span>
                            <span className="text-[10px] text-emerald-400 ml-2">+{formatCurrencyMc(tc.profitPerUnit * inv.units)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-[var(--app-fg-muted)]">Total in {biz?.name}</span>
                    <span className="font-mono font-bold">{formatCurrencyMc(bizInvested)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--app-fg-subtle)] mb-3">No investments yet</p>
            <button onClick={() => navigate('/market')} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all">
              Browse Market
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

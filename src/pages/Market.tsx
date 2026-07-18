import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { isMarketOpen, getMarketStatusMessage, mcToRands } from '@/lib/calculations';
import { TRANCHE_CONFIGS } from '@/lib/calculations';

export function Market() {
  const navigate = useNavigate();
  const { businesses, investments, currentUser } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'funding' | 'defaulted'>('all');

  const marketOpen = isMarketOpen();

  // Backer progress (0-100) for ventures open for funding
  const backerProgress = (b: (typeof businesses)[number]) =>
    b.requiredBackers > 0 ? Math.min(100, Math.round((b.currentBackers / b.requiredBackers) * 100)) : 0;

  const filtered = businesses.filter((b) => {
    if (b.status === 'draft') return false; // drafts stay hidden from the public market
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'funding' ? b.status === 'approved' :
      b.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getUserUnits = (businessId: string, trancheId: string) => {
    if (!currentUser) return 0;
    return investments
      .filter((i) => i.userId === currentUser.id && i.businessId === businessId && i.trancheId === trancheId)
      .reduce((sum, i) => sum + i.units, 0);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      {/* Header with skyline background */}
      <div
        className="relative border-b border-[var(--card-border)]"
        style={{
          backgroundImage: 'url(/market-header.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--app-bg)]/70 via-[var(--app-bg)]/85 to-[var(--app-bg)]" />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border-hover)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all backdrop-blur-sm bg-black/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">Venture Fund Market</h1>
                <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Buy & Sell Equity Shares</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/list-business')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              List Your Business
            </button>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${marketOpen ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-xs font-medium ${marketOpen ? 'text-green-400' : 'text-red-400'}`}>{getMarketStatusMessage()}</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 lg:mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-fg-subtle)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50"
              placeholder="Search businesses..." />
          </div>
          {(['all', 'live', 'funding', 'defaulted'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-[var(--card-bg-elevated)] border-[var(--card-border-hover)] text-[var(--app-fg)]' : 'border-transparent text-[var(--app-fg-muted)] hover:text-[var(--app-fg-dim)]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Business Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((biz) => (
            <div key={biz.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all overflow-hidden group cursor-pointer" onClick={() => navigate(`/business/${biz.id}`)}>
              {/* Card Header */}
              <div className="p-4 border-b border-[var(--card-border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: biz.color, boxShadow: `0 0 8px ${biz.color}40` }} />
                    <h3 className="text-sm font-bold text-[var(--app-fg)]">{biz.name}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${biz.status === 'live' ? 'bg-green-500/10 text-green-400' : biz.status === 'approved' ? 'bg-amber-500/10 text-amber-400' : biz.status === 'defaulted' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{biz.status === 'approved' ? 'funding' : biz.status}</span>
                </div>
                <p className="text-[11px] text-[var(--app-fg-muted)] line-clamp-2">{biz.description}</p>
              </div>

              {/* Stats */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider">Confidence Price</div>
                  <div className="text-sm font-bold font-mono" style={{ color: biz.color }}>R{mcToRands(biz.confidencePrice).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider">Health Score</div>
                  <div className={`text-sm font-bold ${biz.healthScore >= 80 ? 'text-green-400' : biz.healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{biz.healthScore}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider">Net Entries</div>
                  <div className={`text-sm font-bold ${biz.netEntries >= 0 ? 'text-green-400' : 'text-red-400'}`}>{biz.netEntries > 0 ? '+' : ''}{biz.netEntries}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider">Units Issued</div>
                  <div className="text-sm font-bold text-[var(--app-fg-dim)]">{biz.totalUnitsIssued}</div>
                </div>
              </div>

              {/* Funding Progress (approved ventures) / Tranche Actions (trading) */}
              {biz.status === 'approved' ? (
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider">Backers</span>
                    <span className="text-[10px] font-bold text-amber-400">{biz.currentBackers}/{biz.requiredBackers}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--card-bg-elevated)] overflow-hidden mb-2.5">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${backerProgress(biz)}%` }} />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/business/${biz.id}`); }}
                    className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
                  >
                    Back →
                  </button>
                </div>
              ) : (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['origin', 'velocity', 'apex'] as const).map((tid) => {
                    const tc = TRANCHE_CONFIGS[tid];
                    const userUnits = getUserUnits(biz.id, tid);
                    return (
                      <div key={tid} className="text-center p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                        <div className="text-[9px] font-bold" style={{ color: tc.color }}>{tc.name.split(' ')[0]}</div>
                        <div className="text-[10px] text-[var(--app-fg-muted)]">R{mcToRands(tc.minDeposit)}</div>
                        {userUnits > 0 && <div className="text-[9px] text-emerald-400">{userUnits} units</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--app-fg-subtle)] text-sm">No businesses match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

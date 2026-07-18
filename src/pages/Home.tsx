import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { isMarketOpen, getMarketStatusMessage, formatCurrencyMc, TRANCHE_CONFIGS } from '@/lib/calculations';

export function Home() {
  const navigate = useNavigate();
  const { currentUser, businesses, investments, paymentRequests, notifications } = useStore();

  if (!currentUser) return null;

  const marketOpen = isMarketOpen();

  // Memoize all computed values to prevent re-calculation on every render
  const {
    portfolioValue,
    pendingPaymentsCount,
    unreadNotificationsCount,
    userInvestments,
    hasInvestments,
  } = useMemo(() => {
    const userInvs = investments.filter((i) => i.userId === currentUser.id);
    return {
      portfolioValue: userInvs.reduce((sum, i) => sum + i.depositedMillicents, 0),
      pendingPaymentsCount: paymentRequests.filter((p) => p.toUserId === currentUser.id && p.status === 'pending').length,
      unreadNotificationsCount: notifications.filter((n) => !n.read && n.userId === currentUser.id).length,
      userInvestments: userInvs.slice(0, 3), // Only show first 3 on home
      hasInvestments: userInvs.length > 0,
    };
  }, [currentUser.id, investments, paymentRequests, notifications]);

  const quickActions = [
    { label: 'Find Business', desc: 'Browse the market', color: '#3b82f6', path: '/market', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> },
    { label: 'Web Bank', desc: 'Deposit & Transfer', color: '#10b981', path: '/webbank', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
    { label: 'List Business', desc: 'Submit for approval', color: '#f59e0b', path: '/list-business', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> },
    { label: 'Activity', desc: 'Notifications & alerts', color: '#8b5cf6', path: '/activity', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Hero Banner with Background */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6"
        style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--app-bg)]/95 via-[var(--app-bg)]/80 to-[var(--app-bg)]/60" />
        <div className="relative z-10 p-4 lg:p-8 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg lg:text-2xl font-bold text-[var(--app-fg)] truncate">Welcome, {currentUser.fullName.split(' ')[0]}</h1>
            <p className="text-xs text-[var(--app-fg-muted)] mt-1">Your student financial ecosystem at a glance</p>
          </div>
          <div className={`flex items-center gap-3 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl border ${marketOpen ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'} flex-shrink-0`}>
            <span className={`w-2.5 h-2.5 rounded-full ${marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} style={{ boxShadow: marketOpen ? '0 0 10px rgba(34,197,94,0.4)' : '0 0 10px rgba(239,68,68,0.4)' }} />
            <div>
              <div className={`text-xs font-bold ${marketOpen ? 'text-green-400' : 'text-red-400'}`}>{getMarketStatusMessage()}</div>
              <div className="text-[10px] text-[var(--app-fg-subtle)]">SAST (UTC+2)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Wallet Balance</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{formatCurrencyMc(currentUser.walletBalanceMillicents)}</div>
          {currentUser.pendingInterestMillicents > 0 && (
            <div className="text-[10px] text-yellow-400/60 mt-1">+{formatCurrencyMc(currentUser.pendingInterestMillicents)} pending interest</div>
          )}
        </div>
        <button
          onClick={() => navigate('/portfolio')}
          className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all text-left"
        >
          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Portfolio Value</div>
          <div className="text-xl font-bold text-blue-400 font-mono">{formatCurrencyMc(portfolioValue)}</div>
          <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">View full portfolio →</div>
        </button>
        <button
          onClick={() => navigate('/activity')}
          className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all text-left"
        >
          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Pending Payments</div>
          <div className="text-xl font-bold text-orange-400 font-mono">{pendingPaymentsCount}</div>
          <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">View activity →</div>
        </button>
        <button
          onClick={() => navigate('/activity')}
          className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all text-left"
        >
          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">Notifications</div>
          <div className="text-xl font-bold text-purple-400 font-mono">{unreadNotificationsCount}</div>
          <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">View activity →</div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button key={action.label} onClick={() => navigate(action.path)}
            className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] transition-all text-left group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-all" style={{ backgroundColor: `${action.color}15`, color: action.color }}>
              {action.icon}
            </div>
            <div className="text-sm font-bold text-[var(--app-fg)] group-hover:text-[var(--app-fg)] transition-colors">{action.label}</div>
            <div className="text-[10px] text-[var(--app-fg-subtle)]">{action.desc}</div>
          </button>
        ))}
      </div>

      {/* Mini Portfolio Preview */}
      {hasInvestments ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
              Portfolio Preview
            </h3>
            <button
              onClick={() => navigate('/portfolio')}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              View Full Portfolio →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {userInvestments.map((inv) => {
              const biz = businesses.find((b) => b.id === inv.businessId);
              const tc = TRANCHE_CONFIGS[inv.trancheId];
              return (
                <div key={inv.id} className="p-3 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: biz?.color || tc.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--app-fg)] truncate">{inv.businessName}</div>
                    <div className="text-[10px]" style={{ color: tc.color }}>{tc.name} x{inv.units}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold font-mono text-[var(--app-fg-dim)]">{formatCurrencyMc(inv.depositedMillicents)}</div>
                    <div className="text-[9px] text-emerald-400/60">+{formatCurrencyMc(tc.profitPerUnit * inv.units)} potential</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <img src="/empty-wallet.jpg" alt="Empty Portfolio" className="w-24 h-24 mx-auto mb-4 rounded-xl opacity-40 object-cover" />
          <h3 className="text-sm font-bold text-[var(--app-fg)] mb-1">Your Portfolio is Empty</h3>
          <p className="text-xs text-[var(--app-fg-muted)] mb-4">Start investing in student businesses to build your portfolio.</p>
          <button onClick={() => navigate('/market')}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-xs font-bold transition-all">
            Browse Market
          </button>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: 'Market Analytics', desc: 'Charts & rankings', path: '/analytics', color: '#3b82f6', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg> },
            { label: 'My Portfolio', desc: 'Investment details', path: '/portfolio', color: '#10b981', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg> },
            { label: 'Activity Feed', desc: 'Notifications & payments', path: '/activity', color: '#8b5cf6', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
            { label: 'Web Bank', desc: 'Transfers & deposits', path: '/webbank', color: '#f59e0b', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
            { label: 'YAVV Card', desc: 'Virtual student card', path: '/card', color: '#ef4444', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
            { label: 'Transactions', desc: 'History & records', path: '/transact', color: '#06b6d4', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-bg-hover)] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${link.color}15`, color: link.color }}>
                {link.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--app-fg)] truncate">{link.label}</div>
                <div className="text-[10px] text-[var(--app-fg-subtle)]">{link.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

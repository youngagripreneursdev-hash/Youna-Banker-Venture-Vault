import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { isMarketOpen, formatCurrencyMc, getAccountExpiryStatus, calculatePendingInterest } from '@/lib/calculations';

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, isBanker, notifications, theme, toggleTheme } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Monthly interest timer - runs every hour to check if interest should be credited.
  // Accrues at most once per period (anchored to lastInterestAt ?? createdAt) — the
  // period guard prevents the credit->balance-change->re-effect infinite loop.
  useEffect(() => {
    if (!currentUser) return;

    const PERIOD_MS = (parseInt(import.meta.env.VITE_INTEREST_PERIOD_HOURS ?? '720', 10) || 720) * 60 * 60 * 1000;

    const checkInterest = () => {
      const s = useStore.getState();
      const u = s.users.find((x) => x.id === currentUser.id);
      if (!u || u.walletBalanceMillicents <= 0) return;
      const anchor = Date.parse(u.lastInterestAt ?? u.createdAt ?? '') || Date.now();
      if (Date.now() - anchor < PERIOD_MS) return;
      const interest = calculatePendingInterest(u.walletBalanceMillicents);
      if (interest <= 0) return;
      s.updateUserBalance(u.id, interest);
      s.updateUserProfile(u.id, { lastInterestAt: new Date().toISOString() });
      s.addNotification({
        id: `n-${Date.now()}`, userId: u.id, type: 'interest_earned',
        message: `Monthly interest of ${formatCurrencyMc(interest)} credited to your wallet.`,
        read: false, createdAt: new Date().toISOString(),
      });
    };

    // Check on mount, then every hour
    checkInterest();
    const interval = setInterval(checkInterest, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  if (!isAuthenticated) return <>{children}</>;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const marketOpen = isMarketOpen();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> },
    { path: '/analytics', label: 'Analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg> },
    { path: '/portfolio', label: 'Portfolio', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg> },
    { path: '/activity', label: 'Activity', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> },
    { path: '/market', label: 'Market', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> },
    { path: '/list-business', label: 'List Business', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> },
    { path: '/webbank', label: 'Web Bank', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
    ...(isBanker ? [{ path: '/banker-login', label: 'Banker', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, fixed on desktop */}
      <aside
        className={`w-64 border-r border-[var(--card-border)] bg-[var(--app-bg)] flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">YOUNA</h1>
              <p className="text-[9px] text-[var(--app-fg-subtle)] uppercase tracking-widest">Venture Vault</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--card-bg-elevated)] text-[var(--app-fg-dim)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path} onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive(item.path) ? 'bg-[var(--card-bg-elevated)] text-[var(--app-fg)]' : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg-dim)] hover:bg-[var(--card-bg)]'
              }`}>
              {item.icon}
              {item.label}
              {item.path === '/activity' && unreadCount > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full bg-red-500 text-[var(--app-fg)] text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Market Status */}
        <div className="px-4 py-3 border-t border-[var(--card-border)]">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${marketOpen ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-medium ${marketOpen ? 'text-green-400' : 'text-red-400'}`}>
              {marketOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-[var(--card-border)]">
          <button onClick={() => handleNav('/settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--card-bg)] transition-all group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-[var(--card-border)] flex-shrink-0">
              <span className="text-xs font-bold text-[var(--app-fg-dim)]">{currentUser?.fullName.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-[var(--app-fg)] truncate">{currentUser?.fullName}</div>
              <div className="text-[10px] text-[var(--app-fg-subtle)] font-mono">{currentUser ? formatCurrencyMc(currentUser.walletBalanceMillicents) : 'R0.00'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-subtle)] group-hover:text-[var(--app-fg-dim)] flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 w-full min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-[var(--card-border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 bg-[var(--app-bg)]/90 backdrop-blur-lg z-30">
          {/* Hamburger on mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--card-bg-elevated)] transition-all mr-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-dim)]"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>

          <div className="text-[10px] text-[var(--app-fg-subtle)] truncate">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--card-bg-elevated)] transition-all"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-dim)]"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-dim)]"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
            {/* Notifications */}
            <button onClick={() => handleNav('/activity')} className="relative p-2 rounded-lg hover:bg-[var(--card-bg-elevated)] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-muted)]"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[var(--app-fg)] text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          </div>
        </header>

        {/* Demo Account Expiry Banner */}
        {currentUser?.accountExpiryDate && (() => {
          const status = getAccountExpiryStatus(currentUser.accountExpiryDate);
          if (status.isExpired) {
            return (
              <div className="mx-4 lg:mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <span className="text-xs text-red-400 font-medium">{status.message}</span>
                </div>
                <button onClick={() => navigate('/signup')} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-[var(--app-fg)] text-[10px] font-bold transition-all flex-shrink-0">
                  Create Permanent Account
                </button>
              </div>
            );
          }
          if (status.isWarning) {
            return (
              <div className="mx-4 lg:mx-6 mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <span className="text-xs text-yellow-400 font-medium">{status.message}</span>
                </div>
                <button onClick={() => navigate('/signup')} className="px-3 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500 text-[var(--app-fg)] text-[10px] font-bold transition-all flex-shrink-0">
                  Keep My Account
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Page Content */}
        <div className="min-w-0 pb-20 lg:pb-0">{children}</div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--app-bg)]/95 backdrop-blur-lg border-t border-[var(--card-border)] h-16">
          <div className="flex items-center justify-around h-full max-w-lg mx-auto">
            <NavIcon path="/" label="Home" active={location.pathname === '/'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </NavIcon>
            <NavIcon path="/analytics" label="Analytics" active={location.pathname === '/analytics'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
            </NavIcon>
            <NavIcon path="/portfolio" label="Portfolio" active={location.pathname === '/portfolio'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
            </NavIcon>
            <NavIcon path="/activity" label="Activity" active={location.pathname === '/activity'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </NavIcon>
            <NavIcon path="/investing" label="Investing" active={location.pathname === '/investing'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
            </NavIcon>
          </div>
        </nav>
      </main>
    </div>
  );
}

function NavIcon({ path, label, active, children }: { path: string; label: string; active: boolean; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all ${
        active ? 'text-emerald-400' : 'text-[var(--app-fg-muted)]'
      }`}
    >
      {children}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

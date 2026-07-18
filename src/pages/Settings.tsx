import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { canDeleteAccount, formatCurrencyMc, getAccountExpiryStatus } from '@/lib/calculations';

function ThemeIcon({ theme }: { theme: 'dark' | 'light' }) {
  if (theme === 'dark') {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
}

export function Settings() {
  const navigate = useNavigate();
  const { currentUser, investments, loans, logout, theme, toggleTheme } = useStore();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  if (!currentUser) return null;

  const userInvestments = investments.filter((i) => i.userId === currentUser.id && i.status === 'active');
  const userActiveLoans = loans.filter((l) => l.borrowerId === currentUser.id && (l.status === 'active' || l.status === 'overdue'));
  const deleteCheck = canDeleteAccount(currentUser.walletBalanceMillicents, userInvestments.length > 0, userActiveLoans.length > 0);

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') return;
    logout();
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] relative"
      style={{
        backgroundImage: 'url(/lock-pattern.jpg)',
        backgroundSize: '600px',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
        backgroundBlendMode: 'overlay',
      }}
    >
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-[var(--app-bg)]/92" />
      <div className="relative z-10 max-w-[800px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border-hover)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Account Management</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile Information
              </h3>
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-all"
              >
                Edit Profile
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Full Name</label><div className="text-sm text-[var(--app-fg)]">{currentUser.fullName}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Email</label><div className="text-sm text-[var(--app-fg)]">{currentUser.email}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Student Number</label><div className="text-sm text-[var(--app-fg)]">{currentUser.studentNumber}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Phone</label><div className="text-sm text-[var(--app-fg)]">{currentUser.phoneNumber}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Address</label><div className="text-sm text-[var(--app-fg)]">{currentUser.address}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Role</label><div className="text-sm text-purple-400 font-bold">{currentUser.role === 'banker' ? 'Banker' : 'Student'}</div></div>
              {currentUser.accountExpiryDate && (() => {
                const st = getAccountExpiryStatus(currentUser.accountExpiryDate);
                return (
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Account Expires</label>
                    <div className={`text-sm font-medium ${st.isWarning ? 'text-yellow-400' : 'text-[var(--app-fg-dim)]'}`}>
                      {new Date(currentUser.accountExpiryDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {st.isWarning && <span className="text-yellow-400/70 text-[10px] ml-2">({st.daysRemaining} days left)</span>}
                    </div>
                  </div>
                );
              })()}
              {!currentUser.accountExpiryDate && currentUser.role !== 'banker' && (
                <div>
                  <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Account Type</label>
                  <div className="text-sm text-emerald-400 font-medium">Permanent Account</div>
                </div>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 brown-corner-tl brown-corner-br">
            <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4 flex items-center gap-2">
              <ThemeIcon theme={theme} />
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--app-fg)] font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="text-[10px] text-[var(--app-fg-muted)]">
                  {theme === 'dark' ? 'Deep vault aesthetic with dark surfaces' : 'Warm cream with dark brown accents'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative w-14 h-7 rounded-full transition-colors duration-300 flex items-center"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(93,64,55,0.20)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(93,64,55,0.25)'}`,
                }}
              >
                <div
                  className="absolute w-5 h-5 rounded-full transition-transform duration-300 flex items-center justify-center"
                  style={{
                    backgroundColor: theme === 'dark' ? '#5D4037' : '#F5F0EB',
                    border: `1px solid ${theme === 'dark' ? '#8D6E63' : '#5D4037'}`,
                    transform: theme === 'dark' ? 'translateX(4px)' : 'translateX(28px)',
                  }}
                >
                  {theme === 'dark' ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#F5F0EB" stroke="none"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#5D4037" stroke="none"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Banking Details */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
              Linked Bank Account
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Bank</label><div className="text-sm text-[var(--app-fg)]">{currentUser.bankName}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Account Holder</label><div className="text-sm text-[var(--app-fg)]">{currentUser.bankAccountHolder}</div></div>
              <div><label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider block mb-1">Account Number</label><div className="text-sm text-[var(--app-fg)] font-mono">{currentUser.bankAccountNumber}</div></div>
            </div>
          </div>

          {/* Withdrawal - link to WebBank */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="m17 8-5-5-5 5"/></svg>
              Withdraw Funds
            </h3>
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 mb-4">
              <div className="flex justify-between text-xs mb-1"><span className="text-[var(--app-fg-dim)]">Wallet Balance</span><span className="text-emerald-400 font-bold font-mono">{formatCurrencyMc(currentUser.walletBalanceMillicents)}</span></div>
              <div className="flex justify-between text-xs mb-1"><span className="text-[var(--app-fg-dim)]">Withdrawal Fee</span><span className="text-orange-400 font-bold">R7.00</span></div>
              <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Minimum</span><span className="text-[var(--app-fg-dim)]">R5.00</span></div>
            </div>
            <button
              onClick={() => navigate('/webbank')}
              className="w-full bg-orange-600 hover:bg-orange-500 text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all"
            >
              Go to Web Bank to Withdraw
            </button>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-5">
            <h3 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Danger Zone - Account Deletion
            </h3>

            {!deleteCheck.allowed && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-4">
                <p className="text-[10px] text-red-400/60">Cannot delete account:</p>
                <ul className="text-[10px] text-red-400/40 list-disc list-inside mt-1">
                  {deleteCheck.reason.split('. ').map((r, i) => r && <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {deleteCheck.allowed && (
              <div>
                <p className="text-xs text-[var(--app-fg-muted)] mb-4">
                  Deleting your account is permanent. All your data will be removed. Type DELETE to confirm.
                </p>
                {!showDeleteWarning ? (
                  <button onClick={() => setShowDeleteWarning(true)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-[var(--app-fg)] text-xs font-bold transition-all">
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-red-500/50" placeholder="Type DELETE to confirm" />
                    <div className="flex gap-3">
                      <button onClick={() => { setShowDeleteWarning(false); setDeleteConfirm(''); }} className="px-4 py-2 rounded-lg border border-[var(--card-border-hover)] text-[var(--app-fg-dim)] text-xs hover:text-[var(--app-fg)] transition-all">Cancel</button>
                      <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE'}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-[var(--app-fg)] text-xs font-bold transition-all">
                        Permanently Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="text-center pb-8">
            <button onClick={() => { logout(); navigate('/login'); }}
              className="px-6 py-2.5 rounded-lg border border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] hover:border-[var(--card-border-hover)] text-xs transition-all">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

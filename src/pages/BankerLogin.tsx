import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { hashPassword } from '@/lib/crypto';

// Admin access is verified against a salted SHA-256 hash only (no plaintext comparison).
// Set VITE_ADMIN_PASSWORD_HASH in your .env file before building.
// VITE_ADMIN_PASSWORD (plaintext) is a legacy fallback, hashed at runtime for comparison.
const ADMIN_HASH = (import.meta.env.VITE_ADMIN_PASSWORD_HASH || '').toLowerCase();
const LEGACY_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

export function BankerLogin() {
  const navigate = useNavigate();
  const { adminLogin, currentUser } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    // Check if admin password is configured (hash preferred, legacy plaintext fallback)
    if (!ADMIN_HASH && !LEGACY_ADMIN_PASSWORD) {
      setError('Admin password not configured. Please set VITE_ADMIN_PASSWORD in your environment and rebuild.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Hash the input and compare against the configured hash
    const inputHash = await hashPassword(password);
    const storedHash = ADMIN_HASH || (await hashPassword(LEGACY_ADMIN_PASSWORD));

    if (inputHash === storedHash) {
      adminLogin();
      navigate('/banker');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLocked(true);
        setError('Too many failed attempts. Locked for 5 minutes.');
        setTimeout(() => { setLocked(false); setAttempts(0); setError(''); }, 5 * 60 * 1000);
      } else {
        setError(`Incorrect password. ${5 - newAttempts} attempts remaining.`);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8"
        style={{ backgroundImage: 'url(/bankerloginpicture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[var(--app-bg)]/90" style={{ position: 'fixed' }} />
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h1 className="text-xl font-bold">Banker Access</h1>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1 uppercase tracking-widest">Restricted Area</p>
            {currentUser && (
              <p className="text-[10px] text-[var(--app-fg-subtle)] mt-2">Logged in as: {currentUser.fullName}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter admin password"
                disabled={locked}
                className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-40"
              />
            </div>
            <button
              type="submit"
              disabled={locked || isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[var(--app-fg)] text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? 'Verifying...' : 'Authenticate'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-2 rounded-lg border border-[var(--card-border)] text-[var(--app-fg-dim)] text-xs transition-all hover:bg-[var(--card-bg-hover)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

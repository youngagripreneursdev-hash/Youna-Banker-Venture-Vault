import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { hashPassword } from '@/lib/crypto';

export function Login() {
  const navigate = useNavigate();
  const { users, login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsReset, setNeedsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsReset(false);
    setIsLoading(true);

    // Find user by email
    const user = users.find((u) => u.email === email);
    if (!user) {
      setError('No account found with this email. Please sign up first.');
      setIsLoading(false);
      return;
    }

    const storedHash = user._passwordHash || '';

    // Legacy accounts without a stored hash must reset their password first
    if (!storedHash) {
      setError('This account uses an old password format. Please reset it via Forgot Password.');
      setNeedsReset(true);
      setIsLoading(false);
      return;
    }

    // Hash the input password and compare with stored hash
    const inputHash = await hashPassword(password);
    if (inputHash !== storedHash) {
      setError('Incorrect password. Please try again.');
      setIsLoading(false);
      return;
    }

    login(user);
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/userloginpicture.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[var(--app-bg)]/90" />
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h1 className="text-xl font-bold">Welcome Back</h1>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1 uppercase tracking-widest">YOUNA Venture Vault</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <span className="text-xs text-red-400">
                {error}
                {needsReset && (
                  <button type="button" onClick={() => navigate('/forgot-password')} className="ml-1 text-blue-400 hover:text-blue-300 underline transition-colors">
                    Forgot Password
                  </button>
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.za"
                className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[var(--app-fg)] text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button onClick={() => navigate('/forgot-password')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot Password?</button>
            <div>
              <button onClick={() => navigate('/signup')} className="text-xs text-[var(--app-fg-subtle)] hover:text-[var(--app-fg-dim)] transition-colors">
                Don't have an account? <span className="text-emerald-400">Sign Up</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { useStore } from '@/store/useStore';
import { generateResetCode } from '@/lib/calculations';
import { hashPassword } from '@/lib/crypto';

// EmailJS is only used when all three env vars are configured; otherwise the
// app falls back to showing the reset code on screen (demo mode).
const EJ_OK = Boolean(
  import.meta.env.VITE_EMAILJS_SERVICE_ID &&
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID_RESET &&
  import.meta.env.VITE_EMAILJS_PUBLIC_KEY
);

export function ForgotPassword() {
  const navigate = useNavigate();
  const { users, setResetCode } = useStore();
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [generatedCode, setGeneratedCode] = useState('');
  const [foundUser, setFoundUser] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [isSending, setIsSending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Deliver the reset code via EmailJS. Returns true on success.
  const deliverCode = async (toEmail: string, toName: string, resetCode: string): Promise<boolean> => {
    if (!EJ_OK) return false;
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID_RESET,
        { to_email: toEmail, to_name: toName, reset_code: resetCode, app_name: 'YOUNA Venture Vault' },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      return true;
    } catch {
      return false;
    }
  };

  const handleSendCode = async () => {
    setError('');
    if (isSending) return;
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Find user by email
    const user = users.find((u) => u.email === email);

    if (!user) {
      setError('No account found with that email. Please check and try again.');
      return;
    }

    setIsSending(true);
    const newCode = generateResetCode();
    setGeneratedCode(newCode);
    setFoundUser(user.id);

    // Save code with 10 minute expiry
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    setResetCode(user.id, newCode, expiry);

    const sent = await deliverCode(user.email, user.fullName, newCode);
    setEmailStatus(sent ? 'sent' : EJ_OK ? 'failed' : 'idle');

    setIsSending(false);
    setStep('code');
    setCountdown(240); // 4 minutes cooldown
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    if (!foundUser) return;

    const newCode = generateResetCode();
    setGeneratedCode(newCode);

    const user = users.find((u) => u.id === foundUser);
    if (user) {
      const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      setResetCode(user.id, newCode, expiry);
      const sent = await deliverCode(user.email, user.fullName, newCode);
      setEmailStatus(sent ? 'sent' : EJ_OK ? 'failed' : 'idle');
    }

    setCountdown(240);
    setError('');
  };

  const handleVerifyCode = () => {
    setError('');
    if (!foundUser) return;

    const user = users.find((u) => u.id === foundUser);
    if (!user) {
      setError('User not found. Please start over.');
      return;
    }

    // Check if code expired
    if (user.resetCodeExpiry && new Date(user.resetCodeExpiry) < new Date()) {
      setError('Code has expired. Please request a new one.');
      setResetCode(foundUser, null, null);
      return;
    }

    if (code.toUpperCase() !== user.resetCode) {
      setError('Invalid code. Please check and try again.');
      return;
    }

    setStep('reset');
  };

  const handleResetPassword = async () => {
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!foundUser) return;

    // Update password (hashed before storage)
    const { updateUserProfile } = useStore.getState();
    const hash = await hashPassword(newPassword);
    updateUserProfile(foundUser, { _passwordHash: hash });
    setResetCode(foundUser, null, null);

    // Show success and redirect
    alert('Password reset successful! You can now log in with your new password.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] text-[var(--app-fg)] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(10,11,13,0.8) 0%, rgba(10,11,13,0.95) 100%)' }} />

      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">YOUNA Vault</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-widest">Password Recovery</p>
          </div>
        </div>

        {/* Step 1: Enter Email */}
        {step === 'email' && (
          <div className="rounded-2xl border border-[var(--card-border)] backdrop-blur-xl bg-[var(--card-bg)] p-8 shadow-2xl">
            <h2 className="text-lg font-bold mb-1">Forgot Password?</h2>
            <p className="text-xs text-[var(--app-fg-muted)] mb-6">Enter your email address to receive a reset code.</p>

            <div className="mb-4">
              <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold block mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)]" placeholder="you@student.ac.za" />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg mb-4">{error}</p>}

            <button onClick={handleSendCode} disabled={isSending} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg">
              {isSending ? 'Sending...' : 'Send Reset Code'}
            </button>

            <p className="text-center mt-4">
              <button onClick={() => navigate('/login')} className="text-xs text-[var(--app-fg-subtle)] hover:text-[var(--app-fg)] transition-colors">
                Back to Login
              </button>
            </p>
          </div>
        )}

        {/* Step 2: Enter Code */}
        {step === 'code' && (
          <div className="rounded-2xl border border-[var(--card-border)] backdrop-blur-xl bg-[var(--card-bg)] p-8 shadow-2xl">
            <h2 className="text-lg font-bold mb-1">Enter Verification Code</h2>
            <p className="text-xs text-[var(--app-fg-muted)] mb-6">
              We sent a code to {email}. Check your inbox.
            </p>

            {/* Delivery status: emailed confirmation, or on-screen demo code */}
            {emailStatus === 'sent' ? (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400">A reset code was sent to your email.</p>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Demo Mode - Your Code:</p>
                <p className="text-lg font-mono font-bold text-emerald-400 tracking-widest">{generatedCode}</p>
                {emailStatus === 'failed' && (
                  <p className="text-[10px] text-yellow-400 mt-1">Email delivery failed — here is your code instead.</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold block mb-1.5">Reset Code (2 letters + 3 numbers)</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)] font-mono tracking-widest uppercase text-center" placeholder="AB123" />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg mb-4">{error}</p>}

            <button onClick={handleVerifyCode} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg mb-3">
              Verify Code
            </button>

            {/* Resend */}
            {countdown > 0 ? (
              <p className="text-center text-xs text-[var(--app-fg-subtle)]">Resend available in {formatCountdown()}</p>
            ) : (
              <div className="space-y-2">
                <button onClick={handleResend} className="w-full py-2 rounded-lg border border-[var(--card-border)] text-xs text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all">
                  Didn't receive it? Resend Code
                </button>
                <p className="text-center text-[10px] text-[var(--app-fg-subtle)]">
                  Check your spam folder. Still nothing?{' '}
                  <button onClick={() => { setStep('email'); setError('Please contact youngagripreneursdev@gmail.com for assistance.'); }} className="text-yellow-400 hover:text-yellow-300 underline">
                    Get help
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <div className="rounded-2xl border border-[var(--card-border)] backdrop-blur-xl bg-[var(--card-bg)] p-8 shadow-2xl">
            <h2 className="text-lg font-bold mb-1">Create New Password</h2>
            <p className="text-xs text-[var(--app-fg-muted)] mb-6">Choose a strong, unique password.</p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold block mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)]" placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold block mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)]" placeholder="Re-enter password" />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg mb-4">{error}</p>}

            <button onClick={handleResetPassword} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg">
              Reset Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

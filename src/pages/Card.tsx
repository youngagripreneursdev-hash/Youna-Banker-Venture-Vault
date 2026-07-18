import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrencyMc } from '@/lib/calculations';

export function Card() {
  const navigate = useNavigate();
  const { currentUser } = useStore();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'rotateX(0) rotateY(0)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!currentUser) return null;

  const cardNumber = `YAVV ${currentUser.studentNumber.slice(0, 4)} ${currentUser.studentNumber.slice(4, 8)} ${currentUser.id.slice(-4)}`;
  // Card expiry: 2 years from account creation (not demo expiry)
  const cardExpiryDate = new Date(currentUser.createdAt);
  cardExpiryDate.setFullYear(cardExpiryDate.getFullYear() + 2);
  const expiryDate = cardExpiryDate.toLocaleDateString('en-ZA', { month: '2-digit', year: '2-digit' });

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Your YAVV Card</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Virtual Student Card</p>
          </div>
        </div>

        {/* Virtual Card with 3D Tilt */}
        <div className="flex flex-col items-center gap-6">
          <div style={{ perspective: '1000px' }} className="w-full max-w-[420px]">
            <div
              ref={cardRef}
              className="relative w-full rounded-2xl overflow-hidden transition-transform duration-200 ease-out"
              style={{
                aspectRatio: '1.6 / 1',
                backgroundImage: 'url(/youngagri.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(45deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)', zIndex: 1 }} />

              {/* Card Content */}
              <div className="relative z-10 h-full p-6 flex flex-col justify-between" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {/* Top Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[3px] text-emerald-400">YOUNA Venture Vault</p>
                    <div className="mt-2 w-[50px] h-[40px] rounded-lg" style={{ background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)' }} />
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-dim)] rotate-90"><path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z"/><path d="M5 12h14"/></svg>
                </div>

                {/* Card Number */}
                <div className="font-mono text-xl md:text-2xl tracking-[2px] text-[var(--app-fg)]">
                  {cardNumber}
                </div>

                {/* Bottom Row */}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] uppercase text-[var(--app-fg-subtle)] mb-0.5">Card Holder</p>
                    <p className="text-sm font-medium tracking-wide uppercase">{currentUser.fullName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-[var(--app-fg-subtle)] mb-0.5">Expires</p>
                    <p className="text-sm font-medium tracking-wide">{expiryDate}</p>
                  </div>
                  <div className="w-12 h-8 bg-[var(--app-fg)]/10 rounded flex items-center justify-center text-[10px] font-bold italic text-[var(--app-fg)]">
                    YAVV
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="w-full max-w-[420px] space-y-3">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 brown-corner-tl brown-corner-br">
              <h3 className="text-xs font-bold text-[var(--app-fg)] mb-3 uppercase tracking-wider">Account Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--app-fg-muted)]">Wallet Balance</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrencyMc(currentUser.walletBalanceMillicents)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--app-fg-muted)]">Student Number</span>
                  <span className="font-mono">{currentUser.studentNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--app-fg-muted)]">Account Type</span>
                  <span className="capitalize">{currentUser.role}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--app-fg-muted)]">Status</span>
                  <span className="text-emerald-400">{currentUser.isStudentVerified ? 'Verified' : 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Pending Interest */}
            {currentUser.pendingInterestMillicents > 0 && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-400">Pending Interest</span>
                  <span className="font-mono font-bold text-yellow-400">{formatCurrencyMc(currentUser.pendingInterestMillicents)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

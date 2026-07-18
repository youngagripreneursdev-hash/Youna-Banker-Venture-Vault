import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white relative overflow-hidden"
      style={{
        backgroundImage: 'url(/notfound-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(10,11,13,0.8) 0%, rgba(10,11,13,0.9) 50%, rgba(10,11,13,0.97) 100%)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-md px-6">
        {/* 404 */}
        <div className="mb-6">
          <span className="text-8xl font-black text-white/[0.04] select-none">404</span>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <circle cx="12" cy="12" r="10"/>
            <path d="m15 9-6 6"/>
            <path d="m9 9 6 6"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Lost at the Crossroads</h1>
        <p className="text-sm text-white/30 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. 
          Every path in the vault leads somewhere — let us guide you back.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => navigate('/market')}
            className="px-6 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm font-medium transition-all"
          >
            Browse Market
          </button>
        </div>

        {/* Technical detail */}
        <p className="text-[10px] text-white/10 mt-8 font-mono">
          YOUNA Venture Vault &copy; {new Date().getFullYear()} — Route not found
        </p>
      </div>
    </div>
  );
}

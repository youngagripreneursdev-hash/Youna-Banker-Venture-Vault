import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { BASE_RULE_BACKERS } from '@/lib/calculations';
import type { Business } from '@/types';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
  '#14b8a6', '#d946ef', '#22c55e', '#eab308', '#64748b',
];

export function ListBusiness() {
  const navigate = useNavigate();
  const { currentUser, addBusiness, addNotification } = useStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!currentUser) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Business name is required';
    else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!description.trim()) e.description = 'Description is required';
    else if (description.trim().length < 20) e.description = 'Description must be at least 20 characters';
    if (!targetMarket.trim()) e.targetMarket = 'Target market is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !currentUser) return;

    const newBusiness: Business = {
      id: `biz-${Date.now()}`,
      ownerId: currentUser.id,
      ownerName: currentUser.fullName,
      name: name.trim(),
      description: description.trim(),
      status: 'draft',
      healthScore: 50,
      color,
      confidencePrice: 100000,
      totalUnitsIssued: 0,
      unitsHeldByVault: 0,
      netEntries: 0,
      currentBets: 0,
      settledBets: 0,
      totalRevenue: 0,
      netProfit: 0,
      investorPayouts: 0,
      adminFees: 0,
      profitMargin: 0,
      avgSettlementDays: 7,
      velocityScore: 50,
      isLive: false,
      currentBackers: 0,
      requiredBackers: BASE_RULE_BACKERS,
      businessDescription: description.trim(),
      targetMarket: targetMarket.trim(),
      needsTimeExtension: false,
    };

    addBusiness(newBusiness);
    addNotification({
      id: `n-${Date.now()}`,
      userId: currentUser.id,
      type: 'business_backed',
      message: `Your business "${name.trim()}" has been submitted for review. A banker will review it shortly.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
        <div className="max-w-[600px] mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--app-fg)] mb-2">Business Submitted!</h2>
            <p className="text-sm text-[var(--app-fg-muted)] mb-2">
              &ldquo;{name}&rdquo; has been submitted for banker review.
            </p>
            <p className="text-xs text-[var(--app-fg-subtle)] mb-6 max-w-sm mx-auto">
              Your business needs <strong className="text-[var(--app-fg-dim)]">{BASE_RULE_BACKERS} backers</strong> to go live on the market.
              Share your listing with fellow students to gather support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/market')}
                className="px-5 py-2.5 rounded-lg bg-[var(--card-bg-elevated)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-xs font-bold transition-all"
              >
                Browse Market
              </button>
              <button
                onClick={() => { setStep('form'); setName(''); setDescription(''); setTargetMarket(''); setColor(PRESET_COLORS[0]); }}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
              >
                List Another Business
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[640px] mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/market')}
            className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">List Your Business</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Submit for loan approval &amp; market listing</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <div>
              <p className="text-xs text-blue-400 font-medium mb-1">How it works</p>
              <ol className="text-[11px] text-[var(--app-fg-muted)] space-y-1 list-decimal list-inside">
                <li>Fill out your business details below</li>
                <li>A banker reviews and approves your listing</li>
                <li>Gather {BASE_RULE_BACKERS} student backers to go live</li>
                <li>Once live, investors can buy shares in your business</li>
              </ol>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-medium text-[var(--app-fg)] mb-1.5 block">
              Business Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GreenHorizon Farms"
              className={`w-full bg-[var(--card-bg-elevated)] border rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none transition-colors ${errors.name ? 'border-red-500/50' : 'border-[var(--card-border-hover)] focus:border-emerald-500/50'}`}
            />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-[var(--app-fg)] mb-1.5 block">
              Business Description <span className="text-red-400">*</span>
            </label>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mb-1.5">Describe what your business does, your products/services, and your vision. (min 20 characters)</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We are an urban farming startup that grows organic vegetables using hydroponic systems..."
              rows={4}
              className={`w-full bg-[var(--card-bg-elevated)] border rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none resize-none transition-colors ${errors.description ? 'border-red-500/50' : 'border-[var(--card-border-hover)] focus:border-emerald-500/50'}`}
            />
            {errors.description && <p className="text-[10px] text-red-400 mt-1">{errors.description}</p>}
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1 text-right">{description.length} chars</p>
          </div>

          {/* Target Market */}
          <div>
            <label className="text-xs font-medium text-[var(--app-fg)] mb-1.5 block">
              Target Market <span className="text-red-400">*</span>
            </label>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mb-1.5">Who are your customers? Be specific about demographics and geography.</p>
            <input
              type="text"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              placeholder="e.g. University students in Pretoria aged 18-25 who want affordable organic food"
              className={`w-full bg-[var(--card-bg-elevated)] border rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none transition-colors ${errors.targetMarket ? 'border-red-500/50' : 'border-[var(--card-border-hover)] focus:border-emerald-500/50'}`}
            />
            {errors.targetMarket && <p className="text-[10px] text-red-400 mt-1">{errors.targetMarket}</p>}
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-medium text-[var(--app-fg)] mb-2 block">Brand Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--app-bg)] ring-white scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--app-fg)] truncate">{name || 'Your Business Name'}</p>
                <p className="text-[10px] text-[var(--app-fg-muted)] truncate">{description || 'Description will appear here'}</p>
              </div>
              <span className="ml-auto text-[9px] px-2 py-0.5 rounded font-bold bg-gray-500/10 text-gray-400 flex-shrink-0">DRAFT</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Submit Business for Review
          </button>
          <p className="text-[10px] text-[var(--app-fg-subtle)] text-center">
            Your business will be reviewed by a banker before appearing on the market.
          </p>
        </div>
      </div>
    </div>
  );
}

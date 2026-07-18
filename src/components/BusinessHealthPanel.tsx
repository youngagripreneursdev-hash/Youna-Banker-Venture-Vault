import { useState } from 'react';
import type { Business } from '@/types';
import { useStore } from '@/store/useStore';

interface BusinessHealthPanelProps {
  business: Business;
  onSelfReport: (score: number) => void;
}

export function BusinessHealthPanel({ business, onSelfReport }: BusinessHealthPanelProps) {
  const [selfScore, setSelfScore] = useState(Math.round(business.healthScore / 10));
  const { confidenceHistory } = useStore();
  const bizConfidence = confidenceHistory[business.id] || [];
  const latestConfidence = bizConfidence[bizConfidence.length - 1];
  const daysRemaining = Math.max(0, 15 - Math.floor((Date.now() - (latestConfidence?.timestamp || 0)) / (1000 * 60 * 60 * 24)));

  const statusColor = business.healthScore >= 80 ? '#22c55e' : business.healthScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          Business Solvency Index
        </h3>
        <p className="text-[10px] text-[var(--app-fg-muted)] mt-1">15-day internal assessment: Will you settle the amount in time?</p>
      </div>

      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
        <div className="text-3xl font-bold" style={{ color: statusColor }}>{business.healthScore}</div>
        <div>
          <div className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider">Health Score</div>
          <div className="text-[10px] text-[var(--app-fg-subtle)]">{business.healthScore >= 80 ? 'Excellent solvency outlook' : business.healthScore >= 60 ? 'Moderate risk detected' : 'Critical attention needed'}</div>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg-muted)] block mb-2">Self-Assessment (1-10): Settlement Confidence</label>
        <input type="range" min="1" max="10" value={selfScore} onChange={(e) => setSelfScore(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${statusColor} ${(selfScore - 1) * 11.1}%, rgba(255,255,255,0.08) ${(selfScore - 1) * 11.1}%)` }} />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-red-400">Unlikely (1)</span>
          <span className="text-xs font-bold text-[var(--app-fg-dim)]">{selfScore}/10</span>
          <span className="text-[9px] text-green-400">Confident (10)</span>
        </div>
      </div>

      <button onClick={() => onSelfReport(selfScore)}
        className="w-full py-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-[var(--app-fg)] transition-all active:scale-95">
        SUBMIT SOLVENCY REPORT
      </button>

      <div className="mt-3 text-[9px] text-[var(--app-fg-subtle)] text-center">
        Next report due in: <span className="text-purple-400">{daysRemaining} days</span>
      </div>
    </div>
  );
}

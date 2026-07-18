import { useState } from 'react';

interface ConfidenceVotePanelProps {
  businessName: string;
  businessColor: string;
  onVote: (vote: number) => void;
  lastVoteDate?: string;
  daysUntilNext?: number;
}

export function ConfidenceVotePanel({
  businessName,
  businessColor,
  onVote,
  lastVoteDate,
  daysUntilNext = 0,
}: ConfidenceVotePanelProps) {
  const [vote, setVote] = useState(7);

  const labels = [
    { threshold: 1, label: 'Certain Default', color: '#ef4444' },
    { threshold: 3, label: 'High Risk', color: '#f97316' },
    { threshold: 5, label: 'Uncertain', color: '#f59e0b' },
    { threshold: 7, label: 'Likely Solvent', color: '#3b82f6' },
    { threshold: 9, label: 'Highly Reliable', color: '#22c55e' },
    { threshold: 10, label: 'Guaranteed', color: '#10b981' },
  ];

  const currentLabel = labels.filter(l => vote >= l.threshold).pop() || labels[0];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={businessColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Investor Confidence Vote
        </h3>
        <p className="text-[10px] text-[var(--app-fg-muted)] mt-1">
          On a scale of 1-10, do you think <span className="text-[var(--app-fg-dim)]">{businessName}</span> will settle their debt on time?
        </p>
      </div>

      {/* Slider */}
      <div className="mb-3">
        <input
          type="range"
          min="1"
          max="10"
          value={vote}
          onChange={(e) => setVote(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${currentLabel.color} ${(vote - 1) * 11.1}%, rgba(255,255,255,0.08) ${(vote - 1) * 11.1}%)`,
          }}
        />
        <div className="flex justify-between mt-1.5 text-[9px] text-[var(--app-fg-subtle)]">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
          <span>7</span>
          <span>8</span>
          <span>9</span>
          <span>10</span>
        </div>
      </div>

      {/* Vote Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: currentLabel.color }}>
            {vote}
          </span>
          <span className="text-[10px] text-[var(--app-fg-muted)]">/ 10</span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-md"
          style={{
            color: currentLabel.color,
            backgroundColor: `${currentLabel.color}15`,
          }}
        >
          {currentLabel.label}
        </span>
      </div>

      {/* Submit Button */}
      <button
        onClick={() => onVote(vote)}
        className="w-full py-2.5 rounded-lg text-xs font-bold text-[var(--app-fg)] transition-all active:scale-95"
        style={{ backgroundColor: businessColor }}
      >
        SUBMIT CONFIDENCE VOTE
      </button>

      {/* Info */}
      <div className="mt-3 flex items-center justify-between text-[9px] text-[var(--app-fg-subtle)]">
        {lastVoteDate && <span>Last vote: {lastVoteDate}</span>}
        {daysUntilNext > 0 && (
          <span className="text-[var(--app-fg-muted)]">
            Next vote in: <span className="text-[var(--app-fg-dim)]">{daysUntilNext} days</span>
          </span>
        )}
      </div>
    </div>
  );
}

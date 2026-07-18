import type { TrancheId } from '@/types';
import { TRANCHE_CONFIGS } from '@/lib/calculations';

interface TrancheSelectorProps {
  activeTranche: TrancheId;
  onSelect: (tranche: TrancheId) => void;
}

export function TrancheSelector({ activeTranche, onSelect }: TrancheSelectorProps) {
  const tranches: TrancheId[] = ['origin', 'velocity', 'apex'];

  return (
    <div className="space-y-2">
      {tranches.map((tid) => {
        const config = TRANCHE_CONFIGS[tid];
        const isActive = activeTranche === tid;

        return (
          <button
            key={tid}
            onClick={() => onSelect(tid)}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
              isActive
                ? 'border-[var(--card-border-hover)] bg-[var(--card-bg-hover)]'
                : 'border-transparent hover:border-[var(--card-border)] hover:bg-[var(--card-bg)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isActive ? 'scale-110' : 'opacity-40'
                  }`}
                  style={{
                    backgroundColor: config.color,
                    boxShadow: isActive ? `0 0 10px ${config.color}60` : 'none',
                  }}
                />
                <div>
                  <div className="text-xs font-bold text-[var(--app-fg)]">{config.name}</div>
                  <div className="text-[10px] text-[var(--app-fg-muted)]">{config.financialTerm}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-[var(--app-fg-dim)]">
                  R{config.basePrice}
                </div>
                <div
                  className="text-[9px] uppercase tracking-wider font-bold"
                  style={{ color: config.color }}
                >
                  {tid === 'origin' ? 'Conservative' : tid === 'velocity' ? 'Moderate' : 'Aggressive'}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

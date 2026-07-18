import { useStore } from '@/store/useStore';
import type { Business } from '@/types';

interface BusinessSelectorProps {
  businesses: Business[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BusinessSelector({ businesses, selectedId, onSelect }: BusinessSelectorProps) {
  const { confidenceHistory } = useStore();

  return (
    <div className="space-y-1 max-h-[400px] overflow-auto pr-1">
      {businesses.map((biz) => {
        const isSelected = biz.id === selectedId;
        const bizConfidence = confidenceHistory[biz.id] || [];
        const latestConfidence = bizConfidence[bizConfidence.length - 1];

        return (
          <button key={biz.id} onClick={() => onSelect(biz.id)}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
              isSelected ? 'border-[var(--card-border-hover)] bg-[var(--card-bg-hover)]' : 'border-transparent hover:border-[var(--card-border)] hover:bg-[var(--card-bg)]'
            }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${isSelected ? 'scale-110' : 'opacity-50'}`}
                style={{ backgroundColor: biz.color, boxShadow: isSelected ? `0 0 8px ${biz.color}50` : 'none' }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--app-fg)] truncate">{biz.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${biz.status === 'live' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-[9px] text-white/25 uppercase">{biz.status}</span>
                  <span className="text-[9px] text-[var(--app-fg-subtle)]">|</span>
                  <span className="text-[9px] text-white/25">Health: {biz.healthScore}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-bold" style={{ color: (latestConfidence?.compositeScore || 50) >= 70 ? '#22c55e' : (latestConfidence?.compositeScore || 50) >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {latestConfidence?.compositeScore.toFixed(0) || 50}
                </div>
                <div className="text-[9px] text-[var(--app-fg-subtle)]">CLI</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

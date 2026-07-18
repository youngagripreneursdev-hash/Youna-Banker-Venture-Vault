import { useMemo, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { compareVelocities } from '@/lib/calculations';
import type { Business } from '@/types';

interface VelocityComparisonChartProps {
  businesses: Business[];
}

function VelocityComparisonChartInner({ businesses }: VelocityComparisonChartProps) {
  const chartData = useMemo(() => {
    if (businesses.length === 0) return [];
    const { labels, datasets } = compareVelocities(businesses);
    return labels.map((label: string, i: number) => {
      const row: Record<string, string | number> = { period: label };
      datasets.forEach((ds: { name: string; data: number[] }) => {
        row[ds.name] = ds.data[i];
      });
      return row;
    });
  }, [businesses]);

  const datasets = useMemo(() => {
    if (businesses.length === 0) return [];
    return compareVelocities(businesses).datasets;
  }, [businesses]);

  if (businesses.length === 0) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Settlement Velocity Matrix
            </h3>
            <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5">Execution speed comparison (higher = faster settlement)</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--app-fg-subtle)] mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p className="text-xs text-[var(--app-fg-muted)]">No business data available</p>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">Businesses will appear here once listed</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Settlement Velocity Matrix
          </h3>
          <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5">Execution speed comparison (higher = faster settlement)</p>
        </div>
      </div>
      <div className="flex-1 px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="period" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(10,11,13,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
            <Legend wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }} iconType="line" iconSize={10} />
            {datasets.map((ds: { name: string; color: string }) => (
              <Line
                key={ds.name}
                type="monotone"
                dataKey={ds.name}
                stroke={ds.color}
                strokeWidth={2}
                dot={{ fill: ds.color, r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: ds.color, stroke: '#fff', strokeWidth: 1.5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export const VelocityComparisonChart = memo(VelocityComparisonChartInner);

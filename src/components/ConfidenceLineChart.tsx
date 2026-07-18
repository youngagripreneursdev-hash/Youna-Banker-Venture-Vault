import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import type { ConfidencePoint } from '@/types';

interface ConfidenceLineChartProps {
  data: ConfidencePoint[];
  businessColor: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ConfidenceLineChart({ data, businessColor }: ConfidenceLineChartProps) {
  const chartData = data.map((p) => ({
    date: formatDate(p.timestamp),
    composite: p.compositeScore,
    investor: p.investorVote * 10,
    business: p.businessSelfReport * 10,
    votes: p.voteCount,
  }));

  const latest = chartData[chartData.length - 1];
  const status =
    latest.composite >= 70
      ? 'Strong Confidence'
      : latest.composite >= 50
        ? 'Moderate Confidence'
        : 'Low Confidence';

  const statusColor =
    latest.composite >= 70 ? '#22c55e' : latest.composite >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--app-fg)] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={businessColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Debtor Confidence Index
          </h3>
          <p className="text-[10px] text-[var(--app-fg-muted)] mt-0.5">
            Composite of investor votes + business self-reports (updated every 15 days)
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color: statusColor }}>
            {latest.composite.toFixed(1)}/100
          </div>
          <div className="text-[10px] text-[var(--app-fg-muted)]">{status}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`confidenceGrad-${businessColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={businessColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={businessColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4" />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,11,13,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Area
              type="monotone"
              dataKey="composite"
              fill={`url(#confidenceGrad-${businessColor})`}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="composite"
              stroke={businessColor}
              strokeWidth={2.5}
              dot={{ fill: businessColor, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: businessColor, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="investor"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="business"
              stroke="#8b5cf6"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-2 border-t border-[var(--card-border)] text-[10px] text-[var(--app-fg-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: businessColor }} />
          Composite Score
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-blue-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, #0a0b0d 3px, #0a0b0d 6px)' }} />
          Investor Sentiment
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, #0a0b0d 3px, #0a0b0d 6px)' }} />
          Business Self-Report
        </div>
      </div>
    </div>
  );
}

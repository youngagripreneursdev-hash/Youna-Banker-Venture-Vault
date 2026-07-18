import { useRef, useEffect, useState, useCallback } from 'react';
import type { Candle } from '@/types';
import { generateNextCandle } from '@/lib/calculations';

interface CandlestickChartProps {
  candles: Candle[];
  basePrice: number;
  buyVolume: number;
  sellVolume: number;
  confidenceScore: number;
  isLive: boolean;
  businessName: string;
  trancheName: string;
  color: string;
  onBuy: () => void;
  onSell: () => void;
  onCandleUpdate?: (candles: Candle[]) => void;
}

export function CandlestickChart({
  candles: initialCandles,
  basePrice,
  buyVolume: initialBuyVol,
  sellVolume: initialSellVol,
  confidenceScore,
  isLive,
  businessName,
  trancheName,
  color,
  onBuy,
  onSell,
  onCandleUpdate,
}: CandlestickChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [buyVolume, setBuyVolume] = useState(initialBuyVol);
  const [sellVolume, setSellVolume] = useState(initialSellVol);
  const [currentPrice, setCurrentPrice] = useState(
    initialCandles[initialCandles.length - 1]?.close || basePrice
  );
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>('flat');
  const animRef = useRef<number>(0);

  const MAX_CANDLES = 40;

  const drawCandles = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const candleW = width / MAX_CANDLES;

    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const range = maxP - minP || 1;

    const getY = (p: number) =>
      height - ((p - minP) / range) * height * 0.85 - height * 0.075;

    let html = '';

    // Grid lines
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      const price = maxP - (range / 5) * i;
      html += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4" />`;
      html += `<text x="${width - 5}" y="${y + 10}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="end" font-family="monospace">${price.toFixed(2)}</text>`;
    }

    // Volume bars at bottom
    const maxVol = Math.max(...candles.map((c) => c.volume), 1);
    candles.forEach((c, i) => {
      const x = i * candleW;
      const volH = (c.volume / maxVol) * height * 0.08;
      const volColor = c.close >= c.open
        ? 'rgba(34,197,94,0.15)'
        : 'rgba(239,68,68,0.15)';
      html += `<rect x="${x + 1}" y="${height - volH}" width="${candleW - 2}" height="${volH}" fill="${volColor}" />`;
    });

    // Candles
    candles.forEach((c, i) => {
      const x = i * candleW;
      const isUp = c.close >= c.open;
      const candleColor = isUp ? '#22c55e' : '#ef4444';

      // Wick
      html += `<line x1="${x + candleW / 2}" y1="${getY(c.high)}" x2="${x + candleW / 2}" y2="${getY(c.low)}" stroke="${candleColor}" stroke-width="1" opacity="0.7" />`;

      // Body
      const bodyTop = getY(Math.max(c.open, c.close));
      const bodyBottom = getY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);

      html += `<rect x="${x + 2}" y="${bodyTop}" width="${candleW - 4}" height="${bodyH}" fill="${candleColor}" rx="1" />`;

      // Glow effect for latest candle
      if (i === candles.length - 1) {
        html += `<rect x="${x + 2}" y="${bodyTop}" width="${candleW - 4}" height="${bodyH}" fill="${candleColor}" opacity="0.3" rx="1">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
        </rect>`;
      }
    });

    svg.innerHTML = html;
  }, [candles]);

  // Animation loop for live market
  useEffect(() => {
    let tickCount = 0;

    const animate = () => {
      tickCount++;

      if (tickCount % 30 === 0) {
        setCandles((prev) => {
          const last = prev[prev.length - 1];
          const next = generateNextCandle(
            last,
            basePrice,
            buyVolume,
            sellVolume,
            confidenceScore,
            isLive
          );
          const updated = [...prev.slice(1), next];
          setCurrentPrice(next.close);
          setPriceDirection(
            next.close > last.close ? 'up' : next.close < last.close ? 'down' : 'flat'
          );
          onCandleUpdate?.(updated);
          return updated;
        });
        tickCount = 0;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [basePrice, buyVolume, sellVolume, confidenceScore, isLive, onCandleUpdate]);

  // Redraw on candles change
  useEffect(() => {
    drawCandles();
  }, [drawCandles]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => drawCandles();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCandles]);

  const handleBuy = () => {
    setBuyVolume((v) => v + Math.random() * 15 + 5);
    onBuy();
  };

  const handleSell = () => {
    setSellVolume((v) => v + Math.random() * 10 + 3);
    onSell();
  };

  const priceColor =
    priceDirection === 'up'
      ? 'text-green-400'
      : priceDirection === 'down'
        ? 'text-red-400'
        : 'text-[var(--app-fg)]';

  const priceBg =
    priceDirection === 'up'
      ? 'bg-green-500/10 border-green-500/20'
      : priceDirection === 'down'
        ? 'bg-red-500/10 border-red-500/20'
        : 'bg-[var(--card-bg-elevated)] border-[var(--card-border-hover)]';

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
          <div>
            <h3 className="text-sm font-bold text-[var(--app-fg)]">
              {businessName}
              <span className="text-[var(--app-fg-dim)] mx-2">|</span>
              <span style={{ color }}>{trancheName}</span>
            </h3>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">
              {isLive ? 'Live Market Psychology' : 'Static Archive Mode'}
            </p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-lg border ${priceBg} transition-all duration-300`}>
          <span className={`text-2xl font-bold tabular-nums ${priceColor}`}>
            {currentPrice.toFixed(2)}
          </span>
          <span className="text-[10px] text-[var(--app-fg-muted)] ml-2">ZAR</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          preserveAspectRatio="none"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--card-border)]">
        <button
          onClick={handleBuy}
          className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 text-[var(--app-fg)] text-xs font-bold py-2.5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          BUY POSITION
        </button>
        <button
          onClick={handleSell}
          className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-[var(--app-fg)] text-xs font-bold py-2.5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          SELL / EXIT
        </button>

        <div className="flex items-center gap-4 ml-4 text-[10px] text-[var(--app-fg-muted)]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            BUY VOL: <span className="text-green-400 font-mono">{Math.floor(buyVolume)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            SELL VOL: <span className="text-red-400 font-mono">{Math.floor(sellVolume)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

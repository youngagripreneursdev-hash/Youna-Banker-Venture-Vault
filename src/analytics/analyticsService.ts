// ==========================================
// YOUNA VENTURE VAULT - ANALYTICS SERVICE
// Connects to Google Apps Script for time-series data
// Falls back to localStorage if GAS is not configured
// ==========================================

const GAS_URL = import.meta.env.VITE_GAS_ANALYTICS_URL || '';
const IS_GAS_CONFIGURED = Boolean(GAS_URL);

// Time range configurations
export type TimeRange = '2m' | '10m' | '1h' | '1d' | '1w' | '1mo' | '6mo' | '1y';

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '2m': '2 Minutes', '10m': '10 Minutes', '1h': '1 Hour', '1d': '1 Day',
  '1w': '1 Week', '1mo': '1 Month', '6mo': '6 Months', '1y': '1 Year',
};

export const TIME_RANGE_BUCKETS: TimeRange[] = ['2m', '10m', '1h', '1d', '1w', '1mo', '6mo', '1y'];

// LocalStorage fallback keys
const LS_PREFIX = 'yavv_analytics_';

interface CandlestickRecord {
  timestamp: string; businessId: string; businessName: string;
  open: number; high: number; low: number; close: number; volume: number;
}

interface VelocityRecord {
  timestamp: string; businessId: string; businessName: string; velocityScore: number;
}

interface ConfidenceRecord {
  timestamp: string; businessId: string; businessName: string;
  confidenceScore: number; netEntries: number;
}

interface MarketOverviewRecord {
  timestamp: string; totalLiquidity: number; activeBusinesses: number;
  totalInvestors: number; avgHealthScore: number; marketStatus: string;
}

interface LeaderboardRecord {
  timestamp: string; businessId: string; businessName: string;
  compositeScore: number; liquidityScore: number; rank: number;
}

// ==========================================
// GAS API CALLS
// ==========================================
async function gasPost(action: string, data: Record<string, unknown>) {
  if (!IS_GAS_CONFIGURED) return null;
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return await res.json();
  } catch (e) { console.warn('GAS POST failed:', e); return null; }
}

async function gasGet(action: string, params: Record<string, string> = {}) {
  if (!IS_GAS_CONFIGURED) return null;
  try {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${GAS_URL}?${qs}`);
    return await res.json();
  } catch (e) { console.warn('GAS GET failed:', e); return null; }
}

// ==========================================
// LOCAL STORAGE FALLBACK
// ==========================================
function lsPush(key: string, record: Record<string, unknown>, maxItems = 5000) {
  try {
    const fullKey = LS_PREFIX + key;
    const existing = JSON.parse(localStorage.getItem(fullKey) || '[]');
    existing.push(record);
    // Keep only last maxItems
    while (existing.length > maxItems) existing.shift();
    localStorage.setItem(fullKey, JSON.stringify(existing));
  } catch { /* storage full or unavailable */ }
}

function lsGet(key: string): Record<string, unknown>[] {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + key) || '[]');
  } catch { return []; }
}

function lsGetRange(key: string, range: TimeRange): Record<string, unknown>[] {
  const lookbacks: Record<TimeRange, number> = {
    '2m': 2 * 60 * 1000, '10m': 10 * 60 * 1000, '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000, '1w': 7 * 24 * 60 * 60 * 1000,
    '1mo': 30 * 24 * 60 * 60 * 1000, '6mo': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = Date.now() - (lookbacks[range] || lookbacks['1d']);
  return lsGet(key).filter((r: Record<string, unknown>) => {
    const ts = new Date(r.timestamp as string).getTime();
    return ts >= cutoff;
  });
}

// ==========================================
// STORE SNAPSHOT (called periodically)
// ==========================================
export async function storeAnalyticsSnapshot(businesses: Array<{
  id: string; name: string; velocityScore: number; confidencePrice: number;
  healthScore: number; netEntries: number; currentBets: number; settledBets: number;
  totalRevenue: number; color: string;
}>) {
  const now = new Date().toISOString();

  // Candlestick data
  const candlestick: CandlestickRecord[] = businesses.map((b) => {
    const base = b.confidencePrice / 1000;
    const volatility = base * 0.02;
    const open = base + (Math.random() - 0.5) * volatility;
    const close = base + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    return {
      timestamp: now, businessId: b.id, businessName: b.name,
      open: Math.round(open * 100) / 100, high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100, close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 200 + 50),
    };
  });

  // Velocity data
  const velocity: VelocityRecord[] = businesses.map((b) => ({
    timestamp: now, businessId: b.id, businessName: b.name,
    velocityScore: Math.round(b.velocityScore * 10) / 10,
  }));

  // Confidence data
  const confidence: ConfidenceRecord[] = businesses.map((b) => ({
    timestamp: now, businessId: b.id, businessName: b.name,
    confidenceScore: Math.min(100, Math.round(b.confidencePrice / 10) / 10),
    netEntries: b.netEntries,
  }));

  // Market overview
  const totalLiquidity = businesses.reduce((s, b) => s + (b.currentBets + b.settledBets) / 1000, 0);
  const avgHealth = businesses.length > 0
    ? businesses.reduce((s, b) => s + b.healthScore, 0) / businesses.length
    : 0;
  const marketOverview: MarketOverviewRecord = {
    timestamp: now, totalLiquidity, activeBusinesses: businesses.length,
    totalInvestors: businesses.length * 3 + Math.floor(Math.random() * 10),
    avgHealthScore: Math.round(avgHealth * 10) / 10, marketStatus: 'open',
  };

  // Leaderboard
  const sorted = [...businesses].sort((a, b) => {
    const scoreA = (a.totalRevenue / 500000) * 30 + a.velocityScore * 0.25 + Math.min(100, a.confidencePrice / 1000) * 0.25;
    const scoreB = (b.totalRevenue / 500000) * 30 + b.velocityScore * 0.25 + Math.min(100, b.confidencePrice / 1000) * 0.25;
    return scoreB - scoreA;
  });
  const leaderboard: LeaderboardRecord[] = sorted.slice(0, 10).map((b, i) => ({
    timestamp: now, businessId: b.id, businessName: b.name,
    compositeScore: Math.round(((b.totalRevenue / 500000) * 30 + b.velocityScore * 0.25 + Math.min(100, b.confidencePrice / 1000) * 0.25) * 10) / 10,
    liquidityScore: Math.round((b.totalRevenue / 500000) * 100 * 10) / 10,
    rank: i + 1,
  }));

  // Store to localStorage always (fallback)
  candlestick.forEach((r) => lsPush('candlestick', r as unknown as Record<string, unknown>));
  velocity.forEach((r) => lsPush('velocity', r as unknown as Record<string, unknown>));
  confidence.forEach((r) => lsPush('confidence', r as unknown as Record<string, unknown>));
  lsPush('marketOverview', marketOverview as unknown as Record<string, unknown>, 2000);
  leaderboard.forEach((r) => lsPush('leaderboard', r as unknown as Record<string, unknown>));

  // Store to GAS if configured
  if (IS_GAS_CONFIGURED) {
    await gasPost('storeSnapshot', {
      candlestick, velocity, confidence, marketOverview, leaderboard,
    });
  }

  return { stored: true, timestamp: now };
}

// ==========================================
// RETRIEVAL FUNCTIONS
// ==========================================
export async function getCandlestickData(businessId: string | null, range: TimeRange): Promise<CandlestickRecord[]> {
  // Try GAS first
  const gasData = await gasGet('getCandlestick', { businessId: businessId || '', range });
  if (gasData?.data) return gasData.data;
  // Fallback to localStorage
  const local = lsGetRange('candlestick', range) as unknown as CandlestickRecord[];
  return businessId ? local.filter((r) => r.businessId === businessId) : local;
}

export async function getVelocityData(businessId: string | null, range: TimeRange): Promise<VelocityRecord[]> {
  const gasData = await gasGet('getVelocity', { businessId: businessId || '', range });
  if (gasData?.data) return gasData.data;
  const local = lsGetRange('velocity', range) as unknown as VelocityRecord[];
  return businessId ? local.filter((r) => r.businessId === businessId) : local;
}

export async function getConfidenceData(businessId: string | null, range: TimeRange): Promise<ConfidenceRecord[]> {
  const gasData = await gasGet('getConfidence', { businessId: businessId || '', range });
  if (gasData?.data) return gasData.data;
  const local = lsGetRange('confidence', range) as unknown as ConfidenceRecord[];
  return businessId ? local.filter((r) => r.businessId === businessId) : local;
}

export async function getMarketOverviewData(range: TimeRange): Promise<MarketOverviewRecord[]> {
  const gasData = await gasGet('getMarketOverview', { range });
  if (gasData?.data) return gasData.data;
  return lsGetRange('marketOverview', range) as unknown as MarketOverviewRecord[];
}

export async function getLeaderboardData(range: TimeRange): Promise<LeaderboardRecord[]> {
  const gasData = await gasGet('getLeaderboard', { range });
  if (gasData?.data) return gasData.data;
  return lsGetRange('leaderboard', range) as unknown as LeaderboardRecord[];
}

// ==========================================
// AUTO-SNAPSHOT (call from Layout component)
// ==========================================
let snapshotInterval: ReturnType<typeof setInterval> | null = null;

export function startAnalyticsSnapshots(businessesFetcher: () => Array<{
  id: string; name: string; velocityScore: number; confidencePrice: number;
  healthScore: number; netEntries: number; currentBets: number; settledBets: number;
  totalRevenue: number; color: string;
}>) {
  if (snapshotInterval) clearInterval(snapshotInterval);
  // Store every 30 seconds
  snapshotInterval = setInterval(() => {
    const businesses = businessesFetcher();
    if (businesses.length > 0) {
      storeAnalyticsSnapshot(businesses);
    }
  }, 30000);
}

export function stopAnalyticsSnapshots() {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
}

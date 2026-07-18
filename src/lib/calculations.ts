// ==========================================
// YOUNA VENTURE VAULT - FINANCIAL CALCULATION ENGINE
// ==========================================

import type {
  Candle, TrancheId, Business, LeaderboardEntry,
  JournalEntry, ConfidencePoint, VelocityPoint,
} from '@/types';

// Re-export types for components
export type { ConfidencePoint, VelocityPoint };

// ==========================================
// CONSTANTS
// ==========================================
export const CONFIDENCE_BASELINE = 50;
export const PRICE_SENSITIVITY = 0.5;
export const VOLATILITY_FACTOR = 0.02;
export const MARKET_FRICTION = 0.15;
export const VELOCITY_MAX_DAYS = 30;
export const WITHDRAWAL_FEE = 7000; // R7.00 in millicents
export const MIN_WITHDRAWAL = 5000; // R5.00 in millicents
export const ADMIN_FEE = 50000; // R50.00 in millicents
/** @deprecated Legacy flat interest payout (0.5 cents). Interest is now rate-based;
 * see calculatePendingInterest (VITE_MONTHLY_INTEREST_RATE_PERCENT). Kept for backward compatibility. */
export const MONTHLY_INTEREST = 500; // 0.5 cents in millicents
export const INTEREST_THRESHOLD = 5000; // R5.00 balance threshold
export const INTEREST_PAYOUT_THRESHOLD = 1000; // R1.00 to convert
export const LOAN_TERMS_DAYS = 30;
export const LATE_FEE_PERCENT = 0.02;
export const DEFAULT_THRESHOLD_DAYS = 60;
export const LOAN_TIERS = [100000, 150000, 250000]; // millicents
export const VAULT_POOL_PERCENT = 0.15;
export const VAULT_MAX_COST_PERCENT = 0.80;
export const CONFIDENCE_PRICE_BASE = 100000; // R100 in millicents
export const CONFIDENCE_PRICE_STEP = 1000; // R1 per 50 net entries
export const CONFIDENCE_NET_ENTRIES_STEP = 50;

// Market hours (SAST)
export const MARKET_WEEKDAY_OPEN = 15; // 15:00
export const MARKET_WEEKDAY_CLOSE = 23; // 23:50 (use 23 as hour)
export const MARKET_WEEKDAY_CLOSE_MIN = 50;
export const MARKET_WEEKEND_OPEN = 12; // 12:00
export const MARKET_WEEKEND_CLOSE = 23; // 23:50
export const MARKET_TIMEZONE = 'Africa/Johannesburg';

// ==========================================
// FINANCIAL TRANCHE SYSTEM
// Tier 1: Seed Fund (Micro-Shares) - Conservative
// Tier 2: Growth Fund (Growth-Shares) - Moderate
// Tier 3: Apex Fund (Yield-Shares) - Aggressive
// ==========================================
export const TRANCHE_CONFIGS: Record<TrancheId, {
  name: string; financialTerm: string; unitName: string; basePrice: number;
  riskMultiplier: number; color: string;
  minDeposit: number; buyFee: number; sellFee: number;
  profitPerUnit: number; lossPerUnit: number; riskLevel: string;
}> = {
  origin: {
    name: 'Seed Fund', financialTerm: 'Primary Equity Position (PEP)', unitName: 'Micro-Share',
    basePrice: 100, riskMultiplier: 0.8, color: '#10b981',
    minDeposit: 11000, buyFee: 500, sellFee: 500,
    profitPerUnit: 2000, lossPerUnit: 4000, riskLevel: 'Conservative',
  },
  velocity: {
    name: 'Growth Fund', financialTerm: 'Accelerated Growth Instrument (AGI)', unitName: 'Growth-Share',
    basePrice: 250, riskMultiplier: 1.2, color: '#3b82f6',
    minDeposit: 16500, buyFee: 750, sellFee: 750,
    profitPerUnit: 3000, lossPerUnit: 6000, riskLevel: 'Moderate',
  },
  apex: {
    name: 'Apex Fund', financialTerm: 'Sovereign Yield Tranche (SYT)', unitName: 'Yield-Share',
    basePrice: 500, riskMultiplier: 1.8, color: '#8b5cf6',
    minDeposit: 27500, buyFee: 1250, sellFee: 1250,
    profitPerUnit: 5000, lossPerUnit: 10000, riskLevel: 'Aggressive',
  },
};

// ==========================================
// MONEY FORMATTING
// ==========================================
export function mcToRands(millicents: number): number {
  return millicents / 1000;
}

export function randsToMc(rands: number): number {
  return Math.round(rands * 1000);
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `R${(value / 1_000).toFixed(1)}k`;
  return `R${value.toFixed(2)}`;
}

export function formatCurrencyMc(millicents: number): string {
  return formatCurrency(mcToRands(millicents));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-ZA');
}

// ==========================================
// MARKET HOURS
// ==========================================
export function isMarketOpen(): boolean {
  // Use proper SAST timezone (Africa/Johannesburg) for accurate local time
  const sastTime = new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Johannesburg',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const match = sastTime.match(/^(\w+),?\s+(\d+):(\d+)$/);
  if (!match) return false;

  const dayStr = match[1];
  const hour = parseInt(match[2], 10);
  const minute = parseInt(match[3], 10);
  const sastMinutes = hour * 60 + minute;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekends = ['Sat', 'Sun'];

  if (weekdays.includes(dayStr)) {
    const open = MARKET_WEEKDAY_OPEN * 60;
    const close = MARKET_WEEKDAY_CLOSE * 60 + MARKET_WEEKDAY_CLOSE_MIN;
    return sastMinutes >= open && sastMinutes <= close;
  }
  if (weekends.includes(dayStr)) {
    const open = MARKET_WEEKEND_OPEN * 60;
    const close = MARKET_WEEKEND_CLOSE * 60 + MARKET_WEEKDAY_CLOSE_MIN;
    return sastMinutes >= open && sastMinutes <= close;
  }
  return false;
}

export function getMarketStatusMessage(): string {
  if (isMarketOpen()) return 'Market Open - Trading Active';
  const now = new Date();
  const day = now.getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const openTime = isWeekend ? '12:00' : '15:00';
  return `Market Closed - Opens ${openTime} SAST`;
}

// ==========================================
// CONFIDENCE PRICE ENGINE
// ==========================================
export function calculateConfidencePrice(netEntries: number): number {
  const steps = Math.floor(netEntries / CONFIDENCE_NET_ENTRIES_STEP);
  const price = CONFIDENCE_PRICE_BASE + steps * CONFIDENCE_PRICE_STEP;
  return Math.max(10000, price); // Floor at R10
}

// ==========================================
// CANDLESTICK / MARKET PSYCHOLOGY
// ==========================================
export function calculatePsychologyPrice(
  basePrice: number, buyVolume: number, sellVolume: number,
  confidenceScore: number, isLive: boolean
): number {
  const netPressure = (buyVolume - sellVolume) * PRICE_SENSITIVITY;
  const confidenceDelta = (confidenceScore - CONFIDENCE_BASELINE) * 0.1;
  const noise = (Math.random() - 0.5) * VOLATILITY_FACTOR * basePrice;
  const activityFactor = isLive ? 1.0 : MARKET_FRICTION;
  const floor = basePrice * 0.1;
  return Math.round(Math.max(floor, basePrice + (netPressure + confidenceDelta) * activityFactor + noise) * 100) / 100;
}

export function generateNextCandle(
  previous: Candle, basePrice: number, buyVolume: number,
  sellVolume: number, confidenceScore: number, isLive: boolean
): Candle {
  const open = previous.close;
  const close = calculatePsychologyPrice(open, buyVolume, sellVolume, confidenceScore, isLive);
  const wickRange = Math.abs(close - open) * (0.3 + Math.random() * 0.7);
  const high = Math.max(open, close) + wickRange;
  const low = Math.min(open, close) - wickRange * 0.6;
  const volume = Math.floor((Math.abs(close - open) / basePrice) * 1000 + Math.random() * 100);
  const netEntries = close >= open
    ? Math.floor(buyVolume - sellVolume * 0.5)
    : Math.floor(-(sellVolume - buyVolume * 0.5));

  return {
    timestamp: Date.now(), open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100, low: Math.round(low * 100) / 100,
    close: Math.round(close * 100) / 100, volume: Math.max(0, volume), netEntries,
  };
}

export function seedCandleHistory(basePrice: number, count: number = 40, volatility: number = 0.015): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility * basePrice;
    const open = price;
    price += change;
    const close = price;
    const wickRange = Math.abs(change) * (0.5 + Math.random());
    candles.push({
      timestamp: Date.now() - (count - i) * 3000,
      open: Math.round(open * 100) / 100,
      high: Math.round(Math.max(open, close) + wickRange * 100) / 100,
      low: Math.round(Math.min(open, close) - wickRange * 0.4 * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 200 + 50),
      netEntries: Math.floor((Math.random() - 0.5) * 20),
    });
  }
  return candles;
}

// ==========================================
// CONFIDENCE SCORING
// ==========================================
export function calculateConfidenceScore(
  investorVotes: number[], businessSelfReports: number[]
): number {
  if (investorVotes.length === 0 && businessSelfReports.length === 0) return CONFIDENCE_BASELINE;
  const avgInvestor = investorVotes.length > 0 ? investorVotes.reduce((a, b) => a + b, 0) / investorVotes.length : 5;
  const avgSelf = businessSelfReports.length > 0 ? businessSelfReports.reduce((a, b) => a + b, 0) / businessSelfReports.length : 5;
  return Math.min(100, Math.max(0, Math.round(avgInvestor * 6 + avgSelf * 4)));
}

export function updateConfidenceLine(previousScore: number, newVote: number, momentum: number = 0.15): number {
  const target = newVote * 10;
  return Math.round(Math.min(100, Math.max(0, previousScore + (target - previousScore) * momentum)) * 10) / 10;
}

// ==========================================
// VELOCITY ENGINE
// ==========================================
export function calculateVelocityScore(avgSettlementDays: number): number {
  return Math.round(((VELOCITY_MAX_DAYS - Math.min(avgSettlementDays, VELOCITY_MAX_DAYS)) / VELOCITY_MAX_DAYS) * 100 * 10) / 10;
}

// ==========================================
// LOAN ENGINE
// ==========================================
export function getLoanTierAmount(tier: number): number {
  return LOAN_TIERS[Math.min(tier - 1, LOAN_TIERS.length - 1)] || LOAN_TIERS[0];
}

export function calculateLoanInterest(principal: number): number {
  return Math.round(principal * 0.20);
}

export function calculateLateFee(principal: number, daysOverdue: number): number {
  if (daysOverdue < LOAN_TERMS_DAYS) return 0;
  return Math.round(principal * LATE_FEE_PERCENT);
}

export function getLoanStatus(dueDate: string, currentDate: Date = new Date()): 'active' | 'overdue' | 'defaulted' {
  const due = new Date(dueDate);
  const diffMs = currentDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= DEFAULT_THRESHOLD_DAYS) return 'defaulted';
  if (diffDays >= LOAN_TERMS_DAYS) return 'overdue';
  if (diffDays > 0) return 'overdue';
  return 'active';
}

// ==========================================
// LOAN CATEGORY UNLOCK
// Category 1: Default (R100)
// Category 2: Unlocked after 2 repayments (R150)
// Category 3: Unlocked after 5 repayments (R250)
// ==========================================
export function getLoanCategoryUnlocked(repaymentCount: number): 1 | 2 | 3 {
  if (repaymentCount >= 5) return 3;
  if (repaymentCount >= 2) return 2;
  return 1;
}

export function getMaxLoanAmount(categoryUnlocked: 1 | 2 | 3): number {
  return LOAN_TIERS[categoryUnlocked - 1];
}

export function getNextCategoryRequirement(currentCategory: 1 | 2 | 3): string {
  if (currentCategory === 1) return 'Repay 2 times to unlock Category 2 (R150)';
  if (currentCategory === 2) return 'Repay 3 more times to unlock Category 3 (R250)';
  return 'Maximum category unlocked';
}

// ==========================================
// TIME EXTENSION (45 days)
// 2% interest charged on extension
// Not shown as default on graphs
// ==========================================
export const EXTENSION_DAYS = 15;
export const EXTENSION_INTEREST_PERCENT = 0.02;

export function calculateExtensionInterest(principal: number): number {
  return Math.round(principal * EXTENSION_INTEREST_PERCENT);
}

export function getExtendedDueDate(originalDueDate: string): string {
  const d = new Date(originalDueDate);
  d.setDate(d.getDate() + EXTENSION_DAYS);
  return d.toISOString();
}

// ==========================================
// BUSINESS LISTING - 10 PEOPLE BASE RULE
// ==========================================
export const BASE_RULE_BACKERS = 10;
export const EXCESS_STOCK_THRESHOLD = 5; // 50% of base rule

export function canGoLive(currentBackers: number): boolean {
  return currentBackers >= BASE_RULE_BACKERS;
}

export function canBuyExcessStock(currentBackers: number): boolean {
  return currentBackers >= EXCESS_STOCK_THRESHOLD && currentBackers < BASE_RULE_BACKERS;
}

export function needsBankerIntervention(currentBackers: number): boolean {
  return currentBackers >= EXCESS_STOCK_THRESHOLD && currentBackers < BASE_RULE_BACKERS;
}

export function isBusinessInTrouble(currentBackers: number): boolean {
  return currentBackers < EXCESS_STOCK_THRESHOLD;
}

// ==========================================
// PASSWORD VALIDATION
// ==========================================
export function validatePassword(password: string): {
  valid: boolean; errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('One special character');
  return { valid: errors.length === 0, errors };
}

// ==========================================
// RESET CODE GENERATOR (2 letters + 3 numbers)
// ==========================================
export function generateResetCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let code = '';
  code += letters[Math.floor(Math.random() * letters.length)];
  code += letters[Math.floor(Math.random() * letters.length)];
  code += numbers[Math.floor(Math.random() * numbers.length)];
  code += numbers[Math.floor(Math.random() * numbers.length)];
  code += numbers[Math.floor(Math.random() * numbers.length)];
  return code;
}

// ==========================================
// VAULT ENGINE
// ==========================================
export function calculateVaultPool(userBalances: number[]): number {
  return userBalances.reduce((sum, bal) => sum + Math.floor(bal * VAULT_POOL_PERCENT), 0);
}

export function canVaultIntervene(interventionCost: number, poolSize: number): boolean {
  return interventionCost <= poolSize * VAULT_MAX_COST_PERCENT;
}

// ==========================================
// INTEREST ENGINE
// ==========================================
// Rate-based monthly interest: a configurable percent of the eligible balance
// (balances below the threshold earn nothing). Defaults: 2%/month above R100.00.
export function calculatePendingInterest(balanceMillicents: number): number {
  const rate = parseFloat(import.meta.env.VITE_MONTHLY_INTEREST_RATE_PERCENT ?? '2'); // percent per month
  const threshold = parseInt(import.meta.env.VITE_INTEREST_BALANCE_THRESHOLD ?? '100000', 10); // millicents
  if (balanceMillicents < threshold) return 0;
  return Math.round(balanceMillicents * (rate / 100));
}

export function shouldConvertInterest(pendingInterest: number): boolean {
  return pendingInterest >= INTEREST_PAYOUT_THRESHOLD;
}

// ==========================================
// ACCOUNT EXPIRY
// ==========================================
export function getAccountExpiryStatus(expiryDate: string | null): {
  isExpired: boolean;
  daysRemaining: number;
  isWarning: boolean;
  message: string;
} {
  if (!expiryDate) {
    return { isExpired: false, daysRemaining: Infinity, isWarning: false, message: '' };
  }
  const now = Date.now();
  const expiry = new Date(expiryDate).getTime();
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { isExpired: true, daysRemaining: 0, isWarning: false, message: 'Your demo account has expired. Please create a permanent account.' };
  }
  if (daysRemaining <= 7) {
    return { isExpired: false, daysRemaining, isWarning: true, message: `Your demo account expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Create a permanent account to keep your data.` };
  }
  return { isExpired: false, daysRemaining, isWarning: false, message: '' };
}

export function getDefaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// ==========================================
// LEADERBOARD
// ==========================================
export function calculateCompositeScore(business: Business): number {
  const liquidityScore = Math.min(100, (business.totalRevenue / 500000) * 100);
  const velocityScore = business.velocityScore;
  const confidenceScore = Math.min(100, Math.max(0, business.confidencePrice / 1000));
  const profitScore = Math.max(0, business.profitMargin);
  return Math.round((liquidityScore * 0.30 + velocityScore * 0.25 + confidenceScore * 0.25 + profitScore * 0.20) * 10) / 10;
}

export function generateLeaderboard(businesses: Business[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = businesses.map((biz) => ({
    rank: 0, businessId: biz.id, businessName: biz.name, color: biz.color,
    compositeScore: calculateCompositeScore(biz),
    liquidityScore: Math.min(100, Math.round((biz.totalRevenue / 500000) * 100 * 10) / 10),
    velocityScore: biz.velocityScore,
    confidenceScore: Math.min(100, Math.round(biz.confidencePrice / 10) / 10),
    profitScore: Math.max(0, Math.round(biz.profitMargin * 10) / 10),
    totalVolume: mcToRands(biz.currentBets + biz.settledBets),
  }));
  entries.sort((a, b) => b.compositeScore - a.compositeScore);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries.slice(0, 10);
}

// ==========================================
// TOTAL MARKET CAP
// ==========================================
export function calculateTotalMarketCap(businesses: Business[]): number {
  return businesses.reduce((total, b) => total + mcToRands(b.currentBets + b.settledBets), 0);
}

// ==========================================
// VELOCITY COMPARISON
// ==========================================
// Seeded pseudo-random for deterministic velocity curves
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function stringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function compareVelocities(businesses: Business[]) {
  const periods = 12;
  const labels: string[] = [];
  for (let i = 0; i < periods; i++) labels.push(`W${i + 1}`);

  const datasets = businesses.map((biz) => {
    const rand = seededRandom(stringToSeed(biz.id));
    const data: number[] = [];
    let score = biz.velocityScore;
    for (let i = 0; i < periods; i++) {
      data.push(Math.round(score * 10) / 10);
      score += (rand() - 0.48) * 3;
      score = Math.max(0, Math.min(100, score));
    }
    return { name: biz.name, color: biz.color, data };
  });

  return { labels, datasets };
}

// ==========================================
// VAULT POOL
// ==========================================
export function getVaultPool(userBalances: number[]): number {
  return userBalances.reduce((sum, bal) => sum + Math.floor(bal * VAULT_POOL_PERCENT), 0);
}

// ==========================================
// ACCOUNT DELETION
// ==========================================
export function canDeleteAccount(balance: number, hasActiveInvestments: boolean, hasActiveLoans: boolean): {
  allowed: boolean; reason: string;
} {
  const checks: string[] = [];
  if (balance >= 10000) checks.push('Balance must be less than R10.00');
  if (hasActiveInvestments) checks.push('Sell all investments first');
  if (hasActiveLoans) checks.push('Repay all active loans first');
  return {
    allowed: checks.length === 0,
    reason: checks.join('. ') || '',
  };
}

// ==========================================
// JOURNAL HELPERS
// ==========================================
export function getJournalBalance(entries: JournalEntry[]): { totalDebits: number; totalCredits: number; balanced: boolean } {
  const totalDebits = entries.reduce((sum, e) => sum + e.debitMillicents, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.creditMillicents, 0);
  return { totalDebits, totalCredits, balanced: totalDebits === totalCredits };
}

export function getJournalAccountSummary(entries: JournalEntry[]): { account: string; debits: number; credits: number; net: number }[] {
  const map = new Map<string, { debits: number; credits: number }>();
  entries.forEach((e) => {
    const existing = map.get(e.account) || { debits: 0, credits: 0 };
    existing.debits += e.debitMillicents;
    existing.credits += e.creditMillicents;
    map.set(e.account, existing);
  });
  return Array.from(map.entries()).map(([account, data]) => ({
    account, debits: data.debits, credits: data.credits,
    net: data.credits - data.debits,
  }));
}

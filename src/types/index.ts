// ==========================================
// YOUNA VENTURE VAULT (YAVV) - COMPLETE TYPES
// ==========================================

export type TrancheId = 'origin' | 'velocity' | 'apex';
export type UserRole = 'student' | 'banker';
// Business lifecycle: draft = awaiting banker review; approved = open for backing;
// live = backers >= requiredBackers, trading open; rejected = banker declined.
export type BusinessStatus = 'draft' | 'approved' | 'live' | 'rejected' | 'archived' | 'defaulted';
export type LoanStatus = 'draft' | 'active' | 'repaid' | 'overdue' | 'defaulted' | 'extended' | 'rejected';
export type LoanCategory = 1 | 2 | 3; // Tier unlock levels based on payment history
export type ExtensionStatus = 'none' | 'pending' | 'approved';
export type InvestmentStatus = 'active' | 'settled_profit' | 'settled_loss';
export type DepositStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentRequestStatus = 'pending' | 'paid' | 'rejected' | 'expired';
export type NotificationType =
  | 'payment_request'
  | 'payment_received'
  | 'deposit_approved'
  | 'withdrawal_approved'
  | 'loan_approved'
  | 'loan_overdue'
  | 'loan_defaulted'
  | 'investment_bought'
  | 'investment_sold'
  | 'vault_intervention'
  | 'market_correction_failed'
  | 'interest_earned'
  | 'loan_repaid'
  | 'extension_approved'
  | 'extension_requested'
  | 'category_unlocked'
  | 'password_reset'
  | 'business_backed'
  | 'loan_rejected'
  | 'business_approved'
  | 'business_rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  studentNumber: string;
  phoneNumber: string;
  address: string;
  isStudentVerified: boolean;
  role: UserRole;
  walletBalanceMillicents: number;
  pendingInterestMillicents: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  createdAt: string;
  accountExpiryDate: string | null;
  studentCardUrl?: string | null; // Uploaded student card (verification evidence)
  lastInterestAt?: string | null; // Last time monthly interest was credited (accrual anchor)
  resetCode?: string; // Password reset verification code
  resetCodeExpiry?: string; // When the reset code expires
  // Internal: SHA-256 hashed password (never store plaintext)
  _passwordHash?: string;
}

export interface Business {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  status: BusinessStatus;
  healthScore: number;
  color: string;
  confidencePrice: number;
  totalUnitsIssued: number;
  unitsHeldByVault: number;
  netEntries: number;
  currentBets: number;
  settledBets: number;
  totalRevenue: number;
  netProfit: number;
  investorPayouts: number;
  adminFees: number;
  profitMargin: number;
  avgSettlementDays: number;
  velocityScore: number;
  isLive: boolean;
  // Business listing / crowdfunding
  currentBackers: number;
  requiredBackers: number;
  businessDescription: string;
  targetMarket: string;
  needsTimeExtension: boolean;
}

// Crowdfunding backer ledger: one record per user per business
export interface BusinessBacker {
  businessId: string;
  userId: string;
  backedAt: string;
}

export interface Loan {
  id: string;
  businessId: string;
  businessName: string;
  borrowerId: string;
  borrowerName: string;
  amountMillicents: number;
  interestMillicents: number;
  adminFeeMillicents: number;
  dueDate: string;
  status: LoanStatus;
  createdAt: string;
  repaidAt: string | null;
  tier: number;
  // Loan repayment tracking
  totalRepaidMillicents: number;
  lastRepaymentDate: string | null;
  repaymentCount: number; // Number of times repaid - unlocks higher loan categories
  // Time extension
  extensionStatus: ExtensionStatus;
  extensionRequestedAt: string | null;
  extensionInterestMillicents: number; // 2% interest on extension
  // Loan category unlock
  loanCategoryUnlocked: LoanCategory; // 1=default, 2=after 2 repayments, 3=after 5 repayments
  // Business listing
  requiredBackers: number; // Base rule: 10 people
  currentBackers: number;
  proofOfPaymentUrl: string | null;
  businessDescription: string;
  targetMarket: string;
  needsTimeExtension: boolean; // 45 days extension flag
}

export interface Investment {
  id: string;
  userId: string;
  userName: string;
  businessId: string;
  businessName: string;
  trancheId: TrancheId;
  units: number;
  depositedMillicents: number;
  status: InvestmentStatus;
  createdAt: string;
}

export interface Trade {
  id: string;
  businessId: string;
  businessName: string;
  buyerId: string | null;
  sellerId: string | null;
  trancheId: TrancheId;
  units: number;
  pricePerUnitMillicents: number;
  tradeType: 'buy' | 'sell';
  isVaultIntervention: boolean;
  createdAt: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  amountMillicents: number;
  referenceCode: string;
  proofOfPaymentUrl: string | null;
  status: DepositStatus;
  bankerNotes: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amountMillicents: number;
  feeMillicents: number;
  status: WithdrawalStatus;
  createdAt: string;
  approvedAt: string | null;
}

export interface PaymentRequest {
  id: string;
  fromBusinessId: string;
  fromBusinessName: string;
  fromUserId: string | null; // The user who created this request (if not from a business)
  toUserId: string;
  toUserName: string;
  amountMillicents: number;
  orderReference: string | null;
  description: string | null;
  status: PaymentRequestStatus;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
}

export interface Transfer {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string | null;
  toUserName: string | null;
  toBusinessId: string | null;
  toBusinessName: string | null;
  amountMillicents: number;
  feeMillicents: number;
  type: 'user_to_user' | 'user_to_business' | 'business_to_user' | 'business_to_business';
  note: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  businessId: string;
  businessName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  account: string;
  debitMillicents: number;
  creditMillicents: number;
  referenceType: string;
  referenceId: string;
  createdAt: string;
}

export interface VaultIntervention {
  id: string;
  businessId: string;
  businessName: string;
  unitsBought: number;
  totalCostMillicents: number;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  netEntries: number;
}

export interface ConfidencePoint {
  timestamp: number;
  investorVote: number;
  businessSelfReport: number;
  compositeScore: number;
  voteCount: number;
}

export interface VelocityPoint {
  timestamp: number;
  settlementDays: number;
  velocityScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  businessId: string;
  businessName: string;
  color: string;
  compositeScore: number;
  liquidityScore: number;
  velocityScore: number;
  confidenceScore: number;
  profitScore: number;
  totalVolume: number;
}

// Tranche configuration
export interface TrancheConfig {
  id: TrancheId;
  name: string;
  financialTerm: string;
  minDeposit: number;
  buyFee: number;
  sellFee: number;
  profitPerUnit: number;
  lossPerUnit: number;
  riskLevel: string;
  color: string;
}

export interface MarketHours {
  isOpen: boolean;
  nextOpen: Date | null;
  nextClose: Date | null;
  message: string;
}

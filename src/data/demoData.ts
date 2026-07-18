import type {
  User, Business, Loan, Investment, Trade, DepositRequest,
  WithdrawalRequest, PaymentRequest, Transfer, Notification,
  Review, JournalEntry, VaultIntervention, ConfidencePoint, BusinessBacker,
} from '@/types';

// ==========================================
// HELPERS
// ==========================================
const R = (rands: number) => Math.round(rands * 1000);

// ==========================================
// USERS - Only banker account remains
// All student accounts cleared for fresh start
// ==========================================
export const DEMO_USERS: User[] = [
  {
    id: 'u-banker', email: 'youngagripreneurs.ng@gmail.com', fullName: 'Mr NG Ragedi',
    studentNumber: 'ADMIN001', phoneNumber: '+27821234567', address: 'Capitec HQ, Cape Town',
    isStudentVerified: true, role: 'banker',
    walletBalanceMillicents: R(50000), pendingInterestMillicents: 0,
    bankName: 'Capitec Bank', bankAccountNumber: '2081845985', bankAccountHolder: 'Mr NG Ragedi',
    createdAt: new Date().toISOString(), accountExpiryDate: null,
    // SHA-256 of the admin password + salt (see .env VITE_ADMIN_PASSWORD_HASH) —
    // the banker signs in with the same documented admin password, then passes the admin gate.
    _passwordHash: '7e547cc726d99d66d6987e400f06f902577ed7b5bc59692e90123f3650b67144',
  },
];

// ==========================================
// DEMO SEED DATASET (empty-platform fix)
// Seeded by useStore.seedDemoData() when the platform has no data
// and VITE_ENABLE_DEMO_SEED !== 'false'.
// Demo student login: thandi@demo.youna / DemoPass123
// ==========================================

// SHA-256('DemoPass123' + PASSWORD_SALT) - see src/lib/crypto.ts
export const DEMO_STUDENT: User = {
  id: 'u-demo-thandi',
  email: 'thandi@demo.youna',
  fullName: 'Thandi Mokoena',
  studentNumber: '221456789',
  phoneNumber: '+27734561234',
  address: 'Room 14, Savuka Residence, University of Limpopo, Polokwane',
  isStudentVerified: true,
  role: 'student',
  walletBalanceMillicents: 2500000, // R2,500.00
  pendingInterestMillicents: 0,
  bankName: 'TymeBank',
  bankAccountNumber: '51045678901',
  bankAccountHolder: 'T Mokoena',
  createdAt: '2026-05-04T09:30:00.000Z',
  accountExpiryDate: null,
  _passwordHash: '386b362137d1561edf1232e122d1d47a428d858db79c621bae6640f6651b5a56',
};

// Second demo student - owns one draft business, never logs in (no password hash)
export const DEMO_STUDENT_SIPHO: User = {
  id: 'u-demo-sipho',
  email: 'sipho@demo.youna',
  fullName: 'Sipho Dlamini',
  studentNumber: '219876543',
  phoneNumber: '+27612340987',
  address: 'Unit 3, Amberfield Heights, Bloemfontein',
  isStudentVerified: true,
  role: 'student',
  walletBalanceMillicents: 800000, // R800.00
  pendingInterestMillicents: 0,
  bankName: 'Capitec Bank',
  bankAccountNumber: '1789012345',
  bankAccountHolder: 'S Dlamini',
  createdAt: '2026-06-01T10:00:00.000Z',
  accountExpiryDate: null,
};

export interface DemoDataset {
  users: User[];
  businesses: Business[];
  investments: Investment[];
  notifications: Notification[];
  businessBackers: BusinessBacker[];
}

export function buildDemoDataset(): DemoDataset {
  const businesses: Business[] = [
    {
      id: 'b-demo-campus-eats',
      ownerId: 'u-demo-thandi',
      ownerName: 'Thandi Mokoena',
      name: 'Campus Eats',
      description: 'Hot township-style lunches delivered to residences and lecture halls.',
      status: 'live',
      healthScore: 78,
      color: '#10b981',
      confidencePrice: 124000, // R124.00
      totalUnitsIssued: 400,
      unitsHeldByVault: 40,
      netEntries: 60,
      currentBets: 3600000, // R3,600.00
      settledBets: 14800000, // R14,800.00
      totalRevenue: 18400000, // R18,400.00
      netProfit: 4230000, // R4,230.00
      investorPayouts: 1150000, // R1,150.00
      adminFees: 920000, // R920.00
      profitMargin: 23.0,
      avgSettlementDays: 4.5,
      velocityScore: 65,
      isLive: true,
      currentBackers: 12,
      requiredBackers: 10,
      businessDescription:
        'Campus Eats prepares and delivers affordable hot meals (kota, pap & wors, chicken dust) ' +
        'to students at their residences between lectures. Orders are placed via WhatsApp before 10:00 ' +
        'and delivered in two lunch runs. Revenue comes from meal sales with a small delivery fee; ' +
        'ingredients are bought in bulk from the Polokwane fresh produce market every Monday.',
      targetMarket: 'Students and staff at the University of Limpopo, Turfloop campus (~20,000 people).',
      needsTimeExtension: false,
    },
    {
      id: 'b-demo-notesxchange',
      ownerId: 'u-demo-thandi',
      ownerName: 'Thandi Mokoena',
      name: 'NotesXchange',
      description: 'A marketplace for verified, lecturer-approved study notes and past papers.',
      status: 'approved',
      healthScore: 62,
      color: '#f59e0b',
      confidencePrice: 100000, // R100.00 baseline
      totalUnitsIssued: 0,
      unitsHeldByVault: 0,
      netEntries: 0,
      currentBets: 0,
      settledBets: 0,
      totalRevenue: 0,
      netProfit: 0,
      investorPayouts: 0,
      adminFees: 0,
      profitMargin: 0,
      avgSettlementDays: 7.0,
      velocityScore: 40,
      isLive: false,
      currentBackers: 6,
      requiredBackers: 10,
      businessDescription:
        'NotesXchange lets top students upload typed study notes, summaries and past-paper packs ' +
        'for their modules. Each pack is checked against the syllabus before listing. Sellers earn ' +
        'per download and the platform takes a small commission. Funds raised will pay for the ' +
        'reviewer honorariums and printing of exam-season study guides.',
      targetMarket: 'First- to third-year students in the Faculty of Science and Agriculture.',
      needsTimeExtension: false,
    },
    {
      id: 'b-demo-laundry-loop',
      ownerId: 'u-demo-sipho',
      ownerName: 'Sipho Dlamini',
      name: 'Res Laundry Loop',
      description: 'Weekly wash-and-fold laundry collection for residence students.',
      status: 'draft',
      healthScore: 50,
      color: '#3b82f6',
      confidencePrice: 100000, // R100.00 baseline
      totalUnitsIssued: 0,
      unitsHeldByVault: 0,
      netEntries: 0,
      currentBets: 0,
      settledBets: 0,
      totalRevenue: 0,
      netProfit: 0,
      investorPayouts: 0,
      adminFees: 0,
      profitMargin: 0,
      avgSettlementDays: 7.0,
      velocityScore: 50,
      isLive: false,
      currentBackers: 0,
      requiredBackers: 10,
      businessDescription:
        'Res Laundry Loop collects laundry bags from residence rooms every Friday afternoon and ' +
        'returns them washed, dried and folded on Sunday. Pricing is per bag with a monthly ' +
        'subscription option. Startup capital is needed for two industrial washing machines and ' +
        'a branded collection trolley.',
      targetMarket: 'Students living in university residences who have no access to washing machines.',
      needsTimeExtension: false,
    },
  ];

  const investments: Investment[] = [
    {
      id: 'inv-demo-campus-eats-1',
      userId: 'u-demo-thandi',
      userName: 'Thandi Mokoena',
      businessId: 'b-demo-campus-eats',
      businessName: 'Campus Eats',
      trancheId: 'origin',
      units: 10,
      depositedMillicents: 110000, // R110.00
      status: 'active',
      createdAt: '2026-07-02T15:30:00.000Z',
    },
    {
      id: 'inv-demo-campus-eats-2',
      userId: 'u-demo-thandi',
      userName: 'Thandi Mokoena',
      businessId: 'b-demo-campus-eats',
      businessName: 'Campus Eats',
      trancheId: 'velocity',
      units: 5,
      depositedMillicents: 82500, // R82.50
      status: 'active',
      createdAt: '2026-07-09T16:05:00.000Z',
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'ntf-demo-campus-live',
      userId: 'u-demo-thandi',
      type: 'business_backed',
      message: 'Congratulations! Your business "Campus Eats" is now live on the market!',
      read: true,
      createdAt: '2026-06-28T11:15:00.000Z',
    },
    {
      id: 'ntf-demo-investment-1',
      userId: 'u-demo-thandi',
      type: 'investment_bought',
      message: 'You bought 10 Micro-Shares in Campus Eats for R110.00.',
      read: false,
      createdAt: '2026-07-02T15:30:00.000Z',
    },
  ];

  const businessBackers: BusinessBacker[] = [
    { businessId: 'b-demo-campus-eats', userId: 'u-demo-sipho', backedAt: '2026-06-26T09:00:00.000Z' },
    { businessId: 'b-demo-campus-eats', userId: 'u-demo-thandi', backedAt: '2026-06-26T09:05:00.000Z' },
    { businessId: 'b-demo-notesxchange', userId: 'u-demo-thandi', backedAt: '2026-07-06T12:40:00.000Z' },
    { businessId: 'b-demo-notesxchange', userId: 'u-demo-sipho', backedAt: '2026-07-07T08:20:00.000Z' },
  ];

  return { users: [DEMO_STUDENT, DEMO_STUDENT_SIPHO], businesses, investments, notifications, businessBackers };
}

// ==========================================
// BUSINESSES - Empty market for fresh start
// ==========================================
export const DEMO_BUSINESSES: Business[] = [];

// ==========================================
// LOANS - Empty for fresh start
// ==========================================
export const DEMO_LOANS: Loan[] = [];

// ==========================================
// INVESTMENTS - Empty for fresh start
// ==========================================
export const DEMO_INVESTMENTS: Investment[] = [];

// ==========================================
// TRADES - Empty for fresh start
// ==========================================
export const DEMO_TRADES: Trade[] = [];

// ==========================================
// DEPOSITS - Empty for fresh start
// ==========================================
export const DEMO_DEPOSITS: DepositRequest[] = [];

// ==========================================
// WITHDRAWALS - Empty for fresh start
// ==========================================
export const DEMO_WITHDRAWALS: WithdrawalRequest[] = [];

// ==========================================
// PAYMENT REQUESTS - Empty for fresh start
// ==========================================
export const DEMO_PAYMENT_REQUESTS: PaymentRequest[] = [];

// ==========================================
// TRANSFERS - Empty for fresh start
// ==========================================
export const DEMO_TRANSFERS: Transfer[] = [];

// ==========================================
// NOTIFICATIONS - Empty for fresh start
// ==========================================
export const DEMO_NOTIFICATIONS: Notification[] = [];

// ==========================================
// REVIEWS - Empty for fresh start
// ==========================================
export const DEMO_REVIEWS: Review[] = [];

// ==========================================
// JOURNAL ENTRIES - Empty for fresh start
// ==========================================
export const DEMO_JOURNAL_ENTRIES: JournalEntry[] = [];

// ==========================================
// VAULT INTERVENTIONS - Empty for fresh start
// ==========================================
export const DEMO_VAULT_INTERVENTIONS: VaultIntervention[] = [];

// ==========================================
// CONFIDENCE HISTORY - Empty for fresh start
// ==========================================
export const DEMO_CONFIDENCE_HISTORY: Record<string, ConfidencePoint[]> = {};

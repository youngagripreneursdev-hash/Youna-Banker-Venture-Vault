import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Business, Loan, Investment, Trade, DepositRequest,
  WithdrawalRequest, PaymentRequest, Transfer, Notification,
  Review, JournalEntry, VaultIntervention, ConfidencePoint, BusinessBacker,
} from '@/types';
import * as supabaseService from '@/lib/supabaseClient';
import { DEMO_USERS, buildDemoDataset } from '@/data/demoData';
import { formatCurrencyMc } from '@/lib/calculations';

// ==========================================
// MODULE HELPERS
// ==========================================

/** Unique id generator matching the app's `${prefix}-${timestamp}` id style. */
const uid = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const asRow = (o: unknown): Record<string, unknown> => o as Record<string, unknown>;

/**
 * Best-effort write-through to Supabase. Local state remains the source of
 * truth; failures are swallowed with a console.warn so the app works offline.
 */
const mirror = (fn: () => Promise<unknown>): void => {
  if (!supabaseService.isSupabaseConfigured) return;
  try {
    void fn().catch((err) => console.warn('[yavv] Supabase mirror failed', err));
  } catch (err) {
    console.warn('[yavv] Supabase mirror failed', err);
  }
};

// ==========================================
// STATE INTERFACE
// ==========================================
interface AppState {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  isBanker: boolean;
  login: (user: User) => void;
  logout: () => void;

  // Admin / Banker password gate
  isAdminAuthenticated: boolean;
  adminLogin: () => void;
  adminLogout: () => void;

  // Bank reserve (funds available for loan approvals)
  bankReserveMillicents: number;
  fundBankReserve: (amountMillicents: number) => void;

  // Data
  users: User[];
  businesses: Business[];
  loans: Loan[];
  investments: Investment[];
  trades: Trade[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  paymentRequests: PaymentRequest[];
  transfers: Transfer[];
  notifications: Notification[];
  reviews: Review[];
  journalEntries: JournalEntry[];
  vaultInterventions: VaultIntervention[];
  confidenceHistory: Record<string, ConfidencePoint[]>;
  businessBackers: BusinessBacker[];

  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUserBalance: (userId: string, delta: number) => void;

  setBusinesses: (businesses: Business[]) => void;
  addBusiness: (business: Business) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;

  setLoans: (loans: Loan[]) => void;
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;

  setInvestments: (investments: Investment[]) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;

  addTrade: (trade: Trade) => void;
  addDeposit: (deposit: DepositRequest) => void;
  updateDeposit: (id: string, updates: Partial<DepositRequest>) => void;
  addWithdrawal: (withdrawal: WithdrawalRequest) => void;
  updateWithdrawal: (id: string, updates: Partial<WithdrawalRequest>) => void;
  addPaymentRequest: (pr: PaymentRequest) => void;
  updatePaymentRequest: (id: string, updates: Partial<PaymentRequest>) => void;
  addTransfer: (transfer: Transfer) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  addReview: (review: Review) => void;
  addJournalEntry: (entry: JournalEntry) => void;
  addVaultIntervention: (vi: VaultIntervention) => void;

  setConfidenceHistory: (bizId: string, history: ConfidencePoint[]) => void;
  addConfidencePoint: (bizId: string, point: ConfidencePoint) => void;

  // Profile & auth
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
  setResetCode: (userId: string, code: string | null, expiry: string | null) => void;

  // Loan lifecycle
  repayLoan: (loanId: string, amount: number, proofUrl: string | null) => void;
  requestExtension: (loanId: string) => void;
  approveExtension: (loanId: string) => void;
  approveLoan: (loanId: string) => { ok: boolean; error?: string };
  rejectLoan: (loanId: string) => void;

  // Business review (banker) & backing (crowdfunding)
  reviewBusiness: (businessId: string, decision: 'approved' | 'rejected') => void;
  backBusiness: (businessId: string, userId: string) => void;
  hasBacked: (businessId: string, userId: string) => boolean;

  // Demo seed (empty-platform fix)
  seedDemoData: () => void;

  // Supabase sync
  syncFromSupabase: () => Promise<void>;

  // Computed helpers
  getUnreadNotifications: () => Notification[];
  getBusinessInvestments: (businessId: string) => Investment[];
  getUserInvestments: (userId: string) => Investment[];
  getBusinessReviews: (businessId: string) => Review[];
  getPendingDeposits: () => DepositRequest[];
  getPendingWithdrawals: () => WithdrawalRequest[];
  getPendingLoans: () => Loan[];
  getVaultPool: () => number;
}

// ==========================================
// LOAD SAVED THEME
// ==========================================
const getSavedTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem('yavv-theme');
    return saved === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
};

// ==========================================
// STORE WITH PERSISTENCE
// ==========================================
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: getSavedTheme(),
      setTheme: (theme) => {
        try { localStorage.setItem('yavv-theme', theme); } catch { /* noop */ }
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('yavv-theme', next); } catch { /* noop */ }
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      // Auth
      currentUser: null,
      isAuthenticated: false,
      isBanker: false,

      login: (user) => set({
        currentUser: user,
        isAuthenticated: true,
        isBanker: user.role === 'banker',
      }),

      logout: () => set({
        currentUser: null,
        isAuthenticated: false,
        isBanker: false,
        isAdminAuthenticated: false,
      }),

      // Admin gate
      isAdminAuthenticated: false,
      adminLogin: () => set({ isAdminAuthenticated: true }),
      adminLogout: () => set({ isAdminAuthenticated: false }),

      // Bank reserve: starts at R50,000.00 available for loan funding
      bankReserveMillicents: 50000000,
      fundBankReserve: (amountMillicents) => {
        if (!Number.isFinite(amountMillicents) || amountMillicents <= 0) return;
        set((s) => ({ bankReserveMillicents: s.bankReserveMillicents + Math.round(amountMillicents) }));
      },

      // Data: starts with banker account only (all other data empty for fresh start)
      users: DEMO_USERS,
      businesses: [],
      loans: [],
      investments: [],
      trades: [],
      deposits: [],
      withdrawals: [],
      paymentRequests: [],
      transfers: [],
      notifications: [],
      reviews: [],
      journalEntries: [],
      vaultInterventions: [],
      confidenceHistory: {},
      businessBackers: [],

      // User actions
      setUsers: (users) => set({ users }),
      addUser: (user) => {
        set((s) => ({ users: [...s.users, user] }));
        // Sync to Supabase if available
        mirror(() => supabaseService.upsertRow('users', asRow(user)));
      },
      updateUserBalance: (userId, delta) => {
        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId
              ? { ...u, walletBalanceMillicents: Math.max(0, u.walletBalanceMillicents + delta) }
              : u
          ),
          currentUser: s.currentUser?.id === userId
            ? { ...s.currentUser, walletBalanceMillicents: Math.max(0, s.currentUser.walletBalanceMillicents + delta) }
            : s.currentUser,
        }));
        const updated = get().users.find((u) => u.id === userId);
        if (updated) {
          mirror(() => supabaseService.updateRow('users', userId, { walletBalanceMillicents: updated.walletBalanceMillicents }));
        }
      },

      // Business actions
      setBusinesses: (businesses) => set({ businesses }),
      addBusiness: (business) => {
        set((s) => ({ businesses: [...s.businesses, business] }));
        mirror(() => supabaseService.upsertRow('businesses', asRow(business)));
      },
      updateBusiness: (id, updates) => {
        set((s) => ({
          businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
        mirror(() => supabaseService.updateRow('businesses', id, asRow(updates)));
      },

      // Loan actions
      setLoans: (loans) => set({ loans }),
      addLoan: (loan) => {
        set((s) => ({ loans: [...s.loans, loan] }));
        mirror(() => supabaseService.upsertRow('loans', asRow(loan)));
      },
      updateLoan: (id, updates) => {
        set((s) => ({
          loans: s.loans.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }));
        mirror(() => supabaseService.updateRow('loans', id, asRow(updates)));
      },

      // Investment actions
      setInvestments: (investments) => set({ investments }),
      addInvestment: (investment) => {
        set((s) => ({ investments: [...s.investments, investment] }));
        mirror(() => supabaseService.upsertRow('investments', asRow(investment)));
      },
      updateInvestment: (id, updates) => set((s) => ({
        investments: s.investments.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      })),

      // Other actions
      addTrade: (trade) => set((s) => ({ trades: [...s.trades, trade] })),
      addDeposit: (deposit) => {
        set((s) => ({ deposits: [...s.deposits, deposit] }));
        mirror(() => supabaseService.upsertRow('deposit_requests', asRow(deposit)));
      },
      updateDeposit: (id, updates) => {
        set((s) => ({
          deposits: s.deposits.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
        mirror(() => supabaseService.updateRow('deposit_requests', id, asRow(updates)));
      },
      addWithdrawal: (withdrawal) => {
        set((s) => ({ withdrawals: [...s.withdrawals, withdrawal] }));
        mirror(() => supabaseService.upsertRow('withdrawal_requests', asRow(withdrawal)));
      },
      updateWithdrawal: (id, updates) => {
        set((s) => ({
          withdrawals: s.withdrawals.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
        mirror(() => supabaseService.updateRow('withdrawal_requests', id, asRow(updates)));
      },
      addPaymentRequest: (pr) => {
        set((s) => ({ paymentRequests: [...s.paymentRequests, pr] }));
        mirror(() => supabaseService.upsertRow('payment_requests', asRow(pr)));
      },
      updatePaymentRequest: (id, updates) => {
        set((s) => ({
          paymentRequests: s.paymentRequests.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        mirror(() => supabaseService.updateRow('payment_requests', id, asRow(updates)));
      },
      addTransfer: (transfer) => {
        set((s) => ({ transfers: [...s.transfers, transfer] }));
        mirror(() => supabaseService.upsertRow('transfers', asRow(transfer)));
      },
      addNotification: (notification) => {
        set((s) => ({
          notifications: [notification, ...s.notifications],
        }));
        mirror(() => supabaseService.upsertRow('notifications', asRow(notification)));
      },
      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),
      addReview: (review) => {
        set((s) => ({ reviews: [...s.reviews, review] }));
        mirror(() => supabaseService.upsertRow('reviews', asRow(review)));
      },
      addJournalEntry: (entry) => {
        set((s) => ({ journalEntries: [...s.journalEntries, entry] }));
        mirror(() => supabaseService.upsertRow('journal_entries', asRow(entry)));
      },
      addVaultIntervention: (vi) => set((s) => ({ vaultInterventions: [...s.vaultInterventions, vi] })),

      setConfidenceHistory: (bizId, history) => set((s) => ({
        confidenceHistory: { ...s.confidenceHistory, [bizId]: history },
      })),
      addConfidencePoint: (bizId, point) => set((s) => ({
        confidenceHistory: {
          ...s.confidenceHistory,
          [bizId]: [...(s.confidenceHistory[bizId] || []), point],
        },
      })),

      // Profile & auth
      updateUserProfile: (userId, updates) => {
        set((s) => ({
          users: s.users.map((u) => u.id === userId ? { ...u, ...updates } : u),
          currentUser: s.currentUser?.id === userId ? { ...s.currentUser, ...updates } : s.currentUser,
        }));
        mirror(() => supabaseService.updateRow('users', userId, asRow(updates)));
      },

      setResetCode: (userId, code, expiry) => set((s) => ({
        users: s.users.map((u) => u.id === userId ? { ...u, resetCode: code || undefined, resetCodeExpiry: expiry || undefined } : u),
      })),

      // Loan repayment
      repayLoan: (loanId, amount, proofUrl) => set((s) => ({
        loans: s.loans.map((l) => {
          if (l.id !== loanId) return l;
          const newRepaid = l.totalRepaidMillicents + amount;
          const newCount = l.repaymentCount + 1;
          const isFullyRepaid = newRepaid >= l.amountMillicents + l.interestMillicents;
          return {
            ...l,
            totalRepaidMillicents: newRepaid,
            repaymentCount: newCount,
            lastRepaymentDate: new Date().toISOString(),
            proofOfPaymentUrl: proofUrl || l.proofOfPaymentUrl,
            status: isFullyRepaid ? 'repaid' as const : l.status,
            loanCategoryUnlocked: newCount >= 5 ? 3 as const : newCount >= 2 ? 2 as const : 1 as const,
          };
        }),
      })),

      requestExtension: (loanId) => set((s) => ({
        loans: s.loans.map((l) => l.id === loanId ? {
          ...l,
          extensionStatus: 'pending' as const,
          extensionRequestedAt: new Date().toISOString(),
        } : l),
      })),

      approveExtension: (loanId) => set((s) => ({
        loans: s.loans.map((l) => {
          if (l.id !== loanId) return l;
          const extInterest = Math.round(l.amountMillicents * 0.02);
          const newDue = new Date(l.dueDate);
          newDue.setDate(newDue.getDate() + 15);
          return {
            ...l,
            extensionStatus: 'approved' as const,
            status: 'extended' as const,
            extensionInterestMillicents: extInterest,
            dueDate: newDue.toISOString(),
          };
        }),
      })),

      // Loan approval: funded from the bank reserve (no money minting).
      // Reads state via get(), computes, then sets once.
      approveLoan: (loanId) => {
        const s = get();
        const loan = s.loans.find((l) => l.id === loanId);
        if (!loan) return { ok: false, error: 'Loan not found.' };
        if (loan.status !== 'draft') return { ok: false, error: `Loan is not awaiting review (status: ${loan.status}).` };
        if (s.bankReserveMillicents < loan.amountMillicents) {
          return { ok: false, error: `Insufficient bank reserve. Available ${formatCurrencyMc(s.bankReserveMillicents)}, required ${formatCurrencyMc(loan.amountMillicents)}.` };
        }

        const now = new Date().toISOString();
        const borrower = s.users.find((u) => u.id === loan.borrowerId);
        const linkedBiz = s.businesses.find((b) => b.id === loan.businessId);
        const bizGoesLive = !!linkedBiz && linkedBiz.currentBackers >= linkedBiz.requiredBackers;

        const notification: Notification = {
          id: uid('n'),
          userId: loan.borrowerId,
          type: 'loan_approved',
          message: `Your Launch Capital loan of ${formatCurrencyMc(loan.amountMillicents)} for "${loan.businessName}" has been approved.`,
          read: false,
          createdAt: now,
        };
        const journalDebit: JournalEntry = {
          id: uid('j'), account: 'Bank',
          debitMillicents: loan.amountMillicents, creditMillicents: 0,
          referenceType: 'loan_approved', referenceId: loan.id, createdAt: now,
        };
        const journalCredit: JournalEntry = {
          id: uid('j'), account: 'UserWallet',
          debitMillicents: 0, creditMillicents: loan.amountMillicents,
          referenceType: 'loan_approved', referenceId: loan.id, createdAt: now,
        };

        set({
          bankReserveMillicents: s.bankReserveMillicents - loan.amountMillicents,
          loans: s.loans.map((l) => (l.id === loanId ? { ...l, status: 'active' as const } : l)),
          users: s.users.map((u) =>
            u.id === loan.borrowerId
              ? { ...u, walletBalanceMillicents: u.walletBalanceMillicents + loan.amountMillicents }
              : u
          ),
          currentUser: s.currentUser?.id === loan.borrowerId
            ? { ...s.currentUser, walletBalanceMillicents: s.currentUser.walletBalanceMillicents + loan.amountMillicents }
            : s.currentUser,
          businesses: bizGoesLive
            ? s.businesses.map((b) =>
                b.id === linkedBiz.id ? { ...b, status: 'live' as const, isLive: true } : b)
            : s.businesses,
          notifications: [notification, ...s.notifications],
          journalEntries: [...s.journalEntries, journalDebit, journalCredit],
        });

        // Best-effort write-through
        mirror(() => supabaseService.updateRow('loans', loanId, { status: 'active' }));
        if (borrower) {
          mirror(() => supabaseService.updateRow('users', loan.borrowerId, {
            walletBalanceMillicents: borrower.walletBalanceMillicents + loan.amountMillicents,
          }));
        }
        if (bizGoesLive && linkedBiz) {
          mirror(() => supabaseService.updateRow('businesses', linkedBiz.id, { status: 'live', isLive: true }));
        }
        mirror(() => supabaseService.upsertRow('notifications', asRow(notification)));
        mirror(() => supabaseService.upsertRow('journal_entries', asRow(journalDebit)));
        mirror(() => supabaseService.upsertRow('journal_entries', asRow(journalCredit)));

        return { ok: true };
      },

      rejectLoan: (loanId) => {
        const s = get();
        const loan = s.loans.find((l) => l.id === loanId);
        if (!loan || loan.status !== 'draft') return;
        const now = new Date().toISOString();
        const notification: Notification = {
          id: uid('n'),
          userId: loan.borrowerId,
          type: 'loan_rejected',
          message: `Your Launch Capital loan application of ${formatCurrencyMc(loan.amountMillicents)} for "${loan.businessName}" was declined. Contact the banker for details.`,
          read: false,
          createdAt: now,
        };
        set({
          loans: s.loans.map((l) => (l.id === loanId ? { ...l, status: 'rejected' as const } : l)),
          notifications: [notification, ...s.notifications],
        });
        mirror(() => supabaseService.updateRow('loans', loanId, { status: 'rejected' }));
        mirror(() => supabaseService.upsertRow('notifications', asRow(notification)));
      },

      // Business review (banker gate before a listing opens for backing)
      reviewBusiness: (businessId, decision) => {
        const s = get();
        const biz = s.businesses.find((b) => b.id === businessId);
        if (!biz || biz.status !== 'draft') return;
        const now = new Date().toISOString();
        const notification: Notification = {
          id: uid('n'),
          userId: biz.ownerId,
          type: decision === 'approved' ? 'business_approved' : 'business_rejected',
          message: decision === 'approved'
            ? `Your business "${biz.name}" has been approved and is now open for backing.`
            : `Your business "${biz.name}" was declined by the banker. You can update the listing and resubmit.`,
          read: false,
          createdAt: now,
        };
        set({
          businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, status: decision } : b)),
          notifications: [notification, ...s.notifications],
        });
        mirror(() => supabaseService.updateRow('businesses', businessId, { status: decision }));
        mirror(() => supabaseService.upsertRow('notifications', asRow(notification)));
      },

      // Business backing (crowdfunding): one backer per user, only while open
      // for backing ('approved'). Goes live at requiredBackers.
      backBusiness: (businessId, userId) => {
        const s = get();
        const biz = s.businesses.find((b) => b.id === businessId);
        if (!biz || biz.status !== 'approved') return;
        if (s.businessBackers.some((bb) => bb.businessId === businessId && bb.userId === userId)) return;

        const now = new Date().toISOString();
        const newBackers = biz.currentBackers + 1;
        const goesLive = newBackers >= biz.requiredBackers;
        const notification: Notification | null = goesLive
          ? {
              id: uid('n'),
              userId: biz.ownerId,
              type: 'business_backed',
              message: `Congratulations! Your business "${biz.name}" reached ${newBackers} backers and is now live on the market!`,
              read: false,
              createdAt: now,
            }
          : null;

        set({
          businessBackers: [...s.businessBackers, { businessId, userId, backedAt: now }],
          businesses: s.businesses.map((b) =>
            b.id === businessId
              ? {
                  ...b,
                  currentBackers: newBackers,
                  status: goesLive ? ('live' as const) : b.status,
                  isLive: goesLive || b.isLive,
                }
              : b
          ),
          notifications: notification ? [notification, ...s.notifications] : s.notifications,
        });

        mirror(() => supabaseService.updateRow('businesses', businessId, goesLive
          ? { currentBackers: newBackers, status: 'live', isLive: true }
          : { currentBackers: newBackers }));
        if (notification) {
          mirror(() => supabaseService.upsertRow('notifications', asRow(notification)));
        }
      },

      hasBacked: (businessId, userId) =>
        get().businessBackers.some((bb) => bb.businessId === businessId && bb.userId === userId),

      // Demo seed: merge the demo dataset once (no-op when businesses exist)
      seedDemoData: () => {
        const s = get();
        if (s.businesses.length > 0) return;
        const ds = buildDemoDataset();
        const userIds = new Set(s.users.map((u) => u.id));
        const invIds = new Set(s.investments.map((i) => i.id));
        const notifIds = new Set(s.notifications.map((n) => n.id));
        const backerKeys = new Set(s.businessBackers.map((b) => `${b.businessId}:${b.userId}`));
        set({
          users: [...s.users, ...ds.users.filter((u) => !userIds.has(u.id))],
          businesses: ds.businesses,
          investments: [...s.investments, ...ds.investments.filter((i) => !invIds.has(i.id))],
          notifications: [...ds.notifications.filter((n) => !notifIds.has(n.id)), ...s.notifications],
          businessBackers: [
            ...s.businessBackers,
            ...ds.businessBackers.filter((b) => !backerKeys.has(`${b.businessId}:${b.userId}`)),
          ],
        });
      },

      // Supabase sync (load data from Supabase when available).
      // Fault-tolerant: a failed slice is skipped (local state kept); warns once.
      syncFromSupabase: async () => {
        if (!supabaseService.isSupabaseConfigured) return;
        const keys = [
          'users', 'businesses', 'loans', 'investments', 'trades',
          'deposits', 'withdrawals', 'paymentRequests', 'transfers',
          'notifications', 'reviews', 'journalEntries', 'vaultInterventions',
        ] as const;
        const results = await Promise.allSettled([
          supabaseService.fetchUsers(),
          supabaseService.fetchBusinesses(),
          supabaseService.fetchLoans(),
          supabaseService.fetchInvestments(),
          supabaseService.fetchTrades(),
          supabaseService.fetchDeposits(),
          supabaseService.fetchWithdrawals(),
          supabaseService.fetchPaymentRequests(),
          supabaseService.fetchTransfers(),
          supabaseService.fetchNotifications(),
          supabaseService.fetchReviews(),
          supabaseService.fetchJournalEntries(),
          supabaseService.fetchVaultInterventions(),
        ]);
        let warned = false;
        const patch: Record<string, unknown[]> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            patch[keys[i]] = r.value;
          } else if (!warned) {
            warned = true;
            console.warn('[yavv] Supabase sync failed (offline?)', r.reason);
          }
        });
        set(patch as Partial<AppState>);
      },

      // Computed helpers
      getUnreadNotifications: () => get().notifications.filter((n) => !n.read),
      getBusinessInvestments: (businessId) => get().investments.filter((i) => i.businessId === businessId),
      getUserInvestments: (userId) => get().investments.filter((i) => i.userId === userId),
      getBusinessReviews: (businessId) => get().reviews.filter((r) => r.businessId === businessId),
      getPendingDeposits: () => get().deposits.filter((d) => d.status === 'pending'),
      getPendingWithdrawals: () => get().withdrawals.filter((w) => w.status === 'pending'),
      getPendingLoans: () => get().loans.filter((l) => l.status === 'draft'),
      getVaultPool: () => {
        const users = get().users;
        return users.reduce((sum, u) => sum + Math.floor(u.walletBalanceMillicents * 0.15), 0);
      },
    }),
    {
      name: 'yavv-storage',
      partialize: (state) => ({
        // Persist only data + auth + theme -- not computed or functions
        theme: state.theme,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        isBanker: state.isBanker,
        isAdminAuthenticated: state.isAdminAuthenticated,
        bankReserveMillicents: state.bankReserveMillicents,
        users: state.users,
        businesses: state.businesses,
        loans: state.loans,
        investments: state.investments,
        trades: state.trades,
        deposits: state.deposits,
        withdrawals: state.withdrawals,
        paymentRequests: state.paymentRequests,
        transfers: state.transfers,
        notifications: state.notifications,
        reviews: state.reviews,
        journalEntries: state.journalEntries,
        vaultInterventions: state.vaultInterventions,
        confidenceHistory: state.confidenceHistory,
        businessBackers: state.businessBackers,
      }),
    }
  )
);

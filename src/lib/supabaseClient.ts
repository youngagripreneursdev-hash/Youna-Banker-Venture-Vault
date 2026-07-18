// ==========================================
// SUPABASE CLIENT CONFIGURATION
// ==========================================
// Set these environment variables in your .env file:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
// VITE_ADMIN_PASSWORD=your-secure-admin-password (for banker gate)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Determine if Supabase is properly configured
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Create Supabase client only if configured
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ==========================================
// AUTH SERVICE
// ==========================================
export async function signUpWithEmail(email: string, password: string, metadata: Record<string, string>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function resetPassword(email: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ==========================================
// GENERIC WRITE HELPERS (write-through mirror)
// ==========================================

/** Convert a camelCase object key to snake_case (e.g. walletBalanceMillicents -> wallet_balance_millicents). */
export function toSnakeCase(key: string): string {
  return key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
}

// Known DB columns per table (from supabase/schema-idempotent.sql).
// Keys not listed here (e.g. _passwordHash, denormalized *Name fields without
// matching columns) are stripped before writing so best-effort mirroring
// does not fail with PGRST204 "column not found".
const TABLE_COLUMNS: Record<string, ReadonlySet<string>> = {
  users: new Set(['id', 'email', 'full_name', 'student_number', 'phone_number', 'address', 'is_student_verified', 'role', 'wallet_balance_millicents', 'pending_interest_millicents', 'bank_name', 'bank_account_number', 'bank_account_holder', 'student_card_url', 'reset_code', 'reset_code_expiry', 'account_expiry_date', 'created_at', 'updated_at']),
  businesses: new Set(['id', 'owner_id', 'owner_name', 'name', 'description', 'status', 'health_score', 'color', 'confidence_price', 'total_units_issued', 'units_held_by_vault', 'net_entries', 'current_bets', 'settled_bets', 'total_revenue', 'net_profit', 'investor_payouts', 'admin_fees', 'profit_margin', 'avg_settlement_days', 'velocity_score', 'is_live', 'current_backers', 'required_backers', 'target_market', 'needs_time_extension', 'created_at', 'updated_at']),
  loans: new Set(['id', 'business_id', 'business_name', 'borrower_id', 'borrower_name', 'amount_millicents', 'interest_millicents', 'admin_fee_millicents', 'due_date', 'status', 'created_at', 'repaid_at', 'tier', 'total_repaid_millicents', 'last_repayment_date', 'repayment_count', 'extension_status', 'extension_requested_at', 'extension_interest_millicents', 'loan_category_unlocked', 'required_backers', 'current_backers', 'proof_of_payment_url', 'business_description', 'target_market', 'needs_time_extension']),
  investments: new Set(['id', 'user_id', 'business_id', 'tranche_id', 'units', 'deposited_millicents', 'status', 'created_at', 'settled_at']),
  trades: new Set(['id', 'business_id', 'business_name', 'buyer_id', 'seller_id', 'tranche_id', 'units', 'price_per_unit_millicents', 'trade_type', 'is_vault_intervention', 'created_at']),
  deposit_requests: new Set(['id', 'user_id', 'user_name', 'amount_millicents', 'reference_code', 'proof_of_payment_url', 'proof_of_payment_path', 'status', 'banker_notes', 'created_at', 'approved_at', 'approved_by']),
  withdrawal_requests: new Set(['id', 'user_id', 'user_name', 'amount_millicents', 'fee_millicents', 'status', 'created_at', 'approved_at']),
  payment_requests: new Set(['id', 'from_business_id', 'from_business_name', 'from_user_id', 'to_user_id', 'to_user_name', 'amount_millicents', 'order_reference', 'description', 'status', 'created_at', 'paid_at', 'expires_at']),
  transfers: new Set(['id', 'from_user_id', 'from_user_name', 'to_user_id', 'to_user_name', 'to_business_id', 'to_business_name', 'amount_millicents', 'fee_millicents', 'type', 'note', 'created_at']),
  notifications: new Set(['id', 'user_id', 'type', 'message', 'read', 'created_at']),
  reviews: new Set(['id', 'user_id', 'user_name', 'business_id', 'business_name', 'rating', 'comment', 'created_at']),
  journal_entries: new Set(['id', 'account', 'debit_millicents', 'credit_millicents', 'reference_type', 'reference_id', 'created_at']),
  vault_interventions: new Set(['id', 'business_id', 'business_name', 'units_bought', 'total_cost_millicents', 'status', 'created_at', 'resolved_at']),
};

/** Map a camelCase app object to a snake_case DB row, dropping unknown/internal keys. */
export function toDbRow(table: string, obj: Record<string, unknown>): Record<string, unknown> {
  const allowed = TABLE_COLUMNS[table];
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_') || value === undefined) continue;
    const col = toSnakeCase(key);
    if (allowed && !allowed.has(col)) continue;
    row[col] = value;
  }
  return row;
}

/** Insert-or-update a row by primary key. No-op when Supabase is not configured. */
export async function upsertRow(table: string, row: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(table).upsert([toDbRow(table, row)]);
  if (error) console.warn(`[yavv] upsertRow(${table}):`, error);
}

/** Update a row by id. No-op when Supabase is not configured. */
export async function updateRow(table: string, id: string, updates: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(table).update(toDbRow(table, updates)).eq('id', id);
  if (error) console.warn(`[yavv] updateRow(${table}):`, error);
}

// ==========================================
// DATABASE HELPERS
// ==========================================
export async function fetchUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('users').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchBusinesses() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('businesses').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function createBusiness(biz: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('businesses').insert([biz]).select().single();
  if (error) throw error;
  return data;
}

export async function updateBusinessDb(id: string, updates: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('businesses').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchInvestments() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('investments').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function createInvestment(inv: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('investments').insert([inv]).select().single();
  if (error) throw error;
  return data;
}

export async function fetchLoans() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('loans').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchDeposits() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('deposit_requests').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchWithdrawals() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('withdrawal_requests').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchTransfers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('transfers').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchPaymentRequests() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('payment_requests').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchNotifications() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('notifications').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchReviews() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('reviews').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchJournalEntries() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('journal_entries').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchVaultInterventions() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('vault_interventions').select('*');
  if (error) { throw error; }
  return data || [];
}

export async function fetchTrades() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trades').select('*');
  if (error) { throw error; }
  return data || [];
}

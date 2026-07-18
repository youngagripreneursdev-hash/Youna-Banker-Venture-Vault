// ==========================================
// YOUNA VENTURE VAULT - SHARED CRYPTO HELPERS
// ==========================================
// Client-side SHA-256 password hashing (salted).
// NOTE: In production, Supabase Auth should handle credentials;
// this exists for the local-first demo/offline flow.

export const PASSWORD_SALT = 'yavv-salt-2026';

export async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain + PASSWORD_SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

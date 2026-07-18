// ============================================================
// YOUNA VENTURE VAULT - SUPABASE CLIENT & STORAGE HELPERS
// ============================================================
// This file initializes the Supabase client and provides
// helper functions for file uploads to storage buckets.
//
// REQUIRED: Set these environment variables in your .env file:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
//
// STORAGE BUCKETS (create these in Supabase Dashboard > Storage):
//   1. "proof-of-payment" - Private bucket for deposit proofs
//   2. "student-cards" - Private bucket for student card uploads
//   3. "business-logos" - Public bucket for business logos
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ---- INITIALIZE SUPABASE CLIENT ----
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Guard: create a dummy client when env vars are missing to prevent crashes
let supabaseInstance: ReturnType<typeof createClient>;
if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a minimal mock that returns errors gracefully
  supabaseInstance = {
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }),
        getPublicUrl: () => ({ data: { publicUrl: null } }),
        createSignedUrl: async () => ({ data: null, error: new Error('Supabase not configured.') }),
        list: async () => ({ data: [], error: null }),
        download: async () => ({ data: null, error: new Error('Supabase not configured.') }),
        remove: async () => ({ error: null }),
      }),
    },
  } as unknown as ReturnType<typeof createClient>;
}

export const supabase = supabaseInstance;

// ---- BUCKET NAMES ----
export const BUCKETS = {
  PROOF_OF_PAYMENT: 'proof-of-payment',
  STUDENT_CARDS: 'student-cards',
  BUSINESS_LOGOS: 'business-logos',
} as const;

// ---- ALLOWED FILE TYPES ----
export const ALLOWED_FILE_TYPES = {
  PROOF: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'],
  STUDENT_CARD: ['.png', '.jpg', '.jpeg', '.pdf'],
  LOGO: ['.png', '.jpg', '.jpeg'],
} as const;

export const MAX_FILE_SIZES = {
  PROOF: 5 * 1024 * 1024,      // 5MB
  STUDENT_CARD: 2 * 1024 * 1024, // 2MB
  LOGO: 1 * 1024 * 1024,        // 1MB
} as const;

// ============================================================
// FILE UPLOAD FUNCTIONS
// ============================================================

/**
 * Upload a proof-of-payment file to Supabase Storage.
 * Returns the public URL and file path for database storage.
 */
export async function uploadProofOfPayment(
  file: File,
  userId: string,
  depositId: string
): Promise<{ url: string | null; path: string; error: Error | null }> {
  // Validate file type
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}` as '.pdf' | '.doc' | '.docx' | '.png' | '.jpg' | '.jpeg' | '.webp';
  if (!ALLOWED_FILE_TYPES.PROOF.includes(ext)) {
    return {
      url: null,
      path: '',
      error: new Error(
        `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.PROOF.join(', ')}`
      ),
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZES.PROOF) {
    return {
      url: null,
      path: '',
      error: new Error(
        `File too large. Max size: ${MAX_FILE_SIZES.PROOF / (1024 * 1024)}MB`
      ),
    };
  }

  // Create unique file path: {userId}/{depositId}/proof.{ext}
  const filePath = `${userId}/${depositId}/proof${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.PROOF_OF_PAYMENT)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { url: null, path: '', error };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKETS.PROOF_OF_PAYMENT)
    .getPublicUrl(filePath);

  return {
    url: urlData?.publicUrl || null,
    path: data.path,
    error: null,
  };
}

/**
 * Upload a student card image for verification.
 */
export async function uploadStudentCard(
  file: File,
  userId: string
): Promise<{ url: string | null; path: string; error: Error | null }> {
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}` as '.pdf' | '.png' | '.jpg' | '.jpeg';
  if (!ALLOWED_FILE_TYPES.STUDENT_CARD.includes(ext)) {
    return {
      url: null,
      path: '',
      error: new Error(
        `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.STUDENT_CARD.join(', ')}`
      ),
    };
  }

  if (file.size > MAX_FILE_SIZES.STUDENT_CARD) {
    return {
      url: null,
      path: '',
      error: new Error(
        `File too large. Max size: ${MAX_FILE_SIZES.STUDENT_CARD / (1024 * 1024)}MB`
      ),
    };
  }

  const filePath = `${userId}/student-card${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.STUDENT_CARDS)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return { url: null, path: '', error };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKETS.STUDENT_CARDS)
    .getPublicUrl(filePath);

  return {
    url: urlData?.publicUrl || null,
    path: data.path,
    error: null,
  };
}

/**
 * Get a signed URL to view a private file (for banker dashboard).
 * Signed URLs expire after a set time but allow access to private buckets.
 */
export async function getSignedFileUrl(
  bucket: string,
  filePath: string,
  expirySeconds: number = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expirySeconds);

  if (error) {
    return { signedUrl: null, error };
  }

  return { signedUrl: data?.signedUrl || null, error: null };
}

/**
 * List all files in a bucket folder (for banker to review proofs).
 */
export async function listProofOfPaymentFiles(
  folderPath?: string
): Promise<{ files: { name: string; path: string; size: number; createdAt: string }[]; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKETS.PROOF_OF_PAYMENT)
    .list(folderPath || '');

  if (error) {
    return { files: [], error };
  }

  const files = (data || [])
    .filter((item) => item.name && !item.name.endsWith('/')) // Skip folder placeholders
    .map((item) => ({
      name: item.name || '',
      path: folderPath ? `${folderPath}/${item.name}` : (item.name || ''),
      size: (item.metadata as Record<string, unknown>)?.size as number || 0,
      createdAt: item.created_at || '',
    }));

  return { files, error: null };
}

/**
 * Download a file directly (for PDF/image preview).
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<{ blob: Blob | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error) {
    return { blob: null, error };
  }

  return { blob: data, error: null };
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  return { error };
}

// ============================================================
// HELPER: Format file size for display
// ============================================================
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// HELPER: Get file icon based on extension
// ============================================================
export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    webp: '🖼️',
  };
  return iconMap[ext] || '📎';
}

// ============================================================
// HELPER: Check if file is an image (for preview)
// ============================================================
export function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
}

// ============================================================
// MOCK UPLOAD (for demo without Supabase connection)
// ============================================================
/**
 * Simulates a file upload and returns a mock URL.
 * Use this when Supabase is not yet configured.
 */
// Track created object URLs so we can revoke them later
const objectUrlRegistry = new Set<string>();

export function mockUploadProofOfPayment(
  file: File,
  userId: string,
  depositId: string
): Promise<{ url: string | null; path: string; error: Error | null }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const mockPath = `${userId}/${depositId}/proof.${ext}`;
      const mockUrl = URL.createObjectURL(file);
      objectUrlRegistry.add(mockUrl); // Track for cleanup

      resolve({
        url: mockUrl,
        path: mockPath,
        error: null,
      });
    }, 800);
  });
}

/** Revoke a previously created object URL to prevent memory leaks */
export function revokeMockUrl(url: string | null) {
  if (url && objectUrlRegistry.has(url)) {
    URL.revokeObjectURL(url);
    objectUrlRegistry.delete(url);
  }
}

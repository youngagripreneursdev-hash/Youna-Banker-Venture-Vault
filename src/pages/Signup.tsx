import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { hashPassword } from '@/lib/crypto';
import { uploadStudentCard, isImageFile, formatFileSize } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import type { User } from '@/types';

const CARD_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];
const CARD_MAX_BYTES = 2 * 1024 * 1024; // 2MB

// Downscale an image to a compact JPEG data URL for local (non-Supabase) storage
function downscaleImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file'));
    };
    img.src = objectUrl;
  });
}

export function Signup() {
  const navigate = useNavigate();
  const { users, addUser, login, updateUserProfile } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    fullName: '', email: '', phoneNumber: '', studentNumber: '', address: '',
    bankName: '', bankAccountNumber: '', bankAccountHolder: '',
    password: '', confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [cardWarning, setCardWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revoke the thumbnail object URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (cardPreview) URL.revokeObjectURL(cardPreview);
    };
  }, [cardPreview]);

  const handleCardSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!CARD_EXTENSIONS.includes(ext)) {
      setErrors({ ...errors, card: 'Invalid file type. Allowed: .png, .jpg, .jpeg, .pdf' });
      return;
    }
    if (file.size > CARD_MAX_BYTES) {
      setErrors({ ...errors, card: 'File too large. Max size: 2MB' });
      return;
    }
    setErrors({ ...errors, card: '' });
    setCardWarning('');
    setCardFile(file);
    setCardPreview(isImageFile(file.name) ? URL.createObjectURL(file) : null);
  };

  const removeCard = () => {
    setCardFile(null);
    setCardPreview(null);
    setErrors({ ...errors, card: '' });
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    else if (users.some((u) => u.email === form.email.trim())) e.email = 'An account with this email already exists';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    if (!form.studentNumber.trim()) e.studentNumber = 'Student number is required';
    if (!form.address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.bankName.trim()) e.bankName = 'Bank name is required';
    if (!form.bankAccountNumber.trim()) e.bankAccountNumber = 'Account number is required';
    if (!form.bankAccountHolder.trim()) e.bankAccountHolder = 'Account holder name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreed) e.agreed = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadCard = async (userId: string): Promise<string> => {
    if (!cardFile) return '';
    const FAILURE_MSG = 'Card upload failed — you can re-upload from Settings later.';
    if (isSupabaseConfigured) {
      const res = await uploadStudentCard(cardFile, userId);
      if (!res.error && res.url) {
        updateUserProfile(userId, { studentCardUrl: res.url } as Partial<User>);
        return '';
      }
      return FAILURE_MSG;
    }
    // Local mode: store a downscaled data URL (PDFs are too large for localStorage)
    if (isImageFile(cardFile.name)) {
      try {
        const dataUrl = await downscaleImage(cardFile);
        updateUserProfile(userId, { studentCardUrl: dataUrl } as Partial<User>);
        return '';
      } catch {
        return FAILURE_MSG;
      }
    }
    return FAILURE_MSG;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateStep3()) return;
    setIsSubmitting(true);
    const passwordHash = await hashPassword(form.password);
    const newUser = {
      id: `u-${Date.now()}`,
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      studentNumber: form.studentNumber.trim(),
      phoneNumber: form.phoneNumber.trim(),
      address: form.address.trim(),
      isStudentVerified: false,
      role: 'student' as const,
      walletBalanceMillicents: 0,
      pendingInterestMillicents: 0,
      bankName: form.bankName.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankAccountHolder: form.bankAccountHolder.trim(),
      createdAt: new Date().toISOString(),
      accountExpiryDate: null,
      _passwordHash: passwordHash,
    };
    addUser(newUser as unknown as User);
    login(newUser as unknown as User);
    // Optional student card upload — never blocks account creation
    const warning = await uploadCard(newUser.id);
    if (warning) {
      // Non-blocking warning: signup succeeded, but let the user see the note briefly
      setCardWarning(warning);
      setTimeout(() => navigate('/'), 2500);
    } else {
      navigate('/');
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-[var(--card-bg-elevated)] border rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none transition-all ${errors[field] ? 'border-red-500/50' : 'border-[var(--card-border-hover)] focus:border-emerald-500/50'}`;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 relative overflow-hidden"
        style={{ backgroundImage: 'url(/signup-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[var(--app-bg)]/90" />
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h1 className="text-xl font-bold">Create Account</h1>
            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1 uppercase tracking-widest">Step {step} of 3</p>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              {['fullName', 'email', 'phoneNumber', 'studentNumber', 'address'].map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">
                    {field === 'fullName' ? 'Full Name' : field === 'studentNumber' ? 'Student Number' : field === 'phoneNumber' ? 'Phone Number' : field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => { setForm({ ...form, [field]: e.target.value }); setErrors({ ...errors, [field]: '' }); }}
                    placeholder={field === 'fullName' ? 'Thabo Mokoena' : field === 'email' ? 'thabo@university.ac.za' : field === 'studentNumber' ? 'ST2024001' : field === 'phoneNumber' ? '+27823456789' : 'Pretoria, Gauteng'}
                    className={inputClass(field)}
                  />
                  {errors[field] && <p className="text-[10px] text-red-400 mt-1">{errors[field]}</p>}
                </div>
              ))}
              <button onClick={() => validateStep1() && setStep(2)} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-sm font-bold transition-all mt-2">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {['bankName', 'bankAccountNumber', 'bankAccountHolder'].map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">
                    {field === 'bankName' ? 'Bank Name' : field === 'bankAccountNumber' ? 'Account Number' : 'Account Holder'}
                  </label>
                  <input
                    type="text"
                    value={form[field as keyof typeof form]}
                    onChange={(e) => { setForm({ ...form, [field]: e.target.value }); setErrors({ ...errors, [field]: '' }); }}
                    placeholder={field === 'bankName' ? 'FNB' : field === 'bankAccountNumber' ? '62345678901' : 'Thabo Mokoena'}
                    className={inputClass(field)}
                  />
                  {errors[field] && <p className="text-[10px] text-red-400 mt-1">{errors[field]}</p>}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg bg-[var(--card-bg-elevated)] border border-[var(--card-border)] text-[var(--app-fg)] text-sm font-bold transition-all">Back</button>
                <button onClick={() => validateStep2() && setStep(3)} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-sm font-bold transition-all">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">Password</label>
                <input type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }} placeholder="Min 8 characters" className={inputClass('password')} />
                {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }} placeholder="Repeat password" className={inputClass('confirmPassword')} />
                {errors.confirmPassword && <p className="text-[10px] text-red-400 mt-1">{errors.confirmPassword}</p>}
              </div>
              <div>
                <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold mb-1.5 block">
                  Student Card <span className="normal-case font-normal">(recommended for verification — optional)</span>
                </label>
                {!cardFile ? (
                  <label className="flex flex-col items-center justify-center gap-1 w-full py-4 rounded-lg border border-dashed border-[var(--card-border-hover)] bg-[var(--card-bg-elevated)] cursor-pointer hover:border-emerald-500/50 transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--app-fg-subtle)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
                    <span className="text-[10px] text-[var(--app-fg-subtle)]">PNG, JPG or PDF · max 2MB</span>
                    <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleCardSelect} className="hidden" />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 w-full rounded-lg border border-[var(--card-border-hover)] bg-[var(--card-bg-elevated)] px-3 py-2">
                    {cardPreview ? (
                      <img src={cardPreview} alt="Student card preview" className="w-10 h-10 rounded object-cover border border-[var(--card-border)]" />
                    ) : (
                      <span className="w-10 h-10 rounded bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[10px] font-bold text-[var(--app-fg-subtle)]">PDF</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--app-fg)] truncate">{cardFile.name}</p>
                      <p className="text-[10px] text-[var(--app-fg-subtle)]">{formatFileSize(cardFile.size)}</p>
                    </div>
                    <button type="button" onClick={removeCard} aria-label="Remove file" className="text-[var(--app-fg-subtle)] hover:text-red-400 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                )}
                {errors.card && <p className="text-[10px] text-red-400 mt-1">{errors.card}</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrors({ ...errors, agreed: '' }); }} className="rounded border-[var(--card-border-hover)] bg-[var(--card-bg-elevated)]" />
                <span className="text-[10px] text-[var(--app-fg-subtle)]">I accept the <button type="button" className="text-blue-400 hover:underline">Terms of Service</button></span>
              </label>
              {errors.agreed && <p className="text-[10px] text-red-400">{errors.agreed}</p>}
              {cardWarning && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-[10px] text-yellow-400">{cardWarning}</p>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setStep(2)} disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-[var(--card-bg-elevated)] border border-[var(--card-border)] text-[var(--app-fg)] text-sm font-bold transition-all disabled:opacity-40">Back</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-sm font-bold transition-all disabled:opacity-50">
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <button onClick={() => navigate('/login')} className="text-xs text-[var(--app-fg-subtle)] hover:text-[var(--app-fg-dim)] transition-colors">
              Already have an account? <span className="text-emerald-400">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

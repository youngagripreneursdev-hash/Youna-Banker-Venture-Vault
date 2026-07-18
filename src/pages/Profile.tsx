import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export function Profile() {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile } = useStore();
  const [form, setForm] = useState({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phoneNumber: currentUser?.phoneNumber || '',
    address: currentUser?.address || '',
    bankName: currentUser?.bankName || '',
    bankAccountNumber: currentUser?.bankAccountNumber || '',
    bankAccountHolder: currentUser?.bankAccountHolder || '',
  });
  const [saved, setSaved] = useState(false);

  if (!currentUser) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateUserProfile(currentUser.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const fields = [
    { label: 'Full Name', field: 'fullName', placeholder: 'John Doe' },
    { label: 'Email Address', field: 'email', placeholder: 'john@student.ac.za', type: 'email' },
    { label: 'Phone Number', field: 'phoneNumber', placeholder: '+27821234567', type: 'tel' },
    { label: 'Physical Address', field: 'address', placeholder: '123 Main St, Pretoria' },
    { label: 'Bank Name', field: 'bankName', placeholder: 'Capitec Bank' },
    { label: 'Account Number', field: 'bankAccountNumber', placeholder: '2081845985' },
    { label: 'Account Holder', field: 'bankAccountHolder', placeholder: 'John Doe' },
  ];

  const handlePasswordChange = async () => {
    setPwError(''); setPwSuccess(false);
    // Hash current input and compare
    const encoder = new TextEncoder();
    const currData = encoder.encode(passwordForm.current + 'yavv-salt-2026');
    const currHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', currData))).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (currHash !== (currentUser._passwordHash || '')) {
      setPwError('Current password is incorrect'); return;
    }
    if (passwordForm.new.length < 8) {
      setPwError('New password must be at least 8 characters'); return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPwError('New passwords do not match'); return;
    }
    // Hash new password
    const newData = encoder.encode(passwordForm.new + 'yavv-salt-2026');
    const newHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', newData))).map((b) => b.toString(16).padStart(2, '0')).join('');
    updateUserProfile(currentUser.id, { _passwordHash: newHash });
    setPwSuccess(true);
    setPasswordForm({ current: '', new: '', confirm: '' });
    setTimeout(() => setPwSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Edit Profile</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Update Your Information</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold">{currentUser.fullName}</h2>
            <p className="text-xs text-[var(--app-fg-muted)]">{currentUser.studentNumber}</p>
            <p className="text-xs text-[var(--app-fg-subtle)]">{currentUser.role === 'banker' ? 'Banker' : 'Student'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {fields.map((f) => (
            <div key={f.field} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <label className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold block mb-1.5">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.field as keyof typeof form]}
                onChange={(e) => handleChange(f.field, e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        {/* Password Change */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 mb-6">
          <h3 className="text-sm font-bold text-[var(--app-fg)] mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Change Password
          </h3>
          <div className="space-y-3">
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)] transition-colors" placeholder="Current password" />
            <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)] transition-colors" placeholder="New password (min 8 chars)" />
            <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-fg)] focus:outline-none focus:border-[var(--input-focus)] transition-colors" placeholder="Confirm new password" />
            {pwError && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">Password changed successfully!</p>}
            <button onClick={handlePasswordChange}
              className="w-full bg-[var(--card-bg-elevated)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all">
              Update Password
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg mb-4"
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>

        {/* Back to Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] text-xs transition-all mb-6"
        >
          Back to Settings
        </button>
      </div>
    </div>
  );
}

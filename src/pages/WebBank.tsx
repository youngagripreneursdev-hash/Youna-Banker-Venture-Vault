import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrencyMc } from '@/lib/calculations';
import { WITHDRAWAL_FEE, MIN_WITHDRAWAL } from '@/lib/calculations';
import { mockUploadProofOfPayment, formatFileSize, isImageFile } from '@/lib/supabase';

export function WebBank() {
  const navigate = useNavigate();
  const { currentUser, transfers, paymentRequests, deposits, withdrawals, users, addDeposit, addWithdrawal, addTransfer, addPaymentRequest, addNotification, updateUserBalance } = useStore();
  const [activeTab, setActiveTab] = useState<'deposit' | 'transfer' | 'withdraw' | 'requests'>('deposit');

  if (!currentUser) return null;

  const userTransfers = transfers.filter((t) => t.fromUserId === currentUser.id || t.toUserId === currentUser.id);
  const userPayments = paymentRequests.filter((p) => p.toUserId === currentUser.id || p.fromUserId === currentUser.id || p.fromBusinessId === currentUser.id);
  const userDeposits = deposits.filter((d) => d.userId === currentUser.id);
  const userWithdrawals = withdrawals.filter((w) => w.userId === currentUser.id);

  // Forms
  const [depositAmount, setDepositAmount] = useState('');
  const [depositProof, setDepositProof] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payReqEmail, setPayReqEmail] = useState('');
  const [payReqAmount, setPayReqAmount] = useState('');
  const [payReqRef, setPayReqRef] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadedFile(file);

    // Validate file type
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(ext)) {
      setUploadError(`Invalid file type. Allowed: ${allowed.join(', ')}`);
      setUploadedFile(null);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5MB.');
      setUploadedFile(null);
      return;
    }

    // Create preview URL for images
    if (isImageFile(file.name)) {
      const previewUrl = URL.createObjectURL(file);
      setUploadedFileUrl(previewUrl);
    } else {
      setUploadedFileUrl(null);
    }
  };

  const handleUpload = async (): Promise<string | null> => {
    if (!uploadedFile || !currentUser) return null;
    setIsUploading(true);
    setUploadError('');

    const depositId = `d-${Date.now()}`;

    // Use mock upload for demo; replace with real Supabase upload:
    // import { uploadProofOfPayment } from '@/lib/supabase';
    // const result = await uploadProofOfPayment(uploadedFile, currentUser.id, depositId);

    const result = await mockUploadProofOfPayment(uploadedFile, currentUser.id, depositId);

    setIsUploading(false);

    if (result.error) {
      setUploadError(result.error.message);
      return null;
    }

    return result.url;
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    const amt = Math.round(Number(depositAmount) * 1000);

    // Upload file first if selected
    let fileUrl = uploadedFileUrl;
    if (uploadedFile && !fileUrl) {
      fileUrl = await handleUpload();
    }

    const depositId = `d-${Date.now()}`;
    addDeposit({
      id: depositId, userId: currentUser.id, userName: currentUser.fullName,
      amountMillicents: amt, referenceCode: `YAVV-U-${currentUser.fullName.split(' ')[0].toUpperCase()}`,
      proofOfPaymentUrl: fileUrl || depositProof || null, status: 'pending', bankerNotes: null,
      createdAt: new Date().toISOString(), approvedAt: null, approvedBy: null,
    });
    addNotification({
      id: `n-${Date.now()}`, userId: currentUser.id, type: 'deposit_approved',
      message: `Deposit request of ${formatCurrencyMc(amt)} submitted${uploadedFile ? ' with proof of payment' : ''}. Awaiting banker approval.`,
      read: false, createdAt: new Date().toISOString(),
    });
    setDepositAmount(''); setDepositProof('');
    setUploadedFile(null); setUploadedFileUrl(null);
  };

  const handleTransfer = () => {
    if (!transferEmail || !transferAmount || Number(transferAmount) <= 0) return;
    const amt = Math.round(Number(transferAmount) * 1000);
    if (currentUser.walletBalanceMillicents < amt) { alert('Insufficient balance'); return; }
    // Validate recipient exists
    const recipient = users.find((u) => u.email === transferEmail);
    if (!recipient) { alert(`No user found with email: ${transferEmail}`); return; }
    addTransfer({
      id: `tr-${Date.now()}`, fromUserId: currentUser.id, fromUserName: currentUser.fullName,
      toUserId: recipient.id, toUserName: recipient.fullName, toBusinessId: null, toBusinessName: null,
      amountMillicents: amt, feeMillicents: 0, type: 'user_to_user', note: transferNote || null,
      createdAt: new Date().toISOString(),
    });
    updateUserBalance(currentUser.id, -amt);
    updateUserBalance(recipient.id, amt);
    addNotification({
      id: `n-${Date.now()}`, userId: currentUser.id, type: 'payment_received',
      message: `You sent ${formatCurrencyMc(amt)} to ${recipient.fullName}.`, read: false, createdAt: new Date().toISOString(),
    });
    addNotification({
      id: `n-${Date.now()}-recv`, userId: recipient.id, type: 'payment_received',
      message: `You received ${formatCurrencyMc(amt)} from ${currentUser.fullName}.`, read: false, createdAt: new Date().toISOString(),
    });
    setTransferEmail(''); setTransferAmount(''); setTransferNote('');
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    const amt = Math.round(Number(withdrawAmount) * 1000);
    if (amt < MIN_WITHDRAWAL) { alert(`Minimum withdrawal is ${formatCurrencyMc(MIN_WITHDRAWAL)}`); return; }
    if (currentUser.walletBalanceMillicents < amt + WITHDRAWAL_FEE) { alert('Insufficient balance including R7.00 fee'); return; }
    // Create pending withdrawal WITHOUT deducting balance - banker approves later
    addWithdrawal({
      id: `w-${Date.now()}`, userId: currentUser.id, userName: currentUser.fullName,
      amountMillicents: amt, feeMillicents: WITHDRAWAL_FEE, status: 'pending',
      createdAt: new Date().toISOString(), approvedAt: null,
    });
    addNotification({
      id: `n-${Date.now()}`, userId: currentUser.id, type: 'withdrawal_approved',
      message: `Withdrawal request of ${formatCurrencyMc(amt)} submitted (R7.00 fee). Awaiting banker approval. Balance will be deducted upon approval.`,
      read: false, createdAt: new Date().toISOString(),
    });
    setWithdrawAmount('');
  };

  const handlePaymentRequest = () => {
    if (!payReqEmail || !payReqAmount || Number(payReqAmount) <= 0) return;
    const amt = Math.round(Number(payReqAmount) * 1000);
    // Validate recipient exists
    const recipient = users.find((u) => u.email === payReqEmail);
    if (!recipient) { alert(`No user found with email: ${payReqEmail}`); return; }
    addPaymentRequest({
      id: `pr-${Date.now()}`, fromBusinessId: '', fromBusinessName: currentUser.fullName, fromUserId: currentUser.id,
      toUserId: recipient.id, toUserName: recipient.fullName, amountMillicents: amt,
      orderReference: payReqRef || null, description: null, status: 'pending',
      createdAt: new Date().toISOString(), paidAt: null,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    addNotification({
      id: `n-${Date.now()}`, userId: recipient.id, type: 'payment_request',
      message: `${currentUser.fullName} requests ${formatCurrencyMc(amt)}${payReqRef ? ` for ${payReqRef}` : ''}.`,
      read: false, createdAt: new Date().toISOString(),
    });
    setPayReqEmail(''); setPayReqAmount(''); setPayReqRef('');
  };

  const tabs = [
    { key: 'deposit' as const, label: 'Deposit Funds', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { key: 'transfer' as const, label: 'Transfer', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z"/></svg> },
    { key: 'withdraw' as const, label: 'Withdraw', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
    { key: 'requests' as const, label: 'Payment Requests', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> },
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      {/* Header with vault background */}
      <div
        className="relative border-b border-[var(--card-border)]"
        style={{
          backgroundImage: 'url(/vault-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--app-bg)]/75 via-[var(--app-bg)]/88 to-[var(--app-bg)]" />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border-hover)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all backdrop-blur-sm bg-black/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">Web Bank</h1>
                <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Free Movement of Money</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm bg-black/20">
              <span className="text-[10px] text-emerald-400/60 uppercase tracking-wider">Wallet Balance</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">{formatCurrencyMc(currentUser.walletBalanceMillicents)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">

        {/* Tabs - scrollable on mobile */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] mb-4 lg:mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap px-3 ${
                activeTab === t.key ? 'bg-[var(--card-bg-elevated)] text-[var(--app-fg)]' : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg-dim)]'
              }`}>{t.icon}{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-7">
            {activeTab === 'deposit' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--app-fg)] mb-1">Deposit via Capitec</h3>
                  <p className="text-xs text-[var(--app-fg-muted)]">Transfer from your personal bank to the YAVV business account</p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Bank</span><span className="text-[var(--app-fg)] font-mono">Capitec Bank</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Account Name</span><span className="text-[var(--app-fg)] font-mono">Mr NG Ragedi</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Account Number</span><span className="text-blue-400 font-mono font-bold">2081845985</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Branch Code</span><span className="text-[var(--app-fg)] font-mono">470010</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Reference</span><span className="text-emerald-400 font-mono font-bold">YAVV-U-{currentUser.fullName.split(' ')[0].toUpperCase()}</span></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Amount (ZAR)</label>
                    <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="500.00" />
                  </div>

                  {/* File Upload Section */}
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Proof of Payment (PDF, DOC, or Image)</label>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Upload area */}
                    {!uploadedFile ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-[var(--card-border-hover)] hover:border-emerald-500/30 rounded-lg px-4 py-6 text-center transition-all group"
                      >
                        <svg className="mx-auto mb-2 text-[var(--app-fg-subtle)] group-hover:text-emerald-400/60 transition-colors" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <p className="text-xs text-[var(--app-fg-muted)] group-hover:text-[var(--app-fg-dim)]">Click to upload proof of payment</p>
                        <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">PDF, DOC, DOCX, PNG, JPG up to 5MB</p>
                      </button>
                    ) : (
                      <div className="p-3 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border-hover)]">
                        {/* File info */}
                        <div className="flex items-center gap-3">
                          {uploadedFileUrl ? (
                            <img src={uploadedFileUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-[var(--card-border-hover)]" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                              {uploadedFile.name.endsWith('.pdf') ? '📄' : '📝'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--app-fg)] truncate">{uploadedFile.name}</p>
                            <p className="text-[10px] text-[var(--app-fg-muted)]">{formatFileSize(uploadedFile.size)}</p>
                          </div>
                          <button
                            onClick={() => { setUploadedFile(null); setUploadedFileUrl(null); setUploadError(''); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--card-bg-elevated)] text-[var(--app-fg-muted)] hover:text-red-400 transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>

                        {/* Image preview */}
                        {uploadedFileUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-[var(--card-border)]">
                            <img src={uploadedFileUrl} alt="Proof of payment" className="w-full max-h-[200px] object-contain bg-black/20" />
                          </div>
                        )}

                        {/* Upload status */}
                        {isUploading && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400">
                            <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            Uploading to secure storage...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {uploadError && (
                      <p className="mt-2 text-[10px] text-red-400 bg-red-500/5 p-2 rounded-lg">{uploadError}</p>
                    )}
                  </div>

                  {/* Alternative: URL input */}
                  {!uploadedFile && (
                    <div>
                      <label className="text-[10px] text-[var(--app-fg-subtle)] uppercase tracking-wider font-semibold block mb-1">Or paste a link (optional)</label>
                      <input value={depositProof} onChange={(e) => setDepositProof(e.target.value)}
                        className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="https://..." />
                    </div>
                  )}

                  <button onClick={handleDeposit} disabled={!depositAmount || Number(depositAmount) <= 0 || isUploading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all">
                    {isUploading ? 'Uploading...' : 'Submit Deposit Request'}
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <p className="text-[10px] text-yellow-400/60">
                    <strong>Important:</strong> Your wallet starts at R0.00. Funds will only appear after the banker verifies your deposit in the Capitec account. Email questions to: <span className="text-yellow-400">agrisciencesmatriculants@gmail.com</span>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'transfer' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--app-fg)] mb-1">Internal Transfer</h3>
                  <p className="text-xs text-[var(--app-fg-muted)]">Send money to another user or business - completely FREE</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Recipient Email</label>
                    <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="recipient@student.ac.za" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Amount (ZAR)</label>
                    <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="100.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Note (optional)</label>
                    <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="What's this for?" />
                  </div>
                  <button onClick={handleTransfer} disabled={!transferEmail || !transferAmount || Number(transferAmount) <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all">
                    Send Money (Free)
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--app-fg)] mb-1">Withdraw Funds</h3>
                  <p className="text-xs text-[var(--app-fg-muted)]">Cash out to your linked bank account</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Linked Bank</span><span className="text-[var(--app-fg)]">{currentUser.bankName}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Account</span><span className="text-[var(--app-fg)] font-mono">{currentUser.bankAccountNumber}</span></div>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="flex justify-between text-xs mb-1"><span className="text-[var(--app-fg-dim)]">Withdrawal Fee</span><span className="text-orange-400 font-bold">R7.00</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--app-fg-dim)]">Minimum Amount</span><span className="text-[var(--app-fg)]">R5.00</span></div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Amount (ZAR)</label>
                    <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="100.00" />
                  </div>
                  {withdrawAmount && Number(withdrawAmount) > 0 && (
                    <div className="text-xs text-[var(--app-fg-muted)]">
                      You will receive: <span className="text-emerald-400 font-bold">R{Math.max(0, Number(withdrawAmount) - 7).toFixed(2)}</span> (after R7.00 fee)
                    </div>
                  )}
                  <button onClick={handleWithdraw} disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-30 text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all">
                    Request Withdrawal
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--app-fg)] mb-1">Request Payment</h3>
                  <p className="text-xs text-[var(--app-fg-muted)]">Send an invoice to a customer (business owners)</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Customer Email</label>
                    <input type="email" value={payReqEmail} onChange={(e) => setPayReqEmail(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="customer@student.ac.za" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Amount (ZAR)</label>
                    <input type="number" value={payReqAmount} onChange={(e) => setPayReqAmount(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="150.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--app-fg-dim)] uppercase tracking-wider font-semibold block mb-1">Order Reference</label>
                    <input value={payReqRef} onChange={(e) => setPayReqRef(e.target.value)}
                      className="w-full bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-4 py-2.5 text-sm text-[var(--app-fg)] focus:outline-none focus:border-emerald-500/50" placeholder="ORDER-1234" />
                  </div>
                  <button onClick={handlePaymentRequest} disabled={!payReqEmail || !payReqAmount || Number(payReqAmount) <= 0}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-[var(--app-fg)] font-bold py-2.5 rounded-lg text-xs transition-all">
                    Send Payment Request
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-5 space-y-4">
            {activeTab === 'deposit' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider mb-3">Deposit History</h3>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {userDeposits.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--app-fg)]">{formatCurrencyMc(d.amountMillicents)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${d.status === 'approved' ? 'bg-green-500/10 text-green-400' : d.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{d.status}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">Ref: {d.referenceCode} | {new Date(d.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {userDeposits.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-4">No deposits yet</p>}
                </div>
              </div>
            )}

            {activeTab === 'transfer' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider mb-3">Transfer History</h3>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {userTransfers.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--app-fg)]">{formatCurrencyMc(t.amountMillicents)}</span>
                        <span className="text-[10px] text-[var(--app-fg-muted)]">{t.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{t.note || 'No note'} | {new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {userTransfers.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-4">No transfers yet</p>}
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider mb-3">Withdrawal History</h3>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {userWithdrawals.map((w) => (
                    <div key={w.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--app-fg)]">{formatCurrencyMc(w.amountMillicents)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${w.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{w.status}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">Fee: {formatCurrencyMc(w.feeMillicents)} | {new Date(w.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {userWithdrawals.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-4">No withdrawals yet</p>}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-xs font-bold text-[var(--app-fg-dim)] uppercase tracking-wider mb-3">Your Payment Requests</h3>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {userPayments.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--app-fg)]">{formatCurrencyMc(p.amountMillicents)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${p.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{p.status}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{p.orderReference || 'No reference'} | To: {p.toUserName}</div>
                    </div>
                  ))}
                  {userPayments.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-4">No payment requests yet</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

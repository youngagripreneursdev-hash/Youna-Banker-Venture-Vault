import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrencyMc, canVaultIntervene, getJournalBalance, getJournalAccountSummary } from '@/lib/calculations';

export function BankerDashboard() {
  const navigate = useNavigate();
  const { users, businesses, loans, deposits, withdrawals, notifications, journalEntries, vaultInterventions, currentUser, bankReserveMillicents, updateDeposit, updateWithdrawal, updateBusiness, updateUserBalance, addNotification, addVaultIntervention, adminLogout, fundBankReserve, approveLoan, rejectLoan, reviewBusiness } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'loans' | 'businesses' | 'users' | 'vault' | 'journal' | 'messages'>('overview');
  const [loanActionError, setLoanActionError] = useState('');
  const [reserveTopUpRands, setReserveTopUpRands] = useState('');
  const [reserveTopUpError, setReserveTopUpError] = useState('');
  const [reserveTopUpMsg, setReserveTopUpMsg] = useState('');

  if (!currentUser || currentUser.role !== 'banker') {
    return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center text-red-400">Access Denied. Banker only.</div>;
  }

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const pendingLoans = loans.filter((l) => l.status === 'draft');
  const draftBusinesses = businesses.filter((b) => b.status === 'draft');
  const fundingBusinesses = businesses.filter((b) => b.status === 'approved');
  const rejectedBusinesses = businesses.filter((b) => b.status === 'rejected');
  const activeLoans = loans.filter((l) => l.status === 'active');
  const overdueLoans = loans.filter((l) => l.status === 'overdue');
  const hotMessages = notifications.filter((n) => ['market_correction_failed', 'loan_overdue', 'loan_defaulted', 'vault_intervention'].includes(n.type));

  const vaultPoolSize = users.reduce((sum, u) => sum + Math.floor(u.walletBalanceMillicents * 0.15), 0);
  const journalBal = getJournalBalance(journalEntries);
  const journalSummary = getJournalAccountSummary(journalEntries);

  const handleApproveDeposit = (id: string, userId: string, amount: number) => {
    updateDeposit(id, { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: currentUser.id });
    updateUserBalance(userId, amount);
    addNotification({ id: `n-${Date.now()}`, userId, type: 'deposit_approved', message: `Your deposit of ${formatCurrencyMc(amount)} has been approved.`, read: false, createdAt: new Date().toISOString() });
  };

  const handleRejectDeposit = (id: string) => {
    updateDeposit(id, { status: 'rejected', approvedAt: new Date().toISOString(), approvedBy: currentUser.id, bankerNotes: 'Rejected by banker' });
  };

  const handleApproveWithdrawal = (id: string) => {
    updateWithdrawal(id, { status: 'approved', approvedAt: new Date().toISOString() });
  };

  const handleApproveLoan = (id: string) => {
    const res = approveLoan(id);
    if (!res.ok) setLoanActionError(res.error ?? 'Approval failed');
    else setLoanActionError('');
  };

  const handleRejectLoan = (id: string) => {
    if (!window.confirm('Reject this loan application? The borrower will be notified.')) return;
    rejectLoan(id);
    setLoanActionError('');
  };

  const handleApproveBusiness = (id: string) => {
    reviewBusiness(id, 'approved');
  };

  const handleRejectBusiness = (id: string) => {
    if (!window.confirm('Reject this business listing? The owner will be notified.')) return;
    reviewBusiness(id, 'rejected');
  };

  const handleTopUpReserve = () => {
    const rands = Number(reserveTopUpRands);
    if (!reserveTopUpRands.trim() || Number.isNaN(rands) || rands <= 0) {
      setReserveTopUpError('Enter an amount greater than R0.');
      setReserveTopUpMsg('');
      return;
    }
    const millicents = Math.round(rands * 1000); // 1 Rand = 1,000 millicents (matches randsToMc)
    fundBankReserve(millicents);
    setReserveTopUpError('');
    setReserveTopUpMsg(`Reserve topped up by ${formatCurrencyMc(millicents)}. New balance: ${formatCurrencyMc(bankReserveMillicents + millicents)}.`);
    setReserveTopUpRands('');
  };

  const handleVaultIntervene = (businessId: string) => {
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) return;
    const cost = biz.currentBets * 0.3;
    if (!canVaultIntervene(cost, vaultPoolSize)) {
      addNotification({ id: `n-${Date.now()}`, userId: currentUser.id, type: 'market_correction_failed', message: `Vault intervention failed for ${biz.name}. Cost exceeds 80% of pool.`, read: false, createdAt: new Date().toISOString() });
      return;
    }
    const unitsToBuy = Math.ceil(biz.totalUnitsIssued * 0.2);
    addVaultIntervention({ id: `vi-${Date.now()}`, businessId: biz.id, businessName: biz.name, unitsBought: unitsToBuy, totalCostMillicents: Math.round(cost), status: 'active', createdAt: new Date().toISOString(), resolvedAt: null });
    updateBusiness(businessId, { unitsHeldByVault: biz.unitsHeldByVault + unitsToBuy });
    addNotification({ id: `n-${Date.now()}`, userId: biz.ownerId, type: 'vault_intervention', message: `The Vault intervened in ${biz.name}. ${unitsToBuy} units purchased for stabilization.`, read: false, createdAt: new Date().toISOString() });
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> },
    { key: 'deposits' as const, label: `Deposits (${pendingDeposits.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { key: 'withdrawals' as const, label: `Withdrawals (${pendingWithdrawals.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg> },
    { key: 'loans' as const, label: `Loans (${pendingLoans.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="m17 8-5-5-5 5"/><path d="m17 16-5 5-5-5"/></svg> },
    { key: 'businesses' as const, label: `Businesses (${draftBusinesses.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg> },
    { key: 'users' as const, label: 'Users', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key: 'vault' as const, label: 'Vault', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { key: 'journal' as const, label: 'Journal', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg> },
    { key: 'messages' as const, label: `Hot Messages (${hotMessages.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border-hover)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-dim)] hover:text-[var(--app-fg)] transition-all flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold truncate">Banker Dashboard</h1>
              <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">Nerve Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <span className="text-xs text-purple-400 font-medium truncate max-w-[120px]">{currentUser.fullName}</span>
            </div>
            <button
              onClick={() => { adminLogout(); navigate('/banker-login'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400/60 hover:text-red-400 text-[10px] font-bold transition-all flex-shrink-0"
              title="Lock admin session"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Lock
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${activeTab === t.key ? 'bg-[var(--card-bg-elevated)] text-[var(--app-fg)]' : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg-dim)]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              { label: 'Total Users', value: users.length.toString(), color: '#3b82f6', sub: `${users.filter((u) => u.role === 'student').length} students` },
              { label: 'Live Businesses', value: businesses.filter((b) => b.status === 'live').length.toString(), color: '#22c55e', sub: `${businesses.filter((b) => b.status === 'defaulted').length} defaulted` },
              { label: 'Pending Deposits', value: pendingDeposits.length.toString(), color: '#f59e0b', sub: `${formatCurrencyMc(pendingDeposits.reduce((s, d) => s + d.amountMillicents, 0))} total` },
              { label: 'Pending Withdrawals', value: pendingWithdrawals.length.toString(), color: '#ef4444', sub: `${formatCurrencyMc(pendingWithdrawals.reduce((s, w) => s + w.amountMillicents, 0))} total` },
              { label: 'Active Loans', value: activeLoans.length.toString(), color: '#8b5cf6', sub: `${overdueLoans.length} overdue` },
              { label: 'Vault Pool', value: formatCurrencyMc(vaultPoolSize), color: '#ec4899', sub: '15% of all balances' },
              { label: 'Bank Reserve', value: formatCurrencyMc(bankReserveMillicents), color: '#14b8a6', sub: 'Backs loan approvals' },
              { label: 'Journal Balanced', value: journalBal.balanced ? 'YES' : 'NO', color: journalBal.balanced ? '#22c55e' : '#ef4444', sub: `${formatCurrencyMc(journalBal.totalDebits)} debits = ${formatCurrencyMc(journalBal.totalCredits)} credits` },
              { label: 'Hot Messages', value: hotMessages.length.toString(), color: '#f97316', sub: 'Action required' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Deposits */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            {/* File preview modal (inline) */}
            {deposits.filter((d) => d.proofOfPaymentUrl).length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] text-blue-400/60">
                  <strong>Proof of Payment Files:</strong> Click the preview icon next to any deposit with a proof file to view it.
                  Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]">
                  <tr>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">User</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Amount</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Reference</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Proof</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Status</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                      <td className="px-4 py-3">{d.userName}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrencyMc(d.amountMillicents)}</td>
                      <td className="px-4 py-3 font-mono text-[var(--app-fg-dim)]">{d.referenceCode}</td>
                      <td className="px-4 py-3">
                        {d.proofOfPaymentUrl ? (
                          <a
                            href={d.proofOfPaymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold transition-all"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View Proof
                          </a>
                        ) : (
                          <span className="text-[10px] text-[var(--app-fg-subtle)]">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'approved' ? 'bg-green-500/10 text-green-400' : d.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{d.status}</span></td>
                      <td className="px-4 py-3">
                        {d.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApproveDeposit(d.id, d.userId, d.amountMillicents)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Approve</button>
                            <button onClick={() => handleRejectDeposit(d.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">User</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Amount</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Fee</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Status</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Action</th>
              </tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                    <td className="px-4 py-3">{w.userName}</td>
                    <td className="px-4 py-3 font-mono">{formatCurrencyMc(w.amountMillicents)}</td>
                    <td className="px-4 py-3 font-mono text-[var(--app-fg-dim)]">{formatCurrencyMc(w.feeMillicents)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{w.status}</span></td>
                    <td className="px-4 py-3">{w.status === 'pending' && (
                      <button onClick={() => handleApproveWithdrawal(w.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Approve</button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loans */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loanActionError && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-3">
                <p className="text-[10px] text-red-400"><strong>Loan action failed:</strong> {loanActionError}</p>
                <button onClick={() => setLoanActionError('')} className="text-red-400/60 hover:text-red-400 transition-all flex-shrink-0" title="Dismiss">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )}
            {pendingLoans.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-yellow-400 mb-2">Pending Approval ({pendingLoans.length})</h3>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Business</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Borrower</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Amount</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Tier</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Action</th>
                    </tr></thead>
                    <tbody>
                      {pendingLoans.map((l) => (
                        <tr key={l.id} className="border-b border-[var(--card-border)]">
                          <td className="px-4 py-3">{l.businessName}</td>
                          <td className="px-4 py-3">{l.borrowerName}</td>
                          <td className="px-4 py-3 font-mono">{formatCurrencyMc(l.amountMillicents)}</td>
                          <td className="px-4 py-3">Tier {l.tier}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApproveLoan(l.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Approve</button>
                              <button onClick={() => handleRejectLoan(l.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] mb-2">All Loans</h3>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Business</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Amount</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Status</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Due Date</th>
                  </tr></thead>
                  <tbody>
                    {loans.map((l) => (
                      <tr key={l.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                        <td className="px-4 py-3">{l.businessName}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrencyMc(l.amountMillicents)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'active' ? 'bg-green-500/10 text-green-400' : l.status === 'overdue' ? 'bg-orange-500/10 text-orange-400' : l.status === 'defaulted' ? 'bg-red-500/10 text-red-400' : l.status === 'repaid' ? 'bg-blue-500/10 text-blue-400' : l.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{l.status}</span></td>
                        <td className="px-4 py-3 text-[var(--app-fg-muted)]">{l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Businesses */}
        {activeTab === 'businesses' && (
          <div className="space-y-4">
            {/* Pending Review */}
            <div>
              <h3 className="text-xs font-bold text-yellow-400 mb-2">Pending Review ({draftBusinesses.length})</h3>
              {draftBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {draftBusinesses.map((b) => (
                    <div key={b.id} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[var(--app-fg)] truncate">{b.name}</div>
                          <div className="text-[10px] text-[var(--app-fg-muted)]">Owner: {b.ownerName}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 flex-shrink-0">draft</span>
                      </div>
                      <p className="text-xs text-[var(--app-fg-dim)] mb-3">{b.businessDescription}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Target Market</div>
                          <div className="text-xs text-[var(--app-fg-dim)]">{b.targetMarket}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                          <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Required Backers</div>
                          <div className="text-xs font-mono text-[var(--app-fg-dim)]">{b.requiredBackers}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApproveBusiness(b.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Approve</button>
                        <button onClick={() => handleRejectBusiness(b.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                  <p className="text-xs text-[var(--app-fg-subtle)] text-center">No businesses awaiting review</p>
                </div>
              )}
            </div>

            {/* In Funding */}
            <div>
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] mb-2">In Funding ({fundingBusinesses.length})</h3>
              {fundingBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {fundingBusinesses.map((b) => {
                    const pct = b.requiredBackers > 0 ? Math.min(100, Math.round((b.currentBackers / b.requiredBackers) * 100)) : 0;
                    return (
                      <div key={b.id} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[var(--app-fg)] truncate">{b.name}</div>
                            <div className="text-[10px] text-[var(--app-fg-muted)]">Owner: {b.ownerName}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 flex-shrink-0">{b.currentBackers}/{b.requiredBackers} backers</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--card-bg-elevated)] border border-[var(--card-border)] overflow-hidden mb-1">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-[var(--app-fg-subtle)]">{pct}% backed — goes live at {b.requiredBackers} backers</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                  <p className="text-xs text-[var(--app-fg-subtle)] text-center">No businesses currently open for backing</p>
                </div>
              )}
            </div>

            {/* Rejected */}
            {rejectedBusinesses.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-400 mb-2">Rejected ({rejectedBusinesses.length})</h3>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[400px]">
                    <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Business</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Owner</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Target Market</th>
                      <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Status</th>
                    </tr></thead>
                    <tbody>
                      {rejectedBusinesses.map((b) => (
                        <tr key={b.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                          <td className="px-4 py-3">{b.name}</td>
                          <td className="px-4 py-3 text-[var(--app-fg-dim)]">{b.ownerName}</td>
                          <td className="px-4 py-3 text-[var(--app-fg-muted)]">{b.targetMarket}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">rejected</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Name</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Role</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Wallet</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">15% Vault</th>
                <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Bank</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'banker' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 font-mono">{formatCurrencyMc(u.walletBalanceMillicents)}</td>
                    <td className="px-4 py-3 font-mono text-[var(--app-fg-dim)]">{formatCurrencyMc(Math.floor(u.walletBalanceMillicents * 0.15))}</td>
                    <td className="px-4 py-3 text-[var(--app-fg-dim)]">{u.bankName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vault */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            {/* Bank Reserve */}
            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Bank Reserve</div>
                  <div className="text-2xl font-bold font-mono text-teal-400">{formatCurrencyMc(bankReserveMillicents)}</div>
                  <div className="text-[10px] text-[var(--app-fg-subtle)] mt-1">Loans are paid out of this reserve — approvals fail when it is insufficient.</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reserveTopUpRands}
                    onChange={(e) => { setReserveTopUpRands(e.target.value); setReserveTopUpError(''); setReserveTopUpMsg(''); }}
                    placeholder="Amount in Rands"
                    className="w-40 bg-[var(--card-bg-elevated)] border border-[var(--card-border-hover)] rounded-lg px-3 py-2 text-xs text-[var(--app-fg)] focus:outline-none focus:border-teal-500/50"
                  />
                  <button onClick={handleTopUpReserve} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-[var(--app-fg)] text-[10px] font-bold transition-all whitespace-nowrap">Top Up Reserve</button>
                </div>
              </div>
              {reserveTopUpError && <p className="text-[10px] text-red-400 mt-2">{reserveTopUpError}</p>}
              {reserveTopUpMsg && (
                <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                  {reserveTopUpMsg}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Vault Pool Size</div>
                <div className="text-xl font-bold font-mono text-purple-400">{formatCurrencyMc(vaultPoolSize)}</div>
                <div className="text-[10px] text-[var(--app-fg-subtle)]">15% of all balances</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Active Interventions</div>
                <div className="text-xl font-bold font-mono text-orange-400">{vaultInterventions.filter((v) => v.status === 'active').length}</div>
                <div className="text-[10px] text-[var(--app-fg-subtle)]">Currently holding units</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Safety Threshold</div>
                <div className="text-xl font-bold font-mono text-emerald-400">80%</div>
                <div className="text-[10px] text-[var(--app-fg-subtle)]">Max cost of pool</div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] mb-3">Intervene in Market</h3>
              <div className="grid grid-cols-2 gap-3">
                {businesses.filter((b) => b.healthScore < 75 && b.status === 'live').map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[var(--app-fg)]">{b.name}</div>
                      <div className="text-[10px] text-[var(--app-fg-muted)]">Health: {b.healthScore}</div>
                    </div>
                    <button onClick={() => handleVaultIntervene(b.id)} className="px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-[var(--app-fg)] text-[10px] font-bold transition-all">Intervene</button>
                  </div>
                ))}
              </div>
            </div>

            {vaultInterventions.length > 0 && (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[400px]">
                  <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Business</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Units Bought</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Cost</th>
                    <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Status</th>
                  </tr></thead>
                  <tbody>
                    {vaultInterventions.map((v) => (
                      <tr key={v.id} className="border-b border-[var(--card-border)]">
                        <td className="px-4 py-3">{v.businessName}</td>
                        <td className="px-4 py-3">{v.unitsBought}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrencyMc(v.totalCostMillicents)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.status === 'active' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>{v.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Journal */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Total Debits</div>
                <div className="text-lg font-bold font-mono text-red-400">{formatCurrencyMc(journalBal.totalDebits)}</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Total Credits</div>
                <div className="text-lg font-bold font-mono text-green-400">{formatCurrencyMc(journalBal.totalCredits)}</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="text-[10px] text-[var(--app-fg-muted)] uppercase">Balanced</div>
                <div className={`text-lg font-bold ${journalBal.balanced ? 'text-emerald-400' : 'text-red-400'}`}>{journalBal.balanced ? 'YES' : 'NO'}</div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-[var(--card-bg)] border-b border-[var(--card-border)]"><tr>
                  <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Account</th>
                  <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Debit</th>
                  <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Credit</th>
                  <th className="px-4 py-3 text-[10px] text-[var(--app-fg-muted)] uppercase">Reference</th>
                </tr></thead>
                <tbody>
                  {journalEntries.map((j) => (
                    <tr key={j.id} className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]">
                      <td className="px-4 py-3 font-medium">{j.account}</td>
                      <td className="px-4 py-3 font-mono text-red-400">{j.debitMillicents > 0 ? formatCurrencyMc(j.debitMillicents) : '-'}</td>
                      <td className="px-4 py-3 font-mono text-green-400">{j.creditMillicents > 0 ? formatCurrencyMc(j.creditMillicents) : '-'}</td>
                      <td className="px-4 py-3 text-[var(--app-fg-muted)]">{j.referenceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h3 className="text-xs font-bold text-[var(--app-fg-dim)] mb-3">Account Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {journalSummary.map((s) => (
                  <div key={s.account} className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <div className="text-[10px] font-medium text-[var(--app-fg)]">{s.account}</div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-red-400">D: {formatCurrencyMc(s.debits)}</span>
                      <span className="text-green-400">C: {formatCurrencyMc(s.credits)}</span>
                      <span className={s.net >= 0 ? 'text-green-400' : 'text-red-400'}>Net: {formatCurrencyMc(Math.abs(s.net))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {activeTab === 'messages' && (
          <div className="space-y-3">
            {hotMessages.map((m) => (
              <div key={m.id} className={`p-4 rounded-xl border ${m.type === 'market_correction_failed' ? 'border-red-500/20 bg-red-500/5' : m.type === 'loan_defaulted' ? 'border-orange-500/20 bg-orange-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${m.type === 'market_correction_failed' ? 'bg-red-500' : m.type === 'loan_defaulted' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-fg-dim)]">{m.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-[var(--app-fg-dim)]">{m.message}</p>
                <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {hotMessages.length === 0 && <p className="text-xs text-[var(--app-fg-subtle)] text-center py-8">No hot messages</p>}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrencyMc } from '@/lib/calculations';

// Normalized transaction row — every source (transfers, deposit requests,
// withdrawal requests) is mapped to this shape BEFORE rendering.
interface TxRow {
  id: string;
  type: 'transfer' | 'deposit' | 'withdrawal';
  label: string;
  amountMillicents: number;
  date: string;
  status: string;
}

export function Transact() {
  const navigate = useNavigate();
  const { currentUser, transfers, deposits, withdrawals } = useStore();
  const [tab, setTab] = useState<'all' | 'transfers' | 'deposits' | 'withdrawals'>('all');

  if (!currentUser) return null;

  const allTx: TxRow[] = [
    ...transfers.map((t): TxRow => ({
      id: t.id,
      type: 'transfer',
      label: 'Transfer',
      amountMillicents: t.amountMillicents,
      date: t.createdAt,
      status: 'completed',
    })),
    ...deposits.filter((d) => d.userId === currentUser.id).map((d): TxRow => ({
      id: d.id,
      type: 'deposit',
      label: 'Deposit',
      amountMillicents: d.amountMillicents,
      date: d.createdAt,
      status: d.status,
    })),
    ...withdrawals.filter((w) => w.userId === currentUser.id).map((w): TxRow => ({
      id: w.id,
      type: 'withdrawal',
      label: 'Withdrawal',
      amountMillicents: w.amountMillicents,
      date: w.createdAt,
      status: w.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = tab === 'all' ? allTx : allTx.filter((t) =>
    tab === 'transfers' ? t.type === 'transfer' :
    tab === 'deposits' ? t.type === 'deposit' :
    tab === 'withdrawals' ? t.type === 'withdrawal' : true
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Transactions</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">History</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] mb-4 overflow-x-auto scrollbar-hide">
          {(['all', 'transfers', 'deposits', 'withdrawals'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap px-3 ${tab === t ? 'bg-[var(--card-bg-elevated)] text-[var(--app-fg)]' : 'text-[var(--app-fg-muted)]'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length > 0 ? filtered.map((tx) => (
            <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : '↔'}
                </div>
                <div>
                  <p className="text-xs font-medium capitalize">{tx.label}</p>
                  <p className="text-[10px] text-[var(--app-fg-subtle)]">{new Date(tx.date).toLocaleDateString('en-ZA')}</p>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold ${
                tx.type === 'deposit' ? 'text-emerald-400' :
                tx.type === 'withdrawal' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}{formatCurrencyMc(tx.amountMillicents)}
              </span>
            </div>
          )) : (
            <p className="text-center text-sm text-[var(--app-fg-subtle)] py-12">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

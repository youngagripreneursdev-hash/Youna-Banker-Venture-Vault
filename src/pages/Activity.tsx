import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatCurrencyMc } from '@/lib/calculations';

export function Activity() {
  const navigate = useNavigate();
  const { currentUser, notifications, paymentRequests, markNotificationRead } = useStore();

  if (!currentUser) return null;

  const pendingPayments = paymentRequests.filter(
    (p) => p.toUserId === currentUser.id && p.status === 'pending'
  );

  const unread = notifications.filter((n) => !n.read && n.userId === currentUser.id);
  const read = notifications.filter((n) => n.read && n.userId === currentUser.id);

  const getIcon = (type: string) => {
    if (type.includes('payment')) return '💰';
    if (type.includes('loan')) return '📋';
    if (type.includes('deposit') || type.includes('withdrawal')) return '🏦';
    if (type.includes('investment')) return '📈';
    if (type.includes('vault') || type.includes('market')) return '🛡️';
    if (type.includes('interest')) return '💸';
    return '📬';
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('approved') || type.includes('received') || type.includes('earned')) return 'border-emerald-500/20 bg-emerald-500/5';
    if (type.includes('overdue') || type.includes('defaulted') || type.includes('failed')) return 'border-red-500/20 bg-red-500/5';
    if (type.includes('request')) return 'border-blue-500/20 bg-blue-500/5';
    return 'border-[var(--card-border)] bg-[var(--card-bg)]';
  };

  // Combine notifications and payment requests into a unified activity feed
  const recentActivity = useMemo(() => {
    const activities = [
      ...unread.map((n) => ({ type: 'notification' as const, data: n, isUnread: true })),
      ...pendingPayments.map((p) => ({ type: 'payment' as const, data: p, isUnread: true })),
      ...read.slice(0, 10).map((n) => ({ type: 'notification' as const, data: n, isUnread: false })),
    ];
    // Sort by date, newest first
    return activities.sort((a, b) => {
      const dateA = new Date(a.data.createdAt).getTime();
      const dateB = new Date(b.data.createdAt).getTime();
      return dateB - dateA;
    });
  }, [unread, read, pendingPayments]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Activity</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">
              {unread.length + pendingPayments.length} unread / {notifications.length + pendingPayments.length} total
            </p>
          </div>
        </div>

        {/* Pending Payments Section */}
        {pendingPayments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] text-orange-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              Payment Requests ({pendingPayments.length})
            </h3>
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-xs font-medium text-[var(--app-fg)]">
                        Payment from {p.fromBusinessName}
                      </p>
                      <p className="text-[10px] text-[var(--app-fg-muted)]">
                        {p.description || 'No description'} · Ref: {p.orderReference || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-orange-400">
                    {formatCurrencyMc(p.amountMillicents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unread Notifications */}
        {unread.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              New Notifications ({unread.length})
            </h3>
            <div className="space-y-2">
              {unread.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:opacity-90 ${getNotificationColor(n.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--app-fg)] font-medium">{n.message}</p>
                      <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">
                        {new Date(n.createdAt).toLocaleString('en-ZA')}
                      </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Earlier Activity */}
        {recentActivity.length > 0 ? (
          <div>
            <h3 className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold mb-3">
              Earlier Activity
            </h3>
            <div className="space-y-2">
              {recentActivity
                .filter((a) => !a.isUnread)
                .map((activity, i) => {
                  if (activity.type === 'payment') {
                    const p = activity.data as typeof pendingPayments[0];
                    return (
                      <div key={`p-${p.id}-${i}`} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] opacity-60">
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">💰</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--app-fg-muted)]">
                              Payment from {p.fromBusinessName} · {formatCurrencyMc(p.amountMillicents)}
                            </p>
                            <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">
                              {new Date(p.createdAt).toLocaleString('en-ZA')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const n = activity.data as typeof notifications[0];
                  return (
                    <div key={`n-${n.id}-${i}`} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] opacity-60">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{getIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--app-fg-muted)]">{n.message}</p>
                          <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">
                            {new Date(n.createdAt).toLocaleString('en-ZA')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          notifications.length === 0 && pendingPayments.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--app-fg-subtle)] mx-auto mb-4 opacity-40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="text-sm text-[var(--app-fg-subtle)] mb-1">No activity yet</p>
              <p className="text-xs text-[var(--app-fg-muted)]">Notifications and payments will appear here</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

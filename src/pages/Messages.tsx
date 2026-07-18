import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export function Messages() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useStore();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const getIcon = (type: string) => {
    if (type.includes('payment')) return '💰';
    if (type.includes('loan')) return '📋';
    if (type.includes('deposit') || type.includes('withdrawal')) return '🏦';
    if (type.includes('investment')) return '📈';
    if (type.includes('vault') || type.includes('market')) return '🛡️';
    return '📬';
  };

  const NotificationItem = ({ n, isUnread }: { n: typeof notifications[0]; isUnread: boolean }) => (
    <button
      onClick={() => isUnread && markNotificationRead(n.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isUnread
          ? 'border-[var(--card-border-hover)] bg-[var(--card-bg-hover)]'
          : 'border-[var(--card-border)] bg-[var(--card-bg)] opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{getIcon(n.type)}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${isUnread ? 'text-[var(--app-fg)] font-medium' : 'text-[var(--app-fg-muted)]'}`}>{n.message}</p>
          <p className="text-[10px] text-[var(--app-fg-subtle)] mt-1">{new Date(n.createdAt).toLocaleString('en-ZA')}</p>
        </div>
        {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="max-w-[800px] mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Messages</h1>
            <p className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider">{unread.length} unread</p>
          </div>
        </div>

        <div className="space-y-3">
          {unread.length > 0 && (
            <>
              <h3 className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold">New</h3>
              {unread.map((n) => <NotificationItem key={n.id} n={n} isUnread />)}
            </>
          )}
          {read.length > 0 && (
            <>
              <h3 className="text-[10px] text-[var(--app-fg-muted)] uppercase tracking-wider font-semibold mt-6">Earlier</h3>
              {read.slice(0, 20).map((n) => <NotificationItem key={n.id} n={n} isUnread={false} />)}
            </>
          )}
          {notifications.length === 0 && (
            <p className="text-center text-sm text-[var(--app-fg-subtle)] py-12">No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

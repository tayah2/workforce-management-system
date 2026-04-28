import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const TYPE_ICONS = {
  absence: '🗓️',
  message: '💬',
  document: '📄',
  gps: '📍',
  achievement: '⭐',
  default: '🔔',
};

function notifIcon(type = '') {
  return TYPE_ICONS[type.toLowerCase()] ?? TYPE_ICONS.default;
}

function relativeTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsAdmin() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch (_err) {
      // Revert on failure
      load();
    }
  }, [load]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link) {
      window.location.href = notif.link;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge badge-info">{unreadCount} unread</span>
            )}
          </div>
          <p className="page-subtitle">System alerts and activity notifications</p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container"><LoadingSpinner /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-card${!n.is_read ? ' unread' : ''}`}
                onClick={() => handleClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
              >
                <div className="notification-icon">{notifIcon(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="notification-title"
                    style={{ fontWeight: n.is_read ? '500' : '700' }}
                  >
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="notification-body">{n.body}</div>
                  )}
                  <div className="notification-time">{relativeTime(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      flexShrink: 0,
                      alignSelf: 'center',
                    }}
                  />
                )}
                {n.link && (
                  <div
                    style={{ flexShrink: 0, alignSelf: 'center', color: 'var(--primary)', fontSize: '12px', fontWeight: '600' }}
                  >
                    View →
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function avatarColor(name = '') {
  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const EMPTY_COMPOSE = { to_user_id: '', subject: '', body: '' };

export default function Messages() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState(EMPTY_COMPOSE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        api.get('/api/messages/inbox'),
        api.get('/api/messages/sent'),
      ]);
      setInbox(inboxRes.data.messages ?? []);
      setSent(sentRes.data.messages ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users');
      setAdminUsers(data.users ?? []);
    } catch (_err) {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    load();
    loadUsers();
  }, [load, loadUsers]);

  const list = activeTab === 'inbox' ? inbox : sent;

  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    if (activeTab === 'inbox' && !msg.is_read) {
      try {
        // Mark read optimistically
        setInbox((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
      } catch (_err) { /* ignore */ }
    }
  };

  const handleReply = (msg) => {
    setCompose({
      to_user_id: String(activeTab === 'inbox' ? msg.from_user_id : msg.to_user_id),
      subject: msg.subject.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`,
      body: '',
    });
    setComposeOpen(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.to_user_id || !compose.subject || !compose.body.trim()) return;
    setSending(true);
    try {
      await api.post('/api/messages', {
        to_user_id: Number(compose.to_user_id),
        subject: compose.subject,
        body: compose.body,
      });
      toast.success('Message sent');
      setComposeOpen(false);
      setCompose(EMPTY_COMPOSE);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = inbox.filter((m) => !m.is_read).length;

  // Recipient options: employees only see admin/manager users; admins see everyone
  const recipientOptions = isAdmin
    ? adminUsers
    : adminUsers.filter((u) => u.role === 'admin' || u.role === 'manager');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Internal messaging</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCompose(EMPTY_COMPOSE); setComposeOpen(true); }}>
          + Compose
        </button>
      </div>

      <div className="messages-layout">
        {/* Left panel: list */}
        <div className="messages-list">
          {/* Tabs */}
          <div className="tabs" style={{ padding: '0 8px', marginBottom: 0 }}>
            <button
              className={`tab-btn${activeTab === 'inbox' ? ' active' : ''}`}
              onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
            >
              Inbox {unreadCount > 0 && (
                <span className="badge badge-info" style={{ marginLeft: '6px', fontSize: '11px' }}>{unreadCount}</span>
              )}
            </button>
            <button
              className={`tab-btn${activeTab === 'sent' ? ' active' : ''}`}
              onClick={() => { setActiveTab('sent'); setSelectedMessage(null); }}
            >
              Sent
            </button>
          </div>

          {loading ? (
            <div className="loading-container"><LoadingSpinner /></div>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <p>No messages in {activeTab}</p>
            </div>
          ) : (
            list.map((msg) => {
              const displayName = activeTab === 'inbox' ? msg.from_name : msg.to_name;
              const isActive = selectedMessage?.id === msg.id;
              const isUnread = activeTab === 'inbox' && !msg.is_read;
              return (
                <div
                  key={msg.id}
                  className={`message-list-item${isActive ? ' active' : ''}${isUnread ? ' unread' : ''}`}
                  onClick={() => openMessage(msg)}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                    <div
                      className="avatar-circle"
                      style={{ background: avatarColor(displayName), width: '32px', height: '32px', fontSize: '12px' }}
                    >
                      {initials(displayName)}
                    </div>
                    <span className="font-semibold text-sm" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                    {isUnread && <div className="unread-dot" />}
                    <span className="text-sm text-muted" style={{ flexShrink: 0 }}>{fmtDateTime(msg.created_at)}</span>
                  </div>
                  <div className={`message-subject${isUnread ? '' : ''}`} style={{ fontWeight: isUnread ? '700' : '500' }}>
                    {msg.subject}
                  </div>
                  <div className="message-preview">{msg.body}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Right panel: detail */}
        <div className="message-detail">
          {selectedMessage ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h2 className="font-bold" style={{ fontSize: '18px', marginBottom: '12px' }}>
                  {selectedMessage.subject}
                </h2>
                <div className="message-meta">
                  <span><strong>From:</strong> {selectedMessage.from_name}</span>
                  <span><strong>To:</strong> {selectedMessage.to_name}</span>
                  <span>{new Date(selectedMessage.created_at).toLocaleString('en-GB')}</span>
                </div>
              </div>
              <div className="message-body">{selectedMessage.body}</div>
              <div style={{ marginTop: '24px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleReply(selectedMessage)}
                >
                  Reply
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ paddingTop: '80px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="New Message"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setComposeOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label className="form-label">Recipient</label>
            <select
              className="form-select"
              value={compose.to_user_id}
              onChange={(e) => setCompose((f) => ({ ...f, to_user_id: e.target.value }))}
              required
            >
              <option value="">Select recipient...</option>
              {recipientOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              value={compose.subject}
              onChange={(e) => setCompose((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Message subject..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={compose.body}
              onChange={(e) => setCompose((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your message here..."
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

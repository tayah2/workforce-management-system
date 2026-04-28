import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const today = () => new Date().toISOString().slice(0, 10);

function statusBadge(status) {
  const map = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
  };
  return (
    <span className={`badge ${map[status] ?? 'badge-neutral'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { date: '', end_date: '', type: 'sick', reason: '' };

export default function Absence() {
  const { toast } = useToast();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/absences');
      setAbsences(data.absences ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load absences');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    setSubmitting(true);
    try {
      await api.post('/api/absences', form);
      toast.success('Absence request submitted');
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to submit absence request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">My Absences</h1>
          <p className="page-subtitle">Report and track your absence requests</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : '+ Report Absence'}
        </button>
      </div>

      {/* Collapsible form */}
      {showForm && (
        <div className="absence-form-card">
          <h2 className="card-title" style={{ marginBottom: '16px' }}>New Absence Request</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={form.date}
                  min={today()}
                  required
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date <span className="text-muted text-sm">(for multi-day)</span></label>
                <input
                  type="date"
                  name="end_date"
                  className="form-input"
                  value={form.end_date}
                  min={form.date || today()}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select name="type" className="form-select" value={form.type} onChange={handleChange}>
                <option value="sick">Sick Leave</option>
                <option value="holiday">Holiday</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reason <span className="text-muted text-sm">(optional)</span></label>
              <textarea
                name="reason"
                className="form-textarea"
                rows={3}
                value={form.reason}
                placeholder="Provide any additional details..."
                onChange={handleChange}
              />
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">My Absence Requests</span>
          <span className="badge badge-neutral">{absences.length} total</span>
        </div>
        {loading ? (
          <div className="loading-container"><LoadingSpinner /></div>
        ) : absences.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No absence requests submitted yet</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Notes</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {fmtDate(a.date)}
                      {a.end_date && a.end_date !== a.date && (
                        <span className="text-muted text-sm" style={{ display: 'block' }}>
                          to {fmtDate(a.end_date)}
                        </span>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                    <td style={{ maxWidth: '200px' }}>
                      <span
                        title={a.reason}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                      >
                        {a.reason || <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td>{statusBadge(a.status)}</td>
                    <td style={{ maxWidth: '180px' }}>
                      <span
                        title={a.admin_notes}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', color: 'var(--text-muted)', fontStyle: a.admin_notes ? 'normal' : 'italic', fontSize: '13px' }}
                      >
                        {a.admin_notes || 'No notes yet'}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

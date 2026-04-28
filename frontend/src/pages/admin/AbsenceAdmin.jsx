import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

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

const FILTERS = ['all', 'pending', 'approved', 'rejected'];

export default function AbsenceAdmin() {
  const { toast } = useToast();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null); // { absence, action: 'approve'|'reject' }
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const filtered = filter === 'all' ? absences : absences.filter((a) => a.status === filter);

  const stats = {
    total: absences.length,
    pending: absences.filter((a) => a.status === 'pending').length,
    approved: absences.filter((a) => a.status === 'approved').length,
    rejected: absences.filter((a) => a.status === 'rejected').length,
  };

  const openReview = (absence, action) => {
    setReviewModal({ absence, action });
    setNotes('');
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    const { absence, action } = reviewModal;
    setSubmitting(true);
    try {
      const endpoint = `/api/absences/${absence.id}/${action}`;
      await api.put(endpoint, { admin_notes: notes });
      toast.success(`Absence ${action}d successfully`);
      setReviewModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? `Failed to ${action} absence`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Absence Management</h1>
        <p className="page-subtitle">Review and manage staff absence requests</p>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">Total Requests</div>
        </div>

        <div className="stat-card" style={{ borderColor: 'var(--warning)' }}>
          <div className="stat-card-top">
            <div className="stat-card-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
          <div className="stat-card-label">Pending Review</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{stats.approved}</div>
          <div className="stat-card-label">Approved</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--danger)' }}>{stats.rejected}</div>
          <div className="stat-card-label">Rejected</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: '16px' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`tab-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="badge badge-neutral" style={{ marginLeft: '6px', fontSize: '11px' }}>
                {stats[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-container"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No {filter !== 'all' ? filter : ''} absence requests found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Dates</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.employee_name ?? a.user_id}</td>
                    <td>
                      <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.date)}</span>
                      {a.end_date && a.end_date !== a.date && (
                        <span className="text-muted text-sm" style={{ display: 'block' }}>
                          to {fmtDate(a.end_date)}
                        </span>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                    <td style={{ maxWidth: '180px' }}>
                      <span
                        title={a.reason}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}
                      >
                        {a.reason || <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td>{statusBadge(a.status)}</td>
                    <td className="text-muted text-sm">{fmtDate(a.created_at)}</td>
                    <td>
                      {a.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => openReview(a, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => openReview(a, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm text-muted">
                            {a.reviewed_by_name ? `By ${a.reviewed_by_name}` : 'Reviewed'}
                          </span>
                          {a.reviewed_at && (
                            <span className="text-sm text-muted" style={{ display: 'block' }}>
                              {fmtDate(a.reviewed_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={reviewModal ? `${reviewModal.action === 'approve' ? 'Approve' : 'Reject'} Absence Request` : ''}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
            <button
              className={`btn ${reviewModal?.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
              onClick={handleReview}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (reviewModal?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
            </button>
          </>
        }
      >
        {reviewModal && (
          <div>
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <div>
                <strong>{reviewModal.absence.employee_name}</strong> requested{' '}
                <strong>{reviewModal.absence.type}</strong> leave for{' '}
                <strong>{fmtDate(reviewModal.absence.date)}</strong>
                {reviewModal.absence.end_date && reviewModal.absence.end_date !== reviewModal.absence.date &&
                  ` to ${fmtDate(reviewModal.absence.end_date)}`
                }
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Admin Notes <span className="text-muted text-sm">(optional)</span></label>
              <textarea
                className="form-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the employee..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

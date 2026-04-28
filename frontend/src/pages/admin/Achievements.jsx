import React, { useEffect, useState } from 'react';
import { getAllBadgesAdmin, createBadge, updateBadge, deleteBadge } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Modal from '../../components/Modal.jsx';

const CRITERIA_TYPES = [
  { value: 'completed_shifts',   label: 'Completed Shifts' },
  { value: 'gps_verified_shifts', label: 'GPS-Verified Shifts' },
  { value: 'gps_checkins',       label: 'GPS Check-ins' },
  { value: 'streak_days',        label: 'Consecutive Day Streak' },
  { value: 'night_shifts',       label: 'Night Shifts (after 18:00)' },
  { value: 'early_shifts',       label: 'Early Shifts (before 08:00)' },
  { value: 'overtime_hours',     label: 'Overtime Shifts (>8 hrs)' },
  { value: 'total_points',       label: 'Total Points Earned' },
];

const EMPTY_FORM = {
  name: '', description: '', icon: '🏅', criteria_type: 'completed_shifts', criteria_value: 1,
};

function BadgeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.criteria_type) e.criteria_type = 'Select a criteria type';
    const v = parseInt(form.criteria_value, 10);
    if (isNaN(v) || v < 1) e.criteria_value = 'Must be a positive number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, criteria_value: parseInt(form.criteria_value, 10) });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Badge Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Perfect Week"
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <input
              className="form-input"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              placeholder="🏅"
              style={{ fontSize: '20px', textAlign: 'center' }}
              maxLength={4}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What does a staff member need to do to earn this?"
          />
          {errors.description && <div className="form-error">{errors.description}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Criteria Type</label>
            <select
              className="form-select"
              value={form.criteria_type}
              onChange={(e) => set('criteria_type', e.target.value)}
            >
              {CRITERIA_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.criteria_type && <div className="form-error">{errors.criteria_type}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Target Value</label>
            <input
              type="number"
              className="form-input"
              value={form.criteria_value}
              min={1}
              onChange={(e) => set('criteria_value', e.target.value)}
            />
            {errors.criteria_value && <div className="form-error">{errors.criteria_value}</div>}
          </div>
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <strong>Preview: </strong>
          <span style={{ fontSize: '18px' }}>{form.icon || '🏅'}</span>{' '}
          <strong>{form.name || 'Badge Name'}</strong>
          {' — '}
          Awarded after {form.criteria_value}{' '}
          {CRITERIA_TYPES.find((c) => c.value === form.criteria_type)?.label?.toLowerCase() || 'criteria'}.
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Badge'}
        </button>
      </div>
    </form>
  );
}

export default function Achievements() {
  const { toast } = useToast();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBadge, setEditBadge] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllBadgesAdmin()
      .then((data) => setBadges(data.badges || []))
      .catch(() => toast.error('Failed to load badges'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createBadge(data);
      toast.success('Badge created successfully');
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create badge');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data) => {
    setSaving(true);
    try {
      await updateBadge(editBadge.id, data);
      toast.success('Badge updated');
      setEditBadge(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update badge');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge) => {
    if (!window.confirm(`Delete "${badge.name}"? This will also remove it from all staff who earned it.`)) return;
    setDeletingId(badge.id);
    try {
      await deleteBadge(badge.id);
      toast.success('Badge deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete badge');
    } finally {
      setDeletingId(null);
    }
  };

  const criteriaLabel = (type) =>
    CRITERIA_TYPES.find((c) => c.value === type)?.label ?? type;

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Achievement Badges</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Define badges that staff earn automatically when they hit milestones.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add Badge
        </button>
      </div>

      {/* Badge grid */}
      {badges.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏅</div>
            <div style={{ fontWeight: 600 }}>No badges yet</div>
            <div style={{ fontSize: '14px', marginTop: '6px' }}>Click "Add Badge" to create your first achievement.</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Icon</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Criteria</th>
                  <th>Target</th>
                  <th>Earned By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {badges.map((badge) => (
                  <tr key={badge.id}>
                    <td style={{ fontSize: '24px', textAlign: 'center' }}>{badge.icon}</td>
                    <td style={{ fontWeight: 600 }}>{badge.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '240px' }}>
                      {badge.description}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {criteriaLabel(badge.criteria_type)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{badge.criteria_value}</td>
                    <td>
                      <span className="badge badge-success">{badge.earned_count ?? 0} staff</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditBadge(badge)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(badge)}
                          disabled={deletingId === badge.id}
                        >
                          {deletingId === badge.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} title="Create New Badge" onClose={() => setShowCreate(false)}>
        <BadgeForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editBadge} title={editBadge ? `Edit: ${editBadge.name}` : ''} onClose={() => setEditBadge(null)}>
        {editBadge && (
          <BadgeForm
            initial={editBadge}
            onSave={handleEdit}
            onCancel={() => setEditBadge(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}

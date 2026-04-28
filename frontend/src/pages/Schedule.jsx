import React, { useEffect, useState, useCallback } from 'react';
import { getShifts, createShift, updateShift, getLocations, getUsers } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate, formatTime } from '../utils/formatters.js';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  return `${formatDate(weekStart.toISOString())} – ${formatDate(end.toISOString())}`;
}

// -------------------------------------------------------
// Status badge
// -------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    scheduled: 'badge-info',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
    completed: 'badge-neutral',
  };
  return (
    <span className={`badge ${map[status] || 'badge-neutral'}`}>
      {status}
    </span>
  );
}

// -------------------------------------------------------
// Shift card (calendar cell)
// -------------------------------------------------------

function ShiftCard({ shift, locations, onConfirm }) {
  const loc = locations.find((l) => l.id === shift.location_id);
  const locName = loc?.name ?? `Location ${shift.location_id}`;
  const canConfirm = shift.status === 'scheduled';

  return (
    <div className="shift-card">
      <div className="shift-card-location">{locName}</div>
      <div className="shift-card-time">
        {formatTime(shift.scheduled_start)} – {formatTime(shift.scheduled_end)}
      </div>
      <div style={{ marginTop: '6px' }}>
        <StatusBadge status={shift.status} />
      </div>
      {canConfirm && (
        <button
          className="btn btn-sm btn-success"
          style={{ marginTop: '8px', width: '100%' }}
          onClick={() => onConfirm(shift.id)}
        >
          Confirm
        </button>
      )}
      {shift.notes && (
        <div className="shift-card-notes">{shift.notes}</div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Add Shift Modal
// -------------------------------------------------------

function AddShiftModal({ users, locations, onClose, onSave }) {
  const [form, setForm] = useState({
    user_id: '',
    location_id: '',
    scheduled_start: '',
    scheduled_end: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isOpen = !form.user_id; // no employee selected = open shift

  const validate = () => {
    const e = {};
    if (!form.location_id) e.location_id = 'Select a location';
    if (!form.scheduled_start) e.scheduled_start = 'Required';
    if (!form.scheduled_end) e.scheduled_end = 'Required';
    if (form.scheduled_start && form.scheduled_end && form.scheduled_end <= form.scheduled_start) {
      e.scheduled_end = 'End must be after start';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        user_id: form.user_id ? Number(form.user_id) : null,
        location_id: Number(form.location_id),
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
        notes: form.notes || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {isOpen ? '📢 Post Open Shift' : '📋 Assign Shift'}
          </span>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                Assign to Employee
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                  (leave blank to post as open shift)
                </span>
              </label>
              <select
                className="form-select"
                value={form.user_id}
                onChange={(e) => set('user_id', e.target.value)}
              >
                <option value="">📢 Open shift — anyone can claim</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username}
                  </option>
                ))}
              </select>
              {isOpen && (
                <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>
                  ℹ️ This will appear on the "Available Shifts" board for staff to claim.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <select
                className="form-select"
                value={form.location_id}
                onChange={(e) => set('location_id', e.target.value)}
              >
                <option value="">Select location...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {errors.location_id && <div className="form-error">{errors.location_id}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.scheduled_start}
                  onChange={(e) => set('scheduled_start', e.target.value)}
                />
                {errors.scheduled_start && <div className="form-error">{errors.scheduled_start}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">End Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.scheduled_end}
                  onChange={(e) => set('scheduled_end', e.target.value)}
                />
                {errors.scheduled_end && <div className="form-error">{errors.scheduled_end}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Any special instructions..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Employee week view
// -------------------------------------------------------

function EmployeeWeekView({ shifts, locations, weekStart, onConfirm }) {
  const days = DAYS.map((label, i) => ({
    label,
    date: addDays(weekStart, i),
  }));

  return (
    <div className="week-grid">
      {days.map(({ label, date }) => {
        const dayShifts = shifts.filter((s) =>
          isSameDay(new Date(s.scheduled_start), date)
        );
        const isToday = isSameDay(date, new Date());

        return (
          <div key={label} className={`week-day-col ${isToday ? 'today' : ''}`}>
            <div className="week-day-header">
              <span className="week-day-label">{label}</span>
              <span className="week-day-date">{date.getDate()}</span>
            </div>
            <div className="week-day-body">
              {dayShifts.length === 0 ? (
                <div className="week-day-empty">No shifts</div>
              ) : (
                dayShifts.map((s) => (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    locations={locations}
                    onConfirm={onConfirm}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------
// Admin table view
// -------------------------------------------------------

function AdminTableView({ shifts, locations, users, onCancel, onAdd }) {
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const filtered = shifts.filter((s) => {
    if (filterUser && String(s.user_id) !== filterUser) return false;
    if (filterFrom && s.scheduled_start < filterFrom) return false;
    if (filterTo && s.scheduled_end > filterTo + 'T23:59:59') return false;
    return true;
  });

  const getLocName = (id) => locations.find((l) => l.id === id)?.name ?? `#${id}`;
  const getUserName = (id) => {
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name || u.username) : `User ${id}`;
  };

  return (
    <div>
      {/* Filters */}
      <div className="filter-row mb-4">
        <div className="form-group" style={{ minWidth: '200px' }}>
          <label className="form-label">Filter by Employee</label>
          <select
            className="form-select"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">All employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onAdd}>
            + Add Shift
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Location</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No shifts found
                  </td>
                </tr>
              ) : (
                filtered.map((shift) => (
                  <tr key={shift.id}>
                    <td>{formatDate(shift.scheduled_start)}</td>
                    <td>{getUserName(shift.user_id)}</td>
                    <td>{getLocName(shift.location_id)}</td>
                    <td>{formatTime(shift.scheduled_start)}</td>
                    <td>{formatTime(shift.scheduled_end)}</td>
                    <td><StatusBadge status={shift.status} /></td>
                    <td>
                      {shift.status !== 'cancelled' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onCancel(shift.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Main Schedule component
// -------------------------------------------------------

export default function Schedule() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(() => {
    const requests = [
      getShifts().catch(() => null),
      getLocations().catch(() => null),
    ];
    if (isAdmin) {
      requests.push(getUsers().catch(() => null));
    }

    Promise.all(requests).then(([shiftsData, locData, usersData]) => {
      if (shiftsData) {
        setShifts(Array.isArray(shiftsData) ? shiftsData : shiftsData.shifts || []);
      }
      if (locData) {
        setLocations(Array.isArray(locData) ? locData : locData.locations || []);
      }
      if (usersData) {
        setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      }
      setLoading(false);
    });
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = async (shiftId) => {
    try {
      await updateShift(shiftId, { status: 'confirmed' });
      toast.success('Shift confirmed');
      setShifts((prev) =>
        prev.map((s) => s.id === shiftId ? { ...s, status: 'confirmed' } : s)
      );
    } catch (err) {
      toast.error('Failed to confirm shift: ' + err.message);
    }
  };

  const handleCancel = async (shiftId) => {
    if (!window.confirm('Cancel this shift?')) return;
    try {
      await updateShift(shiftId, { status: 'cancelled' });
      toast.success('Shift cancelled');
      setShifts((prev) =>
        prev.map((s) => s.id === shiftId ? { ...s, status: 'cancelled' } : s)
      );
    } catch (err) {
      toast.error('Failed to cancel shift: ' + err.message);
    }
  };

  const handleAddShift = async (data) => {
    try {
      const result = await createShift(data);
      const newShift = result.shift || result;
      toast.success('Shift added successfully');
      setShifts((prev) => [...prev, newShift]);
    } catch (err) {
      toast.error('Failed to add shift: ' + err.message);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  // Filter to my shifts for employee / "mine" tab
  const myShifts = shifts.filter(
    (s) => s.user_id === user?.id || s.username === user?.username
  );

  // Shifts visible in the current week view
  const weekEnd = addDays(weekStart, 6);
  const weekShifts = myShifts.filter((s) => {
    const d = new Date(s.scheduled_start);
    return d >= weekStart && d <= weekEnd;
  });

  return (
    <div>
      {isAdmin ? (
        /* ====================== ADMIN VIEW ====================== */
        <div>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Shifts
            </button>
            <button
              className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              My Schedule
            </button>
          </div>

          {activeTab === 'all' ? (
            <AdminTableView
              shifts={shifts}
              locations={locations}
              users={users}
              onCancel={handleCancel}
              onAdd={() => setShowAddModal(true)}
            />
          ) : (
            <div>
              <div className="week-nav">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWeekStart((w) => addDays(w, -7))}
                >
                  ‹ Previous
                </button>
                <span className="week-nav-label">{formatWeekLabel(weekStart)}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWeekStart((w) => addDays(w, 7))}
                >
                  Next ›
                </button>
              </div>
              <EmployeeWeekView
                shifts={weekShifts}
                locations={locations}
                weekStart={weekStart}
                onConfirm={handleConfirm}
              />
            </div>
          )}
        </div>
      ) : (
        /* ====================== EMPLOYEE VIEW ====================== */
        <div>
          <div className="week-nav">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              ‹ Previous week
            </button>
            <span className="week-nav-label">{formatWeekLabel(weekStart)}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
            >
              Next week ›
            </button>
          </div>
          <EmployeeWeekView
            shifts={weekShifts}
            locations={locations}
            weekStart={weekStart}
            onConfirm={handleConfirm}
          />
        </div>
      )}

      {showAddModal && (
        <AddShiftModal
          users={users}
          locations={locations}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddShift}
        />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser, register } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import { getInitials } from '../../utils/formatters.js';

// -------------------------------------------------------
// Icons
// -------------------------------------------------------

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// -------------------------------------------------------
// Add User Form
// -------------------------------------------------------

const EMPTY_ADD_FORM = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  role: 'employee',
  hourly_rate: '12.21',
};

// -------------------------------------------------------
// Edit User Form
// -------------------------------------------------------

const ROLES = ['employee', 'manager', 'admin'];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function Users() {
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  // Search
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.users || data || []);
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Add User ----

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await register({
        ...addForm,
        hourly_rate: parseFloat(addForm.hourly_rate),
      });
      toast.success(`User ${addForm.first_name} ${addForm.last_name} created.`);
      setAddForm(EMPTY_ADD_FORM);
      setAddOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ---- Edit User ----

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      role: user.role,
      hourly_rate: String(user.hourly_rate ?? '12.21'),
      is_active: user.is_active,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await updateUser(editUser.id, {
        role: editForm.role,
        hourly_rate: parseFloat(editForm.hourly_rate),
        is_active: editForm.is_active,
      });
      toast.success('User updated successfully.');
      setEditOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ---- Deactivate ----

  const handleDeactivate = async (userId) => {
    try {
      await updateUser(userId, { is_active: false });
      toast.success('User deactivated.');
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="card-title">Staff Members</span>
            <span className="badge badge-neutral">{users.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="search"
              className="form-input"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
              <IconPlus /> Add Staff
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <p>{search ? 'No staff match your search.' : 'No staff members yet.'}</p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hourly Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(u.full_name || u.username)}
                        </div>
                        <span className="font-semibold">{u.full_name || u.username}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin'
                            ? 'badge-purple'
                            : u.role === 'manager'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{formatCurrency(u.hourly_rate)}/hr</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(u)}
                          title="Edit user"
                        >
                          <IconEdit /> Edit
                        </button>
                        {u.is_active && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeactivateTarget(u)}
                            title="Deactivate user"
                          >
                            <IconTrash /> Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Add User Modal ---- */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Staff Member"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddSubmit}
              disabled={addLoading}
            >
              {addLoading ? 'Creating...' : 'Create Staff Member'}
            </button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleAddSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-input"
                value={addForm.first_name}
                onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                required
                placeholder="Jane"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-input"
                value={addForm.last_name}
                onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                required
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              className="form-input"
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              required
              placeholder="jsmith"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              required
              placeholder="jane.smith@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              minLength={8}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate (£) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={addForm.hourly_rate}
                onChange={(e) => setAddForm({ ...addForm, hourly_rate: e.target.value })}
                required
                placeholder="12.21"
              />
              <span className="form-hint">UK NMW is £12.21/hr (2024)</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* ---- Edit User Modal ---- */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit: ${editUser?.full_name || editUser?.username}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleEditSubmit}
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={editForm.role || 'employee'}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Hourly Rate (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={editForm.hourly_rate || ''}
              onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Status</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="is_active"
                  value="true"
                  checked={editForm.is_active === true || editForm.is_active === 'true'}
                  onChange={() => setEditForm({ ...editForm, is_active: true })}
                />
                Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="is_active"
                  value="false"
                  checked={editForm.is_active === false || editForm.is_active === 'false'}
                  onChange={() => setEditForm({ ...editForm, is_active: false })}
                />
                Inactive
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* ---- Deactivate Confirm Modal ---- */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate Staff Member"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleDeactivate(deactivateTarget?.id)}
            >
              Deactivate
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '12px' }}>
          Are you sure you want to deactivate{' '}
          <strong>{deactivateTarget?.full_name || deactivateTarget?.username}</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          They will no longer be able to log in. You can re-activate them via the Edit button.
        </p>
      </Modal>
    </div>
  );
}

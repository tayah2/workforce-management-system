import React, { useEffect, useState } from 'react';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';

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
// Validation helpers
// -------------------------------------------------------

function validateCoords(lat, lon) {
  const errors = {};
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    errors.latitude = 'Latitude must be between -90 and 90';
  }
  if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
    errors.longitude = 'Longitude must be between -180 and 180';
  }
  return errors;
}

// -------------------------------------------------------
// Empty form
// -------------------------------------------------------

const EMPTY_FORM = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radius: '0.1',
  is_active: true,
};

// -------------------------------------------------------
// Location Form (reused for add + edit)
// -------------------------------------------------------

function LocationForm({ form, setForm, errors }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Location Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="e.g. Sunrise Care Home"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Address</label>
        <input
          className="form-input"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Full postal address"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Latitude *</label>
          <input
            type="number"
            step="any"
            className={`form-input${errors.latitude ? ' error' : ''}`}
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            required
            placeholder="e.g. 52.6369"
          />
          {errors.latitude && (
            <span className="form-error">{errors.latitude}</span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Longitude *</label>
          <input
            type="number"
            step="any"
            className={`form-input${errors.longitude ? ' error' : ''}`}
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            required
            placeholder="e.g. -1.1398"
          />
          {errors.longitude && (
            <span className="form-error">{errors.longitude}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tolerance Radius (km) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="10"
            className="form-input"
            value={form.radius}
            onChange={(e) => setForm({ ...form, radius: e.target.value })}
            required
            placeholder="0.1 = 100 metres"
          />
          <span className="form-hint">
            {form.radius
              ? `= ${Math.round(parseFloat(form.radius) * 1000)} metres`
              : ''}
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={String(form.is_active)}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.value === 'true' })
            }
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------

export default function Locations() {
  const { toast } = useToast();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await getLocations();
      setLocations(data.locations || data || []);
    } catch (err) {
      toast.error('Failed to load locations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Add ----

  const handleAdd = async (e) => {
    e.preventDefault();
    const errors = validateCoords(addForm.latitude, addForm.longitude);
    if (Object.keys(errors).length) {
      setAddErrors(errors);
      return;
    }
    setAddErrors({});
    setAddLoading(true);
    try {
      await createLocation({
        name: addForm.name,
        address: addForm.address,
        latitude: parseFloat(addForm.latitude),
        longitude: parseFloat(addForm.longitude),
        radius: parseFloat(addForm.radius),
        is_active: addForm.is_active,
      });
      toast.success(`Location "${addForm.name}" created.`);
      setAddForm(EMPTY_FORM);
      setAddOpen(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ---- Edit ----

  const openEdit = (loc) => {
    setEditTarget(loc);
    setEditForm({
      name: loc.name || '',
      address: loc.address || '',
      latitude: String(loc.latitude ?? ''),
      longitude: String(loc.longitude ?? ''),
      radius: String(loc.radius ?? '0.1'),
      is_active: loc.is_active ?? true,
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const errors = validateCoords(editForm.latitude, editForm.longitude);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    setEditLoading(true);
    try {
      await updateLocation(editTarget.id, {
        name: editForm.name,
        address: editForm.address,
        latitude: parseFloat(editForm.latitude),
        longitude: parseFloat(editForm.longitude),
        radius: parseFloat(editForm.radius),
        is_active: editForm.is_active,
      });
      toast.success(`Location "${editForm.name}" updated.`);
      setEditOpen(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ---- Delete ----

  const handleDelete = async () => {
    try {
      await deleteLocation(deleteTarget.id);
      toast.success(`Location "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchLocations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="card-title">Care Facility Locations</span>
            <span className="badge badge-neutral">{locations.length}</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            <IconPlus /> Add Location
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : locations.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              </svg>
              <p>No locations configured yet. Add your first care facility.</p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Radius</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td className="font-semibold">{loc.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {loc.address || '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {typeof loc.latitude === 'number' ? loc.latitude.toFixed(6) : loc.latitude}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {typeof loc.longitude === 'number' ? loc.longitude.toFixed(6) : loc.longitude}
                    </td>
                    <td>
                      {loc.radius != null
                        ? `${Math.round(parseFloat(loc.radius) * 1000)}m`
                        : '-'}
                    </td>
                    <td>
                      <span className={`badge ${loc.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(loc)}
                        >
                          <IconEdit /> Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(loc)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Add Modal ---- */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Location"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add Location'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd}>
          <LocationForm form={addForm} setForm={setAddForm} errors={addErrors} />
        </form>
      </Modal>

      {/* ---- Edit Modal ---- */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit: ${editTarget?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEdit}>
          <LocationForm form={editForm} setForm={setEditForm} errors={editErrors} />
        </form>
      </Modal>

      {/* ---- Delete Confirm Modal ---- */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Location"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '12px' }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
        </p>
        <div className="alert alert-warning" style={{ marginBottom: 0 }}>
          This action cannot be undone. Existing attendance records referencing this location
          will not be affected.
        </div>
      </Modal>
    </div>
  );
}

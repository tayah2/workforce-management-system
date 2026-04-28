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

const CATEGORIES = ['policy', 'procedure', 'health_safety', 'hr', 'training', 'general'];
const CATEGORY_LABELS = {
  policy: 'Policy',
  procedure: 'Procedure',
  health_safety: 'Health & Safety',
  hr: 'HR',
  training: 'Training',
  general: 'General',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Simple inline renderer for preview pane.
 */
function renderContent(raw) {
  if (!raw) return null;
  const paragraphs = raw.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} style={{ fontSize: '15px', fontWeight: '700', margin: '16px 0 6px', color: 'var(--text)' }}>
          {trimmed.slice(3)}
        </h3>
      );
    }
    const lines = trimmed.split('\n');
    return (
      <p key={i} style={{ marginBottom: '10px', lineHeight: '1.7', color: 'var(--text)', fontSize: '14px' }}>
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {parseBold(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function parseBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

const EMPTY_FORM = { title: '', category: 'policy', description: '', content: '' };

export default function DocumentAdmin() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/documents');
      setDocuments(data.documents ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPreviewMode(false);
    setEditDoc(null);
    setShowCreate(true);
  };

  const openEdit = (doc) => {
    setForm({
      title: doc.title ?? '',
      category: doc.category ?? 'policy',
      description: doc.description ?? '',
      content: doc.content ?? '',
    });
    setPreviewMode(false);
    setEditDoc(doc);
    setShowCreate(true);
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      if (editDoc) {
        await api.put(`/api/documents/${editDoc.id}`, form);
        toast.success('Document updated');
      } else {
        await api.post('/api/documents', form);
        toast.success('Document created');
      }
      setShowCreate(false);
      setEditDoc(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/api/documents/${deleteConfirm.id}`);
      toast.success('Document deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const isModalOpen = showCreate || !!editDoc;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Document Manager</h1>
          <p className="page-subtitle">Create and manage company documents</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Document
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Documents</span>
          <span className="badge badge-neutral">{documents.length} documents</span>
        </div>
        {loading ? (
          <div className="loading-container"><LoadingSpinner /></div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No documents yet. Create your first document.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Updated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="font-semibold">{doc.title}</div>
                      {doc.description && (
                        <div className="text-sm text-muted" style={{ marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {CATEGORY_LABELS[doc.category] ?? doc.category}
                      </span>
                    </td>
                    <td className="text-muted">{fmtDate(doc.updated_at || doc.created_at)}</td>
                    <td>
                      <span className={`badge ${doc.is_active === false ? 'badge-danger' : 'badge-success'}`}>
                        {doc.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(doc)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(doc)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={isModalOpen}
        onClose={() => { setShowCreate(false); setEditDoc(null); }}
        title={editDoc ? `Edit: ${editDoc.title}` : 'New Document'}
        maxWidth="800px"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setPreviewMode((v) => !v)}
              type="button"
            >
              {previewMode ? 'Back to Edit' : 'Preview'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowCreate(false); setEditDoc(null); }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editDoc ? 'Save Changes' : 'Create Document')}
            </button>
          </>
        }
      >
        {previewMode ? (
          <div>
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px' }}>
              <div className="font-bold" style={{ fontSize: '18px', marginBottom: '4px' }}>{form.title || 'Untitled'}</div>
              <span className="badge badge-neutral">{CATEGORY_LABELS[form.category] ?? form.category}</span>
              {form.description && <p className="text-muted text-sm" style={{ marginTop: '8px' }}>{form.description}</p>}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {renderContent(form.content) || <p className="text-muted">No content to preview.</p>}
            </div>
          </div>
        ) : (
          <div>
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" name="title" className="form-input" value={form.title} onChange={handleChange} placeholder="Document title..." required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="form-select" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span className="text-muted text-sm">(optional, 2 lines shown to staff)</span></label>
              <textarea name="description" className="form-textarea" rows={2} value={form.description} onChange={handleChange} placeholder="Brief description of this document..." />
            </div>
            <div className="form-group">
              <label className="form-label">Content <span style={{ color: 'var(--danger)' }}>*</span></label>
              <p className="form-hint" style={{ marginBottom: '6px' }}>Supports markdown: ## Heading, **bold**, blank line for paragraphs</p>
              <textarea name="content" className="form-textarea" rows={12} value={form.content} onChange={handleChange} placeholder="Write document content here..." style={{ fontFamily: 'monospace', fontSize: '13px' }} />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Document"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Document'}
            </button>
          </>
        }
      >
        {deleteConfirm && (
          <div>
            <p>Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?</p>
            <p className="text-muted text-sm" style={{ marginTop: '8px' }}>This action cannot be undone.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

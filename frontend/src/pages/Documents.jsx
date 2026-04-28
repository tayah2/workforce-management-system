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

const CATEGORIES = ['All', 'policy', 'procedure', 'health_safety', 'hr', 'training', 'general'];

const CATEGORY_LABELS = {
  policy: 'Policy',
  procedure: 'Procedure',
  health_safety: 'Health & Safety',
  hr: 'HR',
  training: 'Training',
  general: 'General',
};

const CATEGORY_ICONS = {
  policy: '📋',
  procedure: '⚙️',
  health_safety: '🛡️',
  hr: '👥',
  training: '📚',
  general: '📄',
};

const CATEGORY_BADGE_COLORS = {
  policy: 'badge-info',
  procedure: 'badge-neutral',
  health_safety: 'badge-warning',
  hr: 'badge-purple',
  training: 'badge-success',
  general: 'badge-neutral',
};

/**
 * Very simple inline renderer: converts \n\n → paragraphs,
 * ## heading → h3, **text** → <strong>.
 */
function renderContent(raw) {
  if (!raw) return null;
  const paragraphs = raw.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;

    // Heading
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} style={{ fontSize: '16px', fontWeight: '700', margin: '20px 0 8px', color: 'var(--text)' }}>
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={i} style={{ fontSize: '18px', fontWeight: '700', margin: '24px 0 10px', color: 'var(--text)' }}>
          {trimmed.slice(2)}
        </h2>
      );
    }

    // Lines within a paragraph — handle **bold**
    const lines = trimmed.split('\n');
    return (
      <p key={i} style={{ marginBottom: '12px', lineHeight: '1.7', color: 'var(--text)' }}>
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
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Documents() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const filtered = selectedCategory === 'All'
    ? documents
    : documents.filter((d) => d.category === selectedCategory);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">Company policies, procedures, and resources</p>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: selectedCategory === cat ? 'var(--primary)' : 'var(--card-bg)',
              color: selectedCategory === cat ? 'white' : 'var(--text)',
              borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border)',
            }}
          >
            {cat === 'All' ? 'All Documents' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>No documents found{selectedCategory !== 'All' ? ` in ${CATEGORY_LABELS[selectedCategory] ?? selectedCategory}` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map((doc) => (
            <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>
                    {CATEGORY_ICONS[doc.category] ?? '📄'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>
                      {doc.title}
                    </div>
                    <span className={`badge ${CATEGORY_BADGE_COLORS[doc.category] ?? 'badge-neutral'}`}>
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                    </span>
                  </div>
                </div>

                {doc.description && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.5',
                    }}
                  >
                    {doc.description}
                  </p>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                  Updated {fmtDate(doc.updated_at || doc.created_at)}
                  {doc.uploaded_by_name && ` · by ${doc.uploaded_by_name}`}
                </div>
              </div>
              <div style={{ padding: '0 20px 16px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => setSelectedDoc(doc)}
                >
                  Read Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document reader modal */}
      <Modal
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title ?? ''}
        maxWidth="700px"
      >
        {selectedDoc && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span className={`badge ${CATEGORY_BADGE_COLORS[selectedDoc.category] ?? 'badge-neutral'}`}>
                {CATEGORY_ICONS[selectedDoc.category]} {CATEGORY_LABELS[selectedDoc.category] ?? selectedDoc.category}
              </span>
              <span className="text-sm text-muted">Updated {fmtDate(selectedDoc.updated_at || selectedDoc.created_at)}</span>
              {selectedDoc.uploaded_by_name && (
                <span className="text-sm text-muted">by {selectedDoc.uploaded_by_name}</span>
              )}
            </div>
            {selectedDoc.description && (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', fontStyle: 'italic' }}>
                {selectedDoc.description}
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {renderContent(selectedDoc.content)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

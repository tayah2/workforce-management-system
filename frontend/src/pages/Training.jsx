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

const CATEGORY_COLORS = {
  mandatory: 'badge-danger',
  health_safety: 'badge-warning',
  clinical: 'badge-info',
  care: 'badge-success',
  professional: 'badge-purple',
  compliance: 'badge-neutral',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Simple inline content renderer shared with Documents.
 * Handles ## headings, **bold**, and paragraph breaks.
 */
function renderContent(raw) {
  if (!raw) return null;
  const paragraphs = raw.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;
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
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split('\n').filter((l) => l.match(/^[-*] /));
      return (
        <ul key={i} style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ marginBottom: '4px', color: 'var(--text)' }}>
              {parseBold(item.replace(/^[-*] /, ''))}
            </li>
          ))}
        </ul>
      );
    }
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

export default function Training() {
  const { toast } = useToast();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, pct: 0, completions: [] });
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [openModule, setOpenModule] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modRes, progRes] = await Promise.all([
        api.get('/api/training/modules'),
        api.get('/api/training/progress'),
      ]);
      setModules(modRes.data.modules ?? []);
      setProgress(progRes.data ?? { total: 0, completed: 0, pct: 0, completions: [] });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load training modules');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const categories = ['All', ...Array.from(new Set(modules.map((m) => m.category).filter(Boolean)))];

  const filtered = activeCategory === 'All'
    ? modules
    : modules.filter((m) => m.category === activeCategory);

  const handleComplete = async (moduleId) => {
    setCompleting(moduleId);
    try {
      await api.post(`/api/training/modules/${moduleId}/complete`);
      toast.success('Module completed! +10 XP');
      setOpenModule(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to mark module as complete');
    } finally {
      setCompleting(null);
    }
  };

  const pct = progress.pct ?? (progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Training & Development</h1>
        <p className="page-subtitle">Complete your required learning modules</p>
      </div>

      {/* Progress banner */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)', border: 'none' }}>
        <div className="card-body" style={{ color: 'white' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>
                {progress.completed} of {progress.total} modules complete
              </div>
              <div style={{ fontSize: '13px', opacity: '0.8', marginTop: '2px' }}>
                Keep going — you're doing great!
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800' }}>{pct}%</div>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'white',
                borderRadius: '20px',
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="tabs mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`tab-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p>No training modules in this category</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map((mod) => {
            const completionEntry = (progress.completions ?? []).find((c) => c.module_id === mod.id);
            const isCompleted = mod.completed || !!completionEntry;
            return (
              <div
                key={mod.id}
                className={`training-card${isCompleted ? ' completed' : ''}`}
                onClick={() => setOpenModule(mod)}
              >
                <div className="flex items-center justify-between">
                  <span className={`badge ${CATEGORY_COLORS[mod.category] ?? 'badge-neutral'}`}>
                    {mod.category}
                  </span>
                  {isCompleted && (
                    <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Completed
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)', marginBottom: '6px' }}>
                    {mod.title}
                  </div>
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
                    {mod.description}
                  </p>
                </div>

                <div className="flex items-center justify-between" style={{ marginTop: 'auto' }}>
                  {mod.estimated_minutes && (
                    <span className="text-sm text-muted">
                      {'⏱'} {mod.estimated_minutes} min
                    </span>
                  )}
                  {isCompleted ? (
                    <span className="text-sm text-muted">
                      {completionEntry ? fmtDate(completionEntry.completed_at) : 'Done'}
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setOpenModule(mod); }}
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Module reader modal */}
      <Modal
        open={!!openModule}
        onClose={() => setOpenModule(null)}
        title={openModule?.title ?? ''}
        maxWidth="740px"
        footer={
          openModule && !openModule.completed && (
            <>
              <button className="btn btn-secondary" onClick={() => setOpenModule(null)}>Close</button>
              <button
                className="btn btn-success"
                onClick={() => handleComplete(openModule.id)}
                disabled={completing === openModule?.id}
              >
                {completing === openModule?.id ? 'Saving...' : 'Mark as Complete'}
              </button>
            </>
          )
        }
      >
        {openModule && (
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
              <span className={`badge ${CATEGORY_COLORS[openModule.category] ?? 'badge-neutral'}`}>
                {openModule.category}
              </span>
              {openModule.estimated_minutes && (
                <span className="text-sm text-muted">{'⏱'} {openModule.estimated_minutes} min</span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', fontStyle: 'italic' }}>
              {openModule.description}
            </p>
            <div className="training-content" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {renderContent(openModule.content)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

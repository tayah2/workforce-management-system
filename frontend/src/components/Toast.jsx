import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// -------------------------------------------------------
// Context
// -------------------------------------------------------

const ToastContext = createContext(null);

let _toastId = 0;

// -------------------------------------------------------
// Provider
// -------------------------------------------------------

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="alert">
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '16px',
                lineHeight: 1,
              }}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider');

  const toast = useMemo(() => ({
    success: (msg) => ctx.addToast(msg, 'success'),
    error: (msg) => ctx.addToast(msg, 'error', 5000),
    warning: (msg) => ctx.addToast(msg, 'warning'),
    info: (msg) => ctx.addToast(msg, 'info'),
  }), [ctx.addToast]);

  return { toast };
}

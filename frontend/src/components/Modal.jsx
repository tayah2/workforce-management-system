import React, { useEffect } from 'react';

/**
 * Accessible modal dialog.
 *
 * Props:
 *   open       {boolean}    - whether the modal is visible
 *   onClose    {function}   - called when overlay or X is clicked
 *   title      {string}     - modal heading
 *   children   {ReactNode}  - modal body content
 *   footer     {ReactNode}  - optional footer content (replaces default close button)
 *   maxWidth   {string}     - CSS max-width value (default "520px")
 */
export default function Modal({ open, onClose, title, children, footer, maxWidth = '520px' }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">
            {title}
          </h2>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

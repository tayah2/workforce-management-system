import React from 'react';

/**
 * A simple CSS spinner.
 * Use size="sm" for an inline 18px spinner.
 */
export default function LoadingSpinner({ size = 'md' }) {
  return (
    <div
      className={`spinner${size === 'sm' ? ' spinner-sm' : ''}`}
      role="status"
      aria-label="Loading"
    />
  );
}

import React from 'react';

/**
 * A summary stat card.
 *
 * Props:
 *   label   {string}     - descriptive label (e.g. "Total Staff")
 *   value   {string|number}  - the primary value
 *   icon    {ReactNode}  - SVG icon element
 *   color   {string}     - "blue" | "green" | "amber" | "red" | "purple"
 *   sub     {string}     - optional secondary text (e.g. trend)
 */
export default function StatCard({ label, value, icon, color = 'blue', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div>
          <div className="stat-card-value">{value ?? '-'}</div>
          <div className="stat-card-label">{label}</div>
        </div>
        <div className={`stat-card-icon ${color}`}>
          {icon}
        </div>
      </div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}

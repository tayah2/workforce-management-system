import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { getOpenShifts, claimShift } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatDate, formatTime, formatCurrency, formatHours } from '../utils/formatters.js';

// -------------------------------------------------------
// Shift card
// -------------------------------------------------------
function ShiftCard({ shift, onClaim, claiming }) {
  const start = shift.scheduled_start ? new Date(shift.scheduled_start) : null;
  const end = shift.scheduled_end ? new Date(shift.scheduled_end) : null;
  const isToday = start && formatDate(start.toISOString()) === formatDate(new Date().toISOString());
  const isTomorrow = start && (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(start.toISOString()) === formatDate(tomorrow.toISOString());
  })();

  const dayLabel = isToday ? '📌 Today' : isTomorrow ? '📅 Tomorrow' : formatDate(shift.scheduled_start);

  const getPayEstimate = () => {
    // Can't know hourly rate here, just show hours
    return formatHours(shift.duration_hours || 0);
  };

  return (
    <div className="shift-card-available" style={{
      background: 'var(--card-bg)',
      border: '2px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Location + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
            📍 {shift.location_name || `Location #${shift.location_id}`}
          </div>
          {shift.location_address && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {shift.location_address}
            </div>
          )}
        </div>
        <span className={`badge ${isToday ? 'badge-warning' : 'badge-info'}`} style={{ whiteSpace: 'nowrap' }}>
          {dayLabel}
        </span>
      </div>

      {/* Time + duration */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>
            {start ? formatTime(shift.scheduled_start) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '20px', paddingTop: '14px' }}>→</div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>End</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
            {end ? formatTime(shift.scheduled_end) : '—'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
            {getPayEstimate()}
          </div>
        </div>
      </div>

      {/* Notes */}
      {shift.notes && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '6px', padding: '8px 12px' }}>
          📝 {shift.notes}
        </div>
      )}

      {/* Claim button */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '4px', padding: '12px', fontSize: '15px', fontWeight: 700 }}
        onClick={() => onClaim(shift)}
        disabled={claiming === shift.id}
      >
        {claiming === shift.id ? '⏳ Claiming...' : '✅ Pick Up This Shift'}
      </button>
    </div>
  );
}

// -------------------------------------------------------
// Filter bar
// -------------------------------------------------------
function FilterBar({ locationFilter, setLocationFilter, locations }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
      <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
        <label className="form-label">Filter by Location</label>
        <select
          className="form-select"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------
export default function AvailableShifts() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Admins post shifts — they don't browse them
  if (isAdmin) return <Navigate to="/schedule" replace />;
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [lastClaimed, setLastClaimed] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getOpenShifts()
      .then((data) => setShifts(data.shifts || []))
      .catch(() => toast.error('Failed to load available shifts'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (shift) => {
    setClaiming(shift.id);
    try {
      await claimShift(shift.id);
      setLastClaimed(shift);
      toast.success(`You picked up the shift at ${shift.location_name} on ${formatDate(shift.scheduled_start)}!`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to claim shift');
    } finally {
      setClaiming(null);
    }
  };

  const uniqueLocations = [...new Set(shifts.map((s) => s.location_name).filter(Boolean))];
  const filtered = locationFilter
    ? shifts.filter((s) => s.location_name === locationFilter)
    : shifts;

  // Group by date
  const groups = {};
  filtered.forEach((s) => {
    const key = s.scheduled_start ? s.scheduled_start.slice(0, 10) : 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  const sortedDates = Object.keys(groups).sort();

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '28px',
        color: 'white',
      }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
          Available Shifts
        </h2>
        <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: '14px' }}>
          Browse and pick up open shifts — earn more, build your streak, and collect achievement points.
        </p>
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{shifts.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>Shifts Available</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{uniqueLocations.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>Locations</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>+18 pts</div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>Per Shift Completed</div>
          </div>
        </div>
      </div>

      {/* Success message for last claimed */}
      {lastClaimed && (
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #16a34a',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>🎉</span>
          <div>
            <div style={{ fontWeight: 700, color: '#15803d' }}>Shift claimed!</div>
            <div style={{ fontSize: '13px', color: '#166534' }}>
              {lastClaimed.location_name} — {formatDate(lastClaimed.scheduled_start)},{' '}
              {formatTime(lastClaimed.scheduled_start)} to {formatTime(lastClaimed.scheduled_end)}.
              It's now in your schedule.
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', color: '#15803d' }}
            onClick={() => setLastClaimed(null)}
          >✕</button>
        </div>
      )}

      {/* Filter */}
      {uniqueLocations.length > 1 && (
        <FilterBar
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          locations={uniqueLocations}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-container"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🏖️</div>
            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
              {locationFilter ? 'No shifts at this location' : 'No available shifts right now'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {locationFilter
                ? 'Try clearing the location filter to see all shifts.'
                : 'Check back later — your manager will post new shifts here when they become available.'}
            </div>
          </div>
        </div>
      ) : (
        sortedDates.map((dateKey) => {
          const dayShifts = groups[dateKey];
          const dateLabel = (() => {
            const today = new Date().toISOString().slice(0, 10);
            const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
            if (dateKey === today) return '📌 Today';
            if (dateKey === tomorrow) return '📅 Tomorrow';
            return `📆 ${formatDate(dateKey)}`;
          })();

          return (
            <div key={dateKey} style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '2px solid var(--border)',
              }}>
                {dateLabel}
                <span className="badge badge-neutral" style={{ marginLeft: '10px', textTransform: 'none', fontSize: '11px' }}>
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClaim={handleClaim}
                    claiming={claiming}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

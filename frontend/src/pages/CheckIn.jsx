import React, { useEffect, useState, useCallback } from 'react';
import {
  getLocations,
  getCurrentCheckin,
  checkIn,
  checkOut,
} from '../api/client.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatTime, formatHours } from '../utils/formatters.js';

// -------------------------------------------------------
// Icons
// -------------------------------------------------------

function IconMapPin() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconLocate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

// -------------------------------------------------------
// GPS hook
// -------------------------------------------------------

function useGPS() {
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('Unable to retrieve location: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-get location on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { coords, gpsError, gpsLoading, getLocation };
}

// -------------------------------------------------------
// CheckIn page
// -------------------------------------------------------

export default function CheckIn() {
  const { toast } = useToast();
  const { coords, gpsError, gpsLoading, getLocation } = useGPS();

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [currentCheckin, setCurrentCheckin] = useState(null);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);

  // Load initial data
  useEffect(() => {
    Promise.all([getLocations(), getCurrentCheckin()])
      .then(([locsData, currentData]) => {
        const locs = locsData.locations || [];
        setLocations(locs);
        if (locs.length > 0) setSelectedLocationId(String(locs[0].id));
        setCurrentCheckin(currentData.current_checkin || currentData.checkin || null);
      })
      .catch((err) => {
        toast.error('Failed to load data: ' + err.message);
      })
      .finally(() => setPageLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckIn = async () => {
    if (!coords) {
      toast.warning('Please wait for GPS location or click "Get My Location".');
      return;
    }
    if (!selectedLocationId) {
      toast.warning('Please select a location.');
      return;
    }

    setActionLoading(true);
    try {
      const data = await checkIn(
        parseInt(selectedLocationId, 10),
        coords.latitude,
        coords.longitude,
        notes
      );
      setCurrentCheckin(data.checkin || data.attendance);
      setNotes('');
      toast.success('Checked in successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!coords) {
      toast.warning('Please wait for GPS location or click "Get My Location".');
      return;
    }

    setActionLoading(true);
    try {
      const data = await checkOut(coords.latitude, coords.longitude, breakMinutes);
      setCheckoutResult(data.attendance || data.checkin || data);
      setCurrentCheckin(null);
      setBreakMinutes(0);
      toast.success('Checked out successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="checkin-wrapper">
      {/* Checkout success result */}
      {checkoutResult && (
        <div className="success-result" style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', marginBottom: '12px' }}>
            Shift Complete
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
            <div>
              <div className="success-value">{formatHours(checkoutResult.hours_worked)}</div>
              <div className="success-label">Hours Worked</div>
            </div>
            {checkoutResult.points_earned != null && (
              <div>
                <div className="success-value">+{checkoutResult.points_earned}</div>
                <div className="success-label">Points Earned</div>
              </div>
            )}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '12px' }}
            onClick={() => setCheckoutResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-body checkin-status-card">
          {/* Status icon */}
          <div className={`checkin-icon-wrap ${currentCheckin ? 'checked-in' : 'checked-out'}`}>
            {currentCheckin ? <IconCheck /> : <IconMapPin />}
          </div>

          <h2 className="checkin-heading">
            {currentCheckin ? 'You are checked in' : 'Ready to start your shift?'}
          </h2>

          <p className="checkin-subtext">
            {currentCheckin
              ? `At ${currentCheckin.location_name} since ${formatTime(currentCheckin.check_in_time)}`
              : 'Select your work location and tap Check In.'}
          </p>

          {/* Not checked in */}
          {!currentCheckin && (
            <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="location-select">
                  Work Location
                </label>
                <select
                  id="location-select"
                  className="form-select"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  {locations.length === 0 && (
                    <option value="">No locations available</option>
                  )}
                  {locations.map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="notes">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  className="form-textarea"
                  placeholder="Any notes for this shift..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <button
                className="btn btn-success btn-lg btn-full"
                onClick={handleCheckIn}
                disabled={actionLoading || !selectedLocationId}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                    Checking in...
                  </>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          )}

          {/* Checked in */}
          {currentCheckin && (
            <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
              <div className="card" style={{ marginBottom: '20px', background: 'var(--bg)' }}>
                <div className="card-body" style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Location</div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{currentCheckin.location_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Checked In</div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{formatTime(currentCheckin.check_in_time)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>GPS Status</div>
                      <span className={`badge ${currentCheckin.is_check_in_verified ? 'badge-success' : 'badge-warning'}`}>
                        {currentCheckin.is_check_in_verified ? 'Verified' : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="break-select">
                  Break Duration
                </label>
                <select
                  id="break-select"
                  className="form-select"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                >
                  <option value={0}>No break</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <button
                className="btn btn-danger btn-lg btn-full"
                onClick={handleCheckOut}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                    Checking out...
                  </>
                ) : (
                  'Check Out'
                )}
              </button>
            </div>
          )}

          {/* GPS status bar */}
          <div style={{ marginTop: '20px' }}>
            {gpsError ? (
              <div className="gps-status">
                <span className="gps-dot error" />
                GPS error: {gpsError}
                <button className="btn btn-ghost btn-sm" onClick={getLocation}>
                  Retry
                </button>
              </div>
            ) : gpsLoading ? (
              <div className="gps-status">
                <LoadingSpinner size="sm" />
                Acquiring GPS location...
              </div>
            ) : coords ? (
              <div className="gps-status">
                <span className="gps-dot" />
                GPS active — {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                {coords.accuracy && (
                  <span> (±{Math.round(coords.accuracy)}m)</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={getLocation}>
                  <IconLocate /> Refresh
                </button>
              </div>
            ) : (
              <div className="gps-status">
                <span className="gps-dot error" />
                No GPS signal
                <button className="btn btn-ghost btn-sm" onClick={getLocation}>
                  <IconLocate /> Get My Location
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

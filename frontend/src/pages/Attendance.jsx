import React, { useEffect, useState } from 'react';
import { getAttendance, getLocations, exportAttendance } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDate, formatTime, formatHours } from '../utils/formatters.js';

const PAGE_SIZE = 10;

// -------------------------------------------------------
// Icon
// -------------------------------------------------------

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function Attendance() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(monthStartISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [locationFilter, setLocationFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (locationFilter) params.location_id = locationFilter;

      const data = await getAttendance(params);
      setRecords(data.attendance || data.records || []);
      setPage(1);
    } catch (err) {
      toast.error('Failed to load attendance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load locations for filter dropdown
  useEffect(() => {
    getLocations()
      .then((data) => setLocations(data.locations || []))
      .catch(() => {});
  }, []);

  // Fetch on mount + when filters change
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = () => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (locationFilter) params.location_id = locationFilter;
    exportAttendance(params);
  };

  // Pagination
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Filters</span>
          <IconFilter />
        </div>
        <div className="card-body">
          <form onSubmit={handleFilter}>
            <div className="filter-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <select
                  className="form-select"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="">All Locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ visibility: 'hidden' }}>
                  &nbsp;
                </label>
                <button type="submit" className="btn btn-primary">
                  Apply Filters
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Attendance Records
            <span
              className="badge badge-neutral"
              style={{ marginLeft: '10px' }}
            >
              {records.length}
            </span>
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <IconDownload /> Export
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : records.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p>No attendance records found for the selected filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {isAdmin && <th>Staff</th>}
                    <th>Location</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Break</th>
                    <th>GPS Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.check_in_time)}</td>
                      {isAdmin && <td className="font-semibold">{r.user_name}</td>}
                      <td>{r.location_name}</td>
                      <td>{formatTime(r.check_in_time)}</td>
                      <td>
                        {r.check_out_time ? (
                          formatTime(r.check_out_time)
                        ) : (
                          <span className="badge badge-success">Active</span>
                        )}
                      </td>
                      <td>
                        {r.hours_worked != null ? formatHours(r.hours_worked) : '-'}
                      </td>
                      <td>
                        {r.break_minutes ? `${r.break_minutes} min` : '-'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.is_check_in_verified
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                        >
                          {r.is_check_in_verified ? 'Verified' : 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, records.length)} of {records.length}
                </span>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          className={`pagination-btn${p === page ? ' active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    className="pagination-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

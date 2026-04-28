import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  getAttendanceSummary, getDailyActivity, exportAttendance,
  getLocationAnalytics, getStaffAnalytics,
} from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { formatHours, formatCurrency } from '../../utils/formatters.js';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const COLOURS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#db2777'];

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// -------------------------------------------------------
// Date range picker
// -------------------------------------------------------
function DateRangePicker({ start, end, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">From</label>
        <input type="date" className="form-input" value={start}
          onChange={(e) => onChange(e.target.value, end)} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">To</label>
        <input type="date" className="form-input" value={end}
          onChange={(e) => onChange(start, e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end', paddingBottom: '2px' }}>
        {[7, 14, 30].map((n) => (
          <button key={n} className="btn btn-sm btn-secondary"
            onClick={() => onChange(daysAgo(n), today())}>
            {n}d
          </button>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Tab 1 — Attendance Summary
// -------------------------------------------------------
function AttendanceSummaryTab() {
  const { toast } = useToast();
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getAttendanceSummary({ start_date: start, end_date: end }).catch(() => null),
      getDailyActivity({ days: 30 }).catch(() => null),
    ]).then(([s, d]) => {
      if (s) setSummary(s.summary);
      if (d) setDaily(d.daily_activity || []);
    }).catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDateChange = (s, e) => { setStart(s); setEnd(e); };

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <DateRangePicker start={start} end={end} onChange={handleDateChange} />
        <button className="btn btn-secondary" onClick={() => exportAttendance({ start_date: start, end_date: end })}>
          ↓ Export Excel
        </button>
      </div>

      {summary && (
        <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <StatCard label="Total Shifts" value={summary.total_checkins} color="blue" />
          <StatCard label="Completed" value={summary.completed_shifts} color="green" />
          <StatCard label="Hours Worked" value={formatHours(summary.total_hours)} color="purple" />
          <StatCard label="Staff Active" value={summary.unique_employees} color="amber" />
          <StatCard label="GPS Verified In" value={`${summary.gps_verified_checkins}`} color="blue" />
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Daily Activity — Last 30 Days</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daily} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed_shifts" name="Shifts" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="hours_worked" name="Hours" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Tab 2 — Location Analytics
// -------------------------------------------------------
function LocationAnalyticsTab() {
  const { toast } = useToast();
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getLocationAnalytics({ start_date: start, end_date: end })
      .then(setData)
      .catch(() => toast.error('Failed to load location analytics'))
      .finally(() => setLoading(false));
  }, [start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;
  if (!data) return null;

  const { locations, totals } = data;
  const chartData = locations.map((l) => ({
    name: l.location_name.length > 16 ? l.location_name.slice(0, 14) + '…' : l.location_name,
    fullName: l.location_name,
    Hours: l.total_hours,
    Cost: l.payroll_cost,
    Shifts: l.completed_shifts,
  }));

  const pieData = locations.map((l, i) => ({
    name: l.location_name,
    value: l.total_hours,
    fill: COLOURS[i % COLOURS.length],
  }));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
      </div>

      {/* Summary cards */}
      <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Total Hours" value={formatHours(totals.total_hours)} color="blue" />
        <StatCard label="Total Payroll Cost" value={formatCurrency(totals.total_cost)} color="green" />
        <StatCard label="Total Shifts" value={totals.total_shifts} color="purple" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Hours by Location</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [n === 'Cost' ? formatCurrency(v) : v, n]} />
                <Bar dataKey="Hours" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Hours Share</span></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={200} height={220}>
              <Pie data={pieData} cx={100} cy={100} outerRadius={80} dataKey="value" nameKey="name"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => formatHours(v)} />
            </PieChart>
          </div>
        </div>
      </div>

      {/* Cost chart */}
      <div className="card mb-4">
        <div className="card-header"><span className="card-title">Payroll Cost by Location</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="Cost" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="card">
        <div className="card-header"><span className="card-title">Location Breakdown</span></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Shifts</th>
                <th>Hours</th>
                <th>Payroll Cost</th>
                <th>GPS Rate</th>
                <th>Staff</th>
                <th>Top Employee</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, i) => (
                <tr key={loc.location_id}>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: COLOURS[i % COLOURS.length], marginRight: '8px' }} />
                    {loc.location_name}
                  </td>
                  <td>{loc.completed_shifts}</td>
                  <td>{formatHours(loc.total_hours)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(loc.payroll_cost)}</td>
                  <td>
                    <span className={`badge ${loc.gps_rate >= 80 ? 'badge-success' : loc.gps_rate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                      {loc.gps_rate}%
                    </span>
                  </td>
                  <td>{loc.unique_staff}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{loc.top_employee || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Tab 3 — Staff Analytics
// -------------------------------------------------------
function StaffAnalyticsTab() {
  const { toast } = useToast();
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getStaffAnalytics({ start_date: start, end_date: end })
      .then(setData)
      .catch(() => toast.error('Failed to load staff analytics'))
      .finally(() => setLoading(false));
  }, [start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;
  if (!data) return null;

  const { staff, totals } = data;
  const chartData = staff.slice(0, 8).map((s) => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    Hours: s.total_hours,
    Earnings: s.total_earnings,
    GPS: s.gps_rate,
  }));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
      </div>

      <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Total Hours" value={formatHours(totals.total_hours)} color="blue" />
        <StatCard label="Total Earnings" value={formatCurrency(totals.total_earnings)} color="green" />
        <StatCard label="Shifts Completed" value={totals.total_shifts} color="purple" />
      </div>

      {/* Hours chart */}
      <div className="card mb-4">
        <div className="card-header"><span className="card-title">Hours by Staff Member</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n, p) => [n === 'Earnings' ? formatCurrency(v) : v, p.payload.fullName]} />
              <Legend />
              <Bar dataKey="Hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GPS compliance chart */}
      <div className="card mb-4">
        <div className="card-header"><span className="card-title">GPS Compliance Rate (%)</span></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="GPS" name="GPS Verified %" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full staff table */}
      <div className="card">
        <div className="card-header"><span className="card-title">Staff Performance Table</span></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Shifts</th>
                <th>Hours</th>
                <th>Overtime</th>
                <th>Earnings</th>
                <th>GPS %</th>
                <th>Points</th>
                <th>Streak</th>
                <th>Top Location</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.user_id}>
                  <td style={{ fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-muted)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.completed_shifts}</td>
                  <td>{formatHours(s.total_hours)}</td>
                  <td style={{ color: s.overtime_hours > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {formatHours(s.overtime_hours)}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(s.total_earnings)}</td>
                  <td>
                    <span className={`badge ${s.gps_rate >= 80 ? 'badge-success' : s.gps_rate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                      {s.gps_rate}%
                    </span>
                  </td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.total_points.toLocaleString()}</td>
                  <td>{s.current_streak > 0 ? `${s.current_streak} 🔥` : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{s.top_location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Main Reports component
// -------------------------------------------------------
export default function Reports() {
  const [tab, setTab] = useState('attendance');

  const tabs = [
    { id: 'attendance', label: '📋 Attendance' },
    { id: 'locations', label: '📍 Location Analytics' },
    { id: 'staff', label: '👥 Staff Analytics' },
  ];

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && <AttendanceSummaryTab />}
      {tab === 'locations' && <LocationAnalyticsTab />}
      {tab === 'staff' && <StaffAnalyticsTab />}
    </div>
  );
}

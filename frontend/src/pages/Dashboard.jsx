import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardStats } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatDate, formatTime, formatHours } from '../utils/formatters.js';

// -------------------------------------------------------
// Icons
// -------------------------------------------------------

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// -------------------------------------------------------
// Admin Dashboard
// -------------------------------------------------------

function AdminDashboard({ stats }) {
  const navigate = useNavigate();

  const chartData = stats?.daily_checkins || [];

  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Total Staff"
          value={stats?.total_employees ?? 0}
          icon={<IconUsers />}
          color="blue"
        />
        <StatCard
          label="Active Now"
          value={stats?.active_now ?? 0}
          icon={<IconActivity />}
          color="green"
        />
        <StatCard
          label="Today's Shifts"
          value={stats?.today_checkins ?? 0}
          icon={<IconCalendar />}
          color="amber"
        />
        <StatCard
          label="This Month's Hours"
          value={formatHours(stats?.month_hours ?? 0)}
          icon={<IconClock />}
          color="purple"
        />
      </div>

      {/* Daily check-ins chart */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Daily Check-ins (Last 7 Days)</span>
        </div>
        <div className="card-body">
          {chartData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="count"
                    name="Check-ins"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <IconCalendar />
              <p>No check-in data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Currently checked-in staff */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Currently Checked In</span>
          <span className="badge badge-success">{stats?.active_now ?? 0} active</span>
        </div>
        {stats?.active_staff && stats.active_staff.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Location</th>
                  <th>Checked In</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {stats.active_staff.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.user_name}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconMapPin />
                        {s.location_name}
                      </span>
                    </td>
                    <td>{formatTime(s.check_in_time)}</td>
                    <td>
                      <span className={`badge ${s.is_check_in_verified ? 'badge-success' : 'badge-warning'}`}>
                        {s.is_check_in_verified ? 'Verified' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body">
            <div className="empty-state" style={{ padding: '32px' }}>
              <IconActivity />
              <p>No staff currently checked in.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------
// Employee Dashboard
// -------------------------------------------------------

function EmployeeDashboard({ stats }) {
  const navigate = useNavigate();

  const recentAttendance = stats?.recent_attendance || [];
  const isCheckedIn = stats?.is_checked_in || false;

  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="This Week's Hours"
          value={formatHours(stats?.week_hours ?? 0)}
          icon={<IconClock />}
          color="blue"
        />
        <StatCard
          label="This Month's Hours"
          value={formatHours(stats?.month_hours ?? 0)}
          icon={<IconCalendar />}
          color="green"
        />
        <StatCard
          label="Current Points"
          value={stats?.points ?? 0}
          icon={<IconStar />}
          color="amber"
        />
        <StatCard
          label="Current Streak"
          value={`${stats?.streak ?? 0} days`}
          icon={<IconActivity />}
          color="purple"
          sub="Consecutive working days"
        />
      </div>

      {/* Quick action */}
      <div className="card mb-6">
        <div className="card-body" style={{ textAlign: 'center', padding: '28px' }}>
          {isCheckedIn ? (
            <>
              <div style={{ marginBottom: '12px', color: 'var(--success)', fontWeight: 600 }}>
                You are currently checked in
              </div>
              <button
                className="btn btn-danger btn-lg"
                onClick={() => navigate('/checkin')}
              >
                Check Out Now
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                Ready to start your shift?
              </div>
              <button
                className="btn btn-success btn-lg"
                onClick={() => navigate('/checkin')}
              >
                Check In Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Attendance</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/attendance')}>
            View All
          </button>
        </div>
        {recentAttendance.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.check_in_time)}</td>
                    <td>{r.location_name}</td>
                    <td>{formatTime(r.check_in_time)}</td>
                    <td>{r.check_out_time ? formatTime(r.check_out_time) : <span className="badge badge-success">Active</span>}</td>
                    <td>{r.hours_worked ? formatHours(r.hours_worked) : '-'}</td>
                    <td>
                      <span className={`badge ${r.is_check_in_verified ? 'badge-success' : 'badge-warning'}`}>
                        {r.is_check_in_verified ? 'Verified' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body">
            <div className="empty-state" style={{ padding: '32px' }}>
              <IconCalendar />
              <p>No attendance records yet. Check in to get started!</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------
// Dashboard page
// -------------------------------------------------------

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then((data) => setStats(data.stats || data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">{error}</div>
    );
  }

  return isAdmin ? (
    <AdminDashboard stats={stats} />
  ) : (
    <EmployeeDashboard stats={stats} />
  );
}

import React, { useEffect, useState } from 'react';
import { getPayroll, exportPayroll } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatCurrency, formatHours } from '../utils/formatters.js';

// -------------------------------------------------------
// Icons
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

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const start = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function Payroll() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const { start: defaultStart, end: defaultEnd } = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const [payrollData, setPayrollData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPayroll = async (start, end) => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.start_date = start;
      if (end) params.end_date = end;

      const data = await getPayroll(params);
      setPayrollData(data.payroll || data.records || []);
      setSummary(data.summary || null);
    } catch (err) {
      toast.error('Failed to load payroll: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = (e) => {
    e.preventDefault();
    fetchPayroll(startDate, endDate);
  };

  const handleExport = () => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    exportPayroll(params);
  };

  // Compute summary from rows if API doesn't return one
  const computedSummary = summary || {
    total_hours: payrollData.reduce((acc, r) => acc + (r.total_hours || 0), 0),
    regular_pay: payrollData.reduce((acc, r) => acc + (r.regular_pay || 0), 0),
    overtime_pay: payrollData.reduce((acc, r) => acc + (r.overtime_pay || 0), 0),
    total_pay: payrollData.reduce((acc, r) => acc + (r.total_pay || 0), 0),
  };

  return (
    <div>
      {/* Date range filter */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Pay Period</span>
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
                <label className="form-label" style={{ visibility: 'hidden' }}>
                  &nbsp;
                </label>
                <button type="submit" className="btn btn-primary">
                  Apply
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="stat-grid mb-6">
            <StatCard
              label="Total Hours"
              value={formatHours(computedSummary.total_hours)}
              icon={<IconClock />}
              color="blue"
            />
            <StatCard
              label="Regular Pay"
              value={formatCurrency(computedSummary.regular_pay)}
              icon={<IconWallet />}
              color="green"
            />
            <StatCard
              label="Overtime Pay"
              value={formatCurrency(computedSummary.overtime_pay)}
              icon={<IconTrendUp />}
              color="amber"
            />
            <StatCard
              label="Total Pay"
              value={formatCurrency(computedSummary.total_pay)}
              icon={<IconWallet />}
              color="purple"
            />
          </div>

          {/* Payroll table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                Payroll Details
                <span className="badge badge-neutral" style={{ marginLeft: '10px' }}>
                  {payrollData.length} {payrollData.length === 1 ? 'record' : 'records'}
                </span>
              </span>
              <button className="btn btn-primary btn-sm" onClick={handleExport}>
                <IconDownload /> Export to Excel
              </button>
            </div>

            {payrollData.length === 0 ? (
              <div className="card-body">
                <div className="empty-state">
                  <IconWallet />
                  <p>No payroll data for the selected period.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {isAdmin && <th>Employee</th>}
                      {isAdmin && <th>Hourly Rate</th>}
                      <th>Total Hours</th>
                      <th>Regular Hours</th>
                      <th>Overtime Hrs</th>
                      <th>Regular Pay</th>
                      <th>Overtime Pay</th>
                      <th>Total Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.map((row, idx) => (
                      <tr key={row.user_id || idx}>
                        {isAdmin && <td className="font-semibold">{row.user_name}</td>}
                        {isAdmin && <td>{formatCurrency(row.hourly_rate)}/hr</td>}
                        <td>{formatHours(row.total_hours)}</td>
                        <td>{formatHours(row.regular_hours)}</td>
                        <td>
                          {row.overtime_hours > 0 ? (
                            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                              {formatHours(row.overtime_hours)}
                            </span>
                          ) : (
                            formatHours(0)
                          )}
                        </td>
                        <td>{formatCurrency(row.regular_pay)}</td>
                        <td>{formatCurrency(row.overtime_pay)}</td>
                        <td>
                          <strong style={{ fontSize: '15px' }}>
                            {formatCurrency(row.total_pay)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {payrollData.length > 1 && (
                    <tfoot>
                      <tr style={{ background: 'var(--bg)', fontWeight: 600 }}>
                        {isAdmin && <td colSpan={isAdmin ? 2 : 1}>Totals</td>}
                        {!isAdmin && <td>Totals</td>}
                        <td>{formatHours(computedSummary.total_hours)}</td>
                        <td></td>
                        <td></td>
                        <td>{formatCurrency(computedSummary.regular_pay)}</td>
                        <td>{formatCurrency(computedSummary.overtime_pay)}</td>
                        <td style={{ fontSize: '15px' }}>
                          {formatCurrency(computedSummary.total_pay)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

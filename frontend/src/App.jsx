import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

// Top-level error boundary: catches any crash and shows the error message
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.setState({ info }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '40px auto' }}>
          <h2 style={{ color: '#dc2626' }}>⚠️ Application Error</h2>
          <p style={{ fontWeight: 700 }}>{this.state.error.message}</p>
          <pre style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Attendance from './pages/Attendance.jsx';
import Payroll from './pages/Payroll.jsx';
import Gamification from './pages/Gamification.jsx';
import Schedule from './pages/Schedule.jsx';
import Absence from './pages/Absence.jsx';
import Documents from './pages/Documents.jsx';
import Messages from './pages/Messages.jsx';
import Training from './pages/Training.jsx';
import Chat from './pages/Chat.jsx';
import AvailableShifts from './pages/AvailableShifts.jsx';
import Users from './pages/admin/Users.jsx';
import Locations from './pages/admin/Locations.jsx';
import Reports from './pages/admin/Reports.jsx';
import Achievements from './pages/admin/Achievements.jsx';
import AbsenceAdmin from './pages/admin/AbsenceAdmin.jsx';
import DocumentAdmin from './pages/admin/DocumentAdmin.jsx';
import NotificationsAdmin from './pages/admin/NotificationsAdmin.jsx';

// -------------------------------------------------------
// Page wrapper — injects Layout with title
// -------------------------------------------------------

function Page({ title, children }) {
  return (
    <Layout pageTitle={title}>
      {children}
    </Layout>
  );
}

// -------------------------------------------------------
// App
// -------------------------------------------------------

export default function App() {
  return (
    <AppErrorBoundary>
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected — all authenticated users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Page title="Dashboard">
                <Dashboard />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkin"
          element={
            <ProtectedRoute>
              <Page title="Check In / Out">
                <CheckIn />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Page title="Attendance">
                <Attendance />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payroll"
          element={
            <ProtectedRoute>
              <Page title="Payroll">
                <Payroll />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/gamification"
          element={
            <ProtectedRoute>
              <Page title="Achievements">
                <Gamification />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <Page title="My Schedule">
                <Schedule />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/available-shifts"
          element={
            <ProtectedRoute>
              <Page title="Available Shifts">
                <AvailableShifts />
              </Page>
            </ProtectedRoute>
          }
        />

        {/* Protected — admin only */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <Page title="Staff Management">
                <Users />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/locations"
          element={
            <ProtectedRoute adminOnly>
              <Page title="Locations">
                <Locations />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute adminOnly>
              <Page title="Reports">
                <Reports />
              </Page>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/achievements"
          element={
            <ProtectedRoute adminOnly>
              <Page title="Achievement Badges">
                <Achievements />
              </Page>
            </ProtectedRoute>
          }
        />

        {/* Employee: absence, documents, messages, training, chat */}
        <Route path="/absence" element={<ProtectedRoute><Page title="My Absences"><Absence /></Page></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Page title="Documents & Policies"><Documents /></Page></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Page title="Messages"><Messages /></Page></ProtectedRoute>} />
        <Route path="/training" element={<ProtectedRoute><Page title="Learning & Development"><Training /></Page></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Page title="AI Assistant"><Chat /></Page></ProtectedRoute>} />

        {/* Admin: absence management, document manager, notifications */}
        <Route path="/admin/absences" element={<ProtectedRoute adminOnly><Page title="Absence Management"><AbsenceAdmin /></Page></ProtectedRoute>} />
        <Route path="/admin/documents" element={<ProtectedRoute adminOnly><Page title="Document Manager"><DocumentAdmin /></Page></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute adminOnly><Page title="Notifications"><NotificationsAdmin /></Page></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
    </AppErrorBoundary>
  );
}

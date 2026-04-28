import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitials } from '../utils/formatters.js';

// -------------------------------------------------------
// SVG Icons
// -------------------------------------------------------

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconSchedule() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconAbsence() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconTraining() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function IconMsg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V5"/><path d="M8 5h8"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// -------------------------------------------------------
// Sidebar component
// -------------------------------------------------------

function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Links shown to everyone (dashboard only for admin too)
  const sharedLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
  ];

  // Employee-only links (not shown to admin)
  const employeeOnlyLinks = [
    { to: '/checkin', label: 'Check In / Out', icon: <IconMapPin /> },
    { to: '/available-shifts', label: 'Available Shifts', icon: <IconStar /> },
    { to: '/schedule', label: 'My Schedule', icon: <IconSchedule /> },
    { to: '/attendance', label: 'My Attendance', icon: <IconCalendar /> },
    { to: '/payroll', label: 'My Payroll', icon: <IconWallet /> },
    { to: '/absence', label: 'Report Absence', icon: <IconAbsence /> },
    { to: '/documents', label: 'Documents', icon: <IconDoc /> },
    { to: '/training', label: 'Training', icon: <IconTraining /> },
    { to: '/messages', label: 'Messages', icon: <IconMsg /> },
    { to: '/chat', label: 'AI Assistant', icon: <IconBot /> },
    { to: '/gamification', label: 'Achievements', icon: <IconTrophy /> },
  ];

  const adminLinks = [
    { to: '/schedule', label: 'Shift Management', icon: <IconSchedule /> },
    { to: '/admin/users', label: 'Staff Management', icon: <IconUsers /> },
    { to: '/admin/locations', label: 'Locations', icon: <IconBuilding /> },
    { to: '/admin/absences', label: 'Absences', icon: <IconAbsence /> },
    { to: '/admin/documents', label: 'Documents', icon: <IconDoc /> },
    { to: '/admin/reports', label: 'Reports', icon: <IconBarChart /> },
    { to: '/admin/achievements', label: 'Achievements', icon: <IconTrophy /> },
    { to: '/admin/notifications', label: 'Notifications', icon: <IconBell /> },
    { to: '/messages', label: 'Messages', icon: <IconMsg /> },
  ];

  const linkClass = ({ isActive }) =>
    `sidebar-nav-item${isActive ? ' active' : ''}`;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}

      <aside className={`app-sidebar${open ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">WMS</div>
          <div>
            <div className="sidebar-logo-text">WMS</div>
            <div className="sidebar-logo-sub">Care Agency</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Dashboard — shown to all */}
          {sharedLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} onClick={onClose}>
              {link.icon}{link.label}
            </NavLink>
          ))}

          {/* Employee-only links */}
          {!isAdmin && employeeOnlyLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} onClick={onClose}>
              {link.icon}{link.label}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: '8px' }}>
                Admin
              </div>
              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={linkClass}
                  onClick={onClose}
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(user?.full_name || user?.username || '?')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.full_name || user?.username}
              </div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={handleLogout}
              title="Sign out"
              style={{ padding: '6px', color: 'var(--sidebar-text)' }}
            >
              <IconLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// -------------------------------------------------------
// Layout wrapper
// -------------------------------------------------------

export default function Layout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleClass = user?.role === 'admin' ? 'admin' : user?.role === 'manager' ? 'manager' : 'employee';

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="topbar-hamburger btn btn-ghost"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <IconMenu />
            </button>
            {pageTitle && (
              <span className="topbar-title">{pageTitle}</span>
            )}
          </div>

          <div className="topbar-right">
            <span className="topbar-user-name">
              {user?.full_name || user?.username}
            </span>
            <span className={`topbar-role-badge ${roleClass}`}>
              {user?.role}
            </span>
            <button
              className="btn btn-ghost"
              onClick={handleLogout}
              title="Sign out"
            >
              <IconLogOut />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

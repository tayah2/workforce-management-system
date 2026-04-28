import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * Wraps routes that require authentication.
 * If adminOnly is true, only admins can access the route.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

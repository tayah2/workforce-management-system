import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { register as apiRegister } from '../api/client.js';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle between 'login' and 'register' views
  const [mode, setMode] = useState('login');

  // Shared fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register-only fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regCode, setRegCode] = useState('');

  // If already logged in, redirect away
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
    return null;
  }

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setRegCode('');
    setError('');
  };

  const switchMode = (next) => {
    resetForm();
    setMode(next);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Create the account, then immediately log in
      await apiRegister({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        role: 'employee',
        registration_code: regCode.trim(),
      });
      await login(username.trim(), password);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-mark">WMS</div>
          <div className="login-app-name">WMS</div>
          <div className="login-subtitle">Care Agency Workforce Management</div>
        </div>

        <h1 className="login-heading">{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
        <p className="login-subheading">
          {mode === 'login'
            ? 'Enter your credentials to access your account'
            : 'Register as a new employee'}
        </p>

        {/* Error */}
        {error && (
          <div className="alert alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  className="form-input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="regCode">
                Company Registration Code
                <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>
              </label>
              <input
                id="regCode"
                type="text"
                className="form-input"
                placeholder="Enter the code provided by your manager"
                value={regCode}
                onChange={(e) => setRegCode(e.target.value)}
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Ask your manager for the company registration code.
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>
          </form>
        )}

        {/* Toggle between modes */}
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px', padding: 0 }}
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px', padding: 0 }}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Demo credentials — only on login */}
        {mode === 'login' && (
          <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            Demo: <strong>admin</strong> / <strong>admin123</strong>&nbsp;&nbsp;or&nbsp;&nbsp;
            <strong>jsmith</strong> / <strong>password123</strong>
          </p>
        )}
      </div>
    </div>
  );
}

import axios from 'axios';

// -------------------------------------------------------
// Axios instance
// -------------------------------------------------------

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// -------------------------------------------------------
// Request interceptor — attach JWT
// -------------------------------------------------------

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------
// Response interceptor — handle 401
// -------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------
// Helper to extract data or throw a clean error
// -------------------------------------------------------

const handle = (promise) =>
  promise.then((res) => res.data).catch((err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred';
    throw new Error(msg);
  });

// -------------------------------------------------------
// Auth
// -------------------------------------------------------

export const login = (username, password) =>
  handle(apiClient.post('/api/auth/login', { username, password }));

export const register = (data) =>
  handle(apiClient.post('/api/auth/register', data));

export const logout = () =>
  handle(apiClient.post('/api/auth/logout'));

export const getMe = () =>
  handle(apiClient.get('/api/auth/me'));

// -------------------------------------------------------
// Attendance / Check-in
// -------------------------------------------------------

export const checkIn = (locationId, latitude, longitude, notes = '') =>
  handle(
    apiClient.post('/api/checkin', {
      location_id: locationId,
      latitude,
      longitude,
      notes,
    })
  );

export const checkOut = (latitude, longitude, breakMinutes = 0) =>
  handle(
    apiClient.post('/api/checkout', {
      latitude,
      longitude,
      break_minutes: breakMinutes,
    })
  );

export const getAttendance = (params = {}) =>
  handle(apiClient.get('/api/attendance', { params }));

export const getCurrentCheckin = () =>
  handle(apiClient.get('/api/attendance/current'));

// -------------------------------------------------------
// Payroll
// -------------------------------------------------------

export const getPayroll = (params = {}) =>
  handle(apiClient.get('/api/payroll', { params }));

export const exportPayroll = (params = {}) => {
  const token = localStorage.getItem('token');
  const queryString = new URLSearchParams(params).toString();
  const url = `http://localhost:5000/api/payroll/export${queryString ? '?' + queryString : ''}`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'payroll.xlsx');
  if (token) {
    // We open in a new tab since we can't set headers on anchor tags
    window.open(url, '_blank');
  } else {
    link.click();
  }
};

// -------------------------------------------------------
// Gamification
// -------------------------------------------------------

export const getGamificationProfile = () =>
  handle(apiClient.get('/api/gamification/profile'));

export const getLeaderboard = () =>
  handle(apiClient.get('/api/gamification/leaderboard'));

export const getBadges = () =>
  handle(apiClient.get('/api/gamification/badges'));

export const getAllBadgesAdmin = () =>
  handle(apiClient.get('/api/gamification/badges/all'));

export const createBadge = (data) =>
  handle(apiClient.post('/api/gamification/badges', data));

export const updateBadge = (id, data) =>
  handle(apiClient.put(`/api/gamification/badges/${id}`, data));

export const deleteBadge = (id) =>
  handle(apiClient.delete(`/api/gamification/badges/${id}`));

// -------------------------------------------------------
// Locations
// -------------------------------------------------------

export const getLocations = () =>
  handle(apiClient.get('/api/locations'));

export const createLocation = (data) =>
  handle(apiClient.post('/api/locations', data));

export const updateLocation = (id, data) =>
  handle(apiClient.put(`/api/locations/${id}`, data));

export const deleteLocation = (id) =>
  handle(apiClient.delete(`/api/locations/${id}`));

// -------------------------------------------------------
// Users
// -------------------------------------------------------

export const getUsers = () =>
  handle(apiClient.get('/api/users'));

export const updateUser = (id, data) =>
  handle(apiClient.put(`/api/users/${id}`, data));

export const deleteUser = (id) =>
  handle(apiClient.delete(`/api/users/${id}`));

// -------------------------------------------------------
// Reports
// -------------------------------------------------------

export const getAttendanceSummary = (params = {}) =>
  handle(apiClient.get('/api/reports/attendance-summary', { params }));

export const getDailyActivity = (params = {}) =>
  handle(apiClient.get('/api/reports/daily-activity', { params }));

export const getLocationAnalytics = (params = {}) =>
  handle(apiClient.get('/api/reports/location-analytics', { params }));

export const getStaffAnalytics = (params = {}) =>
  handle(apiClient.get('/api/reports/staff-analytics', { params }));

export const exportAttendance = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `http://localhost:5000/api/reports/export${queryString ? '?' + queryString : ''}`;
  window.open(url, '_blank');
};

// -------------------------------------------------------
// Shifts / Schedule
// -------------------------------------------------------

export const getShifts = (params = {}) =>
  handle(apiClient.get('/api/shifts', { params }));

export const getOpenShifts = () =>
  handle(apiClient.get('/api/shifts/open'));

export const createShift = (data) =>
  handle(apiClient.post('/api/shifts', data));

export const updateShift = (id, data) =>
  handle(apiClient.put(`/api/shifts/${id}`, data));

export const deleteShift = (id) =>
  handle(apiClient.delete(`/api/shifts/${id}`));

export const claimShift = (id) =>
  handle(apiClient.post(`/api/shifts/${id}/claim`));

export const releaseShift = (id) =>
  handle(apiClient.post(`/api/shifts/${id}/release`));

export const getWeeklyChallenge = () =>
  handle(apiClient.get('/api/gamification/weekly-challenge'));

// -------------------------------------------------------
// Dashboard
// -------------------------------------------------------

export const getDashboardStats = () =>
  handle(apiClient.get('/api/dashboard/stats'));

export default apiClient;

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export function getToken() { return localStorage.getItem('mm_token'); }
export function setToken(token) { localStorage.setItem('mm_token', token); }
export function clearToken() { localStorage.removeItem('mm_token'); localStorage.removeItem('mm_user'); }
export function getStoredUser() { try { return JSON.parse(localStorage.getItem('mm_user') || 'null'); } catch { return null; } }
export function setStoredUser(user) { localStorage.setItem('mm_user', JSON.stringify(user)); }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || 'Something went wrong');
  return data;
}

export const api = {
  cities: () => request('/api/cities'),
  categories: () => request('/api/categories'),
  vendors: (params = {}) => request(`/api/vendors?${new URLSearchParams(params).toString()}`),
  requestOtp: (payload) => request('/api/auth/request-otp', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (payload) => request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
  googleLogin: (payload) => request('/api/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  registerPassword: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  loginPassword: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/me'),
  createVendor: (payload) => request('/api/vendors', { method: 'POST', body: JSON.stringify(payload) }),
  createBooking: (payload) => request('/api/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  customerBookings: () => request('/api/bookings/customer'),
  vendorBookings: () => request('/api/bookings/vendor'),
  updateBookingStatus: (id, status) => request(`/api/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createReview: (payload) => request('/api/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  vendorReviews: (vendorId) => request(`/api/vendors/${vendorId}/reviews`),
};
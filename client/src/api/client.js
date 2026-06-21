import axios from 'axios';

// Local dev: empty -> uses Vite proxy ('/api').
// Production: set VITE_API_URL to the Render backend URL (e.g. https://api.onrender.com).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api = axios.create({ baseURL: `${API_BASE}/api` });

// Attach JWT from localStorage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages but keep the server payload for callers that need it
// (e.g. login -> needsVerification routing).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    const msg = data?.error?.message || err.message || 'Request failed';
    const e = new Error(msg);
    e.response = err.response;
    e.data = data;
    return Promise.reject(e);
  }
);

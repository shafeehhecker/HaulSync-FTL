import axios from 'axios';

// In Docker: VITE_API_URL is empty, so we use a relative baseURL.
// Nginx proxies /api/* → http://backend:5001/api/*
// In dev (npm run dev): Vite proxy handles /api → http://localhost:5001/api
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hs_ftl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hs_ftl_token');
      localStorage.removeItem('hs_ftl_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

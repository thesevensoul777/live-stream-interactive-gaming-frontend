import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.MODE === 'development'
      ? 'http://localhost:5150'
      : 'https://your-production-domain.com',
  timeout: 5000,
});

/**
 * 请求拦截器：自动携带 JWT
 */
api.interceptors.request.use(
  config => {
    const access_token = localStorage.getItem('access_token');
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
export {};

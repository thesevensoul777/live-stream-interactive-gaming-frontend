// src/api/auth.ts
import axios from 'axios'

const baseURL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:5150'    // 开发 HTTP
    : 'https://your-production-domain.com'; // 生产 HTTPS

const api = axios.create({
  baseURL,
  timeout: 5000,
});

export const registerApi = (data: any) => api.post('/auth/register', data);
export const loginApi = (data: any) => api.post('/auth/login', data);

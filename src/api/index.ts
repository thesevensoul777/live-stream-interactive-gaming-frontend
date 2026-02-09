import axios from 'axios';

const api = axios.create({
  // 建议：如果打包后后端地址会变，可以使用环境变量或相对路径
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5150',
  timeout: 8000, // 考虑到直播环境网络波动，建议稍微调大到 8s
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

/**
 * 响应拦截器：处理 401 过期及数据解构
 */
api.interceptors.response.use(
  response => {
    // 如果你希望在组件里少写一层 .data，可以在这里直接返回 response.data
    return response;
  },
  error => {
    // 处理 401 错误（Token 过期或被封禁）
    if (error.response && error.response.status === 401) {
      console.warn('登录状态已失效，正在清理凭证...');
      
      // 1. 清理本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_exp'); // 如果有存过期时间的话
      
      // 2. 如果你在 Electron 中，通知主进程 Token 已失效（可选）
      if ((window as any).auth?.clearToken) {
        (window as any).auth.clearToken();
      }

      // 3. 重定向到登录页（根据你的路由配置）
      // 如果使用 vue-router，建议在这里引入 router 执行 push
      // 或者发送一个全局事件让 App.vue 处理
      window.location.href = '#/login'; 
    }

    return Promise.reject(error);
  }
);

export default api;
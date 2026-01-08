import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Login', component: () => import('../components/LoginForm.vue') },
  { path: '/main', name: 'Main', component: () => import('../views/MainView.vue') },
  { path: '/overlay', name: 'Overlay', component: () => import('../views/Overlay.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// --- 新增：全局路由守卫 ---
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token');
  const exp = localStorage.getItem('token_exp');
  const isTokenValid = token && exp && Date.now() < Number(exp);

  if (to.path === '/') {
    // 如果要去登录页，但本地有有效 Token，直接拦截并转去主页
    if (isTokenValid) {
      next('/main');
    } else {
      next(); // 否则放行去登录
    }
  } else if (to.path === '/main') {
    // 如果要去主页，但没有有效 Token，强制踢回登录页
    if (!isTokenValid) {
      next('/');
    } else {
      next(); // 放行
    }
  } else {
    next(); // 其他路由（如 overlay）直接放行
  }
})

export default router
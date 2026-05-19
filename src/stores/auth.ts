import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { currentUserApi } from '@/api/auth'

export interface CurrentUser {
  id: string
  username: string
  douyinAccount: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)
  const loading = ref(false)

  // 优化：只要本地有 token，我们就暂时认为它是“已认证”状态，直到 fetchCurrentUser 失败
  const isAuthenticated = computed(() => !!user.value || !!localStorage.getItem('access_token'))

  async function fetchCurrentUser() {
    const token = localStorage.getItem('access_token')
    if (!token) {
        user.value = null
        return
    }

    loading.value = true
    try {
      const res = await currentUserApi()
      // 对应你的 ApiResponse<T> 结构：res.data 是包装层，res.data.data 是具体用户
      user.value = res.data.data 
      // 如果 Electron 环境存在，同步 Token
        if ((window as any).auth) {
            (window as any).auth.setToken(token)
        }
     
  
    } catch (err) {
      console.error("验证登录状态失败:", err)
      logout() // 失败则清理掉本地的 30 天过期 Token
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('access_token')
    // 如果有 Hash 路由，跳转到登录
    if ((window as any).auth?.clearToken) {
      (window as any).auth.clearToken()
    }
    window.location.hash = '/'
  }

  return {
    user,
    loading,
    isAuthenticated,
    fetchCurrentUser,
    logout
  }
})

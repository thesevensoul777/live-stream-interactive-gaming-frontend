import { defineStore } from 'pinia'
import { ref } from 'vue'
import { currentUserApi } from '@/api/auth'

export interface CurrentUser {
  id: string
  username: string
  douyinAccount: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {

  const user = ref<CurrentUser | null>(null)
  const loading = ref(false);
  async function fetchCurrentUser() {
    loading.value = true
    try {
      const res = await currentUserApi()
      user.value = res.data.data;
       (window as any).auth.setToken(localStorage.getItem('access_token'))
    } catch (err) {
      user.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_exp')
  }

  return {
    user,
    loading,
    fetchCurrentUser,
    logout
  }
})

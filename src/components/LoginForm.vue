<template>
  <div class="container">
    <div class="form-card">
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>

      <form @submit.prevent="handleSubmit">
        <input class="form-input" v-model.trim="formData.username" type="text" placeholder="账号" required />
        <input class="form-input" v-model="formData.password" type="password" placeholder="密码" required />

        <template v-if="!isLogin">
          <input class="form-input" v-model="formData.confirmPassword" type="password" placeholder="重复密码" required />
          <input class="form-input" v-model.trim="formData.douyin" type="text" placeholder="抖音号" required />
 <input class="form-input" v-model.trim="formData.ActivationCode" type="text" placeholder="账号卡密" required />

          
        </template>

        <div class="btn-group">
          <button type="submit" :disabled="loading" class="primary-btn">
            {{ loading ? '提交中...' : (isLogin ? '登录' : '提交注册') }}
          </button>
          <button type="button" @click="toggleForm" :disabled="loading">
            {{ isLogin ? '去注册' : '返回登录' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { registerApi, loginApi } from '@/api/auth'

const isLogin = ref(true)
const loading = ref(false)

const access_token = localStorage.getItem('access_token');
const exp = localStorage.getItem('token_exp');




// Use reactive for object grouping to simplify state
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  douyin: '',
  ActivationCode:'DY-AGENT-9F3A-K2M8'

})

const emit = defineEmits<{
  (e: 'switch', mode: 'login' | 'register' | 'main'): void
}>()


if (access_token && exp && Date.now() < Number(exp)) {
   emit('switch', 'main');
} 

const toggleForm = () => {
  isLogin.value = !isLogin.value
  // Reset fields using Object.assign
  Object.assign(formData, { username: '', password: '', confirmPassword: '', douyin: '' })
}

const handleSubmit = async () => {
  if (loading.value) return

  // Basic Validation
  if (!formData.username || !formData.password) return alert('请填写账号和密码')
  
  if (!isLogin.value) {
    if (formData.password !== formData.confirmPassword) return alert('密码不一致')
    if (!formData.douyin) return alert('请填写抖音号')
  }

  loading.value = true
  try {
    if (isLogin.value) {
      const response=await loginApi({ 
        username: formData.username, 
        password: formData.password 
      })
      // 2. Validate Response (Depending on your API structure)
    // If your API returns { success: true, token: '...' }
    if (response.data&&response.data.data.accessToken) {
      // 3. Persist Session
      localStorage.setItem('access_token', response.data.data.accessToken);
      localStorage.setItem('token_exp', (Date.now() + 7200 * 1000).toString());

       (window as any).auth.setToken(response.data.data.accessToken)
      // 4. Optional: Update global state (Pinia)
      // authStore.setToken(response.data.token);

      // 5. Navigate to Main
      emit('switch', 'main');
    } else {
      throw new Error('Login response invalid');
    }

      
    } else {
      await registerApi({
        username: formData.username,
        password: formData.password,
        douyinAccount: formData.douyin,
        ActivationCode:formData.ActivationCode
      })
      alert('注册成功')
      toggleForm()
    }
  } catch (err: any) {
    alert(err.response?.data?.message || err.message || '操作失败')
  } finally {
    loading.value = false
  }
}



</script>

<style scoped>
/* Scoped styles kept clean */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #f0f2f5;
}

.form-card {
  width: 90%; /* Better mobile responsiveness */
  max-width: 400px;
  padding: 2.5rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
}

input {
  width: 100%;
  margin-bottom: 1.2rem;
  padding: 0.75rem 1rem;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #409eff;
}

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

button {
  flex: 1;
  padding: 0.75rem 0;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  background: #fff;
  font-weight: 500;
}

.primary-btn {
  background-color: #409eff;
  color: #fff;
  border: none;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}
.form-input{
  width: 90%;
}
</style>
<template>
  <div class="login-inner-container">
    <div class="form-card">
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>

      <form @submit.prevent="handleSubmit">
        <input 
          class="form-input" 
          v-model.trim="formData.username" 
          type="text" 
          placeholder="账号" 
          required 
        />
        <input 
          class="form-input" 
          v-model="formData.password" 
          type="password" 
          placeholder="密码" 
          required 
        />

        <template v-if="!isLogin">
          <input 
            class="form-input" 
            v-model="formData.confirmPassword" 
            type="password" 
            placeholder="重复密码" 
            required 
          />
          <input 
            class="form-input" 
            v-model.trim="formData.douyin" 
            type="text" 
            placeholder="抖音号" 
            required 
          />
          <input 
            class="form-input" 
            v-model.trim="formData.ActivationCode" 
            type="text" 
            placeholder="账号卡密" 
            required 
          />
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router' // 引入路由
import { registerApi, loginApi } from '@/api/auth'

const router = useRouter() // 获取路由实例
const isLogin = ref(true)
const loading = ref(false)

// 响应式数据
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  douyin: '',
  ActivationCode: 'DY-AGENT-9F3A-K2M8'
})

// 自动登录逻辑：放在 onMounted 中确保组件加载后跳转
onMounted(() => {
  const access_token = localStorage.getItem('access_token');
  const exp = localStorage.getItem('token_exp');
  if (access_token && exp && Date.now() < Number(exp)) {
    router.push('/main'); // 使用路由跳转
  }
})

// 切换登录/注册模式
const toggleForm = () => {
  isLogin.value = !isLogin.value
  Object.assign(formData, { 
    username: '', 
    password: '', 
    confirmPassword: '', 
    douyin: '' 
  })
}

const handleSubmit = async () => {
  if (loading.value) return

  // 基础校验
  if (!formData.username || !formData.password) return alert('请填写账号和密码')
  
  if (!isLogin.value) {
    if (formData.password !== formData.confirmPassword) return alert('密码不一致')
    if (!formData.douyin) return alert('请填写抖音号')
  }

  loading.value = true
  try {
    if (isLogin.value) {
      // 执行登录
      const response = await loginApi({ 
        username: formData.username, 
        password: formData.password 
      })

      if (response.data && response.data.data.accessToken) {
        // 保存 Token 和过期时间 (2小时)
        localStorage.setItem('access_token', response.data.data.accessToken);
        localStorage.setItem('token_exp', (Date.now() + 7200 * 1000).toString());

        // 将 Token 传给主进程（IPC）
        if ((window as any).auth) {
          (window as any).auth.setToken(response.data.data.accessToken)
        }
        console.log("dengluchenggong")
        // 使用路由跳转到主界面
        router.push('/main'); 
      } else {
        throw new Error('登录响应数据异常');
      }
    } else {
      // 执行注册
      await registerApi({
        username: formData.username,
        password: formData.password,
        douyinAccount: formData.douyin,
        ActivationCode: formData.ActivationCode
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
/* 关键修改：让最外层容器占据整个屏幕高度，并开启 Flex 居中 */
.login-inner-container {
  width: 100%;
  min-height: 100vh; /* 必须有高度，flex 垂直居中才有效 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center;     /* 垂直居中 */
  background-color: #f0f2f5; /* 加上背景色，让登录框更明显 */
}

.form-card {
  width: 90%; /* 适配小窗口 */
  max-width: 400px;
  padding: 2.5rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  /* 确保在 Electron 窗口大小改变时依然稳定 */
  margin: 20px; 
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-input {
  width: 100%;
  margin-bottom: 1.2rem;
  padding: 0.75rem 1rem;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: border-color 0.2s;
  box-sizing: border-box; 
}

.form-input:focus {
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
  transition: all 0.2s;
}

.primary-btn {
  background-color: #409eff;
  color: #fff;
  border: none;
}

.primary-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
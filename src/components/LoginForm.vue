<template>
  <div class="container">
    <div class="form-card">
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>

      <!-- 登录表单 -->
      <template v-if="isLogin">
        <input v-model="username" type="text" placeholder="账号" />
        <input v-model="password" type="password" placeholder="密码" />
      </template>

      <!-- 注册表单 -->
      <template v-else>
        <input v-model="username" type="text" placeholder="账号" />
        <input v-model="password" type="password" placeholder="密码" />
        <input v-model="confirmPassword" type="password" placeholder="重复密码" />
        <input v-model="douyin" type="text" placeholder="抖音号" />
      </template>

      <div class="btn-group">
        <button @click="isLogin ? onLogin() : onRegister()">
          {{ isLogin ? '登录' : '提交注册' }}
        </button>
        <button @click="toggleForm">
          {{ isLogin ? '注册' : '返回登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { registerApi } from '@/api/auth'

const isLogin = ref(true) // true: 登录，false: 注册

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const douyin = ref('')

const emit = defineEmits<{
  (e: 'switch', mode: 'login' | 'register' | 'main'): void
}>()

const toggleForm = () => {
  isLogin.value = !isLogin.value
  // 切换表单时清空数据
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  douyin.value = ''
}

// 登录逻辑
const onLogin = async () => {
  if (!username.value || !password.value) {
    alert('请填写账号和密码')
    return
  }

  try {
    // TODO: 替换为后端登录接口
    // 例如 await loginApi({ username: username.value, password: password.value })
    alert(`登录成功: ${username.value}`)
    emit('switch', 'main')
  } catch (err: any) {
    alert(err.response?.data || '登录失败')
  }
}

// 注册逻辑
const onRegister = async () => {
  if (!username.value || !password.value || !confirmPassword.value || !douyin.value) {
    alert('请填写完整信息')
    return
  }

  if (password.value !== confirmPassword.value) {
    alert('密码和重复密码不一致')
    return
  }

  try {
    await registerApi({
      username: username.value,
      password: password.value,
      douyinAccount: douyin.value
    })

    alert('注册成功')
    toggleForm() // 切回登录
  } catch (err: any) {
    alert(err.response?.data || '注册失败')
  }
}
</script>

<style scoped>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #f0f2f5;
}

.form-card {
  width: 40vw;
  min-width: 300px;
  max-width: 600px;
  padding: 2rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.form-card h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-card input,
.form-card button {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.btn-group {
  display: flex;
  justify-content: space-between;
}

.btn-group button {
  flex: 1;
  margin: 0 0.3rem;
  padding: 0.6rem 0;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-group button:hover {
  background-color: #66b1ff;
}
</style>

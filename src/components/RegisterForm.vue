<template>
  <div class="form-card">
    <h2>注册</h2>
    <input v-model="username" type="text" placeholder="账号" />
    <input v-model="password" type="password" placeholder="密码" />
    <input v-model="confirmPassword" type="password" placeholder="重复密码" />
    <input v-model="douyin" type="text" placeholder="抖音号" />
    <input v-model="card" type="text" placeholder="卡密" />
    <div class="btn-group">
      <button @click="onRegister">提交注册</button>
      <button @click="$emit('switch', 'login')">返回登录</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const douyin = ref('')
const card = ref('')

const emit = defineEmits<{
  (e: 'switch', mode: 'login' | 'register' | 'main'): void
}>()

const onRegister = () => {
  if (!username.value || !password.value || !confirmPassword.value) {
    alert('请填写完整信息')
    return
  }
  if (password.value !== confirmPassword.value) {
    alert('密码和重复密码不一致')
    return
  }
  alert(`注册成功: ${username.value}`)
  emit('switch', 'login')
}
</script>

<style scoped>
.form-card {
  width: 40vw;      /* 宽度占窗口 40% */
  min-width: 300px; /* 最小宽度 */
  max-width: 600px; /* 最大宽度 */
  padding: 2rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}
.form-card h2{text-align:center;margin-bottom:1.5rem;}
.form-card input{margin-bottom:1rem;padding:0.6rem 1rem;border-radius:5px;border:1px solid #ccc;}
.btn-group{display:flex;justify-content:space-between;}
.btn-group button{flex:1;margin:0 0.3rem;padding:0.6rem 0;background:#409eff;color:white;border:none;border-radius:5px;cursor:pointer;}
.btn-group button:hover{background:#66b1ff;}
</style>

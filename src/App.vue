<template>
  <div class="container" :class="{ center: mode !== 'main' }">
    <LoginForm v-if="mode !== 'main'" @switch="handleSwitch" />
    <MainView v-else />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import MainView from './views/MainView.vue'

const mode = ref<'login' | 'register' | 'main'>('login')

const handleSwitch = (newMode: 'login' | 'register' | 'main') => {
  mode.value = newMode
}
</script>
<style scoped> html, body, #app { margin: 0; padding: 0; width: 100%; height: 100%; } .container { display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh; background-color: #f0f2f5; } .form-card { width: 40vw; min-width: 300px; max-width: 600px; padding: 2rem; background: white; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); } .form-card h2 { text-align: center; margin-bottom: 1.5rem; } .form-card input, .form-card button { width: 100%; box-sizing: border-box; margin-bottom: 1rem; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 5px; border: 1px solid #ccc; } .btn-group { display: flex; justify-content: space-between; } .btn-group button { flex: 1; margin: 0 0.3rem; padding: 0.6rem 0; background-color: #409eff; color: white; border: none; border-radius: 5px; cursor: pointer; } .btn-group button:hover { background-color: #66b1ff; } </style>
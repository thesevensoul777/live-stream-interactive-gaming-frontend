<template>
  <div
    class="container"
    :class="{ center: mode !== 'main' }"
  >
    <LoginForm v-if="mode === 'login'" />
    <RegisterForm v-else-if="mode === 'register'" />
    <MainView v-else />
  </div>
</template>


<script lang="ts" setup>
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import MainView from './views/MainView.vue'

const mode = ref<'login' | 'register' | 'main'>('main')


</script>

<style>
.container {
  width: 100%;
  height: 100%;
  background-color: #f0f2f5;
}





</style>

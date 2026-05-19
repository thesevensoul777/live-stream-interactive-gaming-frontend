<template>
  <div class="main-layout">
    
    <MainSelector
      :active="currentGame"
      @change="currentGame = $event"
    />

    <div class="content">
      <TopControlPanel />

      <RecordTable />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 导入组件
import MainSelector from '@/views/sidebar/MainSelector.vue'
import TopControlPanel from '@/views/panels/TopControlPanel.vue'
import RecordTable from '@/views/panels/RecordTable.vue'

const router = useRouter()
const authStore = useAuthStore()
const currentGame = ref<'war3' | 'sc'>('war3')

onMounted(async () => {
  // 1. 验证登录状态：如果 Token 没了，直接踢回登录页
  const token = localStorage.getItem('access_token')
  if (!token) {
    router.push('/')
    return
  }

  // 2. 获取当前登录用户信息
  try {
    await authStore.fetchCurrentUser()
  } catch (e) {
    console.error('获取当前用户失败', e)
    // 如果获取用户失败（比如 Token 过期），清除并跳转
    localStorage.removeItem('access_token')
    router.push('/')
  }
})
</script>

<style scoped>
/* 撑满全屏，左右布局 */
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: #ffffff; /* 管理后台保持简洁白色背景 */
  overflow: auto;
}

/* 右侧内容容器 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;     
  box-sizing: border-box;
  background-color: #f0f2f5; /* 略显深色的背景色，区分左侧导航 */
}

/* 确保底部表格能占满剩余空间 */
:deep(.record-table) {
  flex: 1;
  overflow: hidden;
}
</style>

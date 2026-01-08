<template>
  <router-view />
</template>

<script lang="ts" setup>
// 这里不再需要 mode 变量和 handleSwitch 函数
</script>

<style>
/* 全局样式移除非局部 (scoped) 限制，确保铺满整个 Electron 窗口 */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

/* 移除原来在这里的 .container 背景色，因为绿幕窗口不需要灰色背景 */
</style>
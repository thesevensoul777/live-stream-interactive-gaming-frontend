<template>
  <div class="sidebar">
    <div
      class="item"
      :class="{ active: active === 'war3' }"
      @click="$emit('change', 'war3')"
    >
      魔兽争霸
    </div>

    <div
      class="item"
      :class="{ active: active === 'sc' }"
      @click="$emit('change', 'sc')"
    >
      星际争霸
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active: 'war3' | 'sc'
}>()

defineEmits<{
  (e: 'change', val: 'war3' | 'sc'): void
}>()
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #1f1f1f;
  color: #fff;
  padding: 10px;
}

.item {
  padding: 12px;
  cursor: pointer;
}

.item.active {
  background: #409eff;
}
</style>

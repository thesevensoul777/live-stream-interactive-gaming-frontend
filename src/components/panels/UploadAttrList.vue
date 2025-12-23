<script setup lang="ts">
import { ref } from 'vue'

interface AttrItem {
  key: string
  value: string
}

const attrs = ref<AttrItem[]>([
  { key: '房间ID', value: '91375314576' },
  { key: '主播名称', value: '某某主播' },
  { key: '游戏类型', value: '魔兽争霸' },
  { key: '监听状态', value: '运行中' },
])
</script>

<template>
  <div class="attr-wrapper">
    <div class="title">上传属性</div>

    <table>
      <thead>
        <tr>
          <th>属性</th>
          <th>值</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in attrs" :key="item.key">
          <td>{{ item.key }}</td>
          <td>{{ item.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.attr-wrapper {
  height: 100%;
  border: 1px solid #333;
  background: #121212;
  color: #ddd;
  font-size: 13px;
}

.title {
  padding: 6px;
  background: #1f1f1f;
  color: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 6px;
  border-bottom: 1px solid #333;
}

th {
  background: #181818;
  text-align: left;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface AttrItem {
  key: string
  value: string
}

const { t } = useI18n()

const attrs = computed<AttrItem[]>(() => [
  { key: t('uploadAttrs.roomId'), value: '91375314576' },
  { key: t('uploadAttrs.anchorName'), value: t('uploadAttrs.sampleAnchor') },
  { key: t('uploadAttrs.gameType'), value: t('uploadAttrs.warcraft') },
  { key: t('uploadAttrs.monitorStatus'), value: t('uploadAttrs.running') },
])
</script>

<template>
  <div class="attr-wrapper">
    <div class="title">{{ t('uploadAttrs.title') }}</div>

    <table>
      <thead>
        <tr>
          <th>{{ t('uploadAttrs.attribute') }}</th>
          <th>{{ t('uploadAttrs.value') }}</th>
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

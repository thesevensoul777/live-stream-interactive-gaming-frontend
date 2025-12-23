<template>
   <div class="table-wrapper"> 

  <table class="table">
    <thead>
      <tr>
        <th>赠送人</th>
        <th>礼物</th>
        <th>数量</th>
        <th>音浪</th>
        <th>时间</th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="item in casts" :key="item.time">
        <td>{{ item.user?.name }}</td>
        <td>{{ item.gift?.name }}</td>
        <td>{{ item.gift?.count }}</td>
        <td>{{ item.gift?.price }}</td>
        <td>{{ item.time ? formatTime(item.time) : '' }}</td> 
      </tr>
    </tbody>
  </table>
  </div>
</template>

<script setup lang="ts">

import { useDanmuStore } from '@/components/composables/DanmuData'
import { watch,onMounted } from 'vue'
import type { CastType } from '@/components/CastTypeBtn/type';
import { CastMethod, type DyMessage } from '@/core/dycast';
import { ref } from 'vue';

const { allCasts, mainCasts } = useDanmuStore()


/** 显示弹幕 */
const casts = ref<DyMessage[]>([]);



// 类型控制器
const typeMap: Map<CastMethod, boolean> = new Map();


/**
 * 设置弹幕类型显隐状态
 * @param type
 * @param flag
 */
const setCastType = function (type: CastType, flag?: boolean) {
  switch (type) {
    case 'chat':
      typeMap.set(CastMethod.CHAT, !!flag);
      typeMap.set(CastMethod.EMOJI_CHAT, !!flag);
      break;
    case 'gift':
      typeMap.set(CastMethod.GIFT, !!flag);
      break;
    case 'like':
      typeMap.set(CastMethod.LIKE, !!flag);
      break;
    case 'social':
      typeMap.set(CastMethod.SOCIAL, !!flag);
      break;
    case 'member':
      typeMap.set(CastMethod.MEMBER, !!flag);
      break;
  }
};

// script setup
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
};



/**
 * 设置弹幕显示
 */
const addCasts = function (msgs: DyMessage[], isClear: boolean = false) {
  const list: DyMessage[] = msgs.filter(item => {
    if (item.method) return !!typeMap.get(item.method);
    else return false;
  });
  if (isClear) casts.value = list;
  else casts.value.push(...list);

};


watch(mainCasts, (newVal) => {
  addCasts(mainCasts.value);

}, { deep: true, immediate: true })

onMounted(() => {
  setCastType("gift", true);

});


</script>

<style scoped>
  .table-wrapper {
  height: 300px;          /* 固定高度，可按你页面改 */
  overflow-y: auto;       /* 纵向滚动 */
  border: 1px solid #ddd;
}

.table-wrapper {
  height: 300px;          /* 固定高度，可按你页面改 */
  overflow-y: auto;       /* 纵向滚动 */
  border: 1px solid #ddd;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 6px;
  text-align: center;
  white-space: nowrap;    /* 防止内容换行撑高 */
}

</style>

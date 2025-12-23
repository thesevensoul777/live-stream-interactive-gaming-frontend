<template>
  <div class="main-layout">
    
    <!-- 左侧选择 -->
    <MainSelector
      :active="currentGame"
      @change="currentGame = $event"
    />

    <!-- 右侧内容 -->
    <div class="content">
      <!-- 顶部控制区 -->
      <TopControlPanel />

      <!-- 中部 -->
      <div class="middle">
        <DanmuList  :types="['social', 'like', 'member','chat', 'gift']" />
        <!-- <UploadAttrList /> -->
      </div>

      <!-- 底部表格 -->
      <RecordTable />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'



import MainSelector from '@/components/sidebar/MainSelector.vue'
import TopControlPanel from '@/components/panels/TopControlPanel.vue'
import DanmuList from '@/components/panels/DanmuList.vue'
import RecordTable from '@/components/panels/RecordTable.vue'
import UploadAttrList from '@/components/panels/UploadAttrList.vue'

const currentGame = ref<'war3' | 'sc'>('war3')
</script>

<style scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;

  padding: 16px;     
  box-sizing: border-box;
}

.middle {
  display: flex;
  gap: 16px;          
  margin: 16px 0;     
  padding: 16px;      
  height: 40%;
  width: 65%;
  background: #f7f7f7;  
  border-radius: 8px;   
}

</style>

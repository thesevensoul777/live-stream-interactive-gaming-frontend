<template>
  <div class="rank-entry-overlay">
    <transition name="rank-zoom">
      <div v-if="activeEntry" :key="activeEntry.id" class="entry-inner-box">
        
        <div v-if="activeEntry.rank <= 3" class="special-rank-center-fix">
          <div class="special-rank-card">
            <div class="card-glow"></div>
            <div class="avatar-container">
              <img :src="RANK_FRAMES[activeEntry.rank - 1]" class="frame-effect" />
              <img :src="activeEntry.avatar" class="user-avatar" />
            </div>
            <div class="rank-info">
              <div class="rank-text">{{ t('overlay.worldRank', { rank: activeEntry.rank }) }}</div>
              <div class="user-name">{{ activeEntry.user }}</div>
            </div>
          </div>
        </div>

        <div 
          v-else 
          class="normal-rank-card"
          :style="{ top: activeEntry.posY + 'px', left: activeEntry.posX + 'px' }"
        >
          <div class="avatar-container-small">
            <img :src="otherRankFrame" class="frame-other" />
            <img :src="activeEntry.avatar" class="user-avatar-small" />
            <div class="mini-rank-tag">No.{{ activeEntry.rank }}</div>
          </div>
          <div class="small-info">
            <div class="small-top">
              <span class="small-name">{{ activeEntry.user }}</span>
              <span class="small-label">{{ t('overlay.arrived') }}</span>
            </div>
            <div class="small-rank-text">{{ t('overlay.worldRank', { rank: activeEntry.rank }) }}</div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import rank1Frame from '@/assets/ranks/1.webp'
import rank2Frame from '@/assets/ranks/2.webp'
import rank3Frame from '@/assets/ranks/3.webp'
import otherRankFrame from '@/assets/ranks/otherRank.png'
import { useI18n } from 'vue-i18n'

// --- 变量声明置顶 ---
const { t } = useI18n()
const RANK_FRAMES = [rank1Frame, rank2Frame, rank3Frame]
const activeEntry = ref<any>(null)
const queue: any[] = [] 
let isProcessing = false

/**
 * 循环处理队列中的入场
 */
const showNext = () => {
  if (queue.length === 0) {
    isProcessing = false
    activeEntry.value = null
    return
  }
  isProcessing = true
  activeEntry.value = queue.shift()
  
  // 停留展示时间：统一 3 秒
  setTimeout(() => {
    activeEntry.value = null
    setTimeout(showNext, 500)
  }, 3000)
}

/**
 * 外部推送接口
 */
const push = (item: any) => {
  // [2026-02-25] 语法检查：变量置顶
  const entry = {
    ...item,
    id: Date.now() + Math.random(),
    // 随机位置计算
    posX: Math.random() * (window.innerWidth - 350) + 100,
    posY: Math.random() * (window.innerHeight - 450) + 200
  }
  queue.push(entry)
  if (!isProcessing) showNext()
}

defineExpose({ push })
</script>

<style scoped>
/* 基础全屏容器 */
.rank-entry-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.entry-inner-box {
  position: absolute;
  inset: 0;
}

/* --- 1-3名 样式保持之前的完美方案 --- */
.special-rank-center-fix {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.special-rank-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  will-change: transform, opacity;
}

.avatar-container {
  position: relative;
  width: 260px;
  height: 260px;
  margin-bottom: 25px;
}

.frame-effect {
  position: absolute;
  inset: -50px;
  width: calc(100% + 100px);
  z-index: 2;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.7));
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid rgba(255, 215, 0, 0.4);
}

.rank-text { color: gold; font-size: 24px; font-weight: bold; text-shadow: 0 0 15px black; }
.user-name { color: white; font-size: 36px; font-weight: 900; text-shadow: 0 4px 10px rgba(0,0,0,0.8); }

/* --- 4-20名 样式优化 --- */
.normal-rank-card {
  position: absolute;
  display: flex;
  align-items: center;
  background: rgba(10, 10, 12, 0.9);
  backdrop-filter: blur(8px);
  padding: 12px 24px;
  border-radius: 60px 20px 60px 60px;
  border: 1px solid rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 25px rgba(0,0,0,0.8);
  will-change: transform, opacity;
}

.avatar-container-small { 
  position: relative; 
  width: 64px; 
  height: 64px; 
  margin-right: 15px; 
}
.frame-other { position: absolute; inset: -8px; width: 125%; z-index: 2; }
.user-avatar-small { width: 100%; height: 100%; border-radius: 50%; border: 2px solid gold; }

/* 迷你排名标签（头像下方悬浮） */
.mini-rank-tag {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #ffed4a 0%, #d4af37 100%);
  color: #000;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 6px;
  border-radius: 8px;
  z-index: 3;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.small-info { display: flex; flex-direction: column; gap: 2px; }
.small-top { display: flex; align-items: baseline; }
.small-name { color: white; font-weight: 900; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.small-label { color: rgba(255, 215, 0, 0.8); font-size: 13px; margin-left: 8px; font-weight: bold; }

/* 名字下方的排名细字 */
.small-rank-text {
  color: #ffd700;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
}

/* --- 动画：彻底解决跳动 --- */
.rank-zoom-enter-active {
  animation: rank-pure-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.rank-zoom-leave-active {
  animation: rank-pure-out 0.4s ease-in forwards;
}

@keyframes rank-pure-in {
  from { opacity: 0; transform: scale(0.3); filter: blur(10px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}

@keyframes rank-pure-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.8); filter: blur(15px); }
}
</style>

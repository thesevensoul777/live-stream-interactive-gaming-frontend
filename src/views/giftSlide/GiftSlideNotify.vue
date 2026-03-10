<template>
  <div :class="['notify-container', direction === 1 ? 'pos-left' : 'pos-right']">
    <transition-group :name="direction === 1 ? 'mini-slide-left' : 'mini-slide-right'">
      <div 
        v-for="item in queue" 
        :key="item.id" 
        :class="['notify-bubble', item.type.toLowerCase()]"
      >
        <div class="fire-glow"></div>
        
        <div class="sender-avatar">
          <img :src="item.avatar || defaultAvatar" />
          <div class="fire-ring"></div>
        </div>

        <div class="notify-text">
          <div class="user-info">
            <span class="user-name">{{ item.user }}</span>
            <span class="action-text">{{ item.label }}</span>
          </div>
          <div class="content-info">
            <span class="content-name">{{ item.content }}</span>
          </div>
        </div>

        <div class="notify-count animate-punch">
          <span class="count-x">{{ item.type === 'GIFT' ? 'x' : '❤' }}</span>
          <span class="count-num">{{ item.count }}</span>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import defaultAvatar from '@/assets/images/default-avatar.png';
const props = defineProps<{
  direction: 1 | 2; 
}>()


const queue = ref<any[]>([])

const push = (item: any) => {
  // 1. 限制队列长度（防止堆叠过多）
  if (queue.value.length >= 10) {
    queue.value.shift()
  }
  
  // 2. 将消息推入显示队列
  queue.value.push(item)

  // 3. 💡 核心逻辑：根据 type 设置不同的消失时间
  // GIFT 停留 4000ms (4秒)，其他（如 LIKE）停留 1000ms (1秒)
  const duration = item.type === 'GIFT' ? 5000 : 2000;

  setTimeout(() => {
    // 移除当前这条 ID 对应的消息
    queue.value = queue.value.filter(i => i.id !== item.id)
  }, duration)
}

defineExpose({ push })
</script>

<style scoped>
/* --- 容器布局：定位在 2/3 高度 --- */
.notify-container {
  position: absolute;
  top: 66%;
  display: flex;
  flex-direction: column-reverse; /* 新消息在底部，往上堆叠 */
  gap: 6px;
  width: 240px; /* 宽度显著缩小 */
  z-index: 100;
  pointer-events: none;
}

.pos-left { left: 15px; align-items: flex-start; }
.pos-right { right: 15px; align-items: flex-end; }

/* --- 气泡主体：轻量化设计 --- */
.notify-bubble {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(10, 10, 12, 0.9);
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 4px 20px 20px 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 160px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}

/* --- 火焰特效 (微缩化) --- */
.fire-glow {
  position: absolute;
  bottom: -1px;
  left: 15%;
  width: 70%;
  height: 2px;
  filter: blur(4px);
  opacity: 0.6;
}
.gift .fire-glow { background: #ffae00; box-shadow: 0 0 8px #ffae00; }
.like .fire-glow { background: #ff0055; box-shadow: 0 0 8px #ff0055; }

/* --- 头像 (从 40px 缩小至 26px) --- */
.sender-avatar {
  position: relative;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}
.sender-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
  z-index: 2;
}
.fire-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, #ff4500, #ffae00, transparent);
  animation: rotateFire 2s linear infinite;
}

/* --- 文字排版 (极致精简) --- */
.notify-text {
  margin-left: 8px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  overflow: hidden;
}
.user-name {
  color: #eee;
  font-weight: 600;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-text {
  color: rgba(255,255,255,0.5);
  font-size: 9px;
  margin-left: 4px;
}
.content-name {
  color: #ffae00;
  font-size: 12px;
  font-weight: 800;
  text-shadow: 0 0 5px rgba(255, 174, 0, 0.3);
}

/* --- 数字展示 (从 28px 缩小至 18px) --- */
.notify-count {
  margin-left: 6px;
  display: flex;
  align-items: baseline;
}
.count-x {
  font-size: 11px;
  font-weight: 900;
  color: #ff4500;
}
.count-num {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  filter: drop-shadow(0 0 3px rgba(255, 69, 0, 0.8));
}

/* --- 动画优化 --- */
@keyframes rotateFire { to { transform: rotate(360deg); } }

/* 进场：从下方弹出并轻微放大 */
.mini-slide-left-enter-active, .mini-slide-right-enter-active {
  animation: mini-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
/* 左侧容器：从左边 (-30px) 淡淡滑入 */
.mini-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.mini-slide-left-enter-active {
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.mini-slide-left-enter-to {
  opacity: 1;
  transform: translateX(0);
}

/* 右侧容器：从右边 (30px) 淡淡滑入 */
.mini-slide-right-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.mini-slide-right-enter-active {
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.mini-slide-right-enter-to {
  opacity: 1;
  transform: translateX(0);
}
/* 退场：向侧边滑出并淡出 */
.mini-slide-left-leave-active { 
  animation: mini-out-left 0.6s ease-in forwards; 
}

/* 右边容器的退场：向右滑出 */
.mini-slide-right-leave-active { 
  animation: mini-out-right 0.6s ease-in forwards; 
}
/* 向左滑出屏幕 (X 轴负方向) */
@keyframes mini-out-left { 
  to { 
    transform: translateX(-100px); /* 负值：向左 */
    opacity: 0; 
    filter: blur(4px);
  } 
}

/* 向右滑出屏幕 (X 轴正方向) */
@keyframes mini-out-right { 
  to { 
    transform: translateX(100px); /* 正值：向右 */
    opacity: 0; 
    filter: blur(4px);
  } 
}

.animate-punch { animation: punch 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes punch {
  0% { transform: scale(0.8); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>
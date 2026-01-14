<template>
  <div :class="['notify-container', direction === 1 ? 'pos-left' : 'pos-right']">
    <transition-group :name="direction === 1 ? 'slide-left' : 'slide-right'">
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

const props = defineProps<{
  direction: 1 | 2; 
}>()

const defaultAvatar = 'https://via.placeholder.com/50'
const queue = ref<any[]>([])

const push = (item: any) => {
  if (queue.value.length >= 5) {
    queue.value.shift()
  }
  queue.value.push(item)

  setTimeout(() => {
    queue.value = queue.value.filter(i => i.id !== item.id)
  }, 5000)
}

defineExpose({ push })
</script>

<style scoped>
/* --- 整体尺寸缩小 (约 3/4) --- */
.notify-container {
  position: absolute;
  top: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px; /* 间距缩小 */
  width: 340px; /* 原 450 -> 340 */
  z-index: 100;
  pointer-events: none;
}

.pos-left { left: 20px; align-items: flex-start; }
.pos-right { right: 20px; align-items: flex-end; }

/* --- 气泡主体 --- */
.notify-bubble {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(10, 10, 12, 0.85);
  backdrop-filter: blur(8px);
  padding: 6px 15px; /* 缩小 Padding */
  border-radius: 8px 40px 40px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 240px; /* 原 320 -> 240 */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
  overflow: visible; /* 允许火焰溢出 */
}

/* --- 火焰特效核心 --- */
.fire-glow {
  position: absolute;
  bottom: -2px;
  left: 10%;
  width: 80%;
  height: 4px;
  background: #ff4500;
  filter: blur(8px);
  border-radius: 50%;
  opacity: 0.8;
  animation: flicker 1.5s infinite alternate;
}

.gift .fire-glow { background: #ffae00; box-shadow: 0 0 15px #ffae00; }
.like .fire-glow { background: #ff0055; box-shadow: 0 0 15px #ff0055; }

@keyframes flicker {
  0% { transform: scaleX(1) translateY(0); opacity: 0.6; filter: blur(6px); }
  100% { transform: scaleX(1.1) translateY(-2px); opacity: 1; filter: blur(10px); }
}

/* --- 头像与火焰环 --- */
.sender-avatar {
  position: relative;
  width: 40px; /* 原 54 -> 40 */
  height: 40px;
  flex-shrink: 0;
}

.sender-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  position: relative;
  z-index: 2;
}

.fire-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, #ff4500, #ffae00, transparent);
  animation: rotateFire 2s linear infinite;
  filter: blur(1px);
}

@keyframes rotateFire {
  to { transform: rotate(360deg); }
}

/* --- 文字排版缩小 --- */
.notify-text {
  margin-left: 10px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  color: #eee;
  font-weight: 600;
  font-size: 13px; /* 缩小字体 */
}

.action-text {
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  margin-left: 5px;
}

.content-name {
  color: #ffae00;
  font-size: 15px; /* 缩小字体 */
  font-weight: 800;
  text-shadow: 0 0 8px rgba(255, 174, 0, 0.4);
}

/* --- 数字缩小与发光 --- */
.notify-count {
  margin-left: 8px;
  display: flex;
  align-items: baseline;
}

.count-x {
  font-size: 16px;
  font-weight: 900;
  color: #ff4500;
}

.count-num {
  font-size: 28px; /* 原 36 -> 28 */
  font-weight: 900;
  font-family: 'Arial Black', sans-serif;
  color: #fff;
  filter: drop-shadow(0 0 4px rgba(255, 69, 0, 0.8));
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.2);
}

/* --- 进出场动画 --- */
.slide-left-enter-active { animation: in-left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.slide-left-leave-active { animation: out-left 0.4s ease-in forwards; }

@keyframes in-left {
  from { transform: translateX(-50%) translateY(20px) rotate(-5deg); opacity: 0; }
  to { transform: translateX(0) translateY(0) rotate(0); opacity: 1; }
}

@keyframes out-left {
  to { transform: translateX(-100%) scale(0.9); opacity: 0; filter: blur(5px); }
}

.animate-punch {
  animation: punch 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes punch {
  0% { transform: scale(0.7); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
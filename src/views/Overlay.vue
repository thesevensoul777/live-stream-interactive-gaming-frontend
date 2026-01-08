<template>
  <div class="green-screen-wrapper">
    
    <div class="top-rank-bar">
      <div v-for="(user, index) in topThree" :key="index" :class="['rank-slot', `rank-${index + 1}`]">
        <div class="avatar-box">
          <img :src="user.avatar || defaultAvatar" class="avatar-img" />
          <span class="rank-tag">{{ index + 1 }}</span>
        </div>
        <div class="user-meta">
          <div class="nickname">{{ user.nickname }}</div>
          <div class="score">{{  0 }} pts</div>
        </div>
      </div>
    </div>

    <div class="gift-safe-zone">
      <transition-group name="gift-list">
        <div 
          v-for="gift in giftQueue" 
          :key="gift.id" 
          class="gift-bubble"
        >
          <div class="sender-avatar">
            <img :src="gift.avatar || defaultAvatar" />
          </div>
          <div class="gift-text">
            <span class="user-name">{{ gift.user }}</span>
            <span class="action">送出</span>
            <span class="gift-name">{{ gift.giftName }}</span>
          </div>
          <div class="gift-count">x{{ gift.count }}</div>
        </div>
      </transition-group>
    </div>

    <transition name="zoom">
      <div v-if="showRankList" class="full-rank-overlay">
        <div class="rank-panel">
          <div class="panel-header">🏆 战功赫赫 (TOP 10)</div>
          <div class="list-body">
            <div v-for="(item, i) in fullRanks" :key="i" class="list-item">
              <span class="num">{{ i + 1 }}</span>
              <img :src="item.avatar || defaultAvatar" />
              <span class="name">{{ item.nickname }}</span>
              <span class="points">{{ item.totalScore }}</span>
            </div>
          </div>
          <div class="panel-footer">松开 TAB 返回游戏</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface GiftItem {
  id: string | number
  user: string
  avatar: string
  giftName: string
  count: number
}

const defaultAvatar = 'https://via.placeholder.com/50'
const giftQueue = ref<GiftItem[]>([])
const showRankList = ref(false)
const topThree = ref<any[]>([])
const fullRanks = ref<any[]>([])

// 处理礼物进入
const handleNewGift = (payload: any) => {
  const { detail, ranks } = payload
  
  if (ranks) {
    fullRanks.value = ranks
    topThree.value = ranks.slice(0, 3)
  }

  const newGift: GiftItem = {
    id: Date.now() + Math.random(),
    user: detail.user || detail.nickname,
    avatar: detail.avatar,
    giftName: detail.giftName || detail.gift?.name,
    count: detail.count || detail.gift?.count || 1
  }

  // 限制同时显示的礼物数量，防止刷屏
  if (giftQueue.value.length > 5) {
    giftQueue.value.shift();
  }
  
  giftQueue.value.push(newGift)

  setTimeout(() => {
    giftQueue.value = giftQueue.value.filter(g => g.id !== newGift.id)
  }, 5000)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    showRankList.value = true
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Tab') showRankList.value = false
}

onMounted(() => {

  // 增加安全检查
  if ((window as any).electron && (window as any).electron.ipcRenderer) {
     (window as any).ipcRenderer.on('on-new-gift', handleNewGift)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  } else {
    console.error("检测到 window.electron 未定义。这通常是 Preload 脚本加载失败导致的。");
  }

  

})

onUnmounted(() => {
  (window as any).ipcRenderer.removeAllListeners('on-new-gift')
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
/* 1. 基础容器：OBS采集建议开启色度键扣除绿色 */
.green-screen-wrapper {
  width: 100vw;
  height: 100vh;
  background-color: #00ff00; /* 纯绿幕 */
  color: white;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow: hidden;
  position: relative;
}

/* 2. 顶部前三横条 */
.top-rank-bar {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}
.rank-slot { display: flex; align-items: center; gap: 10px; }
.avatar-box { position: relative; }
.avatar-img { width: 45px; height: 45px; border-radius: 50%; border: 2px solid gold; }
.rank-tag { position: absolute; bottom: -5px; right: -5px; background: gold; color: black; font-size: 10px; padding: 0 4px; border-radius: 4px; font-weight: bold; }
.user-meta .nickname { font-size: 14px; font-weight: bold; }
.user-meta .score { font-size: 12px; color: #ffd700; }

/* 3. 礼物安全区：建议直播截取这一块 */
.gift-safe-zone {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.gift-bubble {
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);
  padding: 8px 20px;
  border-radius: 40px;
  border-left: 4px solid #ffd700;
  width: 100%;
  box-sizing: border-box;
}

.sender-avatar img { width: 40px; height: 40px; border-radius: 50%; }
.gift-text { flex: 1; margin-left: 12px; font-size: 16px; }
.user-name { color: #87ceeb; font-weight: bold; margin-right: 5px; }
.gift-name { color: #ffd700; font-weight: bold; margin-left: 5px; }
.gift-count { font-size: 24px; font-style: italic; color: #ff4500; font-weight: 900; text-shadow: 2px 2px 0 #fff; }

/* 4. 礼物列表动画：从下方滑入并弹动 */
.gift-list-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gift-list-leave-active {
  transition: all 0.5s ease;
}
.gift-list-enter-from { opacity: 0; transform: scale(0.5) translateY(100px); }
.gift-list-leave-to { opacity: 0; transform: translateX(100px); }

/* 5. 全屏榜单 (Tab) */
.full-rank-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.rank-panel {
  width: 400px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  overflow: hidden;
}
.panel-header { background: #333; padding: 15px; text-align: center; color: gold; font-weight: bold; }
.list-item { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid #222; }
.list-item img { width: 30px; height: 30px; border-radius: 50%; margin: 0 15px; }
.list-item .name { flex: 1; }
.list-item .points { color: gold; }
.panel-footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }

/* 缩放动画 */
.zoom-enter-active, .zoom-leave-active { transition: all 0.2s ease; }
.zoom-enter-from, .zoom-leave-to { opacity: 0; transform: scale(0.9); }
</style>
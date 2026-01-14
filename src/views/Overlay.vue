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
          <div class="score">{{ user.totalScore || 0 }} pts</div>
        </div>
      </div>
    </div>

    <GiftSlideNotify ref="leftNotify" :direction="1" />
    <GiftSlideNotify ref="rightNotify" :direction="2" />

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
import { useDanmuStore } from '@/components/composables/DanmuData'
import GiftSlideNotify from '@/components/giftSlide/GiftSlideNotify.vue'
import type { GifddDTO, LikeDTO } from "@/types/danmu"

// --- 数据与状态 ---
const { currentPlay } = useDanmuStore()
const defaultAvatar = 'https://via.placeholder.com/50'

const leftNotify = ref()
const rightNotify = ref()
const showRankList = ref(false)
const topThree = ref<any[]>([])
const fullRanks = ref<any[]>([])
let cleanup: any = null

// --- 核心业务：拦截与分发 ---
const processNotification = (payload: any, type: 'GIFT' | 'LIKE') => {
  // 兼容数据结构 (如果是从 IPC 传过来的 payload 包含 ranks)
  const data = payload.detail || payload;
  if (payload.ranks) {
    fullRanks.value = payload.ranks;
    topThree.value = payload.ranks.slice(0, 3);
  }

  if (!data.realId) return;

  // 1. 查询该用户是否在 currentPlay 中 (之前发过 1 或 2)
  const player = currentPlay.value.find(p => p.realId === data.realId);

  // 💡 只有在列表中的人送礼/点赞才显示特效
  if (!player) {
    console.log(`[Overlay] 拦截路人 ${data.user} 的消息`);
    return;
  }
  // 2. 构造显示对象
  const notification = {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random()}`,
    type: type,
    user: data.user || player.user,
    avatar: data.avatar || player.avatar,
    label: type === 'GIFT' ? '送出' : '点赞了',
    content: type === 'GIFT' ? (data.giftName || '礼物') : '直播间',
    count: type === 'GIFT' ? (data.count || 1) : (data.likeCount || 1)
  }

  // 3. 根据玩家之前的指令内容分发方向
  if (player.content === '1') {
    leftNotify.value?.push(notification);
  } else if (player.content === '2') {
    rightNotify.value?.push(notification);
  }
}

// --- 按键监听 ---
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    showRankList.value = true;
  }
}
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Tab') showRankList.value = false;
}

// --- 生命周期 ---
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);



// 2. 监听玩家列表同步 (关键：确保特效能匹配到人)

    (window as any).electronAPI.onSyncPlayers((players: any[]) => {
      console.log("Overlay 已同步最新玩家列表:", players);
      currentPlay.value = players;
    });

 
    cleanup = (window as any).newWindow.listening(
      (gift: GifddDTO) => processNotification(gift, 'GIFT'),
      (like: LikeDTO) => processNotification(like, 'LIKE')
    )

})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (cleanup) cleanup();
})
</script>

<style scoped>
/* 核心：确保绿幕背景充满全屏 */
.green-screen-wrapper {
  width: 100vw;
  height: 100vh;
  background-color: #00ff00 !important; /* 强制纯绿 */
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

/* 顶部榜单 */
.top-rank-bar {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}
.rank-slot { display: flex; align-items: center; gap: 10px; }
.avatar-box { position: relative; }
.avatar-img { width: 45px; height: 45px; border-radius: 50%; border: 2px solid gold; }
.rank-tag { position: absolute; bottom: -5px; right: -5px; background: gold; color: black; font-size: 10px; padding: 0 4px; border-radius: 4px; font-weight: bold; }
.user-meta .nickname { font-size: 14px; font-weight: bold; color: white; }
.user-meta .score { font-size: 12px; color: #ffd700; }

/* TAB 榜单遮罩 */
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
  border-radius: 12px;
  border: 1px solid #333;
  overflow: hidden;
}
.panel-header { background: #333; padding: 15px; text-align: center; color: gold; font-weight: bold; }
.list-item { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid #222; color: white; }
.list-item img { width: 30px; height: 30px; border-radius: 50%; margin: 0 15px; }
.list-item .name { flex: 1; }
.list-item .points { color: gold; }
.panel-footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }

/* 缩放动画 */
.zoom-enter-active, .zoom-leave-active { transition: all 0.2s ease; }
.zoom-enter-from, .zoom-leave-to { opacity: 0; transform: scale(0.9); }
</style>
<template>
  <div class="permanent-green-bg"></div>

  <div class="overlay-content">
    
    <div class="top-rank-bar">
      <div 
        v-for="(user, index) in topThree" 
        :key="index" 
        :class="['rank-slot', `rank-${index + 1}`]"
      >
        <div class="avatar-box">
          <div v-if="index === 0" class="gold-glow"></div>
          
          <img :src="user.avatarUrl || user.avatar || defaultAvatar" class="avatar-img" />
          
          <span class="rank-tag">{{ index + 1 }}</span>
        </div>

        <div class="user-meta">
          <div class="nickname">{{ user.douyinName || user.nickname || 'Unknown' }}</div>
          <div class="score">{{ user.rankPoints || user.totalScore || 0 }} pts</div>
        </div>
      </div>

      <div v-if="topThree.length === 0" class="loading-placeholder">
        正在获取世界排名...
      </div>
    </div>

    <GiftSlideNotify ref="leftNotify" :direction="1" />
    <GiftSlideNotify ref="rightNotify" :direction="2" />

    <transition name="zoom">
      <div v-if="showRankList" class="full-rank-overlay">
        <div class="rank-panel">
          <div class="panel-header">🏆 战功赫赫 (月度 TOP 20)</div>
          <div class="list-body">
            <div v-for="(item, i) in fullRanks" :key="i" class="list-item">
              <span class="num">{{ i + 1 }}</span>
              <img :src="item.avatarUrl || item.avatar || defaultAvatar" />
              <span class="name">{{ item.douyinName || item.nickname }}</span>
              <span class="points">{{ item.rankPoints || item.totalScore }}</span>
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
import * as PlayerAPI from '@/api/player'

// --- 变量声明置顶 ---
const { currentPlay } = useDanmuStore()
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
const gameTypeId = '261CE843-5F44-418A-8D10-E49F5DEB191D' // 💡 替换为你的真实ID

const leftNotify = ref()
const rightNotify = ref()
const showRankList = ref(false)
const topThree = ref<any[]>([])
const fullRanks = ref<any[]>([])
let cleanup: any = null

// --- 逻辑：获取接口排行榜 (带容错) ---
const fetchLeaderboard = async () => {
  if (typeof PlayerAPI.getMonthlyLeaderboard !== 'function') return;
  try {
    const res = await PlayerAPI.getMonthlyLeaderboard(gameTypeId)
    if (res?.data?.success) {
      fullRanks.value = res.data.data || []
      topThree.value = (res.data.data || []).slice(0, 3)
    }
  } catch (err) {
    console.warn("排行榜请求失败，保持当前状态");
  }
}

// --- 核心业务：拦截与分发 ---
const processNotification = (payload: any, type: 'GIFT' | 'LIKE') => {
  const data = payload.detail || payload;
  if (payload.ranks) {
    fullRanks.value = payload.ranks;
    topThree.value = payload.ranks.slice(0, 3);
  }

  if (!data.realId) return;
  const player = currentPlay.value.find(p => p.realId === data.realId);
  if (!player) return;

  const notification = {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random()}`,
    type,
    user: data.user || player.user,
    avatar: data.avatar || player.avatar,
    label: type === 'GIFT' ? '送出' : '点赞了',
    content: type === 'GIFT' ? (data.giftName || '礼物') : '直播间',
    count: type === 'GIFT' ? (data.count || 1) : (data.likeCount || 1)
  }

  if (player.content === '1') leftNotify.value?.push(notification);
  else if (player.content === '2') rightNotify.value?.push(notification);
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (!showRankList.value) fetchLeaderboard();
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
  fetchLeaderboard();

  if ((window as any).electronAPI) {
    (window as any).electronAPI.onSyncPlayers((players: any[]) => {
      currentPlay.value = players;
    });
  }

  if ((window as any).newWindow) {
    cleanup = (window as any).newWindow.listening(
      (gift: GifddDTO) => processNotification(gift, 'GIFT'),
      (like: LikeDTO) => processNotification(like, 'LIKE')
    )
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (cleanup) cleanup();
})
</script>

<style scoped>
/* 绿幕底层固化 */
.permanent-green-bg {
  position: fixed;
  inset: 0;
  background-color: #00ff00 !important;
  z-index: -999;
}

.overlay-content {
  position: relative;
  z-index: 1;
  width: 100vw;
  height: 100vh;
}

/* 顶部灰色长条：高低错落的核心布局 */
/* 1. 调整容器，确保子元素有足够的平分空间 */
.top-rank-bar {
  display: flex;
  justify-content: center;
  align-items: flex-end; 
  /* 调大 gap 或者取消 gap 改用宽度平分 */
  gap: 20px; 
  padding: 40px 15px 20px 15px;
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(8px);
  min-height: 140px;
}

/* 2. 核心修复：给槽位设置固定宽度 */
.rank-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 💡 设置一个固定宽度，确保左中右三个“坑位”一样大 */
  width: 30px; 
  text-align: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 3. 昵称处理：防止名字太长撑开宽度导致不对称 */
.nickname {
  font-size: 14px;
  font-weight: bold;
  color: white;
  width: 100%; /* 撑满 slot 宽度 */
  white-space: nowrap; /* 不换行 */
  overflow: hidden; /* 超出隐藏 */
  text-overflow: ellipsis; /* 显示省略号 */
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  margin-top: 5px;
}

/* --- 保持之前的排序逻辑 --- */
.rank-1 { order: 2; transform: translateY(-20px) scale(1.1); z-index: 10; width: 140px; /* 第一名可以稍微再宽一点 */}
.rank-2 { order: 1; transform: translateY(-5px); }
.rank-3 { order: 3; transform: translateY(5px); }
.rank-3 .avatar-img { border: 2px solid #CD7F32; }

/* 头像容器 */
.avatar-box { position: relative; }
.avatar-img { width: 50px; height: 50px; border-radius: 50%; background: #222; }

/* 金色流光特效 */
.gold-glow {
  position: absolute;
  inset: -10px;
  background: conic-gradient(from 0deg, gold, transparent, gold, transparent, gold);
  border-radius: 50%;
  animation: rotate 3s linear infinite;
  z-index: -1;
}

@keyframes rotate { to { transform: rotate(360deg); } }

.rank-tag {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: #333;
  color: gold;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: bold;
  border: 1px solid gold;
}

.user-meta { margin-top: 10px; text-align: center; }
.nickname { font-size: 14px; font-weight: bold; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.score { font-size: 12px; color: #ffd700; }

.loading-placeholder { color: rgba(255,255,255,0.4); font-size: 14px; padding-bottom: 20px; }

/* TAB 遮罩 */
.full-rank-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.rank-panel {
  width: 450px;
  background: #111;
  border: 1px solid #444;
  border-radius: 15px;
  overflow: hidden;
}
.panel-header { padding: 15px; background: #222; color: gold; font-weight: bold; text-align: center; }
.list-body { max-height: 400px; overflow-y: auto; }
.list-item { display: flex; align-items: center; padding: 12px 25px; border-bottom: 1px solid #222; color: white; }
.list-item img { width: 35px; height: 35px; border-radius: 50%; margin: 0 15px; }
.list-item .points { margin-left: auto; color: gold; }

.zoom-enter-from { opacity: 0; transform: scale(0.9); }
</style>
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
      <img 
    v-if="index < 3" 
    :src="RANK_FRAMES[index]" 
    class="rank-frame-webp" 
  />
  
  <img :src="user.avatarUrl || user.avatar || defaultAvatar" class="avatar-img" />
  

        </div>

        <div class="user-meta">
          <div class="nickname">{{ user.douyinName || user.nickname || 'Unknown' }}</div>
        <div class="score">{{ formatNumber(user.rankPoints || user.totalScore) }}</div>
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
          <div class="panel-header">🏆 世界排行榜</div>
          <div class="list-body">
            <div v-for="(item, i) in fullRanks" :key="i" class="list-item">
              <span class="num">{{ i + 1 }}</span>
              <img :src="item.avatarUrl || item.avatar || defaultAvatar" />
              <span class="name">{{ item.douyinName || item.nickname }}</span>
              <span class="kills">⚔️ {{ formatNumber(item.kills) || 0 }}</span>
  <span class="tier">🛡️ {{ item.tier || '青铜5' }}</span>
              <span class="points">{{ item.rankPoints || item.totalScore }}</span>
            </div>
          </div>
         <!-- <div class="panel-footer">松开 TAB 返回游戏</div> -->
        </div>  
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDanmuStore } from '@/components/composables/DanmuData'
import GiftSlideNotify from '@/views/giftSlide/GiftSlideNotify.vue'
import type { GifddDTO, LikeDTO } from "@/types/danmu"
import * as PlayerAPI from '@/api/player'
import rank1Frame from '@/assets/ranks/1.webp'
import rank2Frame from '@/assets/ranks/2.webp'
import rank3Frame from '@/assets/ranks/3.webp'
import { 
  LW_GIFT_DESC
} from "@/constants";
import { SYNC_CHANNELS } from '@/constants/syncChannels';
import { useCrossWindowSync } from '@/components/composables/useCrossWindowSync';

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
const RANK_FRAMES = [rank1Frame, rank2Frame, rank3Frame]

useCrossWindowSync(SYNC_CHANNELS.USER_ENTRANCE, (data) => {
  // [2026-01-25] 变量声明置顶
  const memberId = data.user?.realId || data.user?.id;
  let rankIndex = -1;
  console.log(`${data.user.name} 进入了直播间`);
    
  if (!memberId || fullRanks.value.length === 0) return;

  // 在排行榜中查找该用户
  // 💡 这里的 field 名请根据你接口返回的真实字段调整（如 douyinUserId 或 id）
  rankIndex = fullRanks.value.findIndex(item => 
    (item.douyinUserId === memberId) || (item.id === memberId)
  );

  if (rankIndex !== -1) {
    const rankNum = rankIndex + 1;
    console.log(`✨ 发现大咖！第 ${rankNum} 名：${data.user.name} 进入了直播间`);
    
    // 触发播报：你可以调用现有的通知系统
    processRankEntryNotification(data.user, rankNum);
  }
});


/**
 * 专门处理高排名玩家进入的播报
 */
const processRankEntryNotification = (user: any, rank: number) => {
  const notification = {
    id: `rank-entry-${Date.now()}`,
    type: 'RANK', // 你可以给 CSS 增加一个 .rank 样式，做成金色气泡
    user: user.name,
    avatar: user.avatar,
    label: '驾临直播间',
    content: `世界排名第 ${rank} 位`,
    count: rank // 或者显示奖杯图标
  };

  // 默认推送到左侧或两侧
  leftNotify.value?.push(notification);
};


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



// --- 变量声明置顶 ---
const formatNumber = (num: number | string): string => {
  const n = Number(num) || 0;
  if (n < 10000) return n.toString();
  
  // 超过1W的处理：保留两位小数并去掉末尾多余的0
  // 例如：1.50W -> 1.5W, 1.51W -> 1.51W
  const w = n / 10000;
  return w.toFixed(2).replace(/\.?0+$/, "") + 'W';
};

// --- 核心业务：拦截与分发 ---
const processNotification = (payload: any, type: 'GIFT' | 'LIKE') => {
  const data = payload.detail || payload;


  // 获取 realId 并匹配玩家
  const realId = data.realId || data.senderId; 
  if (!realId) return;
  
 const player = currentPlay.value.find(p => p.realId === realId);
// if (!player) return;

  // 核心逻辑：根据类型定制内容
  let displayContent = '';
  let displayCount = data.count || 1;
  let label = '';

  if (type === 'LIKE') {
    // 点赞固定播报
    label = '点赞了';
    displayContent = '获得 10 经验和 5 金币';
    displayCount = data.likeCount || 1;
  } else if (type === 'GIFT') {
    // 礼物根据 ID 匹配功能描述
    label = '获得了';
    const giftCommand = data.command; 
    const effectDesc = LW_GIFT_DESC[giftCommand] || '未知力量';
    displayContent = `${effectDesc}`; 
    displayCount = data.count || 1;
  }

  // 构造通知对象
  const notification = {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random()}`,
    type,
    user: data.user || data.senderName || player?.user,
    avatar: data.avatar || player?.avatar,
    label: label,
    content: displayContent,
    count: displayCount
  }

  // 根据玩家阵营/位置推送
  if (player?.content === '1') {
    leftNotify.value?.push(notification);
  } else {
    rightNotify.value?.push(notification);
  }
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
  gap: 0px; 
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
/* --- 第一名头像与相框专项调大 --- */
.rank-1 .avatar-img { 
  width: 70px;  /* 从 50px 增加到 70px */
  height: 70px; 
}

.rank-1 .rank-frame-webp {
  /* 因为头像变大了，相框的 inset 和尺寸也要同步调整 */
  inset: -20px; 
  width: calc(100% + 40px);
  height: calc(100% + 40px);
}
.rank-1 { 
  order: 2; 
  transform: translateY(-25px); /* 稍微再往上提一点，更有立体感 */
  z-index: 10; 
  width: 160px; /* 从 140px 增加到 160px */
}
.rank-2 { order: 1; transform: translateY(-5px); }
.rank-3 { order: 3; transform: translateY(5px); }
.rank-3 .avatar-img { border: 2px solid #CD7F32; }

/* 头像容器 */
.avatar-box { position: relative; }
.avatar-img { width: 50px; height: 50px; border-radius: 50%; background: #222; }


/* --- 修正后的关键帧动画 --- */
@keyframes frame-subtle-pulse {
  from { 
    transform: scale(1); 
    /* 保持滤镜连写，否则会互相覆盖 */
    filter: brightness(1) drop-shadow(0 0 8px rgba(255, 215, 0, 0.3)); 
  }
  to { 
    transform: scale(1.02); 
    filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)); 
  }
}

/* --- 修正后的类定义 --- */
.rank-frame-webp {
  position: absolute;
  inset: -15px; 
  width: calc(100% + 30px);
  height: calc(100% + 30px);
  z-index: 2;
  pointer-events: none;
  /* 初始滤镜状态 */
  filter: brightness(1) drop-shadow(0 0 8px rgba(255, 215, 0, 0.3));
  /* 引用修正后的动画 */
  animation: frame-subtle-pulse 2s ease-in-out infinite alternate;
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
/* 标题头：缩小高度 */
.panel-header { 
  padding: 10px; /* 从 15px 缩小到 10px */
  background: #222; 
  color: gold; 
  font-weight: bold; 
  text-align: center; 
  font-size: 14px; /* 稍微缩小字体 */
}

/* 列表主体：保持高度限制 */
.list-body { 
  max-height: 400px; 
  overflow-y: auto; 
  background: #111; 
}

/* 列表项：压缩垂直内边距 */
.list-item { 
  display: flex; 
  align-items: center; 
  padding: 6px 15px; /* 垂直方向从 12px 压缩到 6px，水平从 25px 缩到 15px */
  border-bottom: 1px solid #222; 
  color: white; 
  font-size: 13px; /* 整体字号微调 */
}

/* 头像：稍微缩小并收紧间距 */
.list-item img { 
  width: 30px; /* 从 35px 缩小到 30px */
  height: 30px; 
  border-radius: 50%; 
  margin: 0 10px; /* 从 15px 缩小到 10px */
}

/* 排名序号 */
.list-item .num {
  width: 25px;
  color: #888;
  font-size: 12px;
}

/* 名字：由于增加了新字段，给名字设定基础比例 */
.list-item .name {
  flex: 1.5; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 击杀与段位：水平平分空间，间距紧凑 */
.list-item .kills,
.list-item .tier {
  flex: 1;
  text-align: center;
  font-size: 12px;
}

/* 战功分数：靠右并微调间距 */
.list-item .points { 
  flex: 1;
  text-align: right;  
  color: gold; 
  font-weight: bold;
}

.zoom-enter-from { opacity: 0; transform: scale(0.9); }       
</style>
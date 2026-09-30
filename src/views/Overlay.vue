<template>
  <div class="permanent-green-bg"></div>

  <div class="overlay-content">
        <RankEntryEffect ref="rankEffect" />
    
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
        {{ t('overlay.loadingRanking') }}
      </div>
    </div>

    <GiftSlideNotify ref="leftNotify" :direction="1" />
    <GiftSlideNotify ref="rightNotify" :direction="2" />


    <transition name="zoom">
      <div v-if="showRankList" class="full-rank-overlay">
        <div class="rank-panel">
          <div class="panel-header">{{ t('overlay.worldLeaderboard') }}</div>
          <div class="list-body">
            <div v-for="(item, i) in fullRanks" :key="i" class="list-item">
              <span class="num">{{ i + 1 }}</span>
              <img :src="item.avatarUrl || item.avatar || defaultAvatar" />
              <span class="name">{{ item.douyinName || item.nickname }}</span>
              <span class="kills">⚔️ {{ formatNumber(item.kills) || 0 }}</span>
  <span class="tier">🛡️ {{ item.tier || t('overlay.bronzeTier') }}</span>
              <span class="points">{{ item.rankPoints || item.totalScore }}</span>
            </div>
          </div>
         <!-- <div class="panel-footer">Release TAB to return to game</div> -->
        </div>  
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDanmuStore } from '@/components/composables/DanmuData'
import GiftSlideNotify from '@/views/Overlay/GiftSlideNotify.vue'
import RankEntryEffect from '@/views/Overlay/RankEntryEffect.vue'
import type { GifddDTO, LikeDTO } from "@/types/danmu"
import * as PlayerAPI from '@/api/player'
import rank1Frame from '@/assets/ranks/1.webp'
import rank2Frame from '@/assets/ranks/2.webp'
import rank3Frame from '@/assets/ranks/3.webp'
import otherRankFrame from '@/assets/ranks/otherRank.png'
import { 
  LW_GIFT_DESC
} from "@/constants";
import { SYNC_CHANNELS } from '@/constants/syncChannels';
import { useCrossWindowSync } from '@/components/composables/useCrossWindowSync';
import { useI18n } from 'vue-i18n'

// --- Variable declarations ---
const { t } = useI18n()
const { currentPlay } = useDanmuStore()
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
const gameTypeId = '261CE843-5F44-418A-8D10-E49F5DEB191D' // 💡 Replace with your actual ID

const leftNotify = ref()
const rightNotify = ref()
const showRankList = ref(false)
const topThree = ref<any[]>([])
const fullRanks = ref<any[]>([])
let cleanup: any = null
const RANK_FRAMES = [rank1Frame, rank2Frame, rank3Frame]
const rankEffect = ref()

useCrossWindowSync(SYNC_CHANNELS.USER_ENTRANCE, (data) => {
  // [2026-01-25] Variable declarations
  const memberId = data.user?.realId || data.user?.id;
  let rankIndex = -1;

  if (!memberId || fullRanks.value.length === 0) return;

  rankIndex = fullRanks.value.findIndex(item => 
    (item.douyinUserId === memberId) || (item.id === memberId)
  );

  if (rankIndex !== -1) {
    const rankNum = rankIndex + 1;
    
    // 1. Trigger center effect (rank 1-20)
    // Check: component exists and push method is available
    if (rankEffect.value && typeof rankEffect.value.push === 'function') {
      rankEffect.value.push({
        rank: rankNum,
        user: data.user.name,
        avatar: data.user.avatar
      });
    }

  }
});


/**
 * hight-rank player'effect
 */
const processRankEntryNotification = (user: any, rank: number) => {
  const notification = {
    id: `rank-entry-${Date.now()}`,
    type: 'RANK', // You can add a .rank CSS style for a golden bubble effect
    user: user.name,
    avatar: user.avatar,
    label: t('overlay.rankEntryLabel'),
    content: t('overlay.worldRank', { rank }),
    count: rank // Or show a trophy icon
  };

  // Default: push to left or right
  leftNotify.value?.push(notification);
};


// --- Fetch leaderboard from API (with fallback) ---
const fetchLeaderboard = async () => {
  if (typeof PlayerAPI.getMonthlyLeaderboard !== 'function') return;
  try {
    const res = await PlayerAPI.getMonthlyLeaderboard(gameTypeId)
    if (res?.data?.success) {
      fullRanks.value = res.data.data || []
      topThree.value = (res.data.data || []).slice(0, 3)
    }
  } catch (err) {
    console.warn(t('overlay.leaderboardRequestFailed'));
  }
}



// --- Variable declarations ---
const formatNumber = (num: number | string): string => {
  const n = Number(num) || 0;
  if (n < 10000) return n.toString();
  
  // Values > 10000: keep 2 decimal places, strip trailing zeros
  // e.g. 1.50W -> 1.5W, 1.51W -> 1.51W
  const w = n / 10000;
  return w.toFixed(2).replace(/\.?0+$/, "") + 'W';
};

// --- Core: intercept and dispatch ---
const processNotification = (payload: any, type: 'GIFT' | 'LIKE') => {
  const data = payload.detail || payload;


  // Get realId and match player
  const realId = data.realId || data.senderId; 
  if (!realId) return;
  
 const player = currentPlay.value.find(p => p.realId === realId);
// if (!player) return;

  // Core: customize content based on type
  let displayContent = '';
  let displayCount = data.count || 1;
  let label = '';

  if (type === 'LIKE') {
    // Like: fixed announcement text
    label = t('overlay.liked');
    displayContent = t('overlay.likeReward');
    displayCount = data.likeCount || 1;
  } else if (type === 'GIFT') {
    // Gift: match effect description by gift ID
    label = t('overlay.gained');
    const giftCommand = data.command; 
    const effectDesc = t(`gifts.desc.${giftCommand}`, LW_GIFT_DESC[giftCommand] || t('overlay.unknownPower'));
    displayContent = `${effectDesc}`; 
    displayCount = data.count || 1;
  }

  // Build notification object
  const notification = {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random()}`,
    type,
    user: data.user || data.senderName || player?.user,
    avatar: data.avatar || player?.avatar,
    label: label,
    content: displayContent,
    count: displayCount
  }

  // Push based on player team/position
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

// --- Lifecycle ---
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
/* Fixed green screen background */
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

/* Top bar: staggered core layout */
/* 1. Adjust container for even child spacing */
.top-rank-bar {
  display: flex;
  justify-content: center;
  align-items: flex-end; 
  /* Increase gap or use width-based distribution */
  gap: 0px; 
  padding: 40px 15px 20px 15px;
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(8px);
  min-height: 140px;
}

/* 2. Core fix: give each slot a fixed width */
.rank-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 💡 Fixed width to keep left, center, right slots equal */
  width: 30px; 
  text-align: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 3. Nickname: prevent long names from breaking layout symmetry */
.nickname {
  font-size: 14px;
  font-weight: bold;
  color: white;
  width: 100%; /* Fill slot width */
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Show ellipsis */
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  margin-top: 5px;
}

/* --- Keep previous ordering logic --- */
/* --- Rank 1: larger avatar and frame --- */
.rank-1 .avatar-img { 
  width: 70px;  /* Increased from 50px to 70px */
  height: 70px;
}

.rank-1 .rank-frame-webp {
  /* Avatar is larger, so frame inset and size must match */
  inset: -20px; 
  width: calc(100% + 40px);
  height: calc(100% + 40px);
}
.rank-1 { 
  order: 2; 
  transform: translateY(-25px); /* Slightly higher for more depth */
  z-index: 10; 
  width: 160px; /* Increased from 140px to 160px */
}
.rank-2 { order: 1; transform: translateY(-5px); }
.rank-3 { order: 3; transform: translateY(5px); }
.rank-3 .avatar-img { border: 2px solid #CD7F32; }

/* Avatar container */
.avatar-box { position: relative; }
.avatar-img { width: 50px; height: 50px; border-radius: 50%; background: #222; }


/* --- Corrected keyframe animation --- */
@keyframes frame-subtle-pulse {
  from { 
    transform: scale(1); 
    /* Keep filter shorthand to prevent override conflicts */
    filter: brightness(1) drop-shadow(0 0 8px rgba(255, 215, 0, 0.3)); 
  }
  to { 
    transform: scale(1.02); 
    filter: brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)); 
  }
}

/* --- Corrected class definitions --- */
.rank-frame-webp {
  position: absolute;
  inset: -15px; 
  width: calc(100% + 30px);
  height: calc(100% + 30px);
  z-index: 2;
  pointer-events: none;
  /* Initial filter state */
  filter: brightness(1) drop-shadow(0 0 8px rgba(255, 215, 0, 0.3));
  /* Reference corrected animation */
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

/* TAB overlay mask */
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
/* Header: reduce height */
.panel-header { 
  padding: 10px; /* Reduced from 15px to 10px */
  background: #222; 
  color: gold; 
  font-weight: bold; 
  text-align: center; 
  font-size: 14px; /* Slightly smaller font */
}

/* List body: keep height limited */
.list-body { 
  max-height: 400px; 
  overflow-y: auto; 
  background: #111; 
}

/* List item: compress vertical padding */
.list-item { 
  display: flex; 
  align-items: center; 
  padding: 6px 15px; /* Vertical: 12px -> 6px, Horizontal: 25px -> 15px */
  border-bottom: 1px solid #222; 
  color: white; 
  font-size: 13px; /* Slightly smaller overall */
}

/* Avatar: slightly smaller, tighter spacing */
.list-item img { 
  width: 30px; /* Reduced from 35px to 30px */
  height: 30px;
  border-radius: 50%; 
  margin: 0 10px; /* Reduced from 15px to 10px */
}

/* Rank number */
.list-item .num {
  width: 25px;
  color: #888;
  font-size: 12px;
}

/* Name: set base flex ratio since new fields were added */
.list-item .name {
  flex: 1.5; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Kills & tier: even horizontal space, tight gaps */
.list-item .kills,
.list-item .tier {
  flex: 1;
  text-align: center;
  font-size: 12px;
}

/* Score: right-aligned with slight spacing adjustment */
.list-item .points { 
  flex: 1;
  text-align: right;  
  color: gold; 
  font-weight: bold;
}

.zoom-enter-from { opacity: 0; transform: scale(0.9); }       
</style>

<!--
  Overlay.vue

  This is the green screen (chroma-key) overlay window designed for OBS capture during live streams.
  It displays the top 3 ranked viewers in a staggered layout, with animated rank frames,
  and shows real-time gift notifications and entrance effects. The full leaderboard
  is revealed when the streamer holds the TAB key.

  Communication with other windows happens via BroadcastChannel (useCrossWindowSync)
  for gift events, entrance notifications, and player data updates.
-->

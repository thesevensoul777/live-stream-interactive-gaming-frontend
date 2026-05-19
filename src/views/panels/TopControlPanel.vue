<template>
  <div class="panel">
    <div class="platform-tabs">
      <button
        v-for="platform in PLATFORM_ORDER"
        :key="platform"
        type="button"
        class="platform-tab"
        :class="{ active: activePlatform === platform }"
        @click="activePlatform = platform"
      >
        <span>{{ LIVE_PLATFORM_LABEL[platform] }}</span>
        <span :class="platformPanels[platform].status === 1 ? 'connected' : 'disconnected'">
          {{ platformPanels[platform].status === 1 ? '已连接' : '未连接' }}
        </span>
      </button>
    </div>

    <section class="platform-surface">
      <div class="platform-topbar">
        <div class="field room-field">
          <span class="label">直播间</span>
          <input
            v-model="platformPanels[activePlatform].room"
            class="field-input"
            :placeholder="platformPlaceholders[activePlatform]"
          />
        </div>

        <button
          type="button"
          class="listen-btn"
          :class="{ running: platformPanels[activePlatform].status === 1 }"
          @click="togglePlatformListen(activePlatform)"
        >
          {{ platformPanels[activePlatform].status === 1 ? '停止监听' : '启动监听' }}
        </button>
      </div>

      <div class="platform-summary">
        <span>{{ LIVE_PLATFORM_LABEL[activePlatform] }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.anchor || '未获取主播' }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.title || '未获取标题' }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.status || 'unknown' }}</span>
      </div>

      <div v-if="platformPanels[activePlatform].error" class="platform-error">
        {{ platformPanels[activePlatform].error }}
      </div>

      <div class="platform-grid">
        <section class="platform-block">
          <h3>弹幕信息</h3>
          <div class="message-list">
            <div
              v-for="message in platformPanels[activePlatform].messages"
              :key="message.id"
              class="message-item"
            >
              <strong>{{ message.user }}</strong>
              <span>{{ message.content }}</span>
            </div>
            <div v-if="platformPanels[activePlatform].messages.length === 0" class="empty-state">
              暂无弹幕
            </div>
          </div>
        </section>

        <section class="platform-block">
          <h3>礼物操作</h3>
          <div class="block-fields">
            <label class="field">
              <span class="label">选择玩家</span>
              <select v-model="platformPanels[activePlatform].selectedPlayer">
                <option value="" disabled>请选择玩家</option>
                <option
                  v-for="playerOption in platformPanels[activePlatform].players"
                  :key="playerOption.realId"
                  :value="playerOption.realId"
                >
                  {{ playerOption.user }}
                </option>
              </select>
            </label>

            <label class="field count-field">
              <span class="label">数量</span>
              <input
                v-model.number="platformPanels[activePlatform].giftCount"
                type="number"
                min="1"
                @input="handlePlatformCountInput(activePlatform)"
              />
            </label>

            <label class="field gift-field">
              <span class="label">选择礼物</span>
              <select v-model="platformPanels[activePlatform].giftId">
                <option
                  v-for="(label, giftId) in LW_GIFT_NAME_MAP"
                  :key="giftId"
                  :value="giftId"
                >
                  {{ label }}
                </option>
              </select>
            </label>
          </div>

          <div class="gift-actions">
            <button type="button" @click="sendPlatformGift(activePlatform)">补送礼物</button>
          </div>
        </section>
      </div>
    </section>

    <section class="global-surface">
      <div class="global-row">
        <label class="field">
          <span class="label">秘钥</span>
          <input v-model="globalSecret" class="field-input" placeholder="通用秘钥" />
        </label>

        <div class="actions">
       <button :class="{ 'is-confirmed': confirmed }" type="button" @click="chooseFolder">
  {{ buttonText }}
</button>
          <button type="button" class="btn-launch" :disabled="!path" @click="launchGame">
            启动游戏
          </button>
          <button type="button" @click="resetGameData">重置</button>
          <button type="button" @click="addRobot">添加人机</button>
          <button type="button" @click="openOverlay">开启特效</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  CastMethod,
  DyCast,
  DyCastCloseCode,
  RoomStatus,
  type ConnectStatus,
  type DyLiveInfo,
  type DyMessage,
  type LiveRoom,
} from '@/core/dycast'
import { RelayCast } from '@/core/relay'
import { injectWar3, handleDanmu, ManualGiveGift } from '@/core/actionRequests'
import { useDanmuStore } from '@/components/composables/DanmuData'
import { useAuthStore } from '@/stores/auth'
import type { GifddDTO } from '@/types/danmu'
import type { GameSummaryRequest } from '@/api/dto/Player'
import { postGameSummary } from '@/api/player'
import { LW_GIFT_NAME_MAP } from '@/constants'
import { useCrossWindowSync } from '@/components//composables/useCrossWindowSync'
import { SYNC_CHANNELS } from '@/constants/syncChannels'
import {
  LIVE_PLATFORM_LABEL,
  fetchLiveRoomInfo,
  type LivePlatform,
  type LiveRoomInfo as PlatformRoomInfo,
} from '@/core/livePlatforms'
import { debug } from 'console'

type PlatformPlayer = {
  realId: string
  user: string
}

type PlatformMessage = {
  id: string
  user: string
  content: string
}

type PlatformPanelState = {
  room: string
  status: ConnectStatus
  roomInfo: PlatformRoomInfo | null
  error: string
  players: PlatformPlayer[]
  selectedPlayer: string
  giftCount: number
  giftId: string
  messages: PlatformMessage[]
}

const PLATFORM_ORDER: LivePlatform[] = ['douyin', 'douyu', 'bilibili', 'tiktok']

const platformPlaceholders: Record<LivePlatform, string> = {
  douyin: '抖音号或直播间号',
  douyu: '斗鱼房间号或链接',
  bilibili: 'Bilibili 房间号或链接',
  tiktok: '@username 或直播间链接',
}

function createPlatformPanel(room = ''): PlatformPanelState {
  return {
    room,
    status: 0,
    roomInfo: null,
    error: '',
    players: [],
    selectedPlayer: '',
    giftCount: 1,
    giftId: '463',
    messages: [],
  }
}

const activePlatform = ref<LivePlatform>('douyin')
const platformPanels = ref<Record<LivePlatform, PlatformPanelState>>({
  douyin: createPlatformPanel('672573338415'),
  douyu: createPlatformPanel(),
  bilibili: createPlatformPanel(),
  tiktok: createPlatformPanel(),
})

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const { sync: syncUser } = useCrossWindowSync(SYNC_CHANNELS.USER_ENTRANCE)
const { currentPlay, clearDanmu, clearCurrentPlay } = useDanmuStore()

const globalSecret = ref('1')
const path = ref('')
const confirmed = ref(false)
const buttonText = ref('选择游戏文件夹')

let stopListening: (() => void) | undefined
let castWs: DyCast | undefined
let relayWs: RelayCast | undefined
const castSet = new Set<string>()
const allCasts: DyMessage[] = []
const platformRoomInfoTimers = new Map<LivePlatform, number>()
let lastRobotContent = '2'

function pushPlatformMessage(platform: LivePlatform, userName: string, content: string) {
  const panel = platformPanels.value[platform]
  panel.messages.unshift({
    id: `${Date.now()}-${Math.random()}`,
    user: userName,
    content,
  })
  panel.messages = panel.messages.slice(0, 12)
}

function setPlatformPlayers(platform: LivePlatform, players: PlatformPlayer[]) {
  const panel = platformPanels.value[platform]
  panel.players = players

  if (panel.selectedPlayer && !players.some((item) => item.realId === panel.selectedPlayer)) {
    panel.selectedPlayer = ''
  }
}

function handlePlatformCountInput(platform: LivePlatform) {
  const panel = platformPanels.value[platform]
  if (!panel.giftCount || panel.giftCount < 1) {
    panel.giftCount = 1
  }
}

function stopPlatformRoomInfoTimer(platform: LivePlatform) {
  const timer = platformRoomInfoTimers.get(platform)
  if (timer) {
    window.clearInterval(timer)
    platformRoomInfoTimers.delete(platform)
  }
}

async function fetchPlatformRoomInfo(platform: Exclude<LivePlatform, 'douyin'>) {
  const panel = platformPanels.value[platform]
  if (!panel.room) {
    panel.error = '请填写直播间'
    return
  }

  try {
    panel.error = ''
    const info = await fetchLiveRoomInfo(platform, panel.room)
    panel.roomInfo = info
    panel.status = info.status === 'live' ? 1 : 0
  } catch (err) {
    panel.status = 0
    panel.error = err instanceof Error ? err.message : '获取直播间信息失败'
  }
}

async function startPlatformRoomInfoMonitor(platform: Exclude<LivePlatform, 'douyin'>) {
  await fetchPlatformRoomInfo(platform)
  stopPlatformRoomInfoTimer(platform)
  platformRoomInfoTimers.set(
    platform,
    window.setInterval(() => {
      void fetchPlatformRoomInfo(platform)
    }, 10000),
  )
}

function stopDouyinListen() {
  if (castWs) {
    castWs.close(1000, 'manual stop')
    castWs = undefined
  }
  castSet.clear()
  allCasts.length = 0
  clearDanmu()
  platformPanels.value.douyin.status = 0
  platformPanels.value.douyin.messages = []
}

function stopPlatformListen(platform: LivePlatform) {
  if (platform === 'douyin') {
    stopDouyinListen()
    return
  }
  stopPlatformRoomInfoTimer(platform)
  platformPanels.value[platform].status = 0
}

async function togglePlatformListen(platform: LivePlatform) {
  if (platformPanels.value[platform].status === 1) {
    stopPlatformListen(platform)
    return
  }

  if (platform === 'douyin') {
    await startDouyinListen()
    return
  }

  await startPlatformRoomInfoMonitor(platform)
}

async function startDouyinListen() {
  const panel = platformPanels.value.douyin
  if (!panel.room) {
    panel.error = '请填写抖音直播间'
    return
  }
  if (!globalSecret.value) {
    panel.error = '请填写通用秘钥'
    return
  }

  panel.error = ''
  connectLive(panel.room)
  injectWar3(false)
}

function connectLive(roomId: string) {
  try {
    stopDouyinListen()
    const panel = platformPanels.value.douyin
    const cast = new DyCast(roomId)

    cast.on('open', (_ev?: Event, info?: DyLiveInfo) => {
      panel.status = 1
      if (info) {
        panel.roomInfo = {
          platform: 'douyin',
          roomId,
          title: (info as any).title,
          anchor: (info as any).owner?.nickname || (info as any).anchor?.nickname || (info as any).nickname,
          status: 'live',
          raw: info,
        }
      }
    })

    cast.on('error', (err: Error) => {
      panel.status = 0
      panel.error = err.message || '抖音连接失败'
    })

    cast.on('close', (_code: DyCastCloseCode, _reason: string) => {
      panel.status = 0
    })

    cast.on('message', (msgs: DyMessage[]) => {
      handleMessages(msgs)
    })

    cast.connect()
    castWs = cast
  } catch (err) {
    platformPanels.value.douyin.status = 0
    platformPanels.value.douyin.error = err instanceof Error ? err.message : '抖音连接失败'
    castWs = undefined
  }
}

function setRoomCount(room?: LiveRoom) {
  if (!room) return
}

function handleMessages(msgs: DyMessage[]) {
  try {
    for (const msg of msgs) {
      if (!msg.id || castSet.has(msg.id)) continue
      castSet.add(msg.id)

      const userName = msg.user?.name || '匿名用户'
      const content =
        msg.content ||
        msg.gift?.name ||
        (msg.likeCount ? `点赞 x${msg.likeCount}` : msg.method || '消息')

      switch (msg.method) {
        case CastMethod.CHAT:
        case CastMethod.EMOJI_CHAT:
          pushPlatformMessage('douyin', userName, content)
          break
        case CastMethod.GIFT:
          if (!msg.gift?.repeatEnd) {
            pushPlatformMessage('douyin', userName, `礼物 ${msg.gift?.name || msg.gift?.id} x${msg.gift?.count || 1}`)
          }
          break
        case CastMethod.LIKE:
          pushPlatformMessage('douyin', userName, `点赞 x${msg.likeCount || 1}`)
          break
        case CastMethod.MEMBER:
        case CastMethod.SOCIAL:
          pushPlatformMessage('douyin', userName, content)
          break
        case CastMethod.ROOM_USER_SEQ:
        case CastMethod.ROOM_STATS:
          setRoomCount(msg.room)
          break
        case CastMethod.CONTROL:
          if (msg?.room?.status !== RoomStatus.LIVING) {
            stopDouyinListen()
          }
          break
      }
    }
  } catch (_err) {
    // keep the live loop resilient
  }

  allCasts.push(...msgs)
  void handleDanmu(msgs)

  const douyinPlayers = currentPlay.value
    .filter((item) => !!item.realId)
    .map((item) => ({
      realId: item.realId as string,
      user: item.user,
    }))
  setPlatformPlayers('douyin', douyinPlayers)

  if (relayWs && relayWs.isConnected()) {
    relayWs.send(JSON.stringify(msgs))
  }
}

function sendPlatformGift(platform: LivePlatform) {
  const panel = platformPanels.value[platform]
  if (!panel.selectedPlayer) {
    panel.error = '请选择玩家'
    return
  }

  const targetPlayer = panel.players.find((item) => item.realId === panel.selectedPlayer)
  const payload: GifddDTO = {
    realId: panel.selectedPlayer,
    user: targetPlayer?.user || 'manual-send',
    giftId: panel.giftId,
    count: panel.giftCount,
    time: Date.now(),
  } as unknown as GifddDTO

  panel.error = ''
  ManualGiveGift(payload)
  pushPlatformMessage(platform, payload.user, `手动补送礼物 ${panel.giftId} x${panel.giftCount}`)
}

async function chooseFolder() {
  const result = await (window as any).fileAPI.selectFolder()
   debugger;
  if (result) {
    path.value = result
    confirmed.value = true
    buttonText.value = '已确认游戏文件夹'
  } else {
    confirmed.value = false
    buttonText.value = '选择游戏文件夹'
  }
}

async function launchGame() {
  if (!path.value) {
    alert('请先选择游戏文件夹')
    return
  }else{
     buttonText.value = '选择游戏文件夹'
  }

  await (window as any).gameAPI.launchWar3(path.value)
}

function resetGameData() {
  clearCurrentPlay()
  PLATFORM_ORDER.forEach((platform) => {
    platformPanels.value[platform].players = []
    platformPanels.value[platform].selectedPlayer = ''
    platformPanels.value[platform].messages = []
    platformPanels.value[platform].error = ''
  })
}

function addRobot() {
  const robotNames = [
    '真实服了这老六',
    '今天也没睡饱',
    '优雅永不过时',
    'Joker',
    '隔壁老王',
  ]

  const robotId = `robot_${Math.floor(Math.random() * 100000)}`
  const randomName = robotNames[Math.floor(Math.random() * robotNames.length)]
  const mockContent = lastRobotContent === '1' ? '2' : '1'
  lastRobotContent = mockContent

  void handleDanmu([
    {
      method: 'WebcastChatMessage',
      content: mockContent,
      time: Date.now(),
      user: {
        realId: robotId,
        name: randomName,
        avatar: '',
      },
    } as any,
  ])
}

function openOverlay() {
  ;(window as any).newWindow.openOverlay()
}

watch(
  () => user.value?.douyinAccount,
  (value) => {
    if (value) {
      platformPanels.value.douyin.room = value
    }
  },
  { immediate: true },
)

watch(
  currentPlay,
  (players) => {
    setPlatformPlayers(
      'douyin',
      players
        .filter((item) => !!item.realId)
        .map((item) => ({
          realId: item.realId as string,
          user: item.user,
        })),
    )
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  stopListening = (window as any).electronAPI.onGameSummary(async (data: any[]) => {
    clearCurrentPlay()

    try {
      const payload: GameSummaryRequest = {
        gameTypeId: '261CE843-5F44-418A-8D10-E49F5DEB191D',
        players: data.map((item) => ({
          douyinUserId: item.douyinUserId,
          rankPoints: item.RankPoints,
          tierPoints: item.TierPoints,
          kills: item.Kills,
          consumption: item.Consumption,
          addGolds: item.addGolds || 0,
        })),
      }

      await postGameSummary(payload)
    } catch (err) {
      console.error('sync game summary failed', err)
    }
  })
})

onUnmounted(() => {
  stopDouyinListen()
  platformRoomInfoTimers.forEach((timer) => window.clearInterval(timer))
  platformRoomInfoTimers.clear()
  if (stopListening) stopListening()
  syncUser(undefined as any)
})
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid #d6dbe3;
  border-radius: 6px;
  padding: 14px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f3f6fa 100%);
}

.platform-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.platform-tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #d8dde6;
  border-radius: 6px;
  background: #ffffff;
  color: #314055;
  cursor: pointer;
}

.platform-tab.active {
  border-color: #2f7cf6;
  background: #eaf2ff;
}

.platform-surface,
.global-surface {
  border: 1px solid #d8dde6;
  border-radius: 6px;
  background: #ffffff;
  padding: 14px;
}

.platform-topbar,
.global-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  color: #4c5b70;
  font-size: 13px;
}

.platform-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 14px;
  margin-top: 14px;
}

.platform-block {
  border: 1px solid #e3e7ef;
  border-radius: 6px;
  padding: 12px;
  background: #fbfcff;
}

.platform-block h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #2f3f57;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-field {
  flex: 1;
}

.field-input,
select,
input[type='number'] {
  height: 32px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid #ccd4e0;
  border-radius: 4px;
  background: #fff;
}

.label {
  color: #5c687b;
  white-space: nowrap;
}

.listen-btn,
.actions button,
.gift-actions button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #c4cfde;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.listen-btn.running {
  background: #2ecc71;
  color: #fff;
  border-color: #2ecc71;
}
/* 1. 启动游戏按钮的正常状态 */
.btn-launch {
  height: 32px;
  padding: 0 12px;
  background: #2f7cf6 !important; /* 使用 !important 强行覆盖全局冲突 */
  color: #ffffff !important;
  border: 1px solid #2f7cf6 !important;
  cursor: pointer;
  opacity: 1;
  transition: all 0.2s ease;
}

/* 2. ✨ 核心修复：显式定义“启动游戏”按钮在禁用状态下的样子 */
.btn-launch:disabled {
  background: #bcccf6 !important; /* 变成淡淡的蓝色，表示不可点击 */
  color: #ffffff !important;       /* 强制文字为白色，绝对不会变空白！ */
  border-color: #bcccf6 !important;
  cursor: not-allowed !important;  /* 鼠标放上去显示禁止图标 */
  opacity: 0.6;
}

.confirmed {
  background: #4caf50;
  color: #fff;
  border-color: #4caf50;
}
/* 修改后 */
.is-confirmed {
  background: #4caf50 !important; /* 加上 important 阶级，防止被全局或默认样式覆盖成透明/空白 */
  color: #ffffff !important;
  border-color: #4caf50 !important;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 230px;
  max-height: 230px;
  overflow: auto;
}

.message-item {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #edf0f5;
  font-size: 13px;
}

.empty-state {
  color: #8995a8;
  font-size: 13px;
}

.block-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.count-field input {
  width: 100px;
}

.gift-field select {
  width: 100%;
}

.gift-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.platform-error {
  margin-top: 10px;
  color: #dc3545;
  font-size: 13px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: auto;
}

.connected {
  color: #2ecc71;
  font-weight: 600;
}

.disconnected {
  color: #e74c3c;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .platform-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .platform-grid {
    grid-template-columns: 1fr;
  }

  .platform-topbar,
  .global-row {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    margin-left: 0;
  }
}

@media (max-width: 720px) {
  .platform-tabs {
    grid-template-columns: 1fr;
  }

  .message-item {
    grid-template-columns: 1fr;
  }
}
</style>

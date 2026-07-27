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
        <span>{{ t(`platforms.${platform}`) }}</span>
        <span :class="platformPanels[platform].status === 1 ? 'connected' : 'disconnected'">
          {{ platformPanels[platform].status === 1 ? t('controlPanel.connected') : t('controlPanel.disconnected') }}
        </span>
      </button>
    </div>

    <section class="platform-surface">
      <div class="platform-topbar">
        <div class="field room-field">
          <span class="label">{{ t('controlPanel.room') }}</span>
          <input
            v-model="platformPanels[activePlatform].room"
            class="field-input"
            :placeholder="platformPlaceholders[activePlatform]"
            :disabled="platformPanels[activePlatform].status === 1"
          />
                  <button
            v-if="activePlatform === 'douyin' || activePlatform === 'bilibili' || activePlatform === 'tiktok'"
            type="button"
            class="save-btn"
            :class="{ saving: savingPlatform === activePlatform }"
            :disabled="savingPlatform === activePlatform || platformPanels[activePlatform].status === 1 || !platformPanels[activePlatform].room"
            @click="saveRoom(activePlatform)"
          >
            {{ savingPlatform === activePlatform ? t('controlPanel.saving') : t('controlPanel.saveRoom') }}
          </button>
        </div>

        <button
          type="button"
          class="listen-btn"
          :class="{ running: platformPanels[activePlatform].status === 1 }"
          @click="togglePlatformListen(activePlatform)"
        >
          {{ platformPanels[activePlatform].status === 1 ? t('controlPanel.stopListen') : t('controlPanel.startListen') }}
        </button>
      </div>

      <div class="platform-summary">
        <span>{{ t(`platforms.${activePlatform}`) }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.anchor || t('controlPanel.anchorUnknown') }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.title || t('controlPanel.titleUnknown') }}</span>
        <span>{{ platformPanels[activePlatform].roomInfo?.status || 'unknown' }}</span>
      </div>

      <div v-if="platformPanels[activePlatform].error" class="platform-error">
        {{ platformPanels[activePlatform].error }}
      </div>

      <div class="platform-grid">
        <section class="platform-block">
          <h3>{{ t('controlPanel.danmuInfo') }}</h3>
          <DanmuList
            embedded
            pos="center"
            :platform="activePlatform"
            :types="['social', 'like', 'member', 'chat', 'gift']"
          />
        </section>

        <section class="platform-block">
          <h3>{{ t('controlPanel.giftActions') }}</h3>
          <div class="block-fields">
            <label class="field">
              <span class="label">{{ t('controlPanel.selectPlayer') }}</span>
              <select v-model="platformPanels[activePlatform].selectedPlayer">
                <option value="" disabled>{{ t('controlPanel.selectPlayerPlaceholder') }}</option>
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
              <span class="label">{{ t('controlPanel.quantity') }}</span>
              <input
                v-model.number="platformPanels[activePlatform].giftCount"
                type="number"
                min="1"
                @input="handlePlatformCountInput(activePlatform)"
              />
            </label>

            <label class="field gift-field">
              <span class="label">{{ t('controlPanel.selectGift') }}</span>
              <select v-model="platformPanels[activePlatform].giftId">
                <option
                  v-for="(label, giftId) in LW_GIFT_NAME_MAP"
                  :key="giftId"
                  :value="giftId"
                >
                  {{ t(`gifts.names.${giftId}`, label) }}
                </option>
              </select>
            </label>
          </div>

          <div class="gift-actions">
            <button type="button" @click="sendPlatformGift(activePlatform)">{{ t('controlPanel.manualGift') }}</button>
          </div>
        </section>
      </div>
    </section>

    <section class="global-surface">
      <div class="global-row">
        <label class="field">
          <span class="label">{{ t('controlPanel.secret') }}</span>
          <input v-model="globalSecret" class="field-input" :placeholder="t('controlPanel.commonSecret')" />
        </label>

        <div class="actions">
       <button :class="{ 'is-confirmed': confirmed }" type="button" @click="chooseFolder">
  {{ buttonText }}
</button>
          <button type="button" class="btn-launch" :disabled="!path" @click="launchGame">
            {{ t('controlPanel.launchGame') }}
          </button>
          <button type="button" @click="resetGameData">{{ t('controlPanel.reset') }}</button>
          <button type="button" @click="addRobot">{{ t('controlPanel.addRobot') }}</button>
          <button type="button" @click="openOverlay">{{ t('controlPanel.openOverlay') }}</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DanmuList from '@/views/panels/DanmuList.vue'
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
  fetchLiveRoomInfo,
  type LivePlatform,
  type LiveRoomInfo as PlatformRoomInfo,
} from '@/core/livePlatforms'
import { getLiveRoomApi, updateLiveRoomApi } from '@/api/liveRoom'
import type { LiveRoomResponse } from '@/api/dto/LiveRoom'
import { useI18n } from 'vue-i18n'

const { t, tm } = useI18n()
const savingPlatform = ref<LivePlatform | null>(null)

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

const PLATFORM_ORDER: LivePlatform[] = ['douyin', 'bilibili', 'tiktok']

const platformPlaceholders = computed<Record<LivePlatform, string>>(() => ({
  douyin: t('controlPanel.douyinPlaceholder'),
  bilibili: t('controlPanel.bilibiliPlaceholder'),
  tiktok: t('controlPanel.tiktokPlaceholder'),
}))

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
  bilibili: createPlatformPanel('13786821'),
  tiktok: createPlatformPanel(),
})

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const { sync: syncUser } = useCrossWindowSync(SYNC_CHANNELS.USER_ENTRANCE)
const { currentPlay, clearDanmu, clearCurrentPlay, appendPlatformMainCasts, clearPlatformMainCasts } = useDanmuStore()

const globalSecret = ref('1')
const path = ref('')
const confirmed = ref(false)
const folderButtonKey = ref('controlPanel.chooseGameFolder')
const buttonText = computed(() => t(folderButtonKey.value))

let stopListening: (() => void) | undefined
let castWs: DyCast | undefined
let relayWs: RelayCast | undefined
const castSet = new Set<string>()
const allCasts: DyMessage[] = []
const platformRoomInfoTimers = new Map<LivePlatform, number>()
let lastRobotContent = '2'

// ── Bilibili IPC 监控状�?──
let biliUserId: string | null = null
let biliCleanupFns: (() => void)[] = []


const SAVE_PLATFORM_MAP: Partial<Record<LivePlatform, keyof Pick<LiveRoomResponse, 'douyinRoomId' | 'bilibiliRoomId' | 'tikTokRoomId'>>> = {
  douyin: 'douyinRoomId',
  bilibili: 'bilibiliRoomId',
  tiktok: 'tikTokRoomId',
}

async function saveRoom(platform: LivePlatform) {
  const roomId = platformPanels.value[platform].room
  if (!roomId) return

  const field = SAVE_PLATFORM_MAP[platform]
  if (!field) return

  savingPlatform.value = platform
  try {
    await updateLiveRoomApi({ [field]: roomId })
    savingPlatform.value = null
  } catch (err) {
    console.error('Failed to save room ID', err)
    savingPlatform.value = null
  }
}
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
    panel.error = t('controlPanel.roomRequired')
    return
  }

  try {
    panel.error = ''
    const info = await fetchLiveRoomInfo(platform, panel.room)
    panel.roomInfo = info
    panel.status = info.status === 'live' ? 1 : 0
  } catch (err) {
    panel.status = 0
    panel.error = err instanceof Error ? err.message : t('controlPanel.roomInfoFailed')
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
  clearPlatformMainCasts('douyin')
  platformPanels.value.douyin.status = 0
  platformPanels.value.douyin.messages = []
}

function stopBilibiliListen() {
  // 清理 IPC 监听�?
  for (const fn of biliCleanupFns) {
    fn()
  }
  biliCleanupFns = []

  // 通知主进程停止监�?
  if (biliUserId) {
    ;(window as any).electronAPI?.biliStopMonitor(biliUserId).catch(() => {})
    biliUserId = null
  }

  clearPlatformMainCasts('bilibili')
  platformPanels.value.bilibili.status = 0
  platformPanels.value.bilibili.messages = []
}

function stopPlatformListen(platform: LivePlatform) {
  if (platform === 'douyin') {
    stopDouyinListen()
    return
  }
  if (platform === 'bilibili') {
    stopBilibiliListen()
    stopPlatformRoomInfoTimer(platform)
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

  if (platform === 'bilibili') {
    await startBilibiliListen()
    return
  }

  await startPlatformRoomInfoMonitor(platform)
}

async function loadLiveRoom() {
  try {
    const res = await getLiveRoomApi()
    const room = res.data
    if (room.douyinRoomId) {
      platformPanels.value.douyin.room = room.douyinRoomId
    }
    if (room.bilibiliRoomId) {
      platformPanels.value.bilibili.room = room.bilibiliRoomId
    }
    if (room.tikTokRoomId) {
      platformPanels.value.tiktok.room = room.tikTokRoomId
    }
  } catch (err) {
    // LiveRoom not set up yet �� that's fine
  }
}
async function startBilibiliListen() {
  const panel = platformPanels.value.bilibili
  if (!panel.room) {
    panel.error = t('controlPanel.bilibiliRoomRequired')
    return
  }

  panel.error = ''

  stopBilibiliListen()

  try {
    const info = await fetchLiveRoomInfo('bilibili', panel.room)
    panel.roomInfo = info

    await startPlatformRoomInfoMonitor('bilibili')

    if (info.status !== 'live') {
      panel.status = 0
      panel.error = t('controlPanel.liveNotStarted')
      return
    }

    // 使用当前登录用户�?ID 作为 Bilibili 监控�?userId
    const currentUser = authStore.user
    if (!currentUser || !currentUser.id) {
      panel.status = 0
      panel.error = t('controlPanel.loginRequired')
      return
    }

    const userId = currentUser.id
    const targetRoomId = info.roomId

    // 通过 IPC 通知主进程启�?Bilibili 弹幕监控
    const result = await (window as any).electronAPI.biliStartMonitor({ userId, targetRoomId })
    if (!result.ok) {
      panel.status = 0
      panel.error = result.error || t('controlPanel.bilibiliStartFailed')
      return
    }

    biliUserId = userId

    // 监听弹幕数据
    const cleanupDanmu = (window as any).electronAPI.onBiliDanmu(userId, (danmu: any) => {
      // 将主进程传来的弹幕数据转换为 DyMessage 格式
      const msg: DyMessage = {
        id: `bili-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: CastMethod.CHAT,
        user: {
          realId: danmu.uid ? `bili_${danmu.uid}` : undefined,
          id: String(danmu.uid || ''),
          name: danmu.username || t('controlPanel.anonymousUser'),
          avatar: danmu.faceUrl || '',
        },
        content: danmu.content || '',
        time: Date.now(),
      }
      handleBilibiliMessages([msg])
    })
    biliCleanupFns.push(cleanupDanmu)

    // 监听礼物数据
    const cleanupGift = (window as any).electronAPI.onBiliGift(userId, (gift: any) => {
      const msg: DyMessage = {
        id: `bili-gift-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: CastMethod.GIFT,
        user: {
          realId: gift.uid ? `bili_${gift.uid}` : undefined,
          id: String(gift.uid || ''),
          name: gift.uname || t('controlPanel.anonymousUser'),
          avatar: gift.face || '',
        },
        gift: {
          id: gift.giftId || 'unknown',
          name: gift.giftName || t('controlPanel.giftFallback'),
          count: gift.num || 1,
          repeatEnd: 1,
          icon: gift.giftIcon || '',
          price: gift.price || 0,
        },
        time: Date.now(),
      }
      handleBilibiliMessages([msg])
    })
    biliCleanupFns.push(cleanupGift)

    // 监听状态变�?
    const cleanupStatus = (window as any).electronAPI.onBiliStatus(userId, (status: any) => {
      if (status.type === 'connected' || status.type === 'authenticated') {
        panel.status = 1
        panel.error = ''
      } else if (status.type === 'disconnected' || status.type === 'max_reconnect_exceeded') {
        panel.status = 0
        panel.error = status.type === 'max_reconnect_exceeded' ? t('controlPanel.bilibiliReconnectFailed') : t('controlPanel.bilibiliDisconnected')
      }
    })
    biliCleanupFns.push(cleanupStatus)

    // 监听错误
    const cleanupError = (window as any).electronAPI.onBiliError(userId, (error: any) => {
      panel.status = 0
      panel.error = error.message || t('controlPanel.bilibiliConnectionError')
    })
    biliCleanupFns.push(cleanupError)

    panel.status = 1
    panel.error = ''
  } catch (err) {
    panel.status = 0
    panel.error = err instanceof Error ? err.message : t('controlPanel.bilibiliConnectionFailed')
  }
}

async function startDouyinListen() {
  const panel = platformPanels.value.douyin
  if (!panel.room) {
    panel.error = t('controlPanel.douyinRoomRequired')
    return
  }
  if (!globalSecret.value) {
    panel.error = t('controlPanel.secretRequired')
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
      panel.error = err.message || t('controlPanel.douyinConnectionFailed')
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
    platformPanels.value.douyin.error = err instanceof Error ? err.message : t('controlPanel.douyinConnectionFailed')
    castWs = undefined
  }
}

function setRoomCount(room?: LiveRoom) {
  if (!room) return
}

function handleMessages(msgs: DyMessage[]) {
  const uniqueMsgs: DyMessage[] = []
  try {
    for (const msg of msgs) {
      if (!msg.id || castSet.has(msg.id)) continue
      castSet.add(msg.id)
      uniqueMsgs.push(msg)

      switch (msg.method) {
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

  allCasts.push(...uniqueMsgs)
  appendPlatformMainCasts('douyin', uniqueMsgs)
  void handleDanmu(uniqueMsgs)

  const douyinPlayers = currentPlay.value
    .filter((item) => !!item.realId)
    .map((item) => ({
      realId: item.realId as string,
      user: item.user,
    }))
  setPlatformPlayers('douyin', douyinPlayers)

  if (relayWs && relayWs.isConnected()) {
    relayWs.send(JSON.stringify(uniqueMsgs))
  }
}

function handleBilibiliMessages(msgs: DyMessage[]) {
  const platform: LivePlatform = 'bilibili'
  const uniqueMsgs: DyMessage[] = []

  try {
    for (const msg of msgs) {
      if (!msg.id) continue
      uniqueMsgs.push(msg)
    }
  } catch {
    // keep the live loop resilient
  }

  appendPlatformMainCasts(platform, uniqueMsgs)
  void handleDanmu(uniqueMsgs)

  const players = currentPlay.value
    .filter((item) => !!item.realId && String(item.realId).startsWith('bili_'))
    .map((item) => ({
      realId: item.realId as string,
      user: item.user,
    }))
  setPlatformPlayers(platform, players)
}

function sendPlatformGift(platform: LivePlatform) {
  const panel = platformPanels.value[platform]
  if (!panel.selectedPlayer) {
    panel.error = t('controlPanel.playerRequired')
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
  pushPlatformMessage(platform, payload.user, t('controlPanel.manualGiftMessage', { giftId: panel.giftId, count: panel.giftCount }))
}

async function chooseFolder() {
  const result = await (window as any).fileAPI.selectFolder()
  if (result) {
    path.value = result
    confirmed.value = true
    folderButtonKey.value = 'controlPanel.gameFolderConfirmed'
  } else {
    confirmed.value = false
    folderButtonKey.value = 'controlPanel.chooseGameFolder'
  }
}

async function launchGame() {
  if (!path.value) {
    alert(t('controlPanel.gameFolderRequired'))
    return
  }else{
     folderButtonKey.value = 'controlPanel.chooseGameFolder'
  }

  await (window as any).gameAPI.launchWar3(path.value)
}

function resetGameData() {
  clearCurrentPlay()
  clearDanmu()
  PLATFORM_ORDER.forEach((platform) => {
    platformPanels.value[platform].players = []
    platformPanels.value[platform].selectedPlayer = ''
    platformPanels.value[platform].messages = []
    platformPanels.value[platform].error = ''
  })
}

function addRobot() {
  const robotNames = tm('controlPanel.robotNames') as unknown as string[]

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
  // Load saved live room IDs
  loadLiveRoom()

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
  stopBilibiliListen()
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
  color: #314055;
  font-size: 14px;
  font-weight: 400;
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
  font-weight: 400;
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
  /* 弹幕列表容器：固定高度，超出滚动 */
  height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.platform-block h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #2f3f57;
  flex-shrink: 0;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}


.save-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #2f7cf6;
  border-radius: 4px;
  background: #2f7cf6;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.save-btn.saving {
  background: #6c8fd6;
  border-color: #6c8fd6;
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
  color: #314055;
  font: inherit;
  font-weight: 400;
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
  color: #314055;
  cursor: pointer;
  font: inherit;
  font-weight: 400;
}

.listen-btn.running {
  background: #2ecc71;
  color: #fff;
  border-color: #2ecc71;
}
/* 1. 启动游戏按钮的正常状�?*/
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

/* 2. �?核心修复：显式定�?启动游戏"按钮在禁用状态下的样�?*/
.btn-launch:disabled {
  background: #bcccf6 !important; /* 变成淡淡的蓝色，表示不可点击 */
  color: #ffffff !important;       /* 强制文字为白色，绝对不会变空白！ */
  border-color: #bcccf6 !important;
  cursor: not-allowed !important;  /* 鼠标放上去显示禁止图�?*/
  opacity: 0.6;
}

.confirmed {
  background: #4caf50;
  color: #fff;
  border-color: #4caf50;
}
/* 修改�?*/
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




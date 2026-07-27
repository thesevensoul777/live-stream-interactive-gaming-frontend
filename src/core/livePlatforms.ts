export type LivePlatform = 'douyin' | 'bilibili' | 'tiktok'

export type LiveRoomInfo = {
  platform: LivePlatform
  roomId: string
  title?: string
  anchor?: string
  avatar?: string
  cover?: string
  online?: number
  status?: 'live' | 'offline' | 'unknown'
  raw?: unknown
}

type FetchLive = (url: string, headers?: Record<string, string>) => Promise<string>

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getFetchLive(): FetchLive {
  const electronFetch = (window as any).electronAPI?.fetchLive
  if (electronFetch) return electronFetch

  return async (url: string, headers?: Record<string, string>) => {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.text()
  }
}

function pickNumericId(input: string) {
  const match = input.match(/\d+/)
  return match?.[0] || input.trim()
}

function safeJsonParse<T = any>(text: string): T {
  return JSON.parse(text) as T
}

function decodeHtmlEntities(text: string) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

function extractJsonScript(html: string, marker: string) {
  const index = html.indexOf(marker)
  if (index < 0) return null

  const start = html.indexOf('{', index)
  if (start < 0) return null

  let depth = 0
  for (let i = start; i < html.length; i += 1) {
    const char = html[i]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return html.slice(start, i + 1)
  }

  return null
}

async function fetchBilibiliRoomInfo(input: string, fetchLive: FetchLive): Promise<LiveRoomInfo> {
  const shortRoomId = pickNumericId(input)
  const initText = await fetchLive(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(shortRoomId)}`,
    { 'User-Agent': UA, Referer: 'https://live.bilibili.com/' },
  )
  const init = safeJsonParse<any>(initText)
  if (init.code !== 0 || !init.data?.room_id) {
    throw new Error(init.message || 'Bilibili room_init failed')
  }

  const roomId = String(init.data.room_id)
  const baseText = await fetchLive(
    `https://api.live.bilibili.com/xlive/web-room/v1/index/getRoomBaseInfo?req_biz=web_room_componet&room_ids=${roomId}`,
    { 'User-Agent': UA, Referer: `https://live.bilibili.com/${shortRoomId}` },
  )
  const base = safeJsonParse<any>(baseText)
  const info = base.data?.by_room_ids?.[roomId]

  return {
    platform: 'bilibili',
    roomId,
    title: info?.title,
    anchor: info?.uname,
    avatar: info?.face,
    cover: info?.cover,
    online: Number(info?.online || 0),
    status: init.data.live_status === 1 ? 'live' : 'offline',
    raw: { init, base },
  }
}

async function fetchTikTokRoomInfo(input: string, fetchLive: FetchLive): Promise<LiveRoomInfo> {
  const liveUrl = input.startsWith('http') ? input : `https://www.tiktok.com/@${input.replace(/^@/, '')}/live`
  const html = await fetchLive(liveUrl, {
    'User-Agent': UA,
    Referer: 'https://www.tiktok.com/',
  })

  const universalJson = extractJsonScript(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')
  const sigiJson = extractJsonScript(html, 'SIGI_STATE')
  const parsed = universalJson || sigiJson ? safeJsonParse<any>(decodeHtmlEntities(universalJson || sigiJson || '{}')) : null
  const liveRoom =
    parsed?.__DEFAULT_SCOPE__?.['webapp.room-detail'] ||
    parsed?.LiveRoom ||
    parsed?.LiveRoomInfo ||
    parsed?.RoomStore ||
    null

  const roomInfo = liveRoom?.roomInfo || liveRoom?.room_info || liveRoom?.liveRoomUserInfo?.liveRoom || liveRoom
  const owner = roomInfo?.owner || roomInfo?.ownerUser || liveRoom?.userInfo?.user
  const roomId = String(roomInfo?.id || roomInfo?.roomId || roomInfo?.room_id || pickNumericId(input))

  return {
    platform: 'tiktok',
    roomId,
    title: roomInfo?.title,
    anchor: owner?.nickname || owner?.uniqueId,
    avatar: owner?.avatarThumb?.urlList?.[0] || owner?.avatarLarger,
    cover: roomInfo?.cover?.urlList?.[0],
    online: Number(roomInfo?.user_count || roomInfo?.userCount || 0),
    status: roomInfo?.status === 2 || roomInfo?.liveStatus === 2 ? 'live' : 'unknown',
    raw: parsed || { htmlMatched: html.includes('LIVE') },
  }
}

export async function fetchLiveRoomInfo(platform: LivePlatform, input: string): Promise<LiveRoomInfo> {
  const fetchLive = getFetchLive()

  if (platform === 'bilibili') return fetchBilibiliRoomInfo(input, fetchLive)
  if (platform === 'tiktok') return fetchTikTokRoomInfo(input, fetchLive)

  return {
    platform: 'douyin',
    roomId: input.trim(),
    status: 'unknown',
  }
}

export const LIVE_PLATFORM_LABEL: Record<LivePlatform, string> = {
  douyin: '抖音',
  bilibili: 'Bilibili',
  tiktok: 'TikTok',
}

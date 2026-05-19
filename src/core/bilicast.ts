import { Emitter, type EventMap } from './emitter'
import { CastMethod, type DyMessage } from './dycast'
import { LiveWS, type DataEvent } from 'bilibili-live-danmaku'

interface BiliCastEvent extends EventMap {
  open: () => void
  close: () => void
  error: (e: Error) => void
  message: (messages: DyMessage[]) => void
}

type FetchText = (url: string, headers?: Record<string, string>) => Promise<string>

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function asString(value: unknown) {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return undefined
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getFetchText(): FetchText {
  const electronFetch = (window as any).electronAPI?.fetchLive
  if (electronFetch) return electronFetch

  return async (url: string, headers?: Record<string, string>) => {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.text()
  }
}

async function getDanmuConf(roomId: number) {
  const fetchText = getFetchText()
  const url = `https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id=${encodeURIComponent(
    String(roomId),
  )}&platform=pc&player=web`
  const text = await fetchText(url, {
    'User-Agent': UA,
    Referer: `https://live.bilibili.com/${roomId}`,
  })
  const json = JSON.parse(text) as any
  if (json?.code !== 0 || !json?.data) {
    throw new Error(json?.message || json?.msg || 'Bilibili getConf failed')
  }

  const host = json.data?.host_server_list?.[0]?.host || json.data?.host
  const token = json.data?.token
  if (!host || !token) {
    throw new Error('Bilibili getConf missing host/token')
  }

  return {
    host: String(host),
    token: String(token),
    raw: json,
  }
}

export class BiliCast extends Emitter<BiliCastEvent> {
  private ws?: LiveWS
  private connectedRoomId?: number

  constructor(roomId: number) {
    super()
    this.connectedRoomId = roomId
  }

  connect() {
    if (!this.connectedRoomId || Number.isNaN(this.connectedRoomId)) {
      throw new Error('Invalid bilibili room id')
    }

    // async init to avoid making connect() async for existing call sites
    void this.connectInternal(this.connectedRoomId)
  }

  private async connectInternal(roomId: number) {
    this.close()

    const conf = await getDanmuConf(roomId)
    const address = `wss://${conf.host}/sub`

    const ws = new LiveWS(roomId, {
      address,
      key: conf.token,
      protover: 3,
    })
    this.ws = ws

    ws.addEventListener('open', () => this.emit('open'))
    ws.addEventListener('close', () => this.emit('close'))
    ws.addEventListener('error', (ev) => {
      const err = (ev as any)?.error instanceof Error ? (ev as any).error : new Error('Bilibili websocket error')
      this.emit('error', err)
    })

    ws.addEventListener('DANMU_MSG', (ev: DataEvent<any>) => {
      const data = (ev as any)?.data
      const userName = asString(data?.info?.[2]?.[1]) || '匿名用户'
      const uid = asString(data?.info?.[2]?.[0])
      const text = asString(data?.info?.[1])
      if (!text) return

      this.emit('message', [
        {
          id: nowId('bili-chat'),
          method: CastMethod.CHAT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
          },
          content: text,
          time: Date.now(),
        },
      ])
    })

    ws.addEventListener('SEND_GIFT', (ev: DataEvent<any>) => {
      const data = (ev as any)?.data?.data || (ev as any)?.data
      const userName = asString(data?.uname) || '匿名用户'
      const uid = asString(data?.uid)
      const giftName = asString(data?.giftName) || asString(data?.gift_name) || 'gift'
      const giftId = asString(data?.giftId) || asString(data?.gift_id) || giftName
      const countRaw = data?.num ?? data?.gift_num ?? 1
      const count = typeof countRaw === 'number' ? countRaw : Number.parseInt(String(countRaw), 10)

      this.emit('message', [
        {
          id: nowId('bili-gift'),
          method: CastMethod.GIFT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
          },
          gift: {
            id: giftId,
            name: giftName,
            count: Number.isFinite(count) ? count : 1,
            repeatEnd: 1,
          },
          time: Date.now(),
        },
      ])
    })

    ws.addEventListener('INTERACT_WORD', (ev: DataEvent<any>) => {
      const data = (ev as any)?.data?.data || (ev as any)?.data
      const userName = asString(data?.uname) || '匿名用户'
      const uid = asString(data?.uid)
      this.emit('message', [
        {
          id: nowId('bili-interact'),
          method: CastMethod.MEMBER,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
          },
          content: '进入直播间',
          time: Date.now(),
        },
      ])
    })

    ws.addEventListener('SUPER_CHAT_MESSAGE', (ev: DataEvent<any>) => {
      const data = (ev as any)?.data?.data || (ev as any)?.data
      const user = data?.user_info || {}
      const userName = asString(user?.uname) || '匿名用户'
      const uid = asString(user?.uid)
      const text = asString(data?.message)
      if (!text) return

      this.emit('message', [
        {
          id: nowId('bili-superchat'),
          method: CastMethod.CHAT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
          },
          content: text,
          time: Date.now(),
        },
      ])
    })
  }

  close() {
    const ws = this.ws
    this.ws = undefined
    if (ws) {
      try {
        ws.close()
      } catch {
        // ignore
      }
    }
  }
}

import { Emitter, type EventMap } from './emitter'
import { CastMethod, type DyMessage } from './dycast'

interface BiliCastEvent extends EventMap {
  open: () => void
  close: () => void
  error: (e: Error) => void
  message: (messages: DyMessage[]) => void
  reconnecting: (attempt: number) => void
  reconnect: () => void
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

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
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

/**
 * Bilibili live danmaku protocol constants
 */
const BILI_PROTOCOL = {
  /** Header total length (16 bytes) */
  HEADER_LENGTH: 16,
  /** Protocol version: 0=JSON, 1=heartbeat, 2=heartbeat-reply, 3=brotli-compressed */
  PROTO_VERSION: {
    JSON: 0,
    HEARTBEAT: 1,
    HEARTBEAT_REPLY: 2,
    BROTLI: 3,
  },
  /** Operation codes */
  OP: {
    HEARTBEAT: 2,
    HEARTBEAT_REPLY: 3,
    MESSAGE: 5,
    USER_AUTHENTICATION: 7,
    AUTH_REPLY: 8,
  },
  /** Heartbeat interval in ms */
  HEARTBEAT_INTERVAL: 30000,
  /** Max reconnect attempts (blivechat uses total_retry_count=30, we use a generous limit) */
  MAX_RECONNECT_COUNT: 30,
  /** Reconnect base delay in ms */
  RECONNECT_BASE_DELAY: 1000,
} as const

/**
 * Parse a Bilibili live WebSocket binary frame.
 * Bilibili uses a simple binary protocol:
 *   - 4 bytes: total packet length
 *   - 2 bytes: header length (always 16)
 *   - 2 bytes: protocol version
 *   - 4 bytes: operation code
 *   - 4 bytes: sequence id
 *   - body: payload
 */
function parseBiliFrame(buffer: ArrayBuffer | SharedArrayBuffer): {
  op: number
  body: ArrayBuffer
  version: number
} {
  const view = new DataView(buffer)
  // Bilibili protocol uses big-endian (network byte order)
  const headerLen = view.getUint16(4, false)
  const version = view.getUint16(6, false)
  const op = view.getUint32(8, false)
  const body = buffer.slice(headerLen) as ArrayBuffer
  return { op, body, version }
}

/**
 * Build a Bilibili protocol packet
 */
function buildBiliPacket(op: number, body: string | Uint8Array, version: number = 0): ArrayBuffer {
  let bodyBytes: Uint8Array
  if (typeof body === 'string') {
    bodyBytes = new TextEncoder().encode(body)
  } else {
    bodyBytes = body
  }

  const totalLen = BILI_PROTOCOL.HEADER_LENGTH + bodyBytes.length
  const buffer = new ArrayBuffer(totalLen)
  const view = new DataView(buffer)

  // Bilibili protocol uses big-endian (network byte order)
  view.setUint32(0, totalLen, false)
  view.setUint16(4, BILI_PROTOCOL.HEADER_LENGTH, false)
  view.setUint16(6, version, false)
  view.setUint32(8, op, false)
  view.setUint32(12, 1, false)

  // Body
  new Uint8Array(buffer).set(bodyBytes, BILI_PROTOCOL.HEADER_LENGTH)

  return buffer
}

/**
 * Decompress brotli-compressed data via Electron main process (Node.js zlib).
 * IPC bridge: renderer -> preload -> ipcMain -> zlib.brotliDecompressSync
 */
async function brotliDecompress(data: Uint8Array): Promise<Uint8Array | null> {
  const api = (window as any).electronAPI?.brotliDecompress
  if (!api) {
    console.warn('[BiliCast] electronAPI.brotliDecompress not available')
    return null
  }

  try {
    // Convert Uint8Array to plain array for IPC serialization
    const plainArray = Array.from(data)
    const result = await api(plainArray)
    if (!result || !result.ok) {
      console.warn('[BiliCast] Brotli decompress IPC failed:', result?.error)
      return null
    }
    // Convert back from plain array to Uint8Array
    const decompressed = new Uint8Array(result.data)
    return decompressed
  } catch (err) {
    console.warn('[BiliCast] Brotli decompression error:', err)
    return null
  }
}

/**
 * Parse a JSON body that may contain multiple concatenated JSON objects
 * (Bilibili sometimes sends multiple packets concatenated in one frame)
 */
function parseConcatenatedJson(text: string): any[] {
  const results: any[] = []
  // Try standard JSON parse first
  try {
    results.push(JSON.parse(text))
    return results
  } catch {
    // Try to extract multiple JSON objects
    let remaining = text.trim()
    while (remaining.length > 0) {
      try {
        const parsed = JSON.parse(remaining)
        results.push(parsed)
        break
      } catch {
        // Find the first complete JSON object
        let depth = 0
        let start = -1
        for (let i = 0; i < remaining.length; i++) {
          const ch = remaining[i]
          if (ch === '{') {
            if (start === -1) start = i
            depth++
          } else if (ch === '}') {
            depth--
            if (depth === 0 && start !== -1) {
              const jsonStr = remaining.slice(start, i + 1)
              try {
                results.push(JSON.parse(jsonStr))
              } catch {
                // skip malformed
              }
              remaining = remaining.slice(i + 1)
              start = -1
              break
            }
          }
        }
        if (start !== -1 && depth > 0) {
          // No closing brace found, abort
          break
        }
      }
    }
    return results
  }
}

/**
 * Parse multiple concatenated binary frames from a single buffer.
 * Bilibili may pack multiple frames into one WebSocket message.
 */
function parseBiliFrames(buffer: ArrayBuffer | SharedArrayBuffer): Array<{ op: number; body: ArrayBuffer; version: number }> {
  const frames: Array<{ op: number; body: ArrayBuffer; version: number }> = []
  let offset = 0
  const view = new DataView(buffer)

  while (offset + BILI_PROTOCOL.HEADER_LENGTH <= buffer.byteLength) {
    const totalLen = view.getUint32(offset, false)
    if (totalLen < BILI_PROTOCOL.HEADER_LENGTH || offset + totalLen > buffer.byteLength) {
      // Malformed packet, stop parsing
      break
    }

    const frameBuffer = buffer.slice(offset, offset + totalLen) as ArrayBuffer
    const frame = parseBiliFrame(frameBuffer)
    frames.push(frame)
    offset += totalLen
  }

  return frames
}

/**
 * Process avatar URL: strip protocol prefix for protocol-relative URLs
 * (blivechat pattern: "//static.hdslb.com/..." instead of "https://...")
 */
function processAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  // Strip protocol prefix (https: or http:) to get protocol-relative URL
  return url.replace(/^https?:/i, '')
}

/**
 * Default avatar URL for Bilibili users (blivechat uses this)
 */
const DEFAULT_BILI_AVATAR = '//static.hdslb.com/images/member/noface.gif'

/**
 * Determine author type based on Bilibili privilege info.
 * blivechat pattern: 0=普通, 1=舰队(总督/提督/舰长), 2=房管, 3=主播
 */
function getAuthorType(message: any, roomOwnerUid?: number): number {
  if (message.uid && roomOwnerUid && message.uid === roomOwnerUid) return 3 // 主播
  if (message.admin) return 2 // 房管
  if (message.privilege_type !== 0) return 1 // 舰队
  return 0 // 普通
}

export class BiliCast extends Emitter<BiliCastEvent> {
  private ws: WebSocket | undefined
  private roomId: number
  private conf: { host: string; token: string } | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | undefined
  private reconnectCount: number = 0
  /** Total reconnect attempts across all sessions (blivechat pattern: prevent infinite reconnect) */
  private totalReconnectCount: number = 0
  private maxReconnectCount: number = BILI_PROTOCOL.MAX_RECONNECT_COUNT
  private shouldReconnect: boolean = false
  private isReconnecting: boolean = false
  private isClosed: boolean = false
  private lastReceiveTime: number = Date.now()
  private pingCount: number = 0
  /** If 2 heartbeats pass without receiving a message, consider connection stale */
  private readonly downgradePingCount: number = 2

  /** Room owner UID, used for author type classification (blivechat pattern) */
  private roomOwnerUid: number | undefined

  // ── Message buffer for batching ──
  private messageBuffer: DyMessage[] = []
  private batchTimer: ReturnType<typeof setTimeout> | undefined
  private readonly BATCH_INTERVAL = 150 // ms

  constructor(roomId: number) {
    super()
    this.roomId = roomId
  }

  // ── Batch buffer helpers ──

  private startBatchTimer() {
    this.stopBatchTimer()
    this.batchTimer = setInterval(() => {
      this.flushBatch()
    }, this.BATCH_INTERVAL)
  }

  private stopBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = undefined
    }
  }

  private flushBatch() {
    if (this.messageBuffer.length === 0) return
    const batch = this.messageBuffer.splice(0)
    this.emit('message', batch)
  }

  private pushToBuffer(messages: DyMessage[]) {
    if (!messages || messages.length === 0) return
    this.messageBuffer.push(...messages)
  }

  connect() {
    if (!this.roomId || Number.isNaN(this.roomId)) {
      throw new Error('Invalid bilibili room id')
    }
    this.isClosed = false
    this.shouldReconnect = true
    void this.connectInternal()
  }

  private async connectInternal() {
    this.closeWs()

    try {
      if (!this.conf) {
        this.conf = await getDanmuConf(this.roomId)
      }

      const address = `wss://${this.conf.host}/sub`
      const ws = new WebSocket(address)
      ws.binaryType = 'arraybuffer'
      this.ws = ws

      ws.addEventListener('open', () => {
        // Send authentication packet
        const authBody = JSON.stringify({
          uid: 0,
          roomid: this.roomId,
          protover: 3,
          platform: 'web',
          type: 2,
          key: this.conf!.token,
        })
        ws.send(buildBiliPacket(BILI_PROTOCOL.OP.USER_AUTHENTICATION, authBody))
      })

      ws.addEventListener('message', (ev: MessageEvent) => {
        this.handleMessage(ev.data)
      })

      ws.addEventListener('close', () => {
        this.handleClose()
      })

      ws.addEventListener('error', () => {
        // 'close' will fire after 'error', so handleClose handles reconnection
      })
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
      this.handleClose()
    }
  }

  private handleMessage(data: ArrayBuffer) {
    // Reset stale-connection detection
    this.pingCount = 0
    this.lastReceiveTime = Date.now()

    // Parse all frames in this message (may be concatenated)
    const frames = parseBiliFrames(data)

    for (const frame of frames) {
      switch (frame.op) {
        case BILI_PROTOCOL.OP.AUTH_REPLY: {
          // Authentication successful, start heartbeat and batch timer
          if (this.isReconnecting) {
            this.reconnectCount = 0
            this.isReconnecting = false
            this.emit('reconnect')
          } else {
            this.emit('open')
          }
          this.startHeartbeat()
          this.startBatchTimer()
          break
        }

        case BILI_PROTOCOL.OP.HEARTBEAT_REPLY: {
          // Heartbeat reply - silently ignored
          break
        }

        case BILI_PROTOCOL.OP.MESSAGE: {
          void this.handleMessageBody(frame)
          break
        }

        default: {
          break
        }
      }
    }
  }

  private async handleMessageBody(frame: { body: ArrayBuffer; version: number }) {
    if (frame.version === BILI_PROTOCOL.PROTO_VERSION.BROTLI) {
      // Brotli-compressed: may contain multiple concatenated binary frames
      const decompressed = await brotliDecompress(new Uint8Array(frame.body))
      if (!decompressed || decompressed.byteLength === 0) {
        return
      }

      // Use the Uint8Array's underlying buffer directly.
      const rawBuf = decompressed.buffer.slice(
        decompressed.byteOffset,
        decompressed.byteOffset + decompressed.byteLength,
      )
      const subFrames = parseBiliFrames(rawBuf)
      for (const subFrame of subFrames) {
        if (subFrame.op === BILI_PROTOCOL.OP.MESSAGE) {
          await this.dispatchMessage(subFrame.body)
        }
        // Ignore heartbeat-reply and unknown sub-frames silently
      }
      return
    }

    // JSON or other version (version=0)
    await this.dispatchMessage(frame.body)
  }

  private async dispatchMessage(body: ArrayBuffer) {
    const text = new TextDecoder().decode(body)
    if (!text) return

    const jsonObjects = parseConcatenatedJson(text)
    for (const json of jsonObjects) {
      if (!json || typeof json !== 'object') continue

      // blivechat pattern: strip colon suffix from cmd (e.g. "DANMU_MSG:4:12345" -> "DANMU_MSG")
      // https://github.com/xfgryujk/blivedm/blob/master/blivedm/handlers.py#L139-L142
      let cmd = json.cmd || json.type || ''
      const pos = cmd.indexOf(':')
      if (pos !== -1) {
        cmd = cmd.substring(0, pos)
      }

      const data = json.data || json.info || json

      try {
        const messages = this.parseCommand(cmd, data, json)
        if (messages && messages.length > 0) {
          this.pushToBuffer(messages)
        }
      } catch {
        // silently ignore parse errors
      }
    }
  }

  /**
   * Parse a Bilibili command into DyMessage array.
   * Enhanced with blivechat patterns:
   * - Richer user info (medalLevel, medalName, privilegeType, authorLevel)
   * - Author type classification (主播/房管/舰队/普通)
   * - Avatar URL processing
   * - SUPER_CHAT_DELETE handling
   * - GUARD_BUY as MEMBER type
   * - Gift price/coin info
   */
  private parseCommand(cmd: string, data: any, raw: any): DyMessage[] | null {
    // ── DANMU_MSG: chat message ──
    if (cmd === 'DANMU_MSG') {
      const info = raw.info || data
      const userName = asString(info?.[2]?.[1]) || '匿名用户'
      const uid = asString(info?.[2]?.[0])
      const text = asString(info?.[1])
      if (!text) return null

      // blivechat: extract rich user info from DANMU_MSG info array
      // info[0] = [mode, font_size, color, timestamp, rnd, ..., msg_type, ..., dm_type, emoticon_options, voice_config, mode_info]
      // info[0][15] = mode_info (dict with 'user' → 'base' → 'face', and 'extra')
      // info[2] = [uid, uname, admin, vip, svip, urank, mobile_verify, uname_color]
      // info[3] = [medal_level, medal_name, runame, medal_room_id, mcolor, special_medal]
      // info[4] = [user_level, ...]
      // info[5] = [old_title, title]
      // info[7] = privilege_type
      // info[16] = [wealth_level]
      const modeInfo = info?.[0]?.[15] || {}
      const medalInfo = info?.[3] || []
      const medalLevel = asNumber(medalInfo?.[0])
      const medalName = asString(medalInfo?.[1])
      const medalRoomId = asNumber(medalInfo?.[3])
      const authorLevel = asNumber(info?.[4]?.[0])
      const urank = asNumber(info?.[2]?.[5])
      const privilegeType = asNumber(info?.[7])
      const mobileVerify = asNumber(info?.[2]?.[6])
      const isNewbie = urank !== undefined ? urank < 10000 : undefined
      const isMobileVerified = mobileVerify !== undefined ? mobileVerify === 1 : undefined

      // blivechat: only show medal if it belongs to current room
      const showMedal = medalRoomId !== undefined && this.roomId !== undefined
        ? medalRoomId === 0 || medalRoomId === this.roomId
        : true

      // blivechat: author type classification
      const authorType = getAuthorType(
        { uid: Number(uid), admin: false, privilege_type: privilegeType || 0 },
        this.roomOwnerUid,
      )

      // blivechat: check for gift danmaku (msg_type) - info[0][9]
      const msgType = asNumber(info?.[0]?.[9])
      const isGiftDanmaku = msgType !== undefined ? msgType !== 0 : false

      // blivechat: extract face from mode_info['user']['base']['face'] (blivedm pattern)
      // https://github.com/xfgryujk/blivedm/blob/master/blivedm/models/web.py#L125
      let face: string | undefined
      try {
        face = modeInfo?.user?.base?.face
      } catch {
        face = info?.[2]?.[4] || info?.face
      }
      if (!face) {
        face = info?.[2]?.[4] || info?.face
      }

      // blivechat: extract extra dict from mode_info['extra'] (blivedm pattern)
      // https://github.com/xfgryujk/blivedm/blob/master/blivedm/models/web.py#L250
      let extra: any
      try {
        extra = modeInfo?.extra || {}
      } catch {
        extra = info?.extra || {}
      }
      if (!extra || typeof extra === 'string') {
        try {
          extra = JSON.parse(extra || '{}')
        } catch {
          extra = {}
        }
      }
      const replyUname = asString(extra?.reply_uname || extra?.content?.[25])
      const showContent = replyUname ? `@${replyUname} ${text}` : text

      // blivechat: extract dm_type from info[0][12] and emoticon_options from info[0][13] (blivedm pattern)
      // https://github.com/xfgryujk/blivedm/blob/master/blivedm/models/web.py#L160-L161
      const dmType = asNumber(info?.[0]?.[12])
      const emoticonOptions = info?.[0]?.[13]
      let emoticonUrl: string | undefined
      if (typeof emoticonOptions === 'object' && emoticonOptions) {
        emoticonUrl = asString(emoticonOptions?.url)
      } else if (typeof emoticonOptions === 'string') {
        try {
          const parsed = JSON.parse(emoticonOptions)
          emoticonUrl = asString(parsed?.url)
        } catch {
          // not JSON
        }
      }

      return [
        {
          id: nowId('bili-chat'),
          method: CastMethod.CHAT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(face),
          },
          content: showContent,
          time: Date.now(),
          // blivechat rich fields
          medalLevel: showMedal ? medalLevel : undefined,
          medalName: showMedal ? medalName : undefined,
          privilegeType: privilegeType,
          authorLevel: authorLevel,
          isNewbie: isNewbie,
          isMobileVerified: isMobileVerified,
          contentType: dmType === 1 ? 1 : 0,
          contentTypeParams: emoticonUrl ? [emoticonUrl] : undefined,
          isMirror: (cmd as string) === 'DANMU_MSG_MIRROR',
          isGiftDanmaku: isGiftDanmaku,
        },
      ]
    }

    // ── SEND_GIFT: gift event ──
    if (cmd === 'SEND_GIFT') {
      const d = data?.data || data
      const userName = asString(d?.uname) || '匿名用户'
      const uid = asString(d?.uid)
      const giftName = asString(d?.giftName) || asString(d?.gift_name) || 'gift'
      const giftId = asString(d?.giftId) || asString(d?.gift_id) || giftName
      const countRaw = d?.num ?? d?.gift_num ?? 1
      const count = typeof countRaw === 'number' ? countRaw : Number.parseInt(String(countRaw), 10)

      // blivechat: extract coin info
      const coinType = asString(d?.coin_type)
      const totalCoin = asNumber(d?.total_coin) || asNumber(d?.price) || 0
      const isPaid = coinType === 'gold'
      // blivechat: gift_img_basic is nested under gift_info (blivedm pattern)
      // https://github.com/xfgryujk/blivedm/blob/master/blivedm/models/web.py#L329
      const giftIconUrl = asString(d?.gift_info?.img_basic || d?.gift_img_basic || d?.gift_icon || d?.img_basic)
      const guardLevel = asNumber(d?.guard_level) || 0

      // blivechat: medal info
      const medalLevel = asNumber(d?.medal_info?.medal_level || d?.medal_level)
      const medalName = asString(d?.medal_info?.medal_name || d?.medal_name)

      return [
        {
          id: nowId('bili-gift'),
          method: CastMethod.GIFT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face || d?.uface),
          },
          gift: {
            id: giftId,
            name: giftName,
            count: Number.isFinite(count) ? count : 1,
            repeatEnd: 1,
            icon: giftIconUrl,
            price: totalCoin,
          },
          time: Date.now(),
          // blivechat rich fields
          totalCoin: isPaid ? totalCoin : 0,
          totalFreeCoin: !isPaid ? totalCoin : 0,
          giftIconUrl: giftIconUrl,
          privilegeType: guardLevel,
          medalLevel: medalLevel,
          medalName: medalName,
        },
      ]
    }

    // ── INTERACT_WORD / INTERACT_WORD_V2: user enter / follow ──
    if (cmd === 'INTERACT_WORD' || cmd === 'INTERACT_WORD_V2') {
      const d = data?.data || data
      let userName: string | undefined
      let uid: string | undefined
      let face: string | undefined
      let msgType: number | undefined

      if (cmd === 'INTERACT_WORD_V2' && d?.pb) {
        // blivechat: INTERACT_WORD_V2 uses protobuf format
        // Try to parse the pb field - it's a base64-encoded protobuf
        // The protobuf schema has: uid(int64), uname(string), uinfo(base{face}), timestamp(int64), msg_type(int32)
        try {
          const pbBytes = Uint8Array.from(atob(d.pb), c => c.charCodeAt(0))
          // Simple protobuf field extraction (varint + length-delimited)
          // We parse known fields: uid=1 (varint), uname=2 (string), uinfo=3 (embedded), timestamp=5 (varint), msg_type=6 (varint)
          let offset = 0
          while (offset < pbBytes.length) {
            const tag = pbBytes[offset]
            if (tag === undefined) break
            const fieldNum = tag >> 3
            const wireType = tag & 0x07
            offset++
            if (fieldNum === 2 && wireType === 2) {
              // uname (length-delimited string)
              const strLen = pbBytes[offset] ?? 0
              offset++
              userName = new TextDecoder().decode(pbBytes.slice(offset, offset + strLen))
              offset += strLen
            } else if (fieldNum === 1 && wireType === 0) {
              // uid (varint)
              let value = 0
              let shift = 0
              while (offset < pbBytes.length) {
                const byte = pbBytes[offset]
                offset++
                value |= (byte & 0x7f) << shift
                if ((byte & 0x80) === 0) break
                shift += 7
              }
              uid = String(value)
            } else if (fieldNum === 6 && wireType === 0) {
              // msg_type (varint)
              let value = 0
              let shift = 0
              while (offset < pbBytes.length) {
                const byte = pbBytes[offset]
                offset++
                value |= (byte & 0x7f) << shift
                if ((byte & 0x80) === 0) break
                shift += 7
              }
              msgType = value
            } else if (fieldNum === 3 && wireType === 2) {
              // uinfo (embedded message) - skip it for now, face is not critical
              const msgLen = pbBytes[offset] ?? 0
              offset++
              offset += msgLen
            } else if (wireType === 0) {
              // Skip unknown varint
              while (offset < pbBytes.length) {
                if ((pbBytes[offset] & 0x80) === 0) { offset++; break }
                offset++
              }
            } else if (wireType === 2) {
              // Skip unknown length-delimited
              const len = pbBytes[offset] ?? 0
              offset++
              offset += len
            } else {
              break
            }
          }
        } catch {
          // protobuf parsing failed, fall back to JSON fields
        }
      }

      // Fallback to JSON fields if protobuf parsing didn't yield results
      if (!userName) userName = asString(d?.uname) || '匿名用户'
      if (!uid) uid = asString(d?.uid)
      if (!face) face = asString(d?.face || d?.uface)
      if (msgType === undefined) msgType = d?.msg_type

      // msg_type: 1=enter, 2=follow, 3=share, 4=special follow, 5=互粉, 6=点赞
      const content = msgType === 2 ? '关注了主播' : '进入直播间'

      return [
        {
          id: nowId('bili-interact'),
          method: CastMethod.MEMBER,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(face),
          },
          content,
          time: Date.now(),
        },
      ]
    }

    // ── SUPER_CHAT_MESSAGE: super chat (paid highlighted message) ──
    if (cmd === 'SUPER_CHAT_MESSAGE') {
      const d = data?.data || data
      const user = d?.user_info || {}
      const userName = asString(user?.uname) || '匿名用户'
      const uid = asString(user?.uid)
      const text = asString(d?.message)
      if (!text) return null

      // blivechat: extract price and medal info
      const price = asNumber(d?.price) || 0
      const medalLevel = asNumber(d?.medal_info?.medal_level || d?.medal_level)
      const medalName = asString(d?.medal_info?.medal_name || d?.medal_name)
      const guardLevel = asNumber(d?.guard_level) || 0

      return [
        {
          id: nowId('bili-superchat'),
          method: CastMethod.CHAT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(user?.face || d?.face),
          },
          content: text,
          time: Date.now(),
          // blivechat rich fields
          price: price,
          privilegeType: guardLevel,
          medalLevel: medalLevel,
          medalName: medalName,
        },
      ]
    }

    // ── SUPER_CHAT_MESSAGE_DELETE: delete super chat ──
    if (cmd === 'SUPER_CHAT_MESSAGE_DELETE') {
      const d = data?.data || data
      const ids: string[] = d?.ids || []

      if (ids.length === 0) return null

      return [
        {
          id: nowId('bili-superchat-del'),
          method: CastMethod.CUSTOM,
          content: 'SUPER_CHAT_DELETE',
          delSuperChatIds: ids,
          time: Date.now(),
        },
      ]
    }

    // ── LIKE_INFO_V3_CLICK: user liked (new version) ──
    if (cmd === 'LIKE_INFO_V3_CLICK' || cmd === 'LIKE_INFO_V3_UPDATE') {
      const d = data?.data || data
      const userName = asString(d?.uname) || '匿名用户'
      const uid = asString(d?.uid)
      const likeCount = asString(d?.like_num) || asString(d?.click_num) || '1'

      return [
        {
          id: nowId('bili-like'),
          method: CastMethod.LIKE,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face),
          },
          content: `为主播点赞了(${likeCount})`,
          likeCount,
          time: Date.now(),
        },
      ]
    }

    // ── ONLINE_RANK_COUNT: real-time viewer count update ──
    if (cmd === 'ONLINE_RANK_COUNT') {
      const d = data?.data || data
      const count = d?.count

      return [
        {
          id: nowId('bili-room-stats'),
          method: CastMethod.ROOM_STATS,
          room: {
            audienceCount: count != null ? Number(count) : undefined,
          },
          time: Date.now(),
        },
      ]
    }

    // ── ONLINE_RANK_V2: top viewers ranking ──
    if (cmd === 'ONLINE_RANK_V2') {
      const d = data?.data || data
      const list: any[] = d?.list || []
      const ranks = list.map((item: any, index: number) => ({
        rank: index + 1,
        score: item?.score != null ? Number(item.score) : 0,
        nickname: asString(item?.uname) || '未知用户',
        avatar: asString(item?.face) || '',
      }))

      return [
        {
          id: nowId('bili-rank'),
          method: CastMethod.ROOM_RANK,
          rank: ranks,
          time: Date.now(),
        },
      ]
    }

    // ── WATCHED_CHANGE: watched count update ──
    if (cmd === 'WATCHED_CHANGE') {
      const d = data?.data || data
      const watchedCount = d?.num ?? d?.watched_num

      return [
        {
          id: nowId('bili-watched'),
          method: CastMethod.ROOM_STATS,
          room: {
            audienceCount: watchedCount != null ? Number(watchedCount) : undefined,
          },
          time: Date.now(),
        },
      ]
    }

    // ── ROOM_REAL_TIME_MESSAGE_UPDATE: room status update ──
    if (cmd === 'ROOM_REAL_TIME_MESSAGE_UPDATE') {
      const d = data?.data || data
      return [
        {
          id: nowId('bili-room-update'),
          method: CastMethod.ROOM_DATA_SYNC,
          room: {
            audienceCount: d?.fans != null ? Number(d.fans) : undefined,
          },
          content: d?.room_notice || '',
          time: Date.now(),
        },
      ]
    }

    // ── STOP_LIVE_ROOM_LIST / LIVE: room live status changed ──
    if (cmd === 'LIVE' || cmd === 'PREPARING') {
      return [
        {
          id: nowId('bili-control'),
          method: CastMethod.CONTROL,
          content: cmd === 'LIVE' ? '直播开始' : '准备直播',
          time: Date.now(),
        },
      ]
    }

    // ── ENTRY_EFFECT: entry animation effect (fan club / guard) ──
    if (cmd === 'ENTRY_EFFECT') {
      const d = data?.data || data
      const userName = asString(d?.uname) || asString(d?.copy_writing?.split(' ')?.[0]) || '用户'
      const uid = asString(d?.uid)

      return [
        {
          id: nowId('bili-entry'),
          method: CastMethod.MEMBER,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face),
          },
          content: '进入直播间',
          time: Date.now(),
        },
      ]
    }

    // ── GUARD_BUY: someone bought a guard (舰长/提督/总督) ──
    // blivechat treats this as ADD_MEMBER (not GIFT), so we use CastMethod.MEMBER
    if (cmd === 'GUARD_BUY') {
      const d = data?.data || data
      const userName = asString(d?.uname) || '匿名用户'
      const uid = asString(d?.uid)
      const guardLevel = d?.guard_level ?? 0
      const guardNames: Record<number, string> = { 1: '总督', 2: '提督', 3: '舰长' }
      const guardName = guardNames[guardLevel] || `守护${guardLevel}`
      const num = d?.num ?? 1
      const unit = asString(d?.unit) || '个月'

      // blivechat: extract price info
      const price = asNumber(d?.price) || 0
      const totalCoin = price * num

      return [
        {
          id: nowId('bili-guard'),
          // blivechat uses ADD_MEMBER for guard buy
          method: CastMethod.MEMBER,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face || d?.uface),
          },
          content: `购买了${guardName}(${num}${unit})`,
          time: Date.now(),
          // blivechat rich fields
          privilegeType: guardLevel,
          totalCoin: totalCoin,
          gift: {
            id: `guard_${guardLevel}`,
            name: guardName,
            count: num,
            repeatEnd: 1,
            price: totalCoin,
          },
        },
      ]
    }

    // ── USER_TOAST_MSG_V2: guard buy notification (blivechat handles this) ──
    if (cmd === 'USER_TOAST_MSG_V2') {
      const d = data?.data || data
      // blivechat: skip source=2 messages (官方评论栏不会显示2的消息)
      if (d?.source === 2) return null

      const userName = asString(d?.username) || '匿名用户'
      const uid = asString(d?.uid)
      const guardLevel = d?.guard_level ?? 0
      const guardNames: Record<number, string> = { 1: '总督', 2: '提督', 3: '舰长' }
      const guardName = guardNames[guardLevel] || `守护${guardLevel}`
      const num = d?.num ?? 1
      const unit = asString(d?.unit) || '个月'

      return [
        {
          id: nowId('bili-toast-guard'),
          method: CastMethod.MEMBER,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face),
          },
          content: `购买了${guardName}(${num}${unit})`,
          privilegeType: guardLevel,
          time: Date.now(),
        },
      ]
    }

    // ── COMBO_SEND: combo gift ──
    if (cmd === 'COMBO_SEND') {
      const d = data?.data || data
      const userName = asString(d?.uname) || '匿名用户'
      const uid = asString(d?.uid)
      const giftName = asString(d?.gift_name) || '礼物'
      const giftId = asString(d?.gift_id) || giftName
      const totalCount = d?.total_num ?? d?.combo_num ?? 1

      return [
        {
          id: nowId('bili-combo-gift'),
          method: CastMethod.GIFT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(d?.face),
          },
          gift: {
            id: giftId,
            name: giftName,
            count: Number(totalCount),
            repeatEnd: 1,
          },
          time: Date.now(),
        },
      ]
    }

    // ── SUPER_CHAT_MESSAGE_JPN: Japanese super chat (same format) ──
    if (cmd === 'SUPER_CHAT_MESSAGE_JPN') {
      const d = data?.data || data
      const user = d?.user_info || {}
      const userName = asString(user?.uname) || '匿名用户'
      const uid = asString(user?.uid)
      const text = asString(d?.message)
      if (!text) return null

      // blivechat: extract price and medal info
      const price = asNumber(d?.price) || 0
      const medalLevel = asNumber(d?.medal_info?.medal_level || d?.medal_level)
      const medalName = asString(d?.medal_info?.medal_name || d?.medal_name)
      const guardLevel = asNumber(d?.guard_level) || 0

      return [
        {
          id: nowId('bili-superchat-jpn'),
          method: CastMethod.CHAT,
          user: {
            realId: uid ? `bili_${uid}` : undefined,
            id: uid,
            name: userName,
            avatar: processAvatarUrl(user?.face || d?.face),
          },
          content: text,
          time: Date.now(),
          // blivechat rich fields
          price: price,
          privilegeType: guardLevel,
          medalLevel: medalLevel,
          medalName: medalName,
        },
      ]
    }

    // ── Unknown command: ignore ──
    return null
  }

  // ════════════════════════════════════════════════════════════════
  // Connection lifecycle methods
  // ════════════════════════════════════════════════════════════════

  /**
   * Handle WebSocket close event.
   * Implements blivechat-style reconnect with exponential backoff + jitter.
   */
  private handleClose() {
    this.stopBatchTimer()
    this.stopHeartbeat()

    if (this.isClosed) {
      this.emit('close')
      return
    }

    if (this.shouldReconnect) {
      this.isReconnecting = true
      this.reconnectCount++
      this.totalReconnectCount++

      // blivechat pattern: cap total reconnect attempts
      if (this.totalReconnectCount > BILI_PROTOCOL.MAX_RECONNECT_COUNT) {
        this.shouldReconnect = false
        this.emit('close')
        return
      }

      this.emit('reconnecting', this.reconnectCount)

      // blivechat: exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectCount - 1), 30000)
      const jitter = Math.random() * 1000
      const delay = baseDelay + jitter

      setTimeout(() => {
        if (!this.isClosed && this.shouldReconnect) {
          void this.connectInternal()
        }
      }, delay)
    } else {
      this.emit('close')
    }
  }

  /**
   * Start heartbeat interval (blivechat: 10s interval).
   * Also starts stale-connection detection.
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastReceiveTime = Date.now()
    this.pingCount = 0

    this.heartbeatTimer = setInterval(() => {
      this.handleStaleConnection()
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeatBody = new Uint8Array(0)
        this.ws.send(buildBiliPacket(BILI_PROTOCOL.OP.HEARTBEAT, heartbeatBody, 1))
      }
    }, BILI_PROTOCOL.HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat interval.
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * Stale connection detection (blivechat pattern).
   * If 2 heartbeats pass without receiving any message, consider the connection stale and reconnect.
   */
  private handleStaleConnection() {
    this.pingCount++
    const elapsed = Date.now() - this.lastReceiveTime
    if (elapsed > BILI_PROTOCOL.HEARTBEAT_INTERVAL * this.downgradePingCount) {
      // Connection is stale, force reconnect
      this.closeWs()
      if (this.shouldReconnect) {
        void this.connectInternal()
      }
    }
  }

  /**
   * Close the WebSocket without triggering reconnect logic.
   */
  private closeWs() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = undefined
    }
  }

  /**
   * Public close method - permanently close the connection.
   */
  close() {
    this.isClosed = true
    this.shouldReconnect = false
    this.stopBatchTimer()
    this.stopHeartbeat()
    this.closeWs()
    this.emit('close')
  }
}

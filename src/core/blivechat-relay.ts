/**
 * BlivechatRelay - WebSocket relay client for blivechat
 *
 * Connects to blivechat's Python backend WebSocket relay (ws://host:port/api/chat)
 * and maps blivechat message types (ADD_TEXT, ADD_GIFT, ADD_MEMBER, ADD_SUPER_CHAT)
 * to the project's unified DyMessage format.
 *
 * Protocol reference: D:/project/blivechat/api/chat.py
 * Frontend client reference: D:/project/blivechat/frontend/src/api/chat/ChatClientRelay.js
 */

import { Emitter, type EventMap } from './emitter'
import { CastMethod, type DyMessage } from './dycast'

// ── blivechat WebSocket Commands ──
const COMMAND_HEARTBEAT = 0
const COMMAND_JOIN_ROOM = 1
const COMMAND_ADD_TEXT = 2
const COMMAND_ADD_GIFT = 3
const COMMAND_ADD_MEMBER = 4
const COMMAND_ADD_SUPER_CHAT = 5
const COMMAND_DEL_SUPER_CHAT = 6
const COMMAND_UPDATE_TRANSLATION = 7
const COMMAND_FATAL_ERROR = 8

// Content types
const CONTENT_TYPE_TEXT = 0
const CONTENT_TYPE_EMOTICON = 1

// Author types (from blivechat constants)
const AUTHOR_TYPE_NORMAL = 0
const AUTHOR_TYPE_MANAGER = 1
const AUTHOR_TYPE_OWNER = 2

// Receive timeout: if no message received for this long, reconnect
const RECEIVE_TIMEOUT = 15 * 1000

// Heartbeat interval (server sends heartbeat, we respond)
const HEARTBEAT_INTERVAL = 10 * 1000

// Max total reconnect attempts
const MAX_TOTAL_RECONNECT = 30

// ── Event interface ──

interface BlivechatRelayEvent extends EventMap {
  open: () => void
  close: () => void
  error: (e: Error) => void
  message: (messages: DyMessage[]) => void
  reconnecting: (attempt: number) => void
  reconnect: () => void
}

// ── Helper: generate unique ID ──

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ── BlivechatRelay class ──

export class BlivechatRelay extends Emitter<BlivechatRelayEvent> {
  private ws: WebSocket | null = null
  private host: string
  private port: number
  private roomKey: string
  private autoTranslate: boolean

  private retryCount = 0
  private totalRetryCount = 0
  private isDestroying = false
  private isReconnecting = false
  private isClosed = false

  private receiveTimeoutTimerId: ReturnType<typeof setTimeout> | undefined
  private heartbeatTimerId: ReturnType<typeof setInterval> | undefined

  // ── Message buffer for batching ──
  private messageBuffer: DyMessage[] = []
  private batchTimer: ReturnType<typeof setTimeout> | undefined
  private readonly BATCH_INTERVAL = 150 // ms

  constructor(
    roomKey: string,
    options?: {
      host?: string
      port?: number
      autoTranslate?: boolean
    },
  ) {
    super()
    this.roomKey = roomKey
    this.host = options?.host ?? '127.0.0.1'
    this.port = options?.port ?? 12450
    this.autoTranslate = options?.autoTranslate ?? false
  }

  // ── Public API ──

  connect() {
    if (!this.roomKey) {
      throw new Error('Invalid blivechat room key')
    }
    this.isClosed = false
    this.isDestroying = false
    this.wsConnect()
  }

  close() {
    this.isDestroying = true
    this.isClosed = true
    this.stopBatchTimer()
    this.clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
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

  // ── WebSocket connection ──

  private wsConnect() {
    if (this.isDestroying) return

    const url = `ws://${this.host}:${this.port}/api/chat`
    console.log(`[BlivechatRelay] Connecting to ${url}`)

    try {
      const ws = new WebSocket(url)
      ws.onopen = this.onWsOpen.bind(this)
      ws.onclose = this.onWsClose.bind(this)
      ws.onmessage = this.onWsMessage.bind(this)
      ws.onerror = this.onWsError.bind(this)
      this.ws = ws
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create WebSocket')
      this.emit('error', error)
      this.scheduleReconnect()
    }
  }

  private onWsOpen() {
    console.log('[BlivechatRelay] Connected, sending JOIN_ROOM')

    // Send JOIN_ROOM command
    this.send({
      cmd: COMMAND_JOIN_ROOM,
      data: {
        roomKey: this.roomKey,
        config: {
          autoTranslate: this.autoTranslate,
        },
      },
    })

    this.retryCount = 0
    this.isReconnecting = false
    this.refreshReceiveTimeoutTimer()
    this.startBatchTimer()
    this.emit('open')
  }

  private onWsClose() {
    console.log('[BlivechatRelay] Disconnected')
    this.ws = null
    this.clearTimers()
    this.stopBatchTimer()

    if (this.isDestroying) {
      this.emit('close')
      return
    }

    this.scheduleReconnect()
  }

  private onWsError(event: Event) {
    console.error('[BlivechatRelay] WebSocket error', event)
    this.emit('error', new Error('WebSocket error'))
  }

  private onWsMessage(event: MessageEvent) {
    this.refreshReceiveTimeoutTimer()

    try {
      const { cmd, data } = JSON.parse(event.data as string)
      const messages = this.handleCommand(cmd, data)
      if (messages && messages.length > 0) {
        this.pushToBuffer(messages)
      }

      // Reset retry count on successful message (except FATAL_ERROR)
      if (cmd !== COMMAND_FATAL_ERROR) {
        this.retryCount = 0
      }
    } catch (err) {
      console.error('[BlivechatRelay] Failed to parse message', err)
    }
  }

  // ── Command handling ──

  private handleCommand(cmd: number, data: any): DyMessage[] | null {
    switch (cmd) {
      case COMMAND_HEARTBEAT: {
        // Server sends heartbeat, we respond
        this.send({ cmd: COMMAND_HEARTBEAT })
        return null
      }

      case COMMAND_ADD_TEXT: {
        // data is an array (bandwidth-efficient format)
        // [avatarUrl, timestamp, authorName, authorType, content, privilegeType,
        //  isGiftDanmaku, authorLevel, isNewbie, isMobileVerified, medalLevel,
        //  id, translation, contentType, contentTypeParams, ?, uid, medalName, isMirror]
        const msg = this.parseTextMessage(data)
        return msg ? [msg] : null
      }

      case COMMAND_ADD_GIFT: {
        // data is an object
        const msg = this.parseGiftMessage(data)
        return msg ? [msg] : null
      }

      case COMMAND_ADD_MEMBER: {
        // data is an object
        const msg = this.parseMemberMessage(data)
        return msg ? [msg] : null
      }

      case COMMAND_ADD_SUPER_CHAT: {
        // data is an object
        const msg = this.parseSuperChatMessage(data)
        return msg ? [msg] : null
      }

      case COMMAND_DEL_SUPER_CHAT: {
        // data: { ids: string[] }
        const msg: DyMessage = {
          id: nowId('sc_del'),
          method: CastMethod.CUSTOM,
          time: Date.now(),
          delSuperChatIds: data.ids,
        }
        return [msg]
      }

      case COMMAND_UPDATE_TRANSLATION: {
        // data: [id, translation]
        // We don't have a direct way to update existing messages in DyMessage format,
        // so we'll emit a custom message with the translation info
        const msg: DyMessage = {
          id: nowId('trans'),
          method: CastMethod.CUSTOM,
          time: Date.now(),
          translation: data[1],
          // Store the original message id so the UI can match it
          content: `[translation]${data[0]}`,
        }
        return [msg]
      }

      case COMMAND_FATAL_ERROR: {
        this.isDestroying = true
        const error = new Error(`[Blivechat] Fatal error: ${data.msg} (type=${data.type})`)
        this.emit('error', error)
        this.close()
        return null
      }

      default:
        console.warn(`[BlivechatRelay] Unknown command: ${cmd}`)
        return null
    }
  }

  // ── Message parsers ──

  private parseTextMessage(data: any[]): DyMessage | null {
    if (!data || data.length < 19) return null

    const avatarUrl = data[0] as string
    const timestamp = data[1] as number
    const authorName = data[2] as string
    const authorType = data[3] as number
    const content = data[4] as string
    const privilegeType = data[5] as number
    const isGiftDanmaku = Boolean(data[6])
    const authorLevel = data[7] as number
    const isNewbie = Boolean(data[8])
    const isMobileVerified = Boolean(data[9])
    const medalLevel = data[10] as number
    const id = data[11] as string
    const translation = data[12] as string
    const contentType = data[13] as number
    const contentTypeParams = data[14] as any
    const uid = data[16] as string
    const medalName = data[17] as string
    const isMirror = Boolean(data[18])

    // Build rtfContent for emoticon messages
    let rtfContent: DyMessage['rtfContent']
    if (contentType === CONTENT_TYPE_EMOTICON && contentTypeParams) {
      rtfContent = [
        { type: 2, url: contentTypeParams[0] as string },
      ]
    }

    const msg: DyMessage = {
      id: id || nowId('bili_chat'),
      method: CastMethod.CHAT,
      time: timestamp * 1000,
      user: {
        id: uid,
        name: authorName,
        avatar: avatarUrl,
      },
      content: content,
      rtfContent,
      // blivechat-specific fields
      translation,
      medalLevel,
      medalName,
      privilegeType,
      authorLevel,
      isNewbie,
      isMobileVerified,
      contentType,
      contentTypeParams: contentTypeParams ? [String(contentTypeParams)] : undefined,
      isMirror,
      isGiftDanmaku,
    }

    return msg
  }

  private parseGiftMessage(data: any): DyMessage | null {
    if (!data) return null

    const msg: DyMessage = {
      id: data.id || nowId('bili_gift'),
      method: CastMethod.GIFT,
      time: (data.timestamp || Date.now() / 1000) * 1000,
      user: {
        id: data.uid,
        name: data.authorName,
        avatar: data.avatarUrl,
      },
      gift: {
        id: String(data.giftId || ''),
        name: data.giftName,
        count: data.num || 1,
        icon: data.giftIconUrl,
        price: data.totalCoin,
      },
      // blivechat-specific fields
      totalCoin: data.totalCoin,
      totalFreeCoin: data.totalFreeCoin,
      giftIconUrl: data.giftIconUrl,
      privilegeType: data.privilegeType,
      medalLevel: data.medalLevel,
      medalName: data.medalName,
    }

    return msg
  }

  private parseMemberMessage(data: any): DyMessage | null {
    if (!data) return null

    const msg: DyMessage = {
      id: data.id || nowId('bili_member'),
      method: CastMethod.MEMBER,
      time: (data.timestamp || Date.now() / 1000) * 1000,
      user: {
        id: data.uid,
        name: data.authorName,
        avatar: data.avatarUrl,
      },
      content: `${data.authorName} 开通了${data.unit || ''}舰长`,
      // blivechat-specific fields
      privilegeType: data.privilegeType,
      medalLevel: data.medalLevel,
      medalName: data.medalName,
      totalCoin: data.total_coin,
    }

    return msg
  }

  private parseSuperChatMessage(data: any): DyMessage | null {
    if (!data) return null

    const msg: DyMessage = {
      id: data.id || nowId('bili_sc'),
      method: CastMethod.CHAT,
      time: (data.timestamp || Date.now() / 1000) * 1000,
      user: {
        id: data.uid,
        name: data.authorName,
        avatar: data.avatarUrl,
      },
      content: data.content,
      price: data.price,
      translation: data.translation,
      // blivechat-specific fields
      privilegeType: data.privilegeType,
      medalLevel: data.medalLevel,
      medalName: data.medalName,
    }

    return msg
  }

  // ── Send message ──

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  // ── Timer management ──

  private refreshReceiveTimeoutTimer() {
    if (this.receiveTimeoutTimerId) {
      clearTimeout(this.receiveTimeoutTimerId)
    }
    this.receiveTimeoutTimerId = setTimeout(() => {
      this.onReceiveTimeout()
    }, RECEIVE_TIMEOUT)
  }

  private onReceiveTimeout() {
    this.receiveTimeoutTimerId = undefined
    console.warn('[BlivechatRelay] Receive timeout, reconnecting...')
    if (this.ws) {
      // Force close and reconnect
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
    this.scheduleReconnect()
  }

  private clearTimers() {
    if (this.receiveTimeoutTimerId) {
      clearTimeout(this.receiveTimeoutTimerId)
      this.receiveTimeoutTimerId = undefined
    }
    if (this.heartbeatTimerId) {
      clearInterval(this.heartbeatTimerId)
      this.heartbeatTimerId = undefined
    }
  }

  // ── Reconnect logic ──

  private scheduleReconnect() {
    if (this.isDestroying || this.isClosed) return

    this.retryCount++
    this.totalRetryCount++

    // Prevent infinite reconnect (same as blivechat: max 30 total retries)
    if (this.totalRetryCount > MAX_TOTAL_RECONNECT) {
      this.isDestroying = true
      this.emit('error', new Error('Max reconnect attempts reached'))
      this.emit('close')
      return
    }

    this.isReconnecting = true
    this.emit('reconnecting', this.retryCount)

    // Exponential backoff with jitter (same as blivechat)
    const interval = Math.min(1000 + (this.totalRetryCount - 1) * 2000, 20 * 1000)
    const jitter = Math.random() * 3000
    const delay = interval + jitter

    console.log(`[BlivechatRelay] Reconnecting in ${Math.round(delay)}ms (attempt ${this.totalRetryCount})`)

    setTimeout(() => {
      if (!this.isDestroying && !this.isClosed) {
        this.wsConnect()
      }
    }, delay)
  }
}

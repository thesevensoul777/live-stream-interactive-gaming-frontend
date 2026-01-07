type DyCastOptions = {
  roomId: string
  heartbeatInterval?: number
}

const DEFAULT_OPTS = {
  heartbeatInterval: 10000,
}

export class DyCastClient {
  private ws?: WebSocket
  private roomId: string

  constructor(opts: DyCastOptions) {
    this.roomId = opts.roomId
  }

  /**
   * 获取 fetch 基础地址
   */
  private get fetchBase() {
    return import.meta.env.VITE_DYCAST_FETCH_BASE
  }

  /**
   * 获取 websocket 基础地址
   */
  private get wsBase() {
    return import.meta.env.VITE_DYCAST_WS_BASE
  }

  /**
   * 拉取房间连接信息（fetch）
   */
  async fetchConnectInfo() {
    const url = `${this.fetchBase}/webcast/im/fetch/?room_id=${this.roomId}`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Fetch Live Info Error')
    }

    return res.json()
  }

  /**
   * 构建 WebSocket URL
   */
  private buildSocketUrl(params: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return `${this.wsBase}/webcast/im/push/v2/?${query}`
  }

  /**
   * 连接房间
   */
  async connect() {
    const info = await this.fetchConnectInfo()

    const wsUrl = this.buildSocketUrl({
      room_id: this.roomId,
      ...info,
    })

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('[DyCast] WebSocket connected')
    }

    this.ws.onmessage = (ev) => {
      this.handleMessage(ev.data)
    }

    this.ws.onerror = (err) => {
      console.error('[DyCast] WS error', err)
    }

    this.ws.onclose = (ev) => {
      console.warn('[DyCast] WS closed', ev.code, ev.reason)
    }
  }

  private handleMessage(data: any) {
    // TODO: protobuf 解析 / 弹幕处理
    console.log('[DyCast] message', data)
  }

  close() {
    this.ws?.close()
    this.ws = undefined
  }
}

export class BufferService {
  constructor() {
    /* ================= gift buffer ================= */
    this.giftBuffer = []
    this.GIFT_LIMIT = 100
    this.GIFT_FLUSH_INTERVAL = 6000 // 5 秒
    this.giftFlushing = false
    this.giftTimer = null
    this.authToken = null
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5150'

    /* ================= game config ================= */
    this.gamePath = '' // 新增：用于存储魔兽争霸路径

    /* ================= lifecycle ================= */
    this.initGiftTimer()
    this.initShutdownHook()
  }

  /* =================================================
   * gift 相关逻辑
   * ================================================= */


  setAuthToken(token) {
    this.authToken = token || null
  }

  clearAuthToken() {
    this.authToken = null
  }


  /**
   * 设置魔兽争霸游戏路径
   * @param {string} path 
   */
  setGamePath(path) {
    this.gamePath = path
    console.log('BufferService: 游戏路径已更新为 ->', path)
  }

  /**
   * 获取当前存储的游戏路径
   * @returns {string}
   */
  getGamePath() {
        console.log('BufferService: 当前游戏路径是', this.gamePath)
    return this.gamePath
  }

  addGift(gift) {
    this.giftBuffer.push(gift)

    if (this.giftBuffer.length >= this.GIFT_LIMIT) {
      this.flushGift()
    }
  }



  initGiftTimer() {
    this.giftTimer = setInterval(() => {
      if (this.giftBuffer.length > 0) {
        this.flushGift()
      }
    }, this.GIFT_FLUSH_INTERVAL)
  }

  async flushGift() {
    if (this.giftFlushing) return
    if (!this.giftBuffer.length) return

    this.giftFlushing = true

    const gifts = this.giftBuffer
    this.giftBuffer = []

    try {
         if (!this.authToken) throw new Error('No Authorization token')
    const res = await fetch(`${this.apiBaseUrl}/gift/batchUpdate`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
   'Authorization': 'Bearer ' + this.authToken
   },
  body: JSON.stringify(gifts)
});

if (!res.ok) {
  console.error('Gift flush failed', res.status, await res.text());
} else {
  console.log('Gift flush success');
}
    } catch (err) {
      console.error('Gift flush failed', err)
      // 失败兜底：塞回 buffer
      this.giftBuffer.unshift(...gifts)
    } finally {
      this.giftFlushing = false
    }
  }

  /* =================================================
   * playerDelta 相关逻辑（不 buffer）
   * ================================================= */

  /**
   * 对局结束 / 按钮触发
   * deltaList: PlayerDelta[]
   */
  async sendPlayerDelta(deltaList) {
    if (!deltaList || !deltaList.length) return

    try {
      await fetch(`${this.apiBaseUrl}/player-delta/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,  'Authorization': 'Bearer ' + this.authToken},
        body: JSON.stringify({ playerDeltas: deltaList })
      })
    } catch (err) {
      console.error('PlayerDelta send failed', err)
      // 如果你未来需要重试，这里可以接消息队列 / 本地缓存
    }
  }

  /* =================================================
   * 应用关闭兜底
   * ================================================= */

  initShutdownHook() {
    const flushBeforeExit = async () => {
      try {
        await this.flushGift()
      } catch (e) {
        console.error('Final gift flush failed', e)
      }
    }

    // Node / Electron
    process.on('beforeExit', flushBeforeExit)
    process.on('SIGINT', async () => {
      await flushBeforeExit()
      process.exit(0)
    })
    process.on('SIGTERM', async () => {
      await flushBeforeExit()
      process.exit(0)
    })

    // 浏览器 / Electron renderer
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.giftBuffer.length > 0) {
          navigator.sendBeacon(
            `${this.apiBaseUrl}/gift/batch`,
            JSON.stringify({ gifts: this.giftBuffer })
          )
        }
      })
    }
  }
}

export const bufferService = new BufferService();

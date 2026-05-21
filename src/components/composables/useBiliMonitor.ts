/**
 * useBiliMonitor - Vue 组合式函数
 * 
 * 封装了与 Electron 主进程的 Bilibili 弹幕监控通信。
 * 每个主播（userId）拥有独立的登录凭证和弹幕通道。
 * 
 * 使用示例：
 * ```ts
 * const monitor = useBiliMonitor('host_zhangsan')
 * 
 * // 检查登录状态
 * const { authenticated } = await monitor.checkAuth()
 * 
 * // 启动监控（如果未登录会自动弹出扫码窗口）
 * await monitor.startMonitor(7777)
 * 
 * // 监听弹幕
 * monitor.onDanmu((danmu) => {
 *   console.log(danmu.username, danmu.content)
 * })
 * 
 * // 组件卸载时清理
 * onUnmounted(() => monitor.dispose())
 * ```
 */

import { ref, readonly, onUnmounted } from 'vue'

export interface BiliDanmuData {
  uid: number
  username: string
  content: string
  faceUrl: string
}

export interface BiliGiftData {
  uid: number
  username: string
  giftName: string
  giftId: string
  num: number
  faceUrl: string
  price: number
}

export interface BiliMonitorStatus {
  type: 'connected' | 'authenticated' | 'disconnected' | 'max_reconnect_exceeded'
  roomId?: string | number
}

export interface BiliMonitorError {
  message: string
}

export interface ActiveMonitor {
  userId: string
  roomId: string
}

/**
 * 获取 Electron API 代理（兼容非 Electron 环境）
 */
function getElectronAPI(): any {
  return (window as any).electronAPI
}

/**
 * 判断是否在 Electron 环境中运行
 */
function isElectron(): boolean {
  return !!(window as any).electronAPI
}

/**
 * Bilibili 弹幕监控组合式函数
 * @param userId 主播唯一标识
 */
export function useBiliMonitor(userId: string) {
  const isMonitoring = ref(false)
  const isAuthenticated = ref(false)
  const currentRoomId = ref<string | number | null>(null)
  const statusMessage = ref<string>('')
  const errorMessage = ref<string>('')

  // 清理函数列表
  const cleanupFns: Array<() => void> = []

  /**
   * 检查该主播的 B 站登录状态
   */
  async function checkAuth(): Promise<{ authenticated: boolean }> {
    if (!isElectron()) {
      console.warn('[useBiliMonitor] 非 Electron 环境，无法检查 B 站登录状态')
      return { authenticated: false }
    }

    try {
      const api = getElectronAPI()
      const result = await api.biliCheckAuth(userId)
      if (result.ok) {
        isAuthenticated.value = result.authenticated
        return { authenticated: result.authenticated }
      }
      return { authenticated: false }
    } catch (err: any) {
      console.error('[useBiliMonitor] 检查登录状态失败:', err)
      return { authenticated: false }
    }
  }

  /**
   * 启动弹幕监控
   * @param targetRoomId 目标直播间 ID
   */
  async function startMonitor(targetRoomId: string | number): Promise<boolean> {
    if (!isElectron()) {
      errorMessage.value = '非 Electron 环境，无法启动 B 站弹幕监控'
      return false
    }

    try {
      const api = getElectronAPI()
      const result = await api.biliStartMonitor({ userId, targetRoomId })

      if (result.ok) {
        isMonitoring.value = true
        currentRoomId.value = targetRoomId
        statusMessage.value = `监控已启动 - 直播间 ${targetRoomId}`
        errorMessage.value = ''
        return true
      } else {
        errorMessage.value = result.error || '启动监控失败'
        isMonitoring.value = false
        return false
      }
    } catch (err: any) {
      errorMessage.value = err.message || '启动监控异常'
      isMonitoring.value = false
      return false
    }
  }

  /**
   * 停止弹幕监控
   */
  async function stopMonitor(): Promise<boolean> {
    if (!isElectron()) {
      return false
    }

    try {
      const api = getElectronAPI()
      const result = await api.biliStopMonitor(userId)

      if (result.ok) {
        isMonitoring.value = false
        currentRoomId.value = null
        statusMessage.value = '监控已停止'
        return true
      }
      return false
    } catch (err: any) {
      console.error('[useBiliMonitor] 停止监控失败:', err)
      return false
    }
  }

  /**
   * 清除该主播的 B 站登录态
   */
  async function clearAuth(): Promise<boolean> {
    if (!isElectron()) {
      return false
    }

    try {
      // 先停止监控
      if (isMonitoring.value) {
        await stopMonitor()
      }

      const api = getElectronAPI()
      const result = await api.biliClearAuth(userId)

      if (result.ok) {
        isAuthenticated.value = false
        statusMessage.value = '登录态已清除'
        return true
      }
      return false
    } catch (err: any) {
      console.error('[useBiliMonitor] 清除登录态失败:', err)
      return false
    }
  }

  /**
   * 监听弹幕数据
   * @param callback 弹幕回调
   * @returns 清理函数
   */
  function onDanmu(callback: (danmu: BiliDanmuData) => void): () => void {
    if (!isElectron()) {
      return () => {}
    }

    const api = getElectronAPI()
    const cleanup = api.onBiliDanmu(userId, callback)
    cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * 监听礼物数据
   * @param callback 礼物回调
   * @returns 清理函数
   */
  function onGift(callback: (gift: BiliGiftData) => void): () => void {
    if (!isElectron()) {
      return () => {}
    }

    const api = getElectronAPI()
    const cleanup = api.onBiliGift(userId, callback)
    cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * 监听监控状态变化
   * @param callback 状态回调
   * @returns 清理函数
   */
  function onStatus(callback: (status: BiliMonitorStatus) => void): () => void {
    if (!isElectron()) {
      return () => {}
    }

    const api = getElectronAPI()
    const cleanup = api.onBiliStatus(userId, (status: BiliMonitorStatus) => {
      statusMessage.value = `状态: ${status.type}`
      if (status.type === 'connected' || status.type === 'authenticated') {
        isMonitoring.value = true
      } else if (status.type === 'disconnected' || status.type === 'max_reconnect_exceeded') {
        isMonitoring.value = false
      }
      callback(status)
    })
    cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * 监听监控错误
   * @param callback 错误回调
   * @returns 清理函数
   */
  function onError(callback: (error: BiliMonitorError) => void): () => void {
    if (!isElectron()) {
      return () => {}
    }

    const api = getElectronAPI()
    const cleanup = api.onBiliError(userId, (error: BiliMonitorError) => {
      errorMessage.value = error.message
      callback(error)
    })
    cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * 获取所有活跃的监控列表
   */
  async function getActiveMonitors(): Promise<ActiveMonitor[]> {
    if (!isElectron()) {
      return []
    }

    try {
      const api = getElectronAPI()
      const result = await api.biliGetActiveMonitors()
      if (result.ok) {
        return result.monitors || []
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * 清理所有监听器
   */
  function dispose() {
    for (const cleanup of cleanupFns) {
      try {
        cleanup()
      } catch {
        // ignore
      }
    }
    cleanupFns.length = 0
  }

  // 如果组件卸载时自动清理
  onUnmounted(() => {
    dispose()
  })

  return {
    // 状态
    isMonitoring: readonly(isMonitoring),
    isAuthenticated: readonly(isAuthenticated),
    currentRoomId: readonly(currentRoomId),
    statusMessage: readonly(statusMessage),
    errorMessage: readonly(errorMessage),

    // 方法
    checkAuth,
    startMonitor,
    stopMonitor,
    clearAuth,
    onDanmu,
    onGift,
    onStatus,
    onError,
    getActiveMonitors,
    dispose,
  }
}

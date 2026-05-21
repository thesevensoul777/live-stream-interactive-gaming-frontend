const { contextBridge, ipcRenderer } = require('electron');

/* ================= Files And File folder ================= */

contextBridge.exposeInMainWorld('fileAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
});


/* ================= JWT Token Storage ================= */
let authToken = null;




/* ================= Existing Electron API ================= */
contextBridge.exposeInMainWorld('electronAPI', {


  
// 1. 修改为 invoke，确保主窗口知道同步成功
  syncCurrentPlay: (players) => ipcRenderer.invoke('sync-players-to-main', players),

  // 2. 这里的 on 必须保留，因为 Overlay 窗口是在"被动接收"消息
  onSyncPlayers: (callback) => {
    ipcRenderer.removeAllListeners('update-players-to-overlay');
    ipcRenderer.on('update-players-to-overlay', (_event, value) => callback(value));
  },
 /**
  * 游戏结算数据监听
  * @param onSummaryReceived 结算回调函数
  * @returns {Function} 清理函数
  */
  onGameSummary: (onSummaryReceived) => {
    const summarySub = (_event, data) => onSummaryReceived(data);
    
    // 开启监听
    ipcRenderer.on('on-game-summary', summarySub);

    // 返回清理逻辑，供 Vue 组件 onUnmounted 调用
    return () => {
      ipcRenderer.removeListener('on-game-summary', summarySub);
    };
  },
  
  /**
   * Send a command to the main process
   */
  addCommand: (msg, action) =>ipcRenderer.invoke('add-command', { msg, action }),
    /**
   * 礼物事件
   */
  addGift: (msg) =>ipcRenderer.invoke('add-gift', msg),

  /**
   * 点赞事件
   */
  addLike: (msg) =>ipcRenderer.invoke('add-like', msg),

    /**
   * 点赞事件
   */
  getCommands: () =>
    ipcRenderer.invoke('get-commands'),

  injectGame: () =>
    ipcRenderer.invoke('inject-game'),

  fetchLive: (url, headers) =>
    ipcRenderer.invoke('api:fetch-live', url, headers),

  fetchLiveBinary: (url) =>
    ipcRenderer.invoke('api:fetch-binary', url),

  sendData: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
   onReceiveData: (channel, callback) => {
    // 移除旧监听，防止叠加
    ipcRenderer.removeAllListeners(channel);
    // 注册新监听
    ipcRenderer.on(channel, (_event, value) => {
      if (typeof callback === 'function') {
        callback(value);
      }
    });
  },

  /**
   * Brotli decompress binary data via main process (Node.js zlib)
   */
  brotliDecompress: async (data) => {
    return ipcRenderer.invoke('brotli:decompress', data);
  },

  // ════════════════════════════════════════════════════════════════
  // Bilibili 弹幕监控 API (主播独立凭证模式)
  // ════════════════════════════════════════════════════════════════

  /**
   * 检查指定主播的 B 站登录状态
   * @param {string} userId 主播唯一标识
   * @returns {Promise<{ok: boolean, authenticated: boolean, error?: string}>}
   */
  biliCheckAuth: (userId) => ipcRenderer.invoke('bili:check-auth', userId),

  /**
   * 启动 B 站弹幕监控（如果未登录会自动弹出扫码窗口）
   * @param {{userId: string, targetRoomId: string|number}} params
   * @returns {Promise<{ok: boolean, userId?: string, targetRoomId?: string, error?: string}>}
   */
  biliStartMonitor: (params) => ipcRenderer.invoke('bili:start-monitor', params),

  /**
   * 停止指定主播的 B 站弹幕监控
   * @param {string} userId
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  biliStopMonitor: (userId) => ipcRenderer.invoke('bili:stop-monitor', userId),

  /**
   * 清除指定主播的 B 站登录态
   * @param {string} userId
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  biliClearAuth: (userId) => ipcRenderer.invoke('bili:clear-auth', userId),

  /**
   * 获取当前所有活跃的监控列表
   * @returns {Promise<{ok: boolean, monitors: Array<{userId: string, roomId: string}>}>}
   */
  biliGetActiveMonitors: () => ipcRenderer.invoke('bili:get-active-monitors'),

  /**
   * 监听指定主播的弹幕数据
   * @param {string} userId
   * @param {Function} callback (danmu: {uid, username, content, faceUrl}) => void
   * @returns {Function} 清理函数
   */
  onBiliDanmu: (userId, callback) => {
    const channel = `bili:danmu-${userId}`;
    ipcRenderer.removeAllListeners(channel);
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  /**
   * 监听指定主播的礼物数据
   * @param {string} userId
   * @param {Function} callback (gift) => void
   * @returns {Function} 清理函数
   */
  onBiliGift: (userId, callback) => {
    const channel = `bili:gift-${userId}`;
    ipcRenderer.removeAllListeners(channel);
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  /**
   * 监听指定主播的监控状态变化
   * @param {string} userId
   * @param {Function} callback (status) => void
   * @returns {Function} 清理函数
   */
  onBiliStatus: (userId, callback) => {
    const channel = `bili:status-${userId}`;
    ipcRenderer.removeAllListeners(channel);
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  /**
   * 监听指定主播的监控错误
   * @param {string} userId
   * @param {Function} callback (error: {message: string}) => void
   * @returns {Function} 清理函数
   */
  onBiliError: (userId, callback) => {
    const channel = `bili:error-${userId}`;
    ipcRenderer.removeAllListeners(channel);
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

});




/* ================= Buffer Service Bridge ================= */
contextBridge.exposeInMainWorld('buffer', {
  /**
   * Add a gift to the buffer
   */
  addGift: (gift) => ipcRenderer.send('buffer:addGift', gift),

  /**
   * Add a player delta to the buffer
   */
  addPlayerDelta: (delta) => ipcRenderer.send('buffer:addPlayerDelta', delta),

  /**
   * Trigger sending player deltas (per game end)
   */
  sendPlayerDelta: (deltaList) => ipcRenderer.send('buffer:sendPlayerDelta', deltaList),

  /**
   * Flush gifts manually (optional)
   */
  flushGifts: () => ipcRenderer.send('buffer:flushGifts'),

  /**
   * Get Authorization token for BufferService
   */
  getAuthToken: () => authToken
});

contextBridge.exposeInMainWorld('gameAPI', {
  launchWar3: (gamePath) => ipcRenderer.invoke('launch-war3', gamePath),
});

contextBridge.exposeInMainWorld('auth', {
  // 必须在这里定义，渲染进程才能通过 window.auth.setToken 调用
  setToken: (token) => {
    authToken = token;
    ipcRenderer.send('auth:setToken', token);
  },
  clearToken: () => {
    authToken = null;
    ipcRenderer.send('auth:clearToken');
  }
})
/* ================= Open New Window ================= */
contextBridge.exposeInMainWorld('newWindow', {
  /**
   * 开启特效/绿幕窗口
   */
  openOverlay: () => ipcRenderer.send('open-overlay'),
  
  /**
   * 关闭特效/绿幕窗口
   */
  closeOverlay: () => ipcRenderer.send('close-overlay'),
// Vue 调用这个方法来开启"监听模式"
  listening: (onGiftReceived, onLikeReceived) => {
    
    // 监听礼物
    const giftSub = (_event, data) => onGiftReceived(data);
    ipcRenderer.on('broadcast-gift', giftSub);

    // 监听点赞
    const likeSub = (_event, data) => onLikeReceived(data);
    ipcRenderer.on('broadcast-like', likeSub);

    // 返回清理函数，Vue 卸载时调用
    return () => {
      ipcRenderer.removeListener('broadcast-gift', giftSub);
      ipcRenderer.removeListener('broadcast-like', likeSub);
    };
  }
});

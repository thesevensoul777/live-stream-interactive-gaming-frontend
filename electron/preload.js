const { contextBridge, ipcRenderer } = require('electron');

console.log('preload loaded111');


/* ================= Files And File folder ================= */

contextBridge.exposeInMainWorld('fileAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
});


/* ================= JWT Token Storage ================= */
let authToken = null;

contextBridge.exposeInMainWorld('auth', {
  /**
   * Set the JWT token after login
   * @param token string
   */
   setToken: (token) => {
    // store locally in renderer
    ipcRenderer.send('auth:setToken', token); // send to main process
  },
  /**
   * Get the stored JWT token
   */
   getToken: () => null
});

/* ================= Existing Electron API ================= */
contextBridge.exposeInMainWorld('electronAPI', {
// 1. 修改为 invoke，确保主窗口知道同步成功
  syncCurrentPlay: (players) => ipcRenderer.invoke('sync-players-to-main', players),

  // 2. 这里的 on 必须保留，因为 Overlay 窗口是在“被动接收”消息
  onSyncPlayers: (callback) => {
    ipcRenderer.removeAllListeners('update-players-to-overlay');
    ipcRenderer.on('update-players-to-overlay', (_event, value) => callback(value));
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

  fetchLive: (url) =>
    ipcRenderer.invoke('api:fetch-live', url),

  fetchLiveBinary: (url) =>
    ipcRenderer.invoke('api:fetch-binary', url),
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
  sendPlayerDelta: () => ipcRenderer.send('buffer:sendPlayerDelta'),

  /**
   * Flush gifts manually (optional)
   */
  flushGifts: () => ipcRenderer.send('buffer:flushGifts'),

  /**
   * Get Authorization token for BufferService
   */
  getAuthToken: () => authToken
});


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
// Vue 调用这个方法来开启“监听模式”
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
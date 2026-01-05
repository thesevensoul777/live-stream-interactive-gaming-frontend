import { contextBridge, ipcRenderer } from 'electron';


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
  /**
   * Send a command to the main process
   */
  addCommand: (msg, action) =>
    ipcRenderer.invoke('add-command', { msg, action }),

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

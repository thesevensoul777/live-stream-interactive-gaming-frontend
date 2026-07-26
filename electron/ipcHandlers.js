import { BrowserWindow, dialog, ipcMain, net } from 'electron';
import zlib from 'zlib';
import {
  getWarcraftPath,
  injectWar3,
  launchWarcraft,
  saveCommand,
  saveGift,
  saveLike,
} from './war3.js';
import { ensureUserAuthenticated, clearUserAuth, isUserAuthenticated } from './services/BiliAuthManager.js';
import { BilibiliLiveService } from './services/BilibiliLiveService.js';

function netGetText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      headers,
    });

    request.on('response', (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.end();
  });
}

async function nodeFetchText(url, headers = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.text();
}

function netGetBuffer(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      headers,
    });

    request.on('response', (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.on('error', reject);
    request.end();
  });
}

async function nodeFetchBuffer(url, headers = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export function registerIpcHandlers(win, bufferService, windowManager, activeMonitors = new Map()) {
  ipcMain.handle('add-command', async (_event, payload) => {
    try {
      await saveCommand(payload);
      return { ok: true };
    } catch (err) {
      console.error('[add-command failed]', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('add-gift', async (_event, payload) => {
    try {
      if (windowManager.overlayWin && !windowManager.overlayWin.isDestroyed()) {
        windowManager.overlayWin.webContents.send('broadcast-gift', payload);
      }
      return await saveGift(payload);
    } catch (err) {
      console.error('[ipc add-gift failed]', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('add-like', async (_event, payload) => {
    try {
      if (windowManager.overlayWin && !windowManager.overlayWin.isDestroyed()) {
        windowManager.overlayWin.webContents.send('broadcast-like', payload);
      }
      return await saveLike(payload);
    } catch (err) {
      console.error('[ipc add-like failed]', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.on('sync-to-overlay', (_event, wrapper) => {
    if (windowManager.overlayWin && !windowManager.overlayWin.isDestroyed()) {
      windowManager.overlayWin.webContents.send('global-sync-bus', wrapper);
    }
  });

  ipcMain.handle('sync-players-to-main', async (_event, players) => {
    const targetWin = windowManager.overlayWin;
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.webContents.send('update-players-to-overlay', players);
      return { status: 'ok' };
    }
    return { status: 'no_overlay' };
  });

  ipcMain.on('maximize-window', () => {
    if (win && !win.isDestroyed()) {
      win.setBounds({ x: 100, y: 100, width: 1300, height: 1000 });
    }
  });

  ipcMain.on('auth:setToken', (_event, token) => {
    bufferService.setAuthToken(token);
  });

  ipcMain.on('auth:clearToken', () => {
    bufferService.clearAuthToken();
  });

  ipcMain.handle('inject-game', async () => {
    injectWar3();
    return true;
  });

  ipcMain.handle('api:fetch-live', async (_event, url, headers = {}) => {
    // NOTE: electron.net.request may be blocked by client-side filters (net::ERR_BLOCKED_BY_CLIENT)
    // for some domains (e.g. api.live.bilibili.com). Using Node.js fetch bypasses session filters.
    return nodeFetchText(url, headers);
  });

  ipcMain.handle('api:fetch-binary', async (_event, url, headers = {}) => {
    const finalUrl = url.startsWith('/') ? `https://live.douyin.com${url}` : url;
    // Douyin assets are sensitive to Referer/UA; keep using electron.net with forced headers.
    return netGetBuffer(finalUrl, {
      Referer: 'https://live.douyin.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers,
    });
  });

  ipcMain.handle('select-file', async () => {
    const focusedWin = BrowserWindow.getFocusedWindow();
    if (!focusedWin) return null;

    const result = await dialog.showOpenDialog(focusedWin, {
      title: '请选择文件',
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('select-folder', async () => {
    const focusedWin = BrowserWindow.getFocusedWindow();
    if (!focusedWin) return null;

    const result = await dialog.showOpenDialog(focusedWin, {
      title: '请选择文件夹',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedPath = result.filePaths[0];
    bufferService.setGamePath(selectedPath);
    getWarcraftPath(selectedPath);
    return selectedPath;
  });

  ipcMain.on('buffer:addGift', (_event, gift) => {
    bufferService.addGift(gift);
  });

  ipcMain.on('buffer:addPlayerDelta', (_event, delta) => {
    bufferService.addPlayerDelta(delta);
  });

  ipcMain.on('buffer:sendPlayerDelta', async (_event, deltaList) => {
    await bufferService.sendPlayerDelta(deltaList);
  });

  ipcMain.on('buffer:flushGifts', async () => {
    await bufferService.flushGift();
  });

  ipcMain.on('open-overlay', () => {
    if (!windowManager.overlayWin || windowManager.overlayWin.isDestroyed()) {
      windowManager.createOverlayWindow();
    } else {
      windowManager.overlayWin.focus();
    }
  });

  ipcMain.on('close-overlay', () => {
    if (windowManager.overlayWin && !windowManager.overlayWin.isDestroyed()) {
      windowManager.overlayWin.close();
    }
  });

  ipcMain.handle('launch-war3', async (event, gamePath) => {
    try {
      const finalPath = gamePath || bufferService.getGamePath();
      if (!finalPath) throw new Error('未配置游戏路径');

      const senderWin = BrowserWindow.fromWebContents(event.sender);
      return await launchWarcraft(finalPath, senderWin);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('brotli:decompress', async (_event, data) => {
    try {
      // data comes as a serialized ArrayBuffer (Buffer)
      const buf = Buffer.from(data);
      const decompressed = zlib.brotliDecompressSync(buf);
      // Return as Uint8Array-like plain array for IPC serialization
      return { ok: true, data: Array.from(decompressed) };
    } catch (err) {
      console.error('[brotli:decompress failed]', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Bilibili 弹幕监控 IPC 处理器
  // ════════════════════════════════════════════════════════════════

  /**
   * 检查指定主播的 B 站登录状态
   * 渲染进程调用: window.electronAPI.biliCheckAuth(userId)
   */
  ipcMain.handle('bili:check-auth', async (_event, userId) => {
    try {
      const authenticated = await isUserAuthenticated(userId);
      return { ok: true, authenticated };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  /**
   * 启动主播的 B 站弹幕监控
   * 渲染进程调用: window.electronAPI.biliStartMonitor({ userId, targetRoomId })
   * 
   * 流程：
   * 1. 检查/获取主播的 B 站登录凭证（未登录则弹出扫码窗口）
   * 2. 如果该主播已有监控实例，先关闭旧的
   * 3. 创建新的 BilibiliLiveService 实例并连接
   * 4. 弹幕数据通过 IPC 回传给渲染进程
   */
  ipcMain.handle('bili:start-monitor', async (event, { userId, targetRoomId }) => {
    try {
      // 1. 获取主播的登录凭证（如果未登录会弹出扫码窗口）
      const credentials = await ensureUserAuthenticated(userId);

      // 2. 如果该主播已有监控实例，先关闭
      if (activeMonitors.has(userId)) {
        console.log(`[IPC] 主播 ${userId} 已有监控实例，正在关闭旧的...`);
        activeMonitors.get(userId).close();
        activeMonitors.delete(userId);
      }

      // 3. 创建新的弹幕服务实例
      const service = new BilibiliLiveService(userId, {
        onDanmu: (danmu) => {
          // 弹幕数据回传给渲染进程
          if (win && !win.isDestroyed()) {
            win.webContents.send(`bili:danmu-${userId}`, danmu);
          }
        },
        onGift: (gift) => {
          // 1. 回传给渲染进程（前端展示）
          if (win && !win.isDestroyed()) {
            win.webContents.send(`bili:gift-${userId}`, gift);
          }

          // 2. 广播到 overlay 窗口（特效展示，与抖音礼物逻辑一致）
          if (windowManager.overlayWin && !windowManager.overlayWin.isDestroyed()) {
            windowManager.overlayWin.webContents.send('broadcast-gift', {
              realId: `bili_${gift.uid}`,
              user: gift.uname,
              time: Date.now(),
              command: '', // 由前端根据 giftId 映射
              giftId: gift.giftId,
              count: gift.num,
            });
          }

          // 3. 送入 BufferService 批量上报后端（与抖音礼物逻辑一致）
          //    构建与 GiftRecordRequest 兼容的结构
          bufferService.addGift({
            id: gift.giftId,
            name: gift.giftName,
            price: gift.price,           // 金瓜子价格
            type: 0,
            desc: gift.giftName,
            icon: gift.giftIcon,
            count: gift.num,
            repeatEnd: gift.comboStay === 1 ? 1 : 0,
            senderId: `bili_${gift.uid}`,
            senderName: gift.uname,
            gameTypeId: userId,           // 使用 userId 作为游戏类型标识
            // Bilibili 特有字段保留
            platform: 'bilibili',
            totalCoin: gift.totalCoin,
            rmbPrice: gift.rmbPrice,
            medalLevel: gift.medalLevel,
            medalName: gift.medalName,
            timestamp: gift.timestamp,
          });

          // 4. 同时写入魔兽争霸礼物文件（与抖音礼物逻辑一致）
          //    构建与 saveGift 兼容的格式
          const giftPayload = {
            realId: `bili_${gift.uid}`,
            user: gift.uname,
            command: '', // 由前端根据 giftId 映射
            count: gift.num,
          };
          // 异步写入，不阻塞
          import('./war3.js').then(({ saveGift }) => {
            saveGift(giftPayload).catch(err => {
              console.error('[bili gift saveGift failed]', err);
            });
          });
        },
        onStatus: (status) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send(`bili:status-${userId}`, status);
          }
        },
        onError: (error) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send(`bili:error-${userId}`, {
              message: error.message || String(error),
            });
          }
        },
      });

      activeMonitors.set(userId, service);

      // 4. 用主播自己的账号身份，去监听指定的 targetRoomId
      await service.connect(targetRoomId, credentials);

      return { ok: true, userId, targetRoomId };
    } catch (err) {
      console.error(`[IPC] bili:start-monitor 失败:`, err.message);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  /**
   * 停止指定主播的 B 站弹幕监控
   * 渲染进程调用: window.electronAPI.biliStopMonitor(userId)
   */
  ipcMain.handle('bili:stop-monitor', async (_event, userId) => {
    try {
      if (activeMonitors.has(userId)) {
        activeMonitors.get(userId).close();
        activeMonitors.delete(userId);
        console.log(`[IPC] 主播 ${userId} 的弹幕监控已停止。`);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  /**
   * 清除指定主播的 B 站登录态
   * 渲染进程调用: window.electronAPI.biliClearAuth(userId)
   */
  ipcMain.handle('bili:clear-auth', async (_event, userId) => {
    try {
      // 先停止监控
      if (activeMonitors.has(userId)) {
        activeMonitors.get(userId).close();
        activeMonitors.delete(userId);
      }
      await clearUserAuth(userId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  /**
   * 获取当前所有活跃的监控列表
   * 渲染进程调用: window.electronAPI.biliGetActiveMonitors()
   */
  ipcMain.handle('bili:get-active-monitors', async () => {
    const monitors = [];
    for (const [userId, service] of activeMonitors) {
      monitors.push({
        userId,
        roomId: service.roomId,
      });
    }
    return { ok: true, monitors };
  });
}

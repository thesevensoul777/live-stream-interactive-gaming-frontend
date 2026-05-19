import { BrowserWindow, dialog, ipcMain, net } from 'electron';
import {
  getWarcraftPath,
  injectWar3,
  launchWarcraft,
  saveCommand,
  saveGift,
  saveLike,
} from './war3.js';

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

export function registerIpcHandlers(win, bufferService, windowManager) {
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
    return netGetText(url, headers);
  });

  ipcMain.handle('api:fetch-binary', async (_event, url, headers = {}) => {
    const finalUrl = url.startsWith('/') ? `https://live.douyin.com${url}` : url;
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
}

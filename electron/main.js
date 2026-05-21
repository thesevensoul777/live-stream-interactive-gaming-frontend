// electron/main.js
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkService } from './networkService.js';
import { WindowManager } from './windowManager.js';
import { registerIpcHandlers } from './ipcHandlers.js';
import { BufferService } from './services/BufferService.js';
import { BilibiliLiveService } from './services/BilibiliLiveService.js';
import { ensureUserAuthenticated } from './services/BiliAuthManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 实例化
const networkService = new NetworkService();
const bufferService = new BufferService();
const windowManager = new WindowManager(__dirname);

// 2. 活跃的弹幕监控映射表: Map<userId, BilibiliLiveService>
const activeMonitors = new Map();

app.whenReady().then(async () => {
  // 3. 网络拦截准备
  await networkService.refreshTtwid();

  // 4. 开启主窗口
  const mainWin = windowManager.createMainWindow();

  // 5. 注册所有 IPC 处理器 (注入依赖，包括 activeMonitors)
  registerIpcHandlers(mainWin, bufferService, windowManager, activeMonitors);
});

// 应用准备退出时，主动关闭所有 WebSocket 连接
app.on('before-quit', () => {
  for (const [userId, service] of activeMonitors) {
    console.log(`[Main] 正在关闭主播 ${userId} 的弹幕监控...`);
    service.close();
  }
  activeMonitors.clear();
});

// 处理退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

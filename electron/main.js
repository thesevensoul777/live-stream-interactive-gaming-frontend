// electron/main.js
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkService } from './networkService.js';
import { WindowManager } from './windowManager.js';
import { registerIpcHandlers } from './ipcHandlers.js';
import { BufferService } from './services/BufferService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 实例化
const networkService = new NetworkService();
const bufferService = new BufferService();
const windowManager = new WindowManager(__dirname);



app.whenReady().then(async () => {
  // 2. 网络拦截准备
  await networkService.refreshTtwid();
  networkService.setupInterceptor();

  // 3. 开启主窗口
  const mainWin = windowManager.createMainWindow();

  // 4. 注册所有 IPC 处理器 (注入依赖)
  registerIpcHandlers(mainWin, bufferService, windowManager);
});

// 处理退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
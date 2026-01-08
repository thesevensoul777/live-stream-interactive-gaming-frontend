import { BrowserWindow, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. 获取当前文件的绝对路径 (解决 ESM 模式下 __dirname 未定义的问题)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WindowManager {
  constructor(dirname) {
    // 2. 这里的逻辑调整：dirname 应该传入 app.getAppPath() 或者由 main 传入
    // 但在 Vite 开发环境下，最好的 baseDir 是当前运行脚本的目录
    this.baseDir = __dirname;

    this.preloadPath = path.join(this.baseDir, 'preload.js');

    this.win = null;
    this.overlayWin = null;

    console.log('--- WindowManager 路径诊断 ---');
    console.log('BaseDir:', this.baseDir);
    console.log('Final PreloadPath:', this.preloadPath);
  }

  createMainWindow() {
    this.win = new BrowserWindow({
      width: 1300, 
      height: 1000,
      webPreferences: {
        preload: this.preloadPath, // 使用计算好的路径
        contextIsolation: true,
        nodeIntegration: false // 建议 false，提高安全性
      }
    });

    const url = process.env.VITE_DEV_SERVER_URL 
      ? process.env.VITE_DEV_SERVER_URL 
      : `file://${path.join(this.baseDir, '../dist/index.html')}`;
    
    this.win.loadURL(url);

      this.win.webContents.openDevTools({ mode: 'detach' });

    
    return this.win;
  }

  createOverlayWindow() {
    if (this.overlayWin) {
      this.overlayWin.focus();
      return;
    }
    
    this.overlayWin = new BrowserWindow({
      width: 720,
      height: 1280,
      frame: true,
      resizable: true,
      alwaysOnTop: true,
      backgroundColor: '#00ff00',
      webPreferences: {
        preload: this.preloadPath, // 确保第二个窗口使用完全相同的 preload 路径
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // 修复 URL 拼接逻辑，确保在开发环境使用 hash 路由
    const url = process.env.VITE_DEV_SERVER_URL 
      ? `${process.env.VITE_DEV_SERVER_URL}#/overlay`
      : `file://${path.join(this.baseDir, '../dist/index.html')}#/overlay`;
    
    this.overlayWin.loadURL(url);

    if (process.env.VITE_DEV_SERVER_URL) {
      this.overlayWin.webContents.openDevTools({ mode: 'detach' });
    }

    this.overlayWin.on('closed', () => {
      this.overlayWin = null;
    });
  }
}

export { WindowManager };
import { BrowserWindow } from 'electron';
import path from 'path';

class WindowManager {
  constructor(dirname) {
    this.dirname = dirname;
    this.win = null;
    this.overlayWin = null;
  }

  createMainWindow() {
    this.win = new BrowserWindow({
      width: 1300, height: 1000,
      webPreferences: {
        preload: path.join(this.dirname, 'preload.js'),
        contextIsolation: true,
      }
    });

    const url = process.env.VITE_DEV_SERVER_URL || `file://${path.join(this.dirname, '../dist/index.html')}`;
    this.win.loadURL(url);
    if (process.env.VITE_DEV_SERVER_URL) this.win.webContents.openDevTools({ mode: 'detach' });
    
    return this.win;
  }

  createOverlayWindow() {
    if (this.overlayWin) return;
    this.overlayWin = new BrowserWindow({
      width: 1920, height: 1080,
      transparent: true, frame: false, alwaysOnTop: true,
      resizable: false, hasShadow: false,
      webPreferences: {
        preload: path.join(this.dirname, 'preload.js'),
        contextIsolation: true,
      }
    });

    this.overlayWin.setIgnoreMouseEvents(true);
    const url = process.env.VITE_DEV_SERVER_URL 
      ? `${process.env.VITE_DEV_SERVER_URL}#/overlay`
      : `file://${path.join(this.dirname, '../dist/index.html')}#/overlay`;
    
    this.overlayWin.loadURL(url);
    this.overlayWin.on('closed', () => { this.overlayWin = null; });
  }
}

// 使用这种显式导出方式
export { WindowManager };
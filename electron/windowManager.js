import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WindowManager {
  constructor() {
    this.baseDir = __dirname;
    this.preloadPath = path.join(this.baseDir, 'preload.js');
    this.win = null;
    this.overlayWin = null;
  }

  createMainWindow() {
    this.win = new BrowserWindow({
      width: 1300,
      height: 1000,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    });


    const url = process.env.VITE_DEV_SERVER_URL 
      ? process.env.VITE_DEV_SERVER_URL 
      : `file://${path.join(this.baseDir, '../dist/index.html')}`;
    
    this.win.loadURL(url);
    this.win.webContents.openDevTools({ mode: 'detach' });
    console.log("Preload Path:", this.preloadPath);
    return this.win;

    
  }

  createOverlayWindow() {
    // If already open, just focus it
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
      backgroundColor: '#00ff00', // Green screen background
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Handle routing for Vue/React/Vite
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
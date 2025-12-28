import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execFile } from 'child_process';
import { registerIpcHandlers } from './ipcHandlers.js';
import { injectWar3 } from './war3.js';

// ES Module 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win = null;

injectWar3();


function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 指向编译后的 preload.js
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true,
    },
  });

  // 开发环境加载 Vite 服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // 生产环境加载打包后的 HTML
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // DevTools 自动弹出
  win.webContents.on('did-finish-load', () => {
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });
}


app.whenReady().then(createWindow);

if (!process.env.VITE_DEV_SERVER_URL) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execFile } from 'child_process';
import { registerIpcHandlers } from './ipcHandlers.js';
import { injectWar3 } from './war3.js';
import { session } from 'electron';


// ES Module 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win = null;

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

    registerIpcHandlers(win);
}
// function setupRequestHeaders() {
//   // 拦截所有发往抖音域名请求
//   const filter = {
//     urls: ['wss://*.douyin.com/*', 'https://*.douyin.com/*']
//   };

//   session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
//     // 强制设置 Origin 和 Referer，这是 WebSocket 握手的关键
//     details.requestHeaders['Origin'] = 'https://live.douyin.com';
//     details.requestHeaders['Referer'] = 'https://live.douyin.com/';
//     details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
//     callback({ requestHeaders: details.requestHeaders });
//   });
// }

// 在 app.whenReady() 之后调用
app.whenReady().then(() => {
  // setupRequestHeaders();
session.defaultSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  // 1. 全局修改 User-Agent，移除 Electron 标识
  const fakeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // 2. 拦截并修改请求头
// main.ts
session.defaultSession.webRequest.onBeforeSendHeaders(
  { urls: ['https://*.douyin.com/*', 'wss://*.douyin.com/*'] },
  (details, callback) => {
    details.requestHeaders['User-Agent'] = fakeUA;
    details.requestHeaders['Origin'] = 'https://live.douyin.com';
    details.requestHeaders['Referer'] = 'https://live.douyin.com/';

    // 修正点：必须包含 ttwid= 键名，否则服务端无法解析
    const myTtwid = '1|cAknFJHs7ZJgh61ymJwA-S0_-_6KggDXO-YKFezv8FQ|1766383828|784f2d41d75067d258186b9ab2648d9811c830e5b77012c765162842d5301211';
    
    // 如果请求本身没带 cookie（生产环境通常没带），我们强行塞入
    if (!details.requestHeaders['Cookie']) {
      details.requestHeaders['Cookie'] = `ttwid=${myTtwid}`; 
    } else if (!details.requestHeaders['Cookie'].includes('ttwid')) {
      details.requestHeaders['Cookie'] += `; ttwid=${myTtwid}`;
    }

    callback({ requestHeaders: details.requestHeaders });
  }
);
  createWindow();
});

if (!process.env.VITE_DEV_SERVER_URL) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

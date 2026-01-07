import { app, BrowserWindow, net } from 'electron';
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
let globalTtwid = '';

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


/**
 * 自动获取最新的 ttwid
 */
async function refreshTtwid() {
  return new Promise((resolve) => {
    const request = net.request({
      method: 'GET',
      url: 'https://live.douyin.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    request.on('response', (response) => {
      // 获取响应头中的所有 set-cookie
      const setCookies = response.headers['set-cookie'] || [];
      
      // 寻找包含 ttwid 的那一条
      const ttwidCookie = setCookies.find(cookie => cookie.includes('ttwid='));
      
      if (ttwidCookie) {
        // 提取 ttwid 的值（取第一个分号之前的内容）
        globalTtwid = ttwidCookie.split(';')[0];
      } else {
        console.warn('未能从响应头获取 ttwid，将使用备用值');
      }
      resolve(globalTtwid);
    });

    request.on('error', (error) => {
      console.error('获取 ttwid 请求失败:', error);
      resolve(null);
    });

    request.end();
  });
}

// 在 appReady 中串行执行
app.whenReady().then(async () => {
  // 1. 先刷新获取 ttwid
  await refreshTtwid();

  // 2. 设置全局 User-Agent
  const fakeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  session.defaultSession.setUserAgent(fakeUA);

  // 3. 拦截请求头并注入动态获取的 ttwid
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.douyin.com/*', 'wss://*.douyin.com/*'] },
    (details, callback) => {
      details.requestHeaders['User-Agent'] = fakeUA;
      details.requestHeaders['Origin'] = 'https://live.douyin.com';
      details.requestHeaders['Referer'] = 'https://live.douyin.com/';
      
      // 如果获取到了动态 ttwid，则注入
      if (globalTtwid) {
        // 如果原本没有 Cookie，直接赋值；如果有，追加
        const currentCookie = details.requestHeaders['Cookie'] || '';
        if (!currentCookie.includes('ttwid=')) {
          details.requestHeaders['Cookie'] = currentCookie 
            ? `${currentCookie}; ${globalTtwid}` 
            : globalTtwid;
        }
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

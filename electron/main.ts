import { app, BrowserWindow,ipcMain  } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let win: BrowserWindow | null = null

function createWindow() {
   win = new BrowserWindow({
    width: 1300,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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


// 接收放大窗口的请求
ipcMain.on('maximize-window', () => {
  if (win) {
    win.setBounds({ x: 100, y: 100, width: 1300, height: 1000 })
  }
})

app.whenReady().then(createWindow);

if (process.env.VITE_DEV_SERVER_URL) {
  // 开发阶段不管窗口关闭，让热重载继续工作
} else {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

import { app, BrowserWindow,ipcMain  } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { DanmuCommandDTO } from '@/core/actionRequests';
import { execFile } from "child_process";


// ES Module 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let win: BrowserWindow | null = null
// 1️⃣ 定义 JSON 文件路径
const filePath = path.join(app.getPath('userData'), 'commandRequests.json');


function injectWar3() {
  const injectorPath = path.join(
    __dirname,
    "..",
    "bin",
    "War3Injector.exe"
  );

  execFile(injectorPath, [], (error, stdout, stderr) => {
    if (error) {
      console.error("Inject failed:", error);
      return;
    }
    console.log("Injector output:", stdout);
  });
}

injectWar3();

ipcMain.handle(
  'add-command',
  (event, payload: { msg: DanmuCommandDTO; action: string }) => {

    // 1️⃣ 保存完整 JSON（日志）
    let data: any[] = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {}

    data.push({
      msg: payload.msg,
      action: payload.action,
      time: Date.now(),
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // 2️⃣ 翻译成 Warcraft 指令
    const user = payload.msg.user;
    let war3Cmd = '';

    switch (payload.action) {
      case '加入':
        war3Cmd = `JOIN|${user}`;
        break;

      case '上路':
        war3Cmd = `MOVE|${user}|TOP`;
        break;

      case '中路':
        war3Cmd = `MOVE|${user}|MID`;
        break;

      case '下路':
        war3Cmd = `MOVE|${user}|BOT`;
        break;
    }

    // 3️⃣ 写给 Warcraft（覆盖写即可）
    if (war3Cmd) {
      fs.writeFileSync(
        path.join(app.getPath('userData'), 'war3_command.txt'),
        war3Cmd,
        'utf-8'
      );
    }

    return true;
  }
);



function createWindow() {
   win = new BrowserWindow({
    width: 1300,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'dist/preload.cjs'), // 指向编译后的 preload.js
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true,
    },

    
  });

    win.loadFile(path.join(__dirname, '../dist/index.html'));


 

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

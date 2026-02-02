import { app, BrowserWindow, ipcMain, net,dialog  } from 'electron'
import { BufferService } from './services/BufferService.js';
import { injectWar3 ,saveCommand ,getWarcraftPath,saveGift,saveLike ,launchWarcraft} from './war3.js';
import {WindowManager} from './windowManager.js'
import path from 'path';


  const bufferService = new BufferService()
  const windowManager = new WindowManager()
let overlayWin = null; // 声明特效窗口变量

console.log("ipc21122211")

export function registerIpcHandlers(win) {
  ipcMain.handle('add-command', async (event, payload) => {
    try {
      // 确保 await 保存操作完成
      await saveCommand(payload);
      return { ok: true };
    } catch (err) {
      console.error('[add-command failed]', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

ipcMain.handle('add-gift', async (_, payload) => {
  console.log(">>> [IPC] 收到 add-gift 请求"); // 放在最前面
  try {
    // 💡 建议：先转发给 Overlay 显示，再写文件，防止写文件慢导致特效延迟
    if (windowManager.overlayWin) {
      windowManager.overlayWin.webContents.send('broadcast-gift', payload);
    }

    const res = await saveGift(payload); 
    console.log(">>> [IPC] saveGift 执行完毕");
    return res;
  } catch (err) {
    console.error(">>> [IPC] 发生错误:", err);
    return { ok: false };
  }
});


ipcMain.handle('add-like', async (_, payload) => {
  try {
        // 转发点赞
    if (windowManager.overlayWin) {
      windowManager.overlayWin.webContents.send('broadcast-like', payload);
    }
    const res = await saveLike(payload);

    console.log(">>> [IPC] saveLike 执行完毕");
    return res;
  } catch (err) {
    console.error('[ipc add-like failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

});
// 使用 handle 对应渲染进程的 invoke
ipcMain.handle('sync-players-to-main', async (event, players) => {

// 💡 关键修改：从 windowManager 实例中获取窗口
  const targetWin = windowManager.overlayWin;

  console.log("尝试同步玩家列表:", players, "窗口状态:", !!targetWin);
  // 转发给 Overlay 窗口
  // 注意：这里的 overlayWin 是你在创建窗口时保存的变量名
if (targetWin && !targetWin.isDestroyed()) {

   console.log("尝试同步玩家列表成功");
    targetWin.webContents.send('update-players-to-overlay', players);
    return { status: 'ok' };
  }
  return { status: 'no_overlay' };
});


  ipcMain.on('maximize-window', () => {
    if (win) {
      win.setBounds({ x: 100, y: 100, width: 1300, height: 1000 });
    }
  });


ipcMain.on('auth:setToken', (event, token) => {
  bufferService.setAuthToken(token); // main process instance now has token
});



ipcMain.handle('inject-game', async () => {
  injectWar3();
  return true;
});


ipcMain.handle('api:fetch-live', async (event, url) => {

  return new Promise((resolve, reject) => {
    // 这里的 request 直接请求真实的外网地址
    const request = net.request(url)
    
    request.on('response', (response) => {
      let data = ''
      response.on('data', (chunk) => {
        data += chunk.toString()
      })
      response.on('end', () => {
        resolve(data)
      })
    })
    
    request.on('error', (error) => {
      reject(error)
    })
    
    request.end()
  })
})
ipcMain.handle('api:fetch-binary', async (event, url) => {
 // 如果前端还是传了相对路径，手动补全以防止主进程崩溃
  let finalUrl = url;
  if (url.startsWith('/')) {
    finalUrl = `https://live.douyin.com${url}`;
  }
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: url,
      headers: {
        // 关键：抖音 IM 接口通常校验 Referer 和 User-Agent
        'Referer': 'https://live.douyin.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    request.on('response', (response) => {
      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        // 合并所有 Buffer 片段
        const totalBuffer = Buffer.concat(chunks);
        // 直接返回 Buffer，Electron 会自动处理跨进程序列化
        resolve(totalBuffer);
      });
    });

    request.on('error', (err) => reject(err));
    request.end();
  });
});




ipcMain.handle('select-file', async (_event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const result = await dialog.showOpenDialog(win, {
    title: '请选择文件',
    properties: ['openFile'], // 如果要选文件夹用 'openDirectory'
    filters: [
      { name: 'All Files', extensions: ['*'] }, // 可加具体后缀 ['txt', 'json'] 等
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0]; // 返回选择的文件路径
});

ipcMain.handle('select-folder', async (_event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const result = await dialog.showOpenDialog(win, {
    title: '请选择文件夹',
    properties: ['openDirectory'],
  });

if (result.filePaths.length > 0) {
    const path = result.filePaths[0];
    bufferService.setGamePath(path); // 存入 service
    return path;
  }
  return null;
});



ipcMain.on('buffer:addGift', (_, gift) => {
  bufferService.addGift(gift)
})

ipcMain.on('buffer:addPlayerDelta', (_, delta) => {
  bufferService.addPlayerDelta(delta)
})

ipcMain.on('buffer:sendPlayerDelta', async () => {
  await bufferService.sendPlayerDelta()
})



// --- 开启特效窗口 ---
ipcMain.on('open-overlay', () => {
  // 使用 windowManager 内部的属性判断
  if (!windowManager.overlayWin || windowManager.overlayWin.isDestroyed()) {
    windowManager.createOverlayWindow();
    console.log('特效窗口已开启');
  } else {
    windowManager.overlayWin.focus();
  }
});

// --- 关闭特效窗口 ---
ipcMain.on('close-overlay', () => {
  if (windowManager.overlayWin) {
    windowManager.overlayWin.close();
    // 💡 注意：你应该在 WindowManager 类里面的 closed 监听里把 this.overlayWin 设为 null
  }
});




ipcMain.handle('launch-war3', async (event, gamePath) => {
    try {
        // 逻辑置顶：优先参数，次选 Service 缓存
        const finalPath = gamePath || bufferService.getGamePath();

        if (!finalPath) {
            throw new Error("未配置游戏路径");
        }

        // 调用刚才在 war3.js 里写的业务方法
        return await launchWarcraft(finalPath);
    } catch (err) {
        return { ok: false, error: err.message };
    }
});




}



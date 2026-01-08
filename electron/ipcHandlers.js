import { app, BrowserWindow, ipcMain, net,dialog  } from 'electron'
import { BufferService } from './services/BufferService.js';
import { injectWar3 ,saveCommand ,getWarcraftPath,saveGift,saveLike} from './war3.js';


  const bufferService = new BufferService()




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
  try {
    const res = await saveGift(payload);
    return res;
  } catch (err) {
    console.error('[ipc add-gift failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});


ipcMain.handle('add-like', async (_, payload) => {
  try {
    const res = await saveLike(payload);
    return res;
  } catch (err) {
    console.error('[ipc add-like failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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

  if (result.canceled || result.filePaths.length === 0) return null;
   getWarcraftPath(result.filePaths[0])

  return result.filePaths[0]; // 返回选择的文件夹路径
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

}


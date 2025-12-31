import { app, BrowserWindow, ipcMain, net } from 'electron'
import { saveCommand ,injectWar3 } from './war3.js';

export function registerIpcHandlers(win) {
  ipcMain.handle('add-command', (event, payload) => {
    saveCommand(payload);
    return true;
  });

  ipcMain.on('maximize-window', () => {
    if (win) {
      win.setBounds({ x: 100, y: 100, width: 1300, height: 1000 });
    }
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
  console.log(finalUrl,"finalUrl")
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
}


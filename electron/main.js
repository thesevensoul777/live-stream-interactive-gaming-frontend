// electron/main.js
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkService } from './networkService.js';
import { WindowManager } from './windowManager.js';
import { registerIpcHandlers } from './ipcHandlers.js';
import { BufferService } from './services/BufferService.js';
import { KeepLiveWS } from 'bilibili-live-ws'; // 使用 KeepLiveWS（自动重连）

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 实例化
const networkService = new NetworkService();
const bufferService = new BufferService();
const windowManager = new WindowManager(__dirname);

// 定义一个变量用来存放当前的 WebSocket 连接实例
let bLiveService = null;

/**
 * 浏览器风格的请求头，模拟真实浏览器访问 Bilibili API
 *  - 参考抖音实现：通过添加完整请求头绕过风控
 */
const BILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://live.bilibili.com/',
  'Origin': 'https://live.bilibili.com',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
};

/**
 * 通过 Node.js fetch 发送 HTTP 请求（带完整浏览器请求头）
 *  - 使用 nodeFetchText 模式（同 ipcHandlers.js 中的 api:fetch-live）
 *  - 注意：B 站 getDanmuInfo 接口（xlive/web-room/v1/index/getDanmuInfo）风控严格，返回 -352
 *  - 改用 room/v1/Danmu/getConf 接口（同 bilicast.ts 中的实现），风控较宽松
 * @param {string} url
 * @returns {Promise<any>} 解析后的 JSON 对象
 */
async function biliFetch(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: BILI_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Bilibili API HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * 获取 B 站弹幕配置（WebSocket 地址 + 认证 Token）
 *  - 使用 room/v1/Danmu/getConf 接口（同 bilicast.ts 中的实现）
 *    该接口风控较宽松，配合完整浏览器请求头可绕过 -352 错误
 *  - 先获取真实房间号，再获取弹幕服务器配置
 * @param {number|string} roomId 房间号（支持短号）
 * @returns {Promise<{key: string, host: string, address: string, realRoomId: number}>}
 */
async function fetchBilibiliDanmuConf(roomId) {
  // Step 1: 获取真实房间号
  const initData = await biliFetch(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(String(roomId))}`
  );
  if (initData.code !== 0) {
    throw new Error(`room_init 失败: ${initData.message || initData.msg} (code=${initData.code})`);
  }
  const realRoomId = initData.data.room_id;
  console.log(`[BiliLive] 🎯 房间号映射: ${roomId} -> ${realRoomId}`);

  // Step 2: 获取弹幕服务器配置（使用 room/v1/Danmu/getConf，同 bilicast.ts）
  const danmuData = await biliFetch(
    `https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id=${encodeURIComponent(String(realRoomId))}&platform=pc&player=web`
  );
  if (danmuData.code !== 0) {
    throw new Error(`getConf 失败: ${danmuData.message || danmuData.msg} (code=${danmuData.code})`);
  }

  const host = danmuData.data?.host_server_list?.[0]?.host || danmuData.data?.host;
  const key = danmuData.data?.token;
  if (!host || !key) {
    throw new Error('getConf 返回数据缺少 host 或 token');
  }

  const address = `wss://${host}/sub`;
  console.log(`[BiliLive] 📡 获取配置成功: host=${host}`);
  return { key, host, address, realRoomId };
}

/**
 * Bilibili 直播弹幕连接函数
 *  - 参考抖音 DyCast 的实现模式：
 *    1. 先通过 HTTP API 获取连接配置（绕过风控）
 *    2. 再用配置信息建立 WebSocket 连接
 * @param {number} roomId 房间号
 */
async function testBilibiliLive(roomId) {
  console.log(`\n[BiliLive] 🚀 正在连接直播间: ${roomId}...`);

  try {
    // Step 1: 获取弹幕配置（通过主进程 HTTP 请求 + 完整浏览器请求头）
    const conf = await fetchBilibiliDanmuConf(roomId);

    // Step 2: 建立 WebSocket 连接（传入 key 和 address，避免库内部调用 getConf）
    // 注意：bilibili-live-ws 的 LiveWSBase 不支持 headers 选项，所以不传
    bLiveService = new KeepLiveWS(conf.realRoomId, {
      protover: 3,
      key: conf.key,
      address: conf.address,
    });

    // 监听连接成功
    bLiveService.on('open', () => {
      console.log(`[BiliLive] 🎉 成功连接到房间 ${conf.realRoomId}，正在等待弹幕...`);
    });

    // 监听弹幕
    bLiveService.on('DANMU_MSG', (data) => {
      if (!data || !data.info) return;
      const uname = data.info[2]?.[1] || '未知';
      const content = data.info[1] || '';
      console.log(`[弹幕] ${uname}: ${content}`);
    });

    // 监听礼物
    bLiveService.on('SEND_GIFT', (data) => {
      if (!data || !data.data) return;
      const { uname, giftName, num } = data.data;
      console.log(`[礼物] 🎁 ${uname} 送出 ${giftName} x ${num}`);
    });

    // 错误处理
    bLiveService.on('error', (err) => {
      console.error('[BiliLive 错误]', err);
    });

    // 连接断开
    bLiveService.on('close', (code, reason) => {
      console.log(`[BiliLive] 🔌 连接断开 | code=${code} reason=${reason}`);
    });

  } catch (error) {
    console.error('[BiliLive 初始化失败]:', error.message || error);
  }
}

app.whenReady().then(async () => {
  // 2. 网络拦截准备
  await networkService.refreshTtwid();
 // networkService.setupInterceptor();

  // 3. 开启主窗口
  const mainWin = windowManager.createMainWindow();

  // 4. 注册所有 IPC 处理器 (注入依赖)
  registerIpcHandlers(mainWin, bufferService, windowManager);

  // 5. ── 启动测试 ──
  // 这里暂时硬编码 B 站官方大流量直播间（房间号: 6）来做压力和连通性测试
  // 你也可以换成你自己的真实直播间号
  const TEST_ROOM_ID = 7777; 
  testBilibiliLive(TEST_ROOM_ID);
});

// 应用准备退出时，主动关闭 WebSocket 连接，释放内存
app.on('before-quit', () => {
  if (bLiveService) {
    console.log('[main] 正在关闭 B 站直播连接...');
    bLiveService.close();
    bLiveService = null;
  }
});

// 处理退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
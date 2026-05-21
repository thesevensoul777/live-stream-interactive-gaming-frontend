// electron/services/BilibiliLiveService.js
import { app, net, session } from 'electron';
import { LiveWS } from 'bilibili-live-ws';

// 最大重连次数
const MAX_RECONNECT_COUNT = 30;

// 缓存沙盒 session 实例
let cachedSession = null;

/**
 * 创建或获取一个专属于 B 站弹幕的独立内存 Session
 */
function getBiliSession() {
  if (!cachedSession) {
    cachedSession = session.fromPartition('bili_live_sandbox');
  }
  return cachedSession;
}

/**
 * 工业级特权网络发包函数
 */
function electronBiliFetch(targetUrl) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: targetUrl,
      redirect: 'follow',
      session: getBiliSession()
    });

    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Referer', 'https://live.bilibili.com/');
    request.setHeader('Origin', 'https://live.bilibili.com');
    request.setHeader('Accept', 'application/json, text/plain, */*');
    request.setHeader('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');

    request.on('response', (response) => {
      let data = '';
      if (response.statusCode !== 200) {
        reject(new Error(`Bilibili API HTTP 状态码异常: ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => { data += chunk.toString(); });
      response.on('end', () => {
        try { 
          resolve(JSON.parse(data)); 
        } catch (err) { 
          reject(new Error('非标准JSON格式')); 
        }
      });
    });
    request.on('error', (error) => reject(error));
    request.end();
  });
}

/**
 * 前置准备工作：彻底清理沙盒并生成、注入高信用度游客指纹
 * 核心升级：必须返回生成的 buvid3 供 WebSocket 握手使用
 */
async function initBiliDeviceFingerprint() {
  const biliSession = getBiliSession();
  
  await biliSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'cache']
  });
  
  const randHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
  const randNum = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
  const fakeBuvid3 = `${randHex()}${randHex()}-${randHex()}-${randHex()}-${randHex()}-${randHex()}${randNum(5)}infoc`;
  const currentTimestamp = Math.floor(Date.now() / 1000).toString();

  console.log('[BiliLive] 🛡️ 正在清理沙盒并注入伪装高信用浏览器设备指纹...');

  try {
    await biliSession.cookies.set({
      url: 'https://bilibili.com',
      name: 'buvid3',
      value: fakeBuvid3,
      domain: '.bilibili.com',
      path: '/',
      secure: true,
      sameSite: 'no_restriction'
    });
    await biliSession.cookies.set({
      url: 'https://bilibili.com',
      name: 'b_nut',
      value: currentTimestamp,
      domain: '.bilibili.com',
      path: '/',
      secure: true,
      sameSite: 'no_restriction'
    });
  } catch (cookieErr) {
    console.error('[BiliLive] 注入指纹 Cookie 异常:', cookieErr.message);
  }

  return new Promise((resolve) => {
    const req = net.request({
      method: 'GET',
      url: 'https://www.bilibili.com/',
      redirect: 'follow',
      session: biliSession
    });
    req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    req.on('response', () => {
      console.log('[BiliLive] ✅ 高信用非脱敏通道激活成功。');
      resolve(fakeBuvid3); // 👈 关键修改：返回指纹字符串
    });
    req.on('error', () => {
      console.log('[BiliLive] ⚠️ 激活请求失败，转入备用降级通道。');
      resolve(fakeBuvid3);
    });
    req.end();
  });
}

/**
 * 获取弹幕高保真配置
 */
async function fetchBilibiliDanmuConf(roomId) {
  const timestamp = Date.now();
  const initData = await electronBiliFetch(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(String(roomId))}`
  );
  if (initData.code !== 0) {
    throw new Error(`room_init 失败: ${initData.message || initData.msg} (code=${initData.code})`);
  }
  const realRoomId = initData.data.room_id;
  console.log(`[BiliLive] 🎯 房间号映射: ${roomId} -> ${realRoomId}`);

  const danmuData = await electronBiliFetch(
    `https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id=${encodeURIComponent(String(realRoomId))}&platform=pc&player=web&web_location=102&_=${timestamp}`
  );
  if (danmuData.code !== 0) {
    throw new Error(`getConf 失败: ${danmuData.message || danmuData.msg} (code=${danmuData.code})`);
  }

  const hostList = danmuData.data?.host_server_list || [];
  const host = hostList[0]?.host || danmuData.data?.host;
  const key = danmuData.data?.token;
  if (!host || !key) {
    throw new Error('getConf 返回数据缺少 host 或 token');
  }

  const address = `wss://${host}/sub`;
  console.log(`[BiliLive] 📡 高信用配置获取成功: host=${host} (可用优选服务器: ${hostList.length} 个)`);
  return { key, host, address, realRoomId, hostList };
}

/**
 * Bilibili 直播弹幕服务类
 */
export class BilibiliLiveService {
  constructor() {
    this.ws = null;
    this.reconnectCount = 0;
    this.totalReconnectCount = 0;
    this.isClosed = false;
    this.shouldReconnect = true;
    this.currentHostIndex = 0;
    this.hostList = [];
    this.conf = null;
    this.roomId = null;
    this.buvid = null; // 👈 顶层保存设备指纹
  }

  /**
   * 连接到 B 站直播间
   */
  async connect(roomId) {
    this.roomId = roomId;
    this.isClosed = false;
    this.shouldReconnect = true;
    this.reconnectCount = 0;
    this.totalReconnectCount = 0;

    console.log(`\n[BiliLive] 🚀 开始全流程安全连接，直播间: ${roomId}...`);

    try {
      // 捕获生成的 buvid 并存入实例中
      this.buvid = await initBiliDeviceFingerprint();
      this.conf = await fetchBilibiliDanmuConf(roomId);
      this.hostList = this.conf.hostList;
      this._connectInternal(this.conf);
    } catch (error) {
      console.error('[BiliLive 初始化失败]:', error.message || error);
    }
  }

  /**
   * 内部连接逻辑
   */
  _connectInternal(conf) {
    if (this.isClosed) return;

    this.closeWs();

    try {
      const address = conf.address;
      console.log(`[BiliLive] 🔗 正在握手 WebSocket 管道 #${this.totalReconnectCount + 1} | ${address}`);

      // ⚡ 终极修正核心：不仅指定 protover: 2，还必须将 buvid 注入到 wss 实例化配置中
      // 这会强制底层库在发送客户端认证数据包（Operation 7）时带上设备指纹，彻底激活数据流下发
      this.ws = new LiveWS(conf.realRoomId, {
        protover: 2,
        key: conf.key,
        address: conf.address,
        buvid: this.buvid, // 👈 强行追加握手鉴权指纹
        uid: 0             // 0 代表高信用游客
      });

      this.ws.on('open', () => {
        this.reconnectCount = 0;
        console.log(`[BiliLive] 🎉 成功与高信用高带宽服务器建立稳健连接，房间： ${conf.realRoomId}`);
      });

      // 第一重拦截网：通用数据流对象分发
      this.ws.on('msg', (data) => {
        if (!data) return;

        if (typeof data === 'object' && data.cmd) {
          this._dispatchCommand(data);
          return;
        }

        try {
          if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            if (parsed.cmd) this._dispatchCommand(parsed);
          }
        } catch (_) {
          // ignore
        }
      });

      // 第二重拦截网：原生事件直接捕获
      this.ws.on('DANMU_MSG', (data) => {
        this._parseAndPrintDanmu(data);
      });

      this.ws.on('live', () => {
        console.log(`[BiliLive] ♻️ 弹幕流认证成功 #${this.totalReconnectCount + 1}`);
      });

      this.ws.on('error', (err) => {
        console.error(`[BiliLive 错误] #${this.totalReconnectCount + 1}:`, err?.message || err);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[BiliLive] 🔌 管道断开 | code=${code} reason=${reason}`);
        this._handleClose();
      });

    } catch (err) {
      console.error('[BiliLive 连接异常]:', err instanceof Error ? err.message : String(err));
      this._handleClose();
    }
  }

  /**
   * 统一事件分发器
   */
  _dispatchCommand(packet) {
    if (!packet) return;
    
    const cmd = packet.cmd || packet.msg?.cmd || '';
    
    if (cmd.startsWith('DANMU_MSG')) {
      this._parseAndPrintDanmu(packet);
    } else if (cmd === 'SEND_GIFT') {
      const giftData = packet.data;
      if (giftData) {
        console.log(`[礼物] 🎁 ${giftData.uname} 送出 ${giftData.giftName} x ${giftData.num}`);
      }
    } else if (cmd === 'LIVE_OPEN_PLATFORM_DM') {
      const uname = packet.data?.uname || packet.data?.sender_name || '未知';
      const content = packet.data?.msg || '';
      console.log(`[弹幕-开放平台] ${uname}: ${content}`);
    } else if (cmd === 'BATCH_COMMAND' && Array.isArray(packet.data?.list)) {
      for (const subPacket of packet.data.list) {
        if (subPacket?.cmd?.startsWith('DANMU_MSG')) {
          this._parseAndPrintDanmu(subPacket);
        }
      }
    }
  }

  /**
   * 标准化弹幕解析与分发器
   */
  _parseAndPrintDanmu(data) {
    if (!data) return;

    if (data.info && Array.isArray(data.info)) {
      const uname = data.info[2]?.[1] || '未知';
      const content = data.info[1] || '';
      console.log(`[弹幕] ${uname}: ${content}`);
      return;
    }

    if (data.msg && typeof data.msg === 'object') {
      const uname = data.msg.uname || data.msg.nickname || '未知';
      const content = data.msg.content || data.msg.msg || '';
      console.log(`[弹幕] ${uname}: ${content}`);
    }
  }

  /**
   * 故障退避重连与自动漂移
   */
  _handleClose() {
    if (this.isClosed) return;

    if (!this.shouldReconnect) {
      console.log('[BiliLive] 终止重连状态');
      return;
    }

    this.reconnectCount++;
    this.totalReconnectCount++;

    if (this.totalReconnectCount > MAX_RECONNECT_COUNT) {
      this.shouldReconnect = false;
      console.log(`[BiliLive] ⛔ 超过最大重连次数 (${MAX_RECONNECT_COUNT})，安全熔断`);
      return;
    }

    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectCount - 1), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`[BiliLive] ⏳ ${delay.toFixed(0)}ms 后执行下一次重连尝试 (#${this.totalReconnectCount})`);

    if (this.reconnectCount > 3 && this.hostList.length > 1) {
      this.currentHostIndex = (this.currentHostIndex + 1) % this.hostList.length;
      const altHost = this.hostList[this.currentHostIndex]?.host;
      if (altHost && this.conf) {
        const newConf = { ...this.conf, host: altHost, address: `wss://${altHost}/sub` };
        console.log(`[BiliLive] 🔀 正在触发服务器群集切换 -> 目标优选节点: ${altHost}`);
        setTimeout(() => {
          if (!this.isClosed && this.shouldReconnect) {
            this._connectInternal(newConf);
          }
        }, delay);
        return;
      }
    }

    setTimeout(() => {
      if (!this.isClosed && this.shouldReconnect && this.conf) {
        this._connectInternal(this.conf);
      }
    }, delay);
  }

  /**
   * 关闭当前 WebSocket 连接
   */
  closeWs() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {
        // ignore
      }
      this.ws = null;
    }
  }

  /**
   * 断开连接
   */
  close() {
    console.log('[BiliLive] 主动关闭服务...');
    this.isClosed = true;
    this.shouldReconnect = false;
    this.closeWs();
  }
}
// electron/services/BilibiliLiveService.js
import { net, session } from 'electron';
import { LiveWS } from 'bilibili-live-ws';
import { BilibiliApiClient } from 'bilibili-live-danmaku';

// 最大重连次数
const MAX_RECONNECT_COUNT = 30;

/**
 * 核心设计升级：全隔离分布式架构
 * 每一个 BilibiliLiveService 实例都拥有自己独立的、互不干扰的沙盒环境
 * 主播 A 的小号 Cookie 绝不会污染或覆盖主播 B 的小号 Cookie
 */
export class BilibiliLiveService {
  /**
   * @param {string} instanceId 唯一的实例ID（例如可以使用直播间号或者用户唯一标识）
   * @param {object} [options]
   * @param {Function} [options.onDanmu] 弹幕回调 (danmu) => void
   * @param {Function} [options.onGift] 礼物回调 (gift) => void
   * @param {Function} [options.onStatus] 状态回调 (status) => void
   * @param {Function} [options.onError] 错误回调 (error) => void
   */
  constructor(instanceId, options = {}) {
    this.instanceId = String(instanceId);
    // 为每个实例分配独立的持久化分区，前缀加上 persist: 确保重启不丢 Cookie
    this.partitionName = `persist:bili_sandbox_${this.instanceId}`;
    this.session = session.fromPartition(this.partitionName);

    this.ws = null;
    this.reconnectCount = 0;
    this.totalReconnectCount = 0;
    this.isClosed = false;
    this.shouldReconnect = true;
    this.currentHostIndex = 0;
    this.hostList = [];
    this.conf = null;
    this.roomId = null;
    this.buvid = null;
    this.credentials = null;

    // 回调
    this.onDanmu = options.onDanmu || null;
    this.onGift = options.onGift || null;
    this.onStatus = options.onStatus || null;
    this.onError = options.onError || null;
  }

  /**
   * 专属沙盒的特权发包函数
   */
  _electronBiliFetch(targetUrl) {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: targetUrl,
        redirect: 'follow',
        session: this.session // 👈 绑定当前实例专属的沙盒会话
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
   * 使用 bilibili-live-danmaku 的 BilibiliApiClient 获取认证后的弹幕配置
   * 该客户端自动处理 WBI 签名、Cookie 管理等认证细节
   */
  async _fetchDanmuInfoWithClient(realRoomId) {
    // 从沙盒中读取所有 B 站 Cookie，构建 Cookie 字符串
    const cookies = await this.session.cookies.get({ domain: '.bilibili.com' });
    const cookieMap = {};
    for (const c of cookies) {
      cookieMap[c.name] = c.value;
    }

    // 创建 BilibiliApiClient 实例，注入沙盒中的 Cookie
    const apiClient = new BilibiliApiClient({
      cookie: cookieMap,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // 调用 xliveGetDanmuInfo 获取弹幕配置（自动处理 WBI 签名）
    const result = await apiClient.xliveGetDanmuInfo({ id: realRoomId });
    const data = result.data;

    const hostList = data?.host_list || data?.host_server_list || [];
    const host = hostList[0]?.host || data?.host;
    const key = data?.token;
    if (!host || !key) {
      throw new Error('getDanmuInfo 返回数据缺少 host 或 token');
    }

    const address = `wss://${host}/sub`;
    return { key, host, address, realRoomId, hostList, isAuthenticated: true };
  }

  /**
   * 专属沙盒会话初始化：注入该用户专用的小号凭证与配套高信用指纹
   */
  async _initBiliUserSession() {
    // 💡 提示：不再盲目执行 clearStorageData，因为我们需要持久化锁死已登录的小号态
    const randHex = (len = 4) => {
      let result = '';
      for (let i = 0; i < len; i++) {
        result += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      }
      return result;
    };
    // 标准 buvid3 格式: XXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXinfoc
    const fakeBuvid3 = `${randHex(8)}-${randHex(4)}-${randHex(4)}-${randHex(4)}-${randHex(12)}infoc`;
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();

    console.log(`[BiliLive-${this.instanceId}] 🔐 正在配置独立沙盒环境...`);

    try {
      const baseCookieConf = { domain: '.bilibili.com', path: '/', secure: true };

      if (this.credentials && this.credentials.SESSDATA) {
        console.log(`[BiliLive-${this.instanceId}] 🔑 正在挂载专属小号 Cookie 通道。`);
        await this.session.cookies.set({ ...baseCookieConf, url: 'https://bilibili.com', name: 'SESSDATA', value: this.credentials.SESSDATA, httpOnly: true });
        await this.session.cookies.set({ ...baseCookieConf, url: 'https://bilibili.com', name: 'DedeUserID', value: String(this.credentials.DEDEUSERID) });
      } else {
        console.log(`[BiliLive-${this.instanceId}] ⚠️ 未检测到有效凭证，本次连接将降级为带指纹的匿名游客通道（名字会有星号）。`);
      }
      
      // 无论有无登录态，都把专属高信用设备指纹写进对应的隔离沙盒里
      await this.session.cookies.set({ ...baseCookieConf, url: 'https://bilibili.com', name: 'buvid3', value: fakeBuvid3 });
      await this.session.cookies.set({ ...baseCookieConf, url: 'https://bilibili.com', name: 'b_nut', value: currentTimestamp });
    } catch (cookieErr) {
      console.error(`[BiliLive-${this.instanceId}] 注入 Cookie 异常:`, cookieErr.message);
    }

    return new Promise((resolve) => {
      const req = net.request({
        method: 'GET',
        url: 'https://www.bilibili.com/',
        redirect: 'follow',
        session: this.session
      });
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      req.on('response', () => {
        console.log(`[BiliLive-${this.instanceId}] ✅ 独立管道指纹激活成功。`);
        resolve(fakeBuvid3);
      });
      req.on('error', () => {
        resolve(fakeBuvid3);
      });
      req.end();
    });
  }

  /**
   * 专属沙盒拉取弹幕服务器配置
   * 使用新 API (xlive/web-room/v1/index/getDanmuInfo) 获取认证后的 token，
   * 配合真实 UID 可获取完整用户信息（未遮挡昵称、真实头像）
   * @returns {{ key: string, host: string, address: string, realRoomId: number, hostList: Array, isAuthenticated: boolean }}
   */
  async _fetchBilibiliDanmuConf(roomId) {
    const timestamp = Date.now();
    const initData = await this._electronBiliFetch(
      `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(String(roomId))}`
    );
    if (initData.code !== 0) {
      throw new Error(`room_init 失败: ${initData.message || initData.msg} (code=${initData.code})`);
    }
    const realRoomId = initData.data.room_id;
    console.log(`[BiliLive-${this.instanceId}] 🎯 房间号映射: ${roomId} -> ${realRoomId}`);

    // 使用 bilibili-live-danmaku 的 BilibiliApiClient 获取认证后的弹幕配置
    // 该客户端自动处理 WBI 签名，确保 API 调用成功
    try {
      const authConf = await this._fetchDanmuInfoWithClient(realRoomId);
      console.log(`[BiliLive-${this.instanceId}] ✅ 新 API getDanmuInfo 成功（已认证）`);
      return authConf;
    } catch (authErr) {
      // 如果新 API 失败（如 WBI 签名失败），降级到旧 API（匿名模式）
      console.warn(`[BiliLive-${this.instanceId}] ⚠️ 新 API getDanmuInfo 失败: ${authErr.message}，降级到旧 API getConf（匿名模式）`);
      const fallbackData = await this._electronBiliFetch(
        `https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id=${encodeURIComponent(String(realRoomId))}&platform=pc&player=web&web_location=102&_=${timestamp}`
      );
      if (fallbackData.code !== 0) {
        throw new Error(`getConf 降级也失败: ${fallbackData.message || fallbackData.msg} (code=${fallbackData.code})`);
      }
      const fallbackHostList = fallbackData.data?.host_server_list || [];
      const fallbackHost = fallbackHostList[0]?.host || fallbackData.data?.host;
      const fallbackKey = fallbackData.data?.token;
      if (!fallbackHost || !fallbackKey) {
        throw new Error('getConf 返回数据缺少 host 或 token');
      }
      return { key: fallbackKey, host: fallbackHost, address: `wss://${fallbackHost}/sub`, realRoomId, hostList: fallbackHostList, isAuthenticated: false };
    }
  }

  /**
   * 🚀 连接到指定直播间
   * @param {string|number} roomId 目标直播间号
   * @param {Object} [userCredentials] 可选参数，用户的 B 站小号凭证：{ SESSDATA: '...', DEDEUSERID: '...' }
   */
  async connect(roomId, userCredentials = null) {
    this.roomId = roomId;
    this.credentials = userCredentials;
    this.isClosed = false;
    this.shouldReconnect = true;
    this.reconnectCount = 0;
    this.totalReconnectCount = 0;

    console.log(`\n[BiliLive-${this.instanceId}] 🚀 开始全流程安全连接，直播间: ${roomId}...`);

    try {
      this.buvid = await this._initBiliUserSession();
      this.conf = await this._fetchBilibiliDanmuConf(roomId);
      this.hostList = this.conf.hostList;
      this._connectInternal(this.conf);
    } catch (error) {
      console.error(`[BiliLive-${this.instanceId} 初始化失败]:`, error.message || error);
      if (this.onError) this.onError(error);
    }
  }

  _connectInternal(conf) {
    if (this.isClosed) return;

    this.closeWs();

    try {
      const address = conf.address;
      console.log(`[BiliLive-${this.instanceId}] 🔗 正在握手 WebSocket 管道 #${this.totalReconnectCount + 1} | ${address}`);

      // 使用真实 UID（如果已登录且新 API 成功获取了认证 token），让服务器返回完整的用户信息
      // 如果未登录或新 API 失败（降级到旧 API），则使用 0（匿名模式，名字会有星号遮挡）
      // 注意：旧 API 返回的 token 是匿名 token，使用真实 UID 会导致服务器拒绝连接
      const activeUid = (this.credentials?.DEDEUSERID && conf.isAuthenticated) ? Number(this.credentials.DEDEUSERID) : 0;

      this.ws = new LiveWS(conf.realRoomId, {
        protover: 2,
        key: conf.key,
        address: conf.address,
        buvid: this.buvid,
        uid: activeUid
      });

      this.ws.on('open', () => {
        this.reconnectCount = 0;
        console.log(`[BiliLive-${this.instanceId}] 🎉 成功建立稳健连接，房间： ${conf.realRoomId}`);
        if (this.onStatus) this.onStatus({ type: 'connected', roomId: this.roomId });
      });

      // ⚡ 关键：只监听 msg 和 DANMU_MSG 两个事件，不漏任何弹幕
      this.ws.on('msg', (data) => {
        if (!data) return;
        if (typeof data === 'object' && data.cmd) {
          this._dispatchCommand(data);
        }
      });

      this.ws.on('DANMU_MSG', (data) => {
        this._parseAndPrintDanmu(data);
      });

      this.ws.on('live', () => {
        console.log(`[BiliLive-${this.instanceId}] ♻️ 弹幕流认证成功 #${this.totalReconnectCount + 1}`);
        if (this.onStatus) this.onStatus({ type: 'authenticated', roomId: this.roomId });
      });

      this.ws.on('error', (err) => {
        console.error(`[BiliLive-${this.instanceId} 错误] #${this.totalReconnectCount + 1}:`, err?.message || err);
        if (this.onError) this.onError(err);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[BiliLive-${this.instanceId}] 🔌 管道断开 | code=${code} reason=${reason}`);
        this._handleClose();
      });

    } catch (err) {
      console.error(`[BiliLive-${this.instanceId} 连接异常]:`, err instanceof Error ? err.message : String(err));
      this._handleClose();
    }
  }

  /**
   * 精简分发器：处理 BATCH_COMMAND（批量弹幕）和 SEND_GIFT（礼物）
   * 注意：DANMU_MSG 由 DANMU_MSG 事件监听器直接处理，避免重复
   */
  _dispatchCommand(packet) {
    if (!packet) return;
    const cmd = packet.cmd || packet.msg?.cmd || '';
    
    // 处理单条 SEND_GIFT 礼物消息
    if (cmd === 'SEND_GIFT') {
      this._parseAndEmitGift(packet.data);
      return;
    }

    if (cmd === 'BATCH_COMMAND' && Array.isArray(packet.data?.list)) {
      for (const subPacket of packet.data.list) {
        const subCmd = subPacket?.cmd || '';
        if (subCmd.startsWith('DANMU_MSG')) {
          this._parseAndPrintDanmu(subPacket);
        } else if (subCmd === 'SEND_GIFT') {
          this._parseAndEmitGift(subPacket.data);
        }
      }
    }
  }

  /**
   * ⚡ 终极无遮挡全明文解析器（UID、全称、头像完整闭环）
   */
  _parseAndPrintDanmu(data) {
    if (!data || !data.info) return;

    try {
      const info = data.info;

      // 1. 获取完整用户昵称
      const username = info[2]?.[1] || '未知';

      // 2. 获取用户真实 UID
      const uid = info[2]?.[0] || 0;

      // 3. 获取弹幕内容
      const content = info[1] || '';

      // 4. 获取用户头像 URL
      let faceUrl = '';
      if (info[0] && info[0][15] && typeof info[0][15] === 'object') {
        faceUrl = info[0][15]?.user_face || '';
      }
      if (!faceUrl) {
        faceUrl = 'https://static.hdslb.com/images/member/noface.gif';
      }

      // 如果有专属小号登录，这里出来的姓名是 100% 毫无遮挡的全称
      console.log(`[实例:${this.instanceId} 弹幕] UID: ${uid} | 名字: ${username} | 头像: ${faceUrl} | 内容: ${content}`);

      // 通过回调将数据发回给调用方（IPC 层负责转发到前端）
      if (this.onDanmu) {
        this.onDanmu({ uid, username, content, faceUrl });
      }

    } catch (parseErr) {
      // 容错
    }
  }

  /**
   * 🎁 Bilibili 礼物解析器
   * 解析 SEND_GIFT 命令的 data 字段，提取完整的礼物信息
   * 通过 onGift 回调发送给调用方（IPC 层负责转发到前端和 BufferService）
   */
  _parseAndEmitGift(data) {
    if (!data) return;

    try {
      const giftId = String(data.giftId || '');
      const giftName = data.giftName || '未知礼物';
      const num = data.num || 1;
      const uname = data.uname || '未知';
      const uid = data.uid || 0;
      const face = data.face || 'https://static.hdslb.com/images/member/noface.gif';
      const price = data.price || 0;           // 单个礼物的金瓜子价格
      const totalCoin = data.total_coin || 0;   // 总消费金瓜子
      const coinType = data.coin_type || 'gold';
      const giftIcon = data.giftIcon || '';
      const comboNum = data.combo_num || 1;
      const comboStay = data.combo_stay || 1;
      const batchComboId = data.batch_combo_id || '';
      const medalLevel = data.medal_info?.medal_level || 0;
      const medalName = data.medal_info?.medal_name || '';
      const rcost = data.rcost || 0;            // 真实消费（金瓜子）
      const discountPrice = data.discount_price || 0;

      // 计算人民币价值（B站 1元 = 1000金瓜子）
      const rmbPrice = totalCoin / 1000;

      console.log(`[实例:${this.instanceId} 礼物] UID: ${uid} | 名字: ${uname} | 礼物: ${giftName}(${giftId}) x${num} | 金瓜子: ${totalCoin} | 头像: ${face}`);

      // 通过回调将数据发回给调用方
      if (this.onGift) {
        this.onGift({
          // 基础字段
          giftId,
          giftName,
          num,
          uname,
          uid,
          face,
          // 价格字段
          price,           // 单个价格
          totalCoin,       // 总消费
          rcost,           // 真实消费
          coinType,
          rmbPrice,        // 人民币估算
          discountPrice,
          // 连击字段
          comboNum,
          comboStay,
          batchComboId,
          // 粉丝牌
          medalLevel,
          medalName,
          // 图标
          giftIcon,
          // 时间戳
          timestamp: Date.now(),
        });
      }
    } catch (parseErr) {
      console.error(`[实例:${this.instanceId} 礼物解析错误]:`, parseErr);
    }
  }

  _handleClose() {
    if (this.isClosed) return;
    if (!this.shouldReconnect) return;

    this.reconnectCount++;
    this.totalReconnectCount++;

    if (this.totalReconnectCount > MAX_RECONNECT_COUNT) {
      this.shouldReconnect = false;
      console.log(`[BiliLive-${this.instanceId}] ⛔ 超过最大重连次数，安全熔断`);
      if (this.onStatus) this.onStatus({ type: 'max_reconnect_exceeded' });
      return;
    }

    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectCount - 1), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    if (this.reconnectCount > 3 && this.hostList.length > 1) {
      this.currentHostIndex = (this.currentHostIndex + 1) % this.hostList.length;
      const altHost = this.hostList[this.currentHostIndex]?.host;
      if (altHost && this.conf) {
        const newConf = { ...this.conf, host: altHost, address: `wss://${altHost}/sub` };
        setTimeout(() => {
          if (!this.isClosed && this.shouldReconnect) this._connectInternal(newConf);
        }, delay);
        return;
      }
    }

    setTimeout(() => {
      if (!this.isClosed && this.shouldReconnect && this.conf) this._connectInternal(this.conf);
    }, delay);
  }

  closeWs() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }

  close() {
    console.log(`[BiliLive-${this.instanceId}] 主动关闭服务...`);
    this.isClosed = true;
    this.shouldReconnect = false;
    this.closeWs();
    if (this.onStatus) this.onStatus({ type: 'disconnected' });
  }
}

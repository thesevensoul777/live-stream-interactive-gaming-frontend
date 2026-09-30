import { getAbogus } from './abogus';
import type { DyImInfo } from './dycast';
import { decodeResponse } from './model';
import { getMsToken } from './signature';
import { makeUrlParams, parseLiveHtml } from './util';

/**
 * 请求直播间信息
 */
// 你的业务文件
export const fetchLiveInfo = async function (id: string) {
  try {
    // 1. 拼接完整的真实 URL (必须包含 https://)
    // 假设目标是斗鱼，请替换为真实的域名
    const targetUrl = `https://live.douyin.com/${id}`; 

    // 2. 调用主进程方法 (解决跨域 + 解决路径错误)
    // 注意：这里不再使用 window.fetch
    const html = await (window as any).electronAPI.fetchLive(targetUrl);
    
    return html;
  } catch (err) {
    console.error(err);
    return Promise.reject(Error('Fetch Live Info Error'));
  }
};

/**
 * 获取直播间信息
 * @param id 房间号
 * @returns
 */
export const getLiveInfo = async function (id: string) {
  try {

    const html = await fetchLiveInfo(id);
    const first = parseLiveHtml(html);
    if (first) return first;
    else {
      // 如第一次请求无 cookie => __ac_nonce，无法获得目标信息
      // 但第一次请求会返回 cookie => __ac_nonce
      // 请求第二次
      const realHtml = await fetchLiveInfo(id);
      const second = parseLiveHtml(realHtml);
      if (second) return second;
      
      else throw new Error('Get Live Info Error');
    }
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * 访问抖音 Webcast 用户入口，补齐 CSRF / 登录相关 Cookie。
 */
export const fetchUser = async function () {
  try {
    await (window as any).electronAPI.fetchLive(
      'https://live.douyin.com/webcast/user/',
      {
        'X-Secsdk-Csrf-Request': '1',
        'X-Secsdk-Csrf-Version': '1.2.22',
      },
      { method: 'HEAD', allowHttpError: true },
    );
  } catch (err) {
    return Promise.reject(Error('Fetch Webcast User Error'));
  }
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BROWSER_VERSION =
  '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BROWSER_NAME = 'Mozilla';
const VERSION_CODE = 180800;

/**
 * 接口默认参数
 *  - /webcast/im/fetch
 */
const defaultIMFetchParams = {
  aid: 6383,
  app_name: 'douyin_web',
  browser_language: 'zh-CN',
  browser_name: BROWSER_NAME,
  browser_online: true,
  browser_platform: 'Win32',
  browser_version: BROWSER_VERSION,
  update_version_code: '1.0.0',
  cookie_enabled: true,
  cursor: '',
  device_id: '',
  device_platform: 'web',
  did_rule: 3,
  endpoint: 'live_pc',
  fetch_rule: 1,
  identity: 'audience',
  insert_task_id: '',
  internal_ext: '',
  last_rtt: 0,
  live_id: 1,
  live_reason: '',
  need_persist_msg_count: 15,
  resp_content_type: 'protobuf',
  screen_height: 1080,
  screen_width: 1920,
  support_wrds: 1,
  tz_name: 'Asia/Shanghai',
  version_code: VERSION_CODE
};

/**
 * 请求初次连接信息
 *  - im/fetch
 * @param roomId
 * @param uniqueId
 * @param roomNum 房间号；暂不需要
 */
export const fetchImInfo = async function (roomId: string, uniqueId: string) {
  try {
    const msToken = getMsToken(184);
    const params = Object.assign({}, defaultIMFetchParams, {
      msToken,
      room_id: roomId,
      user_unique_id: uniqueId
    });
    const paramStr = makeUrlParams(
      Object.assign({}, defaultIMFetchParams, {
        room_id: roomId,
        user_unique_id: uniqueId,
        live_pc: roomId,
      }),
    );
    const aBogus = getAbogus(paramStr, USER_AGENT);
    Object.assign(params, {
      live_pc: roomId,
      a_bogus: aBogus
    });

    const path = `/webcast/im/fetch/?${makeUrlParams(params)}`;
    
    // 强制补全域名，因为主进程 net.request 必须识别 https://
    const fullUrl = `https://live.douyin.com${path}`; 

    console.log('Final URL for IPC:', fullUrl);

    // 调用 IPC
    const uint8Array = await (window as any).electronAPI.fetchLiveBinary(fullUrl);
    
    return uint8Array.buffer.slice(
      uint8Array.byteOffset, 
      uint8Array.byteOffset + uint8Array.byteLength
    );
  } catch (err) {
    console.error(err);
    return Promise.reject(Error('Fetch Im Info Error'));
  }
};

/**
 * 获取初次连接信息
 * @param roomId
 * @param uniqueId
 * @returns
 */
export const getImInfo = async function (roomId: string, uniqueId: string): Promise<DyImInfo> {
  const reqMs = Date.now();
  try {
    const buffer = await fetchImInfo(roomId, uniqueId);
    // 请求出错返回的可能为json
    const res = decodeResponse(new Uint8Array(buffer));
    return {
      cursor: res.cursor,
      internalExt: res.internalExt,
      now: res.now,
      pushServer: res.pushServer,
      fetchInterval: res.fetchInterval,
      fetchType: res.fetchType,
      liveCursor: res.liveCursor
    };
  } catch (err) {
    const now = Date.now();
    // 确保能返回 cursor、internalExt
    return {
      cursor: `r-7497180536918546638_d-1_u-1_fh-7497179772733760010_t-${now}`,
      internalExt: `internal_src:dim|wss_push_room_id:${roomId}|wss_push_did:${uniqueId}|first_req_ms:${reqMs}|fetch_time:${now}|seq:1|wss_info:0-${now}-0-0|wrds_v:7497180515443673855`
    };
  }
};

const defaultMeFetchParam = {
  aid: '6383',
  app_name: 'douyin_web',
  browser_language: 'zh-CN',
  browser_name: 'Mozilla',
  browser_platform: 'Win32',
  browser_version: '120.0.0.0',
  cookie_enabled: 'true',
  device_platform: 'web',
  enter_from: 'web_live',
  language: 'zh-CN',
  live_id: '1',
  os_name: 'Windows',
  os_version: '10',
  room_id: '0',
  screen_height: '1080',
  screen_width: '1920',
};

export interface DouyinAccountInfo {
  uid: string;
  did: string;
  nickname: string;
  avatar: string;
  follower: number;
  following: number;
  sign?: string;
}

interface DouyinAccountResponse {
  status_code: number;
  data?: {
    sec_uid?: string;
    display_id?: string;
    nickname?: string;
    avatar_medium?: { url_list?: string[] };
    follow_info?: { follower_count?: number; following_count?: number };
    signature?: string;
    prompts?: string;
    message?: string;
  };
}

/**
 * 校验当前抖音登录态，并返回登录账号信息。
 */
export async function verifyDouyinLogin(): Promise<DouyinAccountInfo> {
  const params: Record<string, string> = { ...defaultMeFetchParam };
  const paramStr = makeUrlParams(params);
  const msToken = getMsToken(184);
  const aBogus = getAbogus(paramStr, USER_AGENT);

  Object.assign(params, {
    msToken,
    a_bogus: aBogus,
  });

  const text = await (window as any).electronAPI.fetchLive(
    `https://live.douyin.com/webcast/user/me/?${makeUrlParams(params)}`,
    {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://live.douyin.com/',
    },
  );
  const response = JSON.parse(text) as DouyinAccountResponse;

  if (response.status_code !== 0 || !response.data?.sec_uid) {
    const message = response.data?.prompts || response.data?.message || '用户未登录或登录态已失效';
    throw new Error(message);
  }

  return {
    uid: response.data.sec_uid || '',
    did: response.data.display_id || '',
    nickname: response.data.nickname || '',
    avatar: response.data.avatar_medium?.url_list?.[0] || '',
    follower: response.data.follow_info?.follower_count || 0,
    following: response.data.follow_info?.following_count || 0,
    sign: response.data.signature || '',
  };
}

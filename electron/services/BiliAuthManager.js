// electron/services/BiliAuthManager.js
import { BrowserWindow, session } from 'electron';

/**
 * BiliAuthManager - 管理主播的 B 站登录态
 * 
 * 核心逻辑：
 * 1. 每个主播（userId）拥有独立的持久化沙盒 session（persist:bili_sandbox_{userId}）
 * 2. 启动时自动检测沙盒内是否已有有效 Cookie（SESSDATA + DedeUserID）
 * 3. 如果未登录，弹出 B 站官方 H5 登录窗口让主播扫码
 * 4. 登录成功后 Cookie 自动固化在沙盒中，后续请求自动携带凭证
 */

const LOGIN_WINDOW_WIDTH = 480;
const LOGIN_WINDOW_HEIGHT = 650;
const COOKIE_CHECK_INTERVAL_MS = 1500;
const BILI_DOMAIN = '.bilibili.com';

/**
 * 获取指定主播的隔离沙盒 session
 * @param {string} userId 主播唯一标识
 * @returns {Electron.Session}
 */
function getSandboxSession(userId) {
  const partitionName = `persist:bili_sandbox_${userId}`;
  return session.fromPartition(partitionName);
}

/**
 * 从沙盒中读取 B 站登录凭证
 * @param {Electron.Session} userSession
 * @returns {Promise<{SESSDATA: string|null, DEDEUSERID: string|null}>}
 */
async function getCredentialsFromSession(userSession) {
  const cookies = await userSession.cookies.get({ domain: BILI_DOMAIN });
  const sessdata = cookies.find(c => c.name === 'SESSDATA');
  const dedeUserId = cookies.find(c => c.name === 'DedeUserID');
  return {
    SESSDATA: sessdata?.value || null,
    DEDEUSERID: dedeUserId?.value || null,
  };
}

/**
 * 确保主播已登录，如果未登录则弹出扫码窗口
 * 
 * @param {string} userId 主播在软件里的唯一ID
 * @returns {Promise<{SESSDATA: string, DEDEUSERID: string}>}
 */
export async function ensureUserAuthenticated(userId) {
  const userSession = getSandboxSession(userId);

  // 1. 检查是否已有有效凭证
  const credentials = await getCredentialsFromSession(userSession);
  if (credentials.SESSDATA && credentials.DEDEUSERID) {
    console.log(`[BiliAuth-${userId}] ✅ 检测到本地已存在有效登录凭证 (UID: ${credentials.DEDEUSERID})，跳过扫码。`);
    return credentials;
  }

  // 2. 未登录 → 弹出 B 站官方 H5 登录页让主播扫码
  console.log(`[BiliAuth-${userId}] 🔑 未检测到登录凭证，正在弹出 B 站官方登录窗口...`);

  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: LOGIN_WINDOW_WIDTH,
      height: LOGIN_WINDOW_HEIGHT,
      title: '请登录您的 B 站账号以激活高保真弹幕通道',
      autoHideMenuBar: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        partition: `persist:bili_sandbox_${userId}`,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    loginWin.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 先加载 B 站首页，再跳转到登录页，避免 H5 登录页被拦截
    loginWin.loadURL('https://www.bilibili.com/');

    // 监听页面加载完成后跳转到登录页
    loginWin.webContents.on('did-finish-load', () => {
      const currentUrl = loginWin.webContents.getURL();
      if (currentUrl === 'https://www.bilibili.com/' || currentUrl === 'https://www.bilibili.com') {
        loginWin.loadURL('https://passport.bilibili.com/login');
      }
    });

    // 监听加载失败（如页面不存在）
    loginWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[BiliAuth-${userId}] ❌ 页面加载失败 [${errorCode}] ${errorDescription} — URL: ${validatedURL}`);
    });

    let resolved = false;

    // 轮询检测 Cookie 是否写入（用户扫码登录后 B 站会设置 Cookie）
    const checker = setInterval(async () => {
      if (loginWin.isDestroyed()) {
        clearInterval(checker);
        return;
      }

      try {
        const currentCredentials = await getCredentialsFromSession(userSession);
        if (currentCredentials.SESSDATA && currentCredentials.DEDEUSERID) {
          clearInterval(checker);
          resolved = true;
          console.log(`[BiliAuth-${userId}] 🎉 主播扫码登录成功！UID: ${currentCredentials.DEDEUSERID}`);

          if (!loginWin.isDestroyed()) {
            loginWin.destroy();
          }
          resolve(currentCredentials);
        }
      } catch (err) {
        console.error(`[BiliAuth-${userId}] 嗅探 Cookie 失败:`, err.message);
      }
    }, COOKIE_CHECK_INTERVAL_MS);

    loginWin.on('closed', () => {
      clearInterval(checker);
      // 如果已经 resolve 过了（登录成功后被 destroy），不再 reject
      if (!resolved) {
        reject(new Error('主播取消了登录。'));
      }
    });
  });
}

/**
 * 清除指定主播的登录态（登出）
 * @param {string} userId
 */
export async function clearUserAuth(userId) {
  const userSession = getSandboxSession(userId);
  await userSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'cache'],
  });
  console.log(`[BiliAuth-${userId}] 🧹 已清除该主播的登录凭证。`);
}

/**
 * 检查指定主播是否已登录
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isUserAuthenticated(userId) {
  const userSession = getSandboxSession(userId);
  const credentials = await getCredentialsFromSession(userSession);
  return !!(credentials.SESSDATA && credentials.DEDEUSERID);
}

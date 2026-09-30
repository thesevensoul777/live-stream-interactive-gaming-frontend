// electron/services/DouyinAuthManager.js
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const LOGIN_WINDOW_WIDTH = 480;
const LOGIN_WINDOW_HEIGHT = 650;
const COOKIE_CHECK_INTERVAL_MS = 1500;
const DOUYIN_LOGIN_URL = 'https://www.douyin.com/';
const LOGIN_PROMISES = new Map();

// Cookies that matter for Douyin requests / authentication
const SIGNIFICANT_COOKIES = new Set([
  'ttwid',
  '__ac_nonce',
  '__ac_signature',
  'passport_csrf_token',
  'passport_csrf_token_default',
  'sessionid',
  'sessionid_ss',
  'sid_tt',
  'uid_tt',
  'uid_tt_ss',
  'sid_guard',
  'odin_tt',
  'msToken',
]);

function getSandboxSession(userId) {
  const partitionName = `persist:douyin_sandbox_${userId}`;
  return session.fromPartition(partitionName);
}

function getCookieFilePath(userId) {
  return path.join(app.getPath('userData'), `douyin_creds_${userId}.json`);
}

async function getCookiesFromSession(userSession) {
  const all = await userSession.cookies.get({});
  return all.filter((c) => c.domain?.includes('douyin.com') || SIGNIFICANT_COOKIES.has(c.name));
}

function readSavedCookies(userId) {
  try {
    const filePath = getCookieFilePath(userId);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveCookiesToFile(userId, cookies) {
  try {
    const filePath = getCookieFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log(`[DouyinAuth-${userId}] Saved ${cookies.length} cookies to file.`);
  } catch (err) {
    console.error(`[DouyinAuth-${userId}] Failed to save cookies:`, err.message);
  }
}

function deleteCookieFile(userId) {
  try {
    const filePath = getCookieFilePath(userId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

export async function injectCookiesToSession(userSession, cookies) {
  for (const c of cookies) {
    if (!c.name || c.value === undefined) continue;
    try {
      const domain = c.domain || '.douyin.com';
      const host = domain.startsWith('.') ? domain.slice(1) : domain;
      await userSession.cookies.set({
        url: `https://${host}`,
        name: c.name,
        value: String(c.value),
        domain,
        path: c.path || '/',
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
      });
    } catch (err) {
      console.error(`[DouyinAuth] Failed to inject cookie ${c.name}:`, err.message);
    }
  }
}

export async function clearDouyinCookiesFromSession(userSession) {
  const cookies = await userSession.cookies.get({});
  const douyinCookies = cookies.filter((c) => c.domain?.includes('douyin.com'));

  for (const cookie of douyinCookies) {
    if (!cookie.name) continue;
    try {
      const domain = cookie.domain || '.douyin.com';
      const host = domain.startsWith('.') ? domain.slice(1) : domain;
      await userSession.cookies.remove(
        `https://${host}${cookie.path || '/'}`,
        cookie.name,
      );
    } catch (err) {
      console.error(`[DouyinAuth] Failed to remove cookie ${cookie.name}:`, err.message);
    }
  }
}

function hasLoginSession(cookies) {
  return cookies.some(
    (c) => ['sessionid', 'sessionid_ss', 'sid_tt'].includes(c.name) && c.value,
  );
}

export function serializeCookies(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

export async function ensureDouyinAuthenticated(userId) {
  const pendingLogin = LOGIN_PROMISES.get(userId);
  if (pendingLogin) {
    return pendingLogin;
  }

  const userSession = getSandboxSession(userId);

  let cookies = await getCookiesFromSession(userSession);
  if (hasLoginSession(cookies)) {
    console.log(`[DouyinAuth-${userId}] Login cookies found, skipping login.`);
    return cookies;
  }

  const saved = readSavedCookies(userId);
  if (saved && saved.length) {
    console.log(`[DouyinAuth-${userId}] Restoring ${saved.length} cookies from file.`);
    await injectCookiesToSession(userSession, saved);
    cookies = await getCookiesFromSession(userSession);
    if (hasLoginSession(cookies)) return cookies;
  }

  console.log(`[DouyinAuth-${userId}] No login session found, opening login window...`);

  const loginPromise = new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: LOGIN_WINDOW_WIDTH,
      height: LOGIN_WINDOW_HEIGHT,
      title: 'Douyin Login',
      autoHideMenuBar: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        partition: `persist:douyin_sandbox_${userId}`,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    loginWin.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    loginWin.loadURL(DOUYIN_LOGIN_URL);
    loginWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[DouyinAuth-${userId}] Page load failed [${errorCode}] ${errorDescription} ${validatedURL}`);
    });

    let resolved = false;
    const checker = setInterval(async () => {
      if (loginWin.isDestroyed()) {
        clearInterval(checker);
        return;
      }
      try {
        const current = await getCookiesFromSession(userSession);
        if (hasLoginSession(current)) {
          clearInterval(checker);
          resolved = true;
          console.log(`[DouyinAuth-${userId}] Login cookies detected. Persisted ${current.length} cookies.`);
          saveCookiesToFile(userId, current);
          if (!loginWin.isDestroyed()) loginWin.destroy();
          resolve(current);
        }
      } catch (err) {
        console.error(`[DouyinAuth-${userId}] Cookie check failed:`, err.message);
      }
    }, COOKIE_CHECK_INTERVAL_MS);

    loginWin.on('closed', () => {
      clearInterval(checker);
      if (!resolved) reject(new Error('Douyin login cancelled.'));
    });
  });

  LOGIN_PROMISES.set(userId, loginPromise);
  try {
    return await loginPromise;
  } finally {
    LOGIN_PROMISES.delete(userId);
  }
}

export async function clearDouyinAuth(userId) {
  const userSession = getSandboxSession(userId);
  await userSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'cache'],
  });
  deleteCookieFile(userId);
  console.log(`[DouyinAuth-${userId}] Auth cleared.`);
}

export async function isDouyinAuthenticated(userId) {
  const userSession = getSandboxSession(userId);
  const cookies = await getCookiesFromSession(userSession);
  if (hasLoginSession(cookies)) return true;
  const saved = readSavedCookies(userId);
  return Boolean(
    saved &&
      saved.some(
        (c) => ['sessionid', 'sessionid_ss', 'sid_tt'].includes(c.name) && c.value,
      ),
  );
}

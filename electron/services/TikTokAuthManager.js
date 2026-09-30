// electron/services/TikTokAuthManager.js
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const LOGIN_WINDOW_WIDTH = 480;
const LOGIN_WINDOW_HEIGHT = 650;
const COOKIE_CHECK_INTERVAL_MS = 1500;
const TIKTOK_LOGIN_URL = 'https://www.tiktok.com/login';

const SIGNIFICANT_COOKIES = new Set([
  'sessionid',
  'sessionid_ss',
  'sid_tt',
  'uid_tt',
  'uid_tt_ss',
  'sid_guard',
  'passport_csrf_token',
  'passport_csrf_token_default',
  'ttwid',
  'msToken',
]);

function getSandboxSession(userId) {
  const partitionName = `persist:tiktok_sandbox_${userId}`;
  return session.fromPartition(partitionName);
}

function getCookieFilePath(userId) {
  return path.join(app.getPath('userData'), `tiktok_creds_${userId}.json`);
}

async function getCookiesFromSession(userSession) {
  const all = await userSession.cookies.get({});
  return all.filter((c) => c.domain?.includes('tiktok.com') || SIGNIFICANT_COOKIES.has(c.name));
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
    console.log(`[TikTokAuth-${userId}] Saved ${cookies.length} cookies to file.`);
  } catch (err) {
    console.error(`[TikTokAuth-${userId}] Failed to save cookies:`, err.message);
  }
}

function deleteCookieFile(userId) {
  try {
    const filePath = getCookieFilePath(userId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

async function injectCookiesToSession(userSession, cookies) {
  for (const c of cookies) {
    if (!c.name || c.value === undefined) continue;
    try {
      const domain = c.domain || '.tiktok.com';
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
      console.error(`[TikTokAuth] Failed to inject cookie ${c.name}:`, err.message);
    }
  }
}

function hasLoginSession(cookies) {
  return cookies.some((c) => (c.name === 'sessionid' || c.name === 'sid_tt') && c.value);
}

export function serializeCookies(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

export async function ensureTikTokAuthenticated(userId) {
  const userSession = getSandboxSession(userId);

  let cookies = await getCookiesFromSession(userSession);
  if (hasLoginSession(cookies)) {
    console.log(`[TikTokAuth-${userId}] Session cookies found, skipping login.`);
    return cookies;
  }

  const saved = readSavedCookies(userId);
  if (saved && saved.length) {
    console.log(`[TikTokAuth-${userId}] Restoring ${saved.length} cookies from file.`);
    await injectCookiesToSession(userSession, saved);
    cookies = await getCookiesFromSession(userSession);
    if (hasLoginSession(cookies)) return cookies;
  }

  console.log(`[TikTokAuth-${userId}] No valid cookies found, opening login window...`);

  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: LOGIN_WINDOW_WIDTH,
      height: LOGIN_WINDOW_HEIGHT,
      title: 'TikTok Login',
      autoHideMenuBar: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        partition: `persist:tiktok_sandbox_${userId}`,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    loginWin.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    loginWin.loadURL(TIKTOK_LOGIN_URL);
    loginWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[TikTokAuth-${userId}] Page load failed [${errorCode}] ${errorDescription} ${validatedURL}`);
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
          console.log(`[TikTokAuth-${userId}] Login complete. Persisted ${current.length} cookies.`);
          saveCookiesToFile(userId, current);
          if (!loginWin.isDestroyed()) loginWin.destroy();
          resolve(current);
        }
      } catch (err) {
        console.error(`[TikTokAuth-${userId}] Cookie check failed:`, err.message);
      }
    }, COOKIE_CHECK_INTERVAL_MS);

    loginWin.on('closed', () => {
      clearInterval(checker);
      if (!resolved) reject(new Error('TikTok login cancelled.'));
    });
  });
}

export async function clearTikTokAuth(userId) {
  const userSession = getSandboxSession(userId);
  await userSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'cache'],
  });
  deleteCookieFile(userId);
  console.log(`[TikTokAuth-${userId}] Auth cleared.`);
}

export async function isTikTokAuthenticated(userId) {
  const userSession = getSandboxSession(userId);
  const cookies = await getCookiesFromSession(userSession);
  if (hasLoginSession(cookies)) return true;
  const saved = readSavedCookies(userId);
  return Boolean(saved && saved.some((c) => (c.name === 'sessionid' || c.name === 'sid_tt') && c.value));
}

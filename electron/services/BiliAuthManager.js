// electron/services/BiliAuthManager.js
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const LOGIN_WINDOW_WIDTH = 480;
const LOGIN_WINDOW_HEIGHT = 650;
const COOKIE_CHECK_INTERVAL_MS = 1500;
const BILI_DOMAIN = '.bilibili.com';

function getSandboxSession(userId) {
  const partitionName = "persist:bili_sandbox_" + userId;
  return session.fromPartition(partitionName);
}

function getCredsFilePath(userId) {
  return path.join(app.getPath("userData"), "bili_creds_" + userId + ".json");
}

async function getCredentialsFromSession(userSession) {
  const cookies = await userSession.cookies.get({ domain: BILI_DOMAIN });
  const sessdata = cookies.find(c => c.name === "SESSDATA");
  const dedeUserId = cookies.find(c => c.name === "DedeUserID");
  return {
    SESSDATA: sessdata?.value || null,
    DEDEUSERID: dedeUserId?.value || null,
  };
}

function readSavedCredentials(userId) {
  try {
    const filePath = getCredsFilePath(userId);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCredentialsToFile(userId, credentials) {
  try {
    const filePath = getCredsFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2), "utf-8");
    console.log("[BiliAuth-" + userId + "] Credentials saved to file for persistence.");
  } catch (err) {
    console.error("[BiliAuth-" + userId + "] Failed to save credentials to file:", err.message);
  }
}

function deleteCredentialsFile(userId) {
  try {
    const filePath = getCredsFilePath(userId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

async function injectCredentialsToSession(userSession, credentials) {
  const items = { SESSDATA: credentials.SESSDATA, DedeUserID: credentials.DEDEUSERID };
  for (const [name, value] of Object.entries(items)) {
    try {
      await userSession.cookies.set({
        url: "https://www.bilibili.com",
        name,
        value,
        domain: ".bilibili.com",
        secure: true,
        httpOnly: true,
      });
    } catch (err) {
      console.error("[BiliAuth] Failed to inject cookie " + name + ":", err.message);
    }
  }
}

export async function ensureUserAuthenticated(userId) {
  const userSession = getSandboxSession(userId);

  let credentials = await getCredentialsFromSession(userSession);
  if (credentials.SESSDATA && credentials.DEDEUSERID) {
    console.log("[BiliAuth-" + userId + "] Session cookies found (UID: " + credentials.DEDEUSERID + "), skipping login.");
    return credentials;
  }

  const saved = readSavedCredentials(userId);
  if (saved && saved.SESSDATA && saved.DEDEUSERID) {
    console.log("[BiliAuth-" + userId + "] Restoring credentials from file (UID: " + saved.DEDEUSERID + ").");
    await injectCredentialsToSession(userSession, saved);
    credentials = await getCredentialsFromSession(userSession);
    if (credentials.SESSDATA && credentials.DEDEUSERID) {
      return credentials;
    }
  }

  console.log("[BiliAuth-" + userId + "] No valid credentials found, opening login window...");

  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: LOGIN_WINDOW_WIDTH,
      height: LOGIN_WINDOW_HEIGHT,
      title: "Please login to your Bilibili account",
      autoHideMenuBar: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        partition: "persist:bili_sandbox_" + userId,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    loginWin.webContents.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    loginWin.loadURL("https://www.bilibili.com/");
    loginWin.webContents.on("did-finish-load", () => {
      const currentUrl = loginWin.webContents.getURL();
      if (currentUrl === "https://www.bilibili.com/" || currentUrl === "https://www.bilibili.com") {
        loginWin.loadURL("https://passport.bilibili.com/login");
      }
    });

    loginWin.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
      console.error("[BiliAuth-" + userId + "] Page load failed [" + errorCode + "] " + errorDescription + " " + validatedURL);
    });

    let resolved = false;
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
          console.log("[BiliAuth-" + userId + "] Login successful! UID: " + currentCredentials.DEDEUSERID);

          saveCredentialsToFile(userId, currentCredentials);

          if (!loginWin.isDestroyed()) loginWin.destroy();
          resolve(currentCredentials);
        }
      } catch (err) {
        console.error("[BiliAuth-" + userId + "] Cookie check failed:", err.message);
      }
    }, COOKIE_CHECK_INTERVAL_MS);

    loginWin.on("closed", () => {
      clearInterval(checker);
      if (!resolved) reject(new Error("Login cancelled."));
    });
  });
}

export async function clearUserAuth(userId) {
  const userSession = getSandboxSession(userId);
  await userSession.clearStorageData({
    storages: ["cookies", "localstorage", "cache"],
  });
  deleteCredentialsFile(userId);
  console.log("[BiliAuth-" + userId + "] Auth cleared.");
}

export async function isUserAuthenticated(userId) {
  const userSession = getSandboxSession(userId);
  const credentials = await getCredentialsFromSession(userSession);
  if (credentials.SESSDATA && credentials.DEDEUSERID) return true;
  const saved = readSavedCredentials(userId);
  return !!(saved && saved.SESSDATA && saved.DEDEUSERID);
}

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { Tools } from './until/tools.js';
// ES 模块下获取 __filename 和 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tool = new Tools()
const fileWriteLocks = new Map();
let CommandPath = '';
let GiftPath = '';
let LikePath = '';


export function getWarcraftPath(paths){

const dir = path.join(paths, 'GameData', 'TerritoryWars');
CommandPath = path.join(dir, 'TerritoryWarsCmd-2147483648');
GiftPath = path.join(dir, 'TerritoryWarsGift-2147483648');
LikePath = path.join(dir, 'TerritoryWarsLike-2147483648');

}



function getInjectorPath() {
  // 开发环境
  if (!app.isPackaged) {
    return path.join(__dirname, '..', 'bin', 'War3Injector.exe');
  }

  // 打包后
  return path.join(process.resourcesPath, 'bin', 'War3Injector.exe');
}




/**
 * 注入 War3
 */

export function injectWar3() {
  // const injectorPath = getInjectorPath();


  // if (!fs.existsSync(injectorPath)) {
  //   console.error('❌ War3Injector.exe not found');
  //   return;
  // }

  // const command = `Start-Process -FilePath "${injectorPath}" -Verb RunAs`;

  // exec(
  //   `powershell -Command "${command}"`,
  //   (error, stdout, stderr) => {
  //     if (error) console.error('[PS error]', error);
  //     if (stderr) console.error('[PS stderr]', stderr);
  //     console.log('[PS stdout]', stdout);
  //   }
  // );
}

export async function saveCommand(payload) {
  try {
    await appendCommandPayload(payload);
    return { ok: true };
  } catch (err) {
    console.error('[saveCommand failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
async function appendCommandPayload(payload, minBytes = 5) {
 await acquireFileLock(CommandPath);

  try {

        // 1. 严格等待 WC3 清空文件
// 开头调用
await waitUntilFileReadyByPath(CommandPath, 10, 500);


    // 2. 基础脚本模板
    const base = `
function PreloadFiles takes nothing returns nothing
    call Preload("")
endfunction

function AAA takes nothing returns nothing
    call PreloadEnd(0.0)
endfunction
`.trim();

    // 3. 文件不存在 → 直接写 base
        fs.writeFileSync(CommandPath, base, 'utf-8');

    // 4. 读取文件
    let buf = fs.readFileSync(CommandPath);
    let content = buf.toString('utf-8');

    let preloadStart = content.indexOf('function PreloadFiles');

    // 5. 找不到 PreloadFiles 的兜底处理
    if (preloadStart === -1) {
        if (buf.length < minBytes) {
            console.warn('PreloadFiles 丢失且文件过小，已重建基础脚本');
            fs.writeFileSync(CommandPath, base, 'utf-8');

            content = base;
            preloadStart = content.indexOf('function PreloadFiles');
        } else {
            throw new Error('找不到 PreloadFiles 函数（文件内容异常，已保护）');
        }
    }

    const endIndex = content.indexOf('endfunction', preloadStart);
    if (endIndex === -1) {
        throw new Error('找不到 PreloadFiles 的 endfunction');
    }



 console.log(payload,"payload")

    // 7. 构建命令文本
    const fullText =
        `|realId=${tool.encodeValue(payload.msg.realId)}|` +
        `*user=${tool.encodeValue(payload.msg.user)}|` +
        `*command=${tool.encodeValue(payload.action)}|` +
        `*time=${payload.msg.time}|`;


        const MAX_SEGMENTS_PER_WRITE = 5;

    // 9. 生成 JASS 注入代码
    let inject =
            `    call SetPlayerName(Player(0), "${fullText}")\n` +
            `    call Preload("")\n`;


    // 10. 注入并写入
    const newContent =
        content.slice(0, endIndex) +
        inject +
        content.slice(endIndex);

    fs.writeFileSync(CommandPath, newContent, 'utf-8');

    console.log(
        '命令已写入 WC3:',
        fullText,
        )
    } finally {
    releaseFileLock(CommandPath);
  }
  
    
    
}


// ----------------- 公共等待文件空闲 -----------------
async function waitUntilFileReadyByPath(filePath, intervalMs = 500) {
  while (true) {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('function PreloadFiles')) return;

    await new Promise(r => setTimeout(r, intervalMs));
  }
}






export async function saveGift(msg) {
  const payload = { type: 'GIFT', msg };
  try {
    await appendGiftPayload(payload);
    return { ok: true };
  } catch (err) {
    console.error('[saveGift failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}


async function appendGiftPayload(payload, minBytes = 5) {
  await acquireFileLock(GiftPath);
  try {
    await waitUntilFileReadyByPath(GiftPath);

    const base = `
function PreloadFiles takes nothing returns nothing
    call Preload("")
endfunction

function AAA takes nothing returns nothing
    call PreloadEnd(0.0)
endfunction
`.trim();

    fs.writeFileSync(GiftPath, base, 'utf-8');

    let content = fs.readFileSync(GiftPath, 'utf-8');
    const preloadStart = content.indexOf('function PreloadFiles');
    const endIndex = content.indexOf('endfunction', preloadStart);
    if (preloadStart === -1 || endIndex === -1) throw new Error('PreloadFiles 结构异常');

    const encodedUser = tool.encodeValue(payload.msg.user);
    const encodedId = tool.encodeValue(payload.msg.realId);
    const safeUser = encodedUser.length > 0 ? encodedUser : encodedId;

    const fullText =
      `|type=GIFT|` +
      `|realId=${encodedId}|` +
      `*user=${safeUser}|` +
      `*giftId=${payload.msg.giftId}|` +
      `*time=${payload.msg.time}|`;

    const inject =
      `    call SetPlayerName(Player(0), "${fullText}")\n` +
      `    call Preload("")\n`;

    const newContent = content.slice(0, endIndex) + inject + content.slice(endIndex);
    fs.writeFileSync(GiftPath, newContent, 'utf-8');

    console.log('礼物已写入 WC3:', fullText);
  } finally {
    releaseFileLock(GiftPath);
  }
}




export async function saveLike(msg) {
  const payload = { type: 'LIKE', msg };
  try {
    await appendLikePayload(payload);
    return { ok: true };
  } catch (err) {
    console.error('[saveLike failed]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function appendLikePayload(payload, minBytes = 5) {
  await acquireFileLock(LikePath);
  try {
    await waitUntilFileReadyByPath(LikePath);

    const base = `
function PreloadFiles takes nothing returns nothing
    call Preload("")
endfunction

function AAA takes nothing returns nothing
    call PreloadEnd(0.0)
endfunction
`.trim();

    fs.writeFileSync(LikePath, base, 'utf-8');

    let content = fs.readFileSync(LikePath, 'utf-8');
    const preloadStart = content.indexOf('function PreloadFiles');
    const endIndex = content.indexOf('endfunction', preloadStart);
    if (preloadStart === -1 || endIndex === -1) throw new Error('PreloadFiles 结构异常');

    const encodedUser = tool.encodeValue(payload.msg.user);
    const encodedId = tool.encodeValue(payload.msg.realId);
    const safeUser = encodedUser.length > 0 ? encodedUser : encodedId;

    const fullText =
      `|type=LIKE|` +
      `|realId=${encodedId}|` +
      `*user=${safeUser}|` +
      `*likeCount=${payload.msg.likeCount}|` +
      `*time=${payload.msg.time}|`;

    const inject =
      `    call SetPlayerName(Player(0), "${fullText}")\n` +
      `    call Preload("")\n`;

    const newContent = content.slice(0, endIndex) + inject + content.slice(endIndex);
    fs.writeFileSync(LikePath, newContent, 'utf-8');

    console.log('点赞已写入 WC3:', fullText);
  } finally {
    releaseFileLock(LikePath);
  }
}

async function acquireFileLock(filePath) {
  while (fileWriteLocks.get(filePath)) {
    await new Promise(r => setTimeout(r, 10));
  }
  fileWriteLocks.set(filePath, true);
}

function releaseFileLock(filePath) {
  fileWriteLocks.set(filePath, false);
}
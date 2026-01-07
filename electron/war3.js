import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { tools } from './until/tools.js';
// ES 模块下获取 __filename 和 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
  const tool = new tools()
let playerIndex = 0;
let WarcraftPath ="";
const MAX_CHARS_PER_PLAYER = 20;

const CHECK_INTERVAL_MS = 50;
const MAX_WAIT_MS = 5000;
export function getWarcraftPath(paths){

const dir = path.join(paths, 'GameData', 'TerritoryWars');
WarcraftPath = path.join(dir, 'TerritoryWarsCmd-2147483648');


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


/**
 * 计算一段字符串的 WC3 长度
 * 中文按 2 个单位，英文按 1 个单位
 * 最后再加 6 的 WC3 内部偏移
 */
function calcSegmentLength(str) {
    let len = 0;
    for (const ch of str) {
        if (/[\u4e00-\u9fa5]/.test(ch)) {
            len += 2;
        } else {
            len += 1;
        }
    }
    return len + 6;
}













/**
 * 拆分字符串为多条 PlayerName，每条最大 maxUnits 单位
 * 中文 2 单位，英文 1 单位
 */
function splitTextForPlayerName(text, maxUnits = 80) {
    const segments = [];
    let remaining = text;

    while (remaining.length > 0) {
        let count = 0;
        let i = 0;
        for (; i < remaining.length; i++) {
            const ch = remaining[i];
            count += /[\u4e00-\u9fa5]/.test(ch) ? 2 : 1;
            if (count > maxUnits) break;
        }

        const part = remaining.slice(0, i);

        // 计算安全前缀
        // 理论长度 = count + 6
        // 安全长度 = 理论长度 - 3
        const safeLength = count + 6-3; 
        const prefix = String(safeLength).padStart(4, '0');

        segments.push(prefix + part);
        remaining = remaining.slice(i);

    }

  
    return segments;
}



/**
 * 追加一条 Payload 到 WC3 文件
 */
async function appendPayload(payload, minBytes = 5) {

        // 1. 严格等待 WC3 清空文件
// 开头调用
await waitUntilFileReady(WarcraftPath, 10, 500);


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
        fs.writeFileSync(WarcraftPath, base, 'utf-8');

    // 4. 读取文件
    let buf = fs.readFileSync(WarcraftPath);
    let content = buf.toString('utf-8');

    let preloadStart = content.indexOf('function PreloadFiles');

    // 5. 找不到 PreloadFiles 的兜底处理
    if (preloadStart === -1) {
        if (buf.length < minBytes) {
            console.warn('PreloadFiles 丢失且文件过小，已重建基础脚本');
            fs.writeFileSync(WarcraftPath, base, 'utf-8');

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





    // 7. 构建命令文本
    const fullText =
        `|realId=${tool.encodeValue(payload.msg.realId)}|` +
        `*user=${tool.encodeValue(payload.msg.user)}|` +
        `*command=${tool.encodeValue(payload.action)}|` +
        `*time=${payload.msg.time}|`;


        const MAX_SEGMENTS_PER_WRITE = 5;
    // 8. 拆分文本
 //   const segments = splitTextForPlayerName(fullText).slice(0, MAX_SEGMENTS_PER_WRITE);;

    // 9. 生成 JASS 注入代码
    let inject =
            `    call SetPlayerName(Player(0), "${fullText}")\n` +
            `    call Preload("")\n`;


    // 10. 注入并写入
    const newContent =
        content.slice(0, endIndex) +
        inject +
        content.slice(endIndex);

    fs.writeFileSync(WarcraftPath, newContent, 'utf-8');

    console.log(
        '命令已写入 WC3:',
        fullText,
        `(${segments.length} 段)`
    );
}




// 获取当前文件夹下的最后 PlayerIndex
function getLastPlayerIndex(content) {
    const match = content.match(/Player\((\d+)\)/g);
    if (!match) return -1;
    const nums = match.map(s => parseInt(s.match(/\d+/)[0], 10));
    return Math.max(...nums);
}



async function waitUntilFileReady(path, threshold = 10, intervalMs = 500) {
    while (true) {
        if (!fs.existsSync(path)) {
            return; // 文件不存在也视为空闲
        }
 
          const content = fs.readFileSync(path, 'utf-8');

        // 如果不包含 PreloadFiles，就说明可以写入
        if (!content.includes('function PreloadFiles')) {
            console.log('[WAIT] 文件空闲，可以写入', path);
            return;
        }
  


        await new Promise(r => setTimeout(r, intervalMs));
    }
}



















/**
 * 外部调用接口
 */
export function saveCommand(payload) {
    appendPayload(payload);
}

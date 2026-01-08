import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Tools } from './until/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tool = new Tools();
const fileWriteLocks = new Map();

let CommandPath = '';
let GiftPath = '';
let LikePath = '';

// 基础 JASS 模板
const JASS_TEMPLATE = `function PreloadFiles takes nothing returns nothing
    call Preload("")
endfunction
function AAA takes nothing returns nothing
    call PreloadEnd(0.0)
endfunction`;

export function getWarcraftPath(paths) {
    const dir = path.join(paths, 'GameData', 'TerritoryWars');
    CommandPath = path.join(dir, 'TerritoryWarsCmd-2147483648');
    GiftPath = path.join(dir, 'TerritoryWarsGift-2147483648');
    LikePath = path.join(dir, 'TerritoryWarsLike-2147483648');
}

/**
 * 核心公共方法：向魔兽文件追加指令队列
 */
async function writeToWarcraftQueue(filePath, dataString) {
    await acquireFileLock(filePath);
    try {
        // 1. 等待文件被清空（没有业务关键字）
        await waitUntilFileReadyByPath(filePath);

        // 2. 读取当前内容
        let content = "";
        if (fs.existsSync(filePath)) {
            content = fs.readFileSync(filePath, 'utf-8');
        }

        // 3. 如果文件结构不正确，使用基础模板初始化
        if (!content.includes('function PreloadFiles')) {
            content = JASS_TEMPLATE;
        }

        // 4. 定位插入点：在第一个 endfunction 之前插入
        const insertPos = content.indexOf('endfunction');
        if (insertPos === -1) {
            content = JASS_TEMPLATE; // 结构彻底坏了就重置
        }

        const injectLine = `    call SetPlayerName(Player(0), "${dataString}")\n`;
        
        // 5. 组合新内容：保留原有指令并追加新指令
        const newContent = content.slice(0, insertPos) + injectLine + content.slice(insertPos);

        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`[Success] 数据已追加: ${path.basename(filePath)} -> ${dataString.substring(0, 30)}...`);

    } finally {
        releaseFileLock(filePath);
    }
}

/**
 * 等待魔兽处理完文件
 */
async function waitUntilFileReadyByPath(filePath, intervalMs = 100) {
    while (true) {
        if (!fs.existsSync(filePath)) return;
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (!content.includes('function PreloadFiles')) return;

            // 只要不包含业务特征码，就认为魔兽已经读完并清空了
            if (!content.includes('realId=') && !content.includes('type=')) {
                return;
            }
        } catch (err) {
            // 文件占用时略过本次循环
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
}

// --- 业务接口 ---

export async function saveCommand(payload) {
    try {
        const fullText = `|realId=${tool.encodeValue(payload.msg.realId)}|` +
                         `*user=${tool.encodeValue(payload.msg.user)}|` +
                         `*command=${tool.encodeValue(payload.action)}|` +
                         `*time=${payload.msg.time}|`;
        
        await writeToWarcraftQueue(CommandPath, fullText);
        return { ok: true };
    } catch (err) {
        console.error('[saveCommand failed]', err);
        return { ok: false, error: err.message };
    }
}

export async function saveGift(msg) {
    try {
        const encodedUser = tool.encodeValue(msg.user);
        const encodedId = tool.encodeValue(msg.realId);
        
        const fullText = `|type=GIFT|` +
                         `|realId=${encodedId}|` +
                         `*user=${encodedUser || encodedId}|` +
                         `*giftId=${msg.giftId}|` +
                         `*time=${msg.time}|`;

        await writeToWarcraftQueue(GiftPath, fullText);
        return { ok: true };
    } catch (err) {
        console.error('[saveGift failed]', err);
        return { ok: false };
    }
}

export async function saveLike(msg) {
    try {
        const fullText = `|type=LIKE|` +
                         `|realId=${tool.encodeValue(msg.realId)}|` +
                         `*user=${tool.encodeValue(msg.user)}|` +
                         `*likeCount=${msg.likeCount}|` +
                         `*time=${msg.time}|`;

        await writeToWarcraftQueue(LikePath, fullText);
        return { ok: true };
    } catch (err) {
        console.error('[saveLike failed]', err);
        return { ok: false };
    }
}

// --- 锁机制 ---
async function acquireFileLock(filePath) {
    while (fileWriteLocks.get(filePath)) {
        await new Promise(r => setTimeout(r, 10));
    }
    fileWriteLocks.set(filePath, true);
}

function releaseFileLock(filePath) {
    fileWriteLocks.set(filePath, false);
}

export function injectWar3(){

}
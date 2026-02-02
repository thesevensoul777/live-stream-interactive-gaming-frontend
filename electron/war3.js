import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Tools } from './until/tools.js';
import { spawn } from 'child_process';
import fsExtra from 'fs-extra'; // 建议使用 fs-extra 处理拷贝，或者用原生 fs.copyFileSync


// 变量声明置顶
// app.isPackaged 判断是“开发调试”还是“已经安装”
const isDev = !app.isPackaged;

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
                         `*command=${tool.encodeValue(payload.action)}`;
        
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
        
        const fullText =  `|realId=${encodedId}|` +
                         `*user=${encodedUser || encodedId}|` +
                         `*command=${msg.command}|` +
                         `*count=${msg.count}`;
      console.log("fullText",fullText,"msg.count",msg.count)
        await writeToWarcraftQueue(GiftPath, fullText);
        return { ok: true };
    } catch (err) {
        console.error('[saveGift failed]', err);
        return { ok: false };
    }
}

export async function saveLike(msg) {
    try {
        const fullText =  `|realId=${tool.encodeValue(msg.realId)}|` +
                         `*user=${tool.encodeValue(msg.user)}|` +
                         `*command=LIKE|` +
                         `*likeCount=${msg.likeCount}` ;

        await writeToWarcraftQueue(LikePath, fullText);
        return { ok: true };
    } catch (err) {
        console.error('[saveLike failed]', err);
        return { ok: false };
    }
}

// 动态获取插件目录
const getPluginDir = () => {
    if (isDev) {
        // 开发环境：在源码的上级目录找
        return path.join(app.getAppPath(), 'plugins');
    } else {
        // 生产环境：在安装目录的 resources 文件夹找
        // process.resourcesPath 专门指向那个 resources 目录
        return path.join(process.resourcesPath, 'plugins');
    }
};

/**
 * 启动魔兽争霸并注入插件
 * @param {string} gamePath 游戏根目录路径
 */
export async function launchWarcraft(gamePath) {
    try {
        const finalPluginDir = getPluginDir();
    const pluginSrc = path.join(finalPluginDir, 'version.dll');np
        const versionDllTarget = path.join(gamePath, 'version.dll');
        const exePath = path.join(gamePath, 'war3.exe');

        console.log(`[Launch] 准备启动。路径: ${gamePath}`);

        // 2. 注入逻辑：拷贝 version.dll
        if (fs.existsSync(pluginSrc)) {
            // 使用同步拷贝确保启动前文件已到位
            fs.copyFileSync(pluginSrc, versionDllTarget);
            console.log('[Launch] version.dll 注入成功');
        } else {
            console.warn('[Launch] 未找到插件源文件，将尝试原版启动:', pluginSrc);
        }

        // 3. 执行启动
        // 使用 detached: true 让魔兽在 Electron 关闭后继续运行
        const child = spawn(exePath, ['-window'], {
            cwd: gamePath,
            detached: true,
            stdio: 'ignore'
        });

        // 防止父进程等待子进程
        child.unref();
        
        return { ok: true };
    } catch (err) {
        console.error('[Launch] 启动失败:', err);
        throw err;
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
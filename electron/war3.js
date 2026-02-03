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
// export async function launchWarcraft(gamePath) {
//     // --- 变量声明严格置顶 ---
//     const kkweBin = `D:\\SnowNightWE\\bin`; // 你的 DLL 来源目录
//     const war3Exe = path.join(gamePath, 'war3.exe');
    
//     // 必须要拷贝的最小集合（复刻雪夜环境）
//     const essentialDlls = [
//         'ydbase.dll',
//         'yd_loader.dll',
//         'yd_virtual_mpq.dll',
//         'yd_lua_engine.dll',
//         'yd_jass_api.dll',
//         'yd_size_limit.dll', // 解决大地图进不去的问题
//         'luacore.dll',
//         'SlkLib.dll'
//     ];

//     try {
//         console.log('[Inject] 正在复刻雪夜 WE 运行环境...');

//         // 1. 批量拷贝 DLL 到魔兽根目录
//         essentialDlls.forEach(dll => {
//             const src = path.join(kkweBin, dll);
//             const dest = path.join(gamePath, dll);
//             if (fs.existsSync(src)) {
//                 fs.copyFileSync(src, dest);
//             }
//         });

//         // 2. 关键：寻找“点火开关”
//         // 将 yd_loader.dll 复制并改名为 version.dll
//         // 魔兽启动会自动运行 version.dll，而 yd_loader 会负责拉起其他 yd_*.dll
//         const loaderSrc = path.join(kkweBin, 'yd_loader.dll');
//         const loaderDest = path.join(gamePath, 'version.dll');
//         if (fs.existsSync(loaderSrc)) {
//             fs.copyFileSync(loaderSrc, loaderDest);
//         }



//         // 4. 执行启动
//         const child = spawn(war3Exe, ['-window'], {
//             cwd: gamePath,
//             detached: true,
//             stdio: 'ignore'
//         });

//         child.unref();
//         console.log('[Launch] 环境已就绪，魔兽启动中...');
//         return { ok: true };

//     } catch (err) {
//         console.error('[Error] 复刻失败:', err);
//         return { ok: false, error: err.message };
//     }
// }



/**
 * 方案二：专业级伪装启动 (整合版)
 */
/**
 * 方案二：专业级伪装启动 (修正版)
 */
/**
 * 方案二：专业级启动 (插件全激活版)
 */
/**
 * 方案三：本地工程插件全量注入版
 */
/**
 * 启动魔兽争霸并注入插件
 * @param {string} gamePath 用户选择的魔兽 Exe 所在路径
 */
// --- [变量声明置顶] ---

export async function launchWarcraft(gamePath) {
    // --- 变量声明置顶 ---
    const isDev = !app.isPackaged;
    const resourceBase = isDev ? app.getAppPath() : process.resourcesPath;

    // 1. 注入器路径：开发环境下在 electron/bin，生产环境下在 resources/bin
    const injectorExe = path.join(resourceBase, 'bin', 'War3Injector.exe');

    // 2. 魔兽路径处理：gamePath 传进来的是目录，我们需要指向 Exe
    const war3Exe = path.join(gamePath, 'war3.exe');
    const war3Dir = gamePath; // 工作目录就是文件夹本身

    // 3. 插件根目录 (-kkwe 参数)：就在 resourceBase 下的 war3plugin
    const kkweRoot = path.join(resourceBase, 'war3plugin');

    // 4. 引导 DLL 路径
    const loaderDll = path.join(kkweRoot, 'plugin', 'warcraft3', 'yd_loader.dll');

    // 封装参数
    const args = [war3Exe, war3Dir, kkweRoot, loaderDll];

    console.log('[Launch] 路径自动匹配成功：');
    console.log('-> Injector:', injectorExe);
    console.log('-> War3Exe:', war3Exe);
    console.log('-> KKWE_ROOT:', kkweRoot);

    // 执行逻辑
    try {
        // 校验文件是否存在，防止 C# 报错闪退
        if (!fs.existsSync(injectorExe)) throw new Error(`找不到注入器: ${injectorExe}`);
        if (!fs.existsSync(war3Exe)) throw new Error(`找不到魔兽程序: ${war3Exe}`);

        const child = spawn(injectorExe, args, {
            cwd: path.dirname(injectorExe),
            windowsHide: false,
            shell: false
        });

        child.stdout.on('data', (data) => console.log(`[C# Output]: ${data}`));
        child.stderr.on('data', (data) => console.error(`[C# Error]: ${data}`));
        child.on('close', (code) => console.log(`[C# Process] 退出码: ${code}`));

    } catch (err) {
        console.error('[Launch Error]:', err.message);
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
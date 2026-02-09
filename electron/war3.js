import { app,screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Tools } from './until/tools.js';
import { spawn, exec } from 'child_process';
import { bufferService } from './services/BufferService.js';


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


// 在你的第一个代码文件中
export function getWarcraftPath(paths) {
    if (!paths) return;
    const dir = path.join(paths, 'GameData', 'TerritoryWars');
    CommandPath = path.join(dir, 'TerritoryWarsCmd-2147483648');
    GiftPath = path.join(dir, 'TerritoryWarsGift-2147483648');
    LikePath = path.join(dir, 'TerritoryWarsLike-2147483648');
    console.log("[PathInit] 监听路径已就绪:", dir);
}

/**
 * 核心公共方法：向魔兽文件追加指令队列
 */
async function writeToWarcraftQueue(filePath, dataString) {
    // --- 守卫逻辑：如果路径没准备好，拒绝执行 ---
    if (!filePath) {
        console.error("[Error] 写入中止：文件路径为空。请先设置魔兽游戏路径。");
        // 尝试自动修复一次
        const autoPath = bufferService.getGamePath();
        console.error("[Error] 写入中止：文件路径为空。请先设置魔兽游戏路径。");
        if (autoPath) {
            getWarcraftPath(autoPath);
            // 重新获取一下路径，如果还是没拿到，就退出
            if (!CommandPath) return; 
        } else {
            return;
        }
    }


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

// --- [工具函数：安全清理] ---
const safeCleanup = (gamePath, dllFiles) => {
    dllFiles.forEach(file => {
        const target = path.join(gamePath, file);
        try {
            if (fs.existsSync(target)) {
                fs.unlinkSync(target);
                console.log(`[Cleanup] 已删除: ${file}`);
            }
        } catch (e) {
            // 忽略被占用的错误
        }
    });
};

export async function launchWarcraft(gamePath) {
    // --- 1. 变量声明严格置顶 ---
    const isDev = !app.isPackaged;
    const resourceBase = isDev ? app.getAppPath() : process.resourcesPath;
    const squareSize = 1300; 
    const waitTime = 100; 
// 获取屏幕分辨率

// 获取屏幕分辨率
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;


    const injectorExe = path.join(resourceBase, 'bin', 'War3Injector.exe');
    const war3Exe = path.join(gamePath, 'war3.exe');
    const war3Dir = gamePath;
    const copySourceDir = path.join(resourceBase, 'war3plugin', 'copyDLL');
    const kkweRoot = path.join(resourceBase, 'war3plugin');
    const loaderDll = path.join(kkweRoot, 'plugin', 'warcraft3', 'yd_loader.dll');

    // 动态计算：宽度 70%，高度 99%
    const targetWidth = Math.floor(screenW * 0.8);
    const targetHeight = Math.floor(screenH * 1);
    const posX = Math.floor((screenW - targetWidth) / 2);
    const posY = Math.floor((screenH - targetHeight) / 2);
    
    const dllFiles = [
        'd3d8.dll', 'scriptrunner.dll', 'SlkLib.dll', 'luacore.dll', 
        'yd_size_limit.dll', 'yd_jass_api.dll', 'ydbase.dll', 
        'yd_virtual_mpq.dll', 'yd_lua_engine.dll', 'yd_loader.dll'
    ];

    
    const args = [war3Exe, war3Dir, kkweRoot, loaderDll];

    console.log('[Prepare] 11环境准备中...');

    try {
        // --- 2. DLL 拷贝 ---
        if (!fs.existsSync(copySourceDir)) throw new Error(`找不到 copyDLL 目录`);
        dllFiles.forEach(file => {
            const src = path.join(copySourceDir, file);
            const dest = path.join(gamePath, file);
            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
        });

        // --- 3. 注入器启动 ---
        const child = spawn(injectorExe, args, {
            cwd: path.dirname(injectorExe),
            windowsHide: false
        });

        child.on('close', (code) => {
            console.log(`[C# Exit]: 注入完成，代码: ${code}。倒计时 ${waitTime/1000}s...`);

            // --- 4. 20秒后执行拉伸 (改进版脚本) ---
            setTimeout(() => {
                console.log('[Action] 尝试定位魔兽窗口并调整尺寸...');
                
                // 改用 Add-Type 的简单字符串方式，彻底避开 Here-String 的换行坑
                const csharpCode = `
                    using System; 
                    using System.Runtime.InteropServices; 
                    public class WinApi { 
                        [DllImport(\\"user32.dll\\")] public static extern IntPtr FindWindow(string lp, string lp2); 
                        [DllImport(\\"user32.dll\\")] public static extern bool SetWindowPos(IntPtr h, IntPtr ha, int x, int y, int cx, int cy, uint f); 
                    }
                `.replace(/\s+/g, ' ');

                const psCommand = `
                    $code = '${csharpCode}';
                    if (-not ([System.Management.Automation.PSTypeName]'WinApi').Type) {
                        Add-Type -TypeDefinition $code
                    }
                    $hwnd = [WinApi]::FindWindow('Warcraft III', $null);
                    if ($hwnd -eq [IntPtr]::Zero) {
                        $proc = Get-Process -Name 'war3' -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0};
                        if ($proc) { $hwnd = $proc.MainWindowHandle }
                    }
                    if ($hwnd -ne [IntPtr]::Zero) {
                        [WinApi]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, ${targetWidth}, ${targetHeight}, 0x0060);
                        'RESIZE_DONE'
                    } else {
                        'WINDOW_NOT_FOUND'
                    }
                `.replace(/\n/g, ' ');

                exec(`powershell -Command "${psCommand}"`, (psErr, stdout) => {
                    if (psErr) {
                        console.error('[PS Exec Error]:', psErr.message);
                        return;
                    }
                    console.log(`[PS Output]: ${stdout.trim()}`);
                });
            }, waitTime);

            // 启动关闭监控
          //  startWar3ExitMonitor(gamePath, dllFiles);
        });

    } catch (err) {
        console.error('[Fatal Error]:', err.message);
     //   safeCleanup(gamePath, dllFiles);
    }
}

// --- 修正后的监控函数：极致稳健版 ---
function startWar3ExitMonitor(gamePath, dllFiles) {
    // 1. 延迟启动：等 10 秒再开始监控，避开启动时的不稳定期
    setTimeout(() => {
        let missingCount = 0; // 记录连续检测不到的次数

        const checkTimer = setInterval(() => {
            exec('tasklist /NH /FI "IMAGENAME eq war3.exe"', (err, stdout) => {
                // 判断逻辑：如果没有报错且 stdout 确实不包含 war3.exe
                const isMissing = !err && (!stdout || !stdout.includes('war3.exe'));

                if (isMissing) {
                    missingCount++;
                    console.log(`[Status] 进程检测不到 (${missingCount}/3)...`);
                } else {
                    missingCount = 0; // 只要检测到一次，计数器归零
                }

                // 只有连续 3 次（15秒）检测不到，才判定为真的退出
                if (missingCount >= 3) {
                    console.log('[Status] 确认魔兽已彻底关闭，执行清理...');
                    clearInterval(checkTimer);
                    
                    dllFiles.forEach(file => {
                        try {
                            const p = path.join(gamePath, file);
                            if (fs.existsSync(p)) fs.unlinkSync(p);
                        } catch (e) {
                            // 正在占用的文件删不掉是正常的，说明还没关透
                        }
                    });
                }
            });
        }, 5000); // 每 5 秒检测一次
    }, 10000); 
}




// --- 辅助函数：清理 DLL ---
function cleanupDLLs(gamePath, dllFiles) {
    console.log('[Cleanup] 正在从魔兽目录删除插件 DLL...');
    dllFiles.forEach(file => {
        const target = path.join(gamePath, file);
        if (fs.existsSync(target)) {
            try {
                fs.unlinkSync(target);
            } catch (e) {
                console.error(`无法删除 ${file}, 可能文件被占用`);
            }
        }
    });
}

// --- 辅助函数：检测魔兽运行状态 ---
function checkWar3Status(gamePath, dllFiles) {
    const checkTimer = setInterval(() => {
        // 使用 tasklist 命令检查 war3.exe 是否在运行
        const cmd = 'tasklist /NH /FI "IMAGENAME eq war3.exe"';
        const { exec } = require('child_process');
        
        exec(cmd, (err, stdout) => {
            if (stdout && stdout.includes('war3.exe')) {
                // 游戏还在运行，继续等待
                // console.log('War3 is running...');
            } else {
                // 游戏已关闭
                console.log('[Status] 检测到魔兽已关闭，准备清理文件...');
                cleanupDLLs(gamePath, dllFiles);
                clearInterval(checkTimer);
            }
        });
    }, 3000); // 每 3 秒检查一次
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




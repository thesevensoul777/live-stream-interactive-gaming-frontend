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

  const tPoints = payload.msg.tierPoints ?? 0; 
        
        const fullText = `|realId=${tool.encodeValue(payload.msg.realId)}|` +
                         `*user=${tool.encodeValue(payload.msg.user)}|` +
                         `*command=${tool.encodeValue(payload.action)}|` + 
                         `*golds=${tool.encodeValue(payload.golds)}|` + 
                         `*tierPoints=${tool.encodeValue(tPoints)}`; // 使用处理后的变量
   
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

export async function launchWarcraft(gamePath,win) {
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

            handleGameEnd(gamePath,win);

            // 启动关闭监控
            startWar3ExitMonitor(gamePath, dllFiles);
        });

    } catch (err) {
        console.error('[Fatal Error]:', err.message);
     //   safeCleanup(gamePath, dllFiles);
    }
}

// --- 修正后的监控函数：极致稳健版 ---
function startWar3ExitMonitor(gamePath, dllFiles) {
    // --- 变量声明置顶 ---
    const checkInterval = 5000;
    const delayStart = 10000;
    let missingCount = 0;

    setTimeout(() => {
        const checkTimer = setInterval(() => {
            // 使用 PowerShell 检测进程，更加稳健
            // Get-Process 会匹配所有包含 war3 的进程，不管是 War3.exe 还是 war3.exe
            const psCmd = `powershell "Get-Process | Where-Object {$_.ProcessName -like '*war3*'} | Select-Object -ExpandProperty ProcessName"`;

            exec(psCmd, (err, stdout) => {
                // 如果输出为空，说明没找到进程
                const isRunning = stdout && stdout.trim().toLowerCase().includes('war3');

                if (!isRunning) {
                    missingCount++;
                    console.log(`[Status] 进程检测不到 (${missingCount}/3)...`);
                } else {
                    if (missingCount > 0) console.log(`[Status] 进程重新捕获: ${stdout.trim()}`);
                    missingCount = 0; 
                }

                if (missingCount >= 3) {
                    console.log('[Status] 确认魔兽已彻底关闭，执行清理...');
                    clearInterval(checkTimer);
                    
                    dllFiles.forEach(file => {
                        try {
                            const p = path.join(gamePath, file);
                            if (fs.existsSync(p)) fs.unlinkSync(p);
                        } catch (e) {
                            // 忽略占用
                        }
                    });
                }
            });
        }, checkInterval);
    }, delayStart);
}



/**
 * 将魔兽原始字符串解析为键值对对象
 * 输入: |realId=123|*rank=5|*score=0
 * 输出: { realId: "123", rank: "5", score: "0" }
 */
/**
 * 将魔兽原始字符串解析为键值对对象
 * 并在此处统一完成：1. 字段名映射 2. 数据类型转换
 */
function parsePlayerData(rawString) {
    const result = {};
    const parts = rawString.split('|');
    
    // 💡 映射表：魔兽原始 Key -> 你的 API 字段名
    const keyMap = {
        'realId': 'douyinUserId',
        'rank':   'TierPoints',
        'score':  'RankPoints',
        'kills':  'Kills',
        'consumption': 'Consumption',
        'addGolds':'addGolds'
    };

    // 💡 需要转为数字的字段列表 (使用你映射后的 API 字段名)
    const numericFields = ['TierPoints', 'RankPoints', 'Kills','Consumption','addGolds'];

    parts.forEach(part => {
        if (part.includes('=')) {
            let [rawKey, val] = part.split('=');
            
            // 1. 清理魔兽 Key (去掉开头的 * 号)
            const cleanKey = rawKey.replace(/^\*/, '');
            
            // 2. 查找映射后的字段名，如果没在 map 里，就用原名
            const apiKey = keyMap[cleanKey] || cleanKey; 

            // 3. 💡 类型转换逻辑写在这里
            if (numericFields.includes(apiKey)) {
                // 如果是 TierPoints/RankPoints/Kills，转为数字，转不了就给 0
                result[apiKey] = Number(val) || 0;
            } else {
                // 其他字段（如 douyinUserId）保持字符串
                result[apiKey] = val;
            }
        }
    });

    return result;
}

// 假设你在某个地方启动了这个监听
/**
 * 处理结算逻辑的循环监听
 * @param {string} gamePath 魔兽根目录
 */
async function handleGameEnd(gamePath, win) {
    // --- 变量声明置顶 ---
    const summaryFile = path.join(gamePath, 'GameData', 'TerritoryWars', 'Summary-2147483648');
    let results = [];
    let isWar3Running = true;
    let formattedData = {};

    console.log("[Summary] 启动结算自动监听重载流程...");

    // 只要魔兽还在运行，就持续监听结算文件
    while (isWar3Running) {
        // 等待一局游戏的结算数据 (返回的是字符串数组)
        results = await watchGameSummary(summaryFile);

        if (results && results.length > 0) {

        const allPlayers = results.map(raw => parsePlayerData(raw));
    
    if (win && !win.isDestroyed()) {
        // 直接发送一整局的所有玩家数据
        win.webContents.send('on-game-summary', allPlayers); 
    }
        }

        // 检查魔兽是否还在运行
        isWar3Running = await new Promise(resolve => {
            exec('tasklist /FI "IMAGENAME eq war3.exe"', (err, stdout) => {
                resolve(stdout.toLowerCase().includes('war3.exe'));
            });
        });
        
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("[Summary] 魔兽已关闭，结算监听任务自然结束。");
}

/**
 * 监听并获取魔兽结算数据
 */
export async function watchGameSummary(summaryPath) {
    // --- 变量声明置顶 ---
    const checkInterval = 1500; 
    const pattern = /SetPlayerName\s*\(\s*Player\s*\(\d+\)\s*,\s*"(.*?)"\s*\)/g;
    let rawContent = "";
    let match;
    let combinedString = "";
    let playersData = [];
    let segments = [];
    let startIndex = -1;
    let isWar3Active = true;

    console.log("[Summary] 正在等待游戏结算触发...");

    while (true) {
        if (fs.existsSync(summaryPath)) {
            try {
                rawContent = fs.readFileSync(summaryPath, 'utf-8');

                // 业务特征码校验
                if (rawContent.includes('realId=') && rawContent.includes('function PreloadFiles')) {
                    combinedString = "";
                    playersData = []; // 清空数组准备装载

                    // 1. 提取并拼接字符串
                    while ((match = pattern.exec(rawContent)) !== null) {
                        combinedString += match[1].trim();
                    }

                    // 2. 切割数据块
                    segments = combinedString.split(/(?=-\|realId=)/);
                    
                  segments.forEach(segment => {
    // --- 变量声明置顶 ---
    let cleanData = segment.trim();
    let startIndex = -1;

    startIndex = cleanData.indexOf('|realId=');
    if (startIndex !== -1) {
        cleanData = cleanData.substring(startIndex);
        
        // 【新增处理】移除末尾多余的连字符或特殊符号
        // 使用 replace /-$|-$| /g 或者简单的 trimEnd
        cleanData = cleanData.replace(/-+$/, ''); 
        
        if (cleanData) {
            playersData.push(cleanData);
        }
    }
});

                    // 3. 关键：解析完成后立即重置文件
                    // 防止 watchGameSummary 还没退出就被下一轮循环再次读到旧数据
                    fs.writeFileSync(summaryPath, JASS_TEMPLATE, 'utf-8');
                    
                    return playersData; 
                }
            } catch (err) {
                // 忽略文件锁定异常
            }
        }

        // 检查进程，如果魔兽中途被强杀，防止此循环变成死循环
        if (Math.random() > 0.9) { // 没必要每次都查进程，降低频率
            isWar3Active = await new Promise(res => {
                exec('tasklist /FI "IMAGENAME eq war3.exe"', (e, s) => res(s.includes('war3.exe')));
            });
            if (!isWar3Active) return [];
        }

        await new Promise(r => setTimeout(r, checkInterval));
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




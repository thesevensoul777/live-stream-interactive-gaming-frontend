import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

// ES 模块下获取 __filename 和 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON 文件路径
const filePath = path.join(app.getPath('userData'), 'commandRequests.json');

/**
 * 注入 War3
 */
export function injectWar3() {
  const injectorPath = path.join(__dirname, '..', 'bin', 'War3Injector.exe');

  execFile(injectorPath, [], (error, stdout, stderr) => {
    if (error) {
      console.error('Inject failed:', error);
      return;
    }
    console.log('Injector output:', stdout);
  });
}

/**
 * 保存弹幕命令
 * @param {object} payload - { msg: {user: string,...}, action: string }
 */
export function saveCommand(payload) {
  // 读取已有数据
  let data = [];
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {}

  // 添加新命令
  data.push({
    msg: payload.msg,
    action: payload.action,
    time: Date.now(),
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  // 转换为 Warcraft 指令
  const user = payload.msg.user;
  let war3Cmd = '';

  switch (payload.action) {
    case '加入':
      war3Cmd = `JOIN|${user}`;
      break;
    case '上路':
      war3Cmd = `MOVE|${user}|TOP`;
      break;
    case '中路':
      war3Cmd = `MOVE|${user}|MID`;
      break;
    case '下路':
      war3Cmd = `MOVE|${user}|BOT`;
      break;
  }

  if (war3Cmd) {
    fs.writeFileSync(
      path.join(app.getPath('userData'), 'war3_command.txt'),
      war3Cmd,
      'utf-8'
    );
  }
}

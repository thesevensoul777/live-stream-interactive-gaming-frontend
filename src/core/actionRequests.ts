import { DyMessage } from "./dycast";

export interface DanmuCommandDTO {
  id?: string;
  user: string;
  content: string;
  time?: number;
}

// 弹幕内容 → 行为 映射表
const COMMAND_MAP: Record<string, string> = {
  '1': '加入',
  '上': '上路',
  '中': '中路',
  '下': '下路',
};

export function handleDanmu(msg: DyMessage) {
  const userName = msg.user?.name;
  if (!userName) return;

  const action = COMMAND_MAP[msg.content];
  if (!action) return; // 不关心的弹幕直接忽略

  const safeMsg: DanmuCommandDTO = {
    id: msg.id,
    user: userName,
    content: msg.content,
    time: msg.time,
  };

  window.electronAPI
    .addCommand(safeMsg, action)
    .then(() => {
      console.log(`已发送命令请求: ${userName} -> ${action}`);
    })
    .catch(err => {
      console.error('发送命令失败', err);
    });
}

import { DyMessage } from "./dycast";

export interface DanmuCommandDTO {
  realId?:string;
  id?: string;
  user: string;
  content: string;
  time?: number;
  command?:string
}


// 弹幕内容 → 行为 映射表
const COMMAND_MAP: Record<string, string> = {
  '1': '进攻方',
  '2':'防守方',
  '上': '上路',
  '左': '中路',
  '下': '下路',
  '右': '下路',
  "666":'福袋',
  "999":'随机事件',
  "查询":"查询信息"

};

export function handleDanmu(msg: DyMessage) {
  const userName = msg.user?.name;
  if (!userName) return;

  const action = msg.content ? COMMAND_MAP[msg.content] : undefined;
  if (!action) return; // 不关心的弹幕直接忽略

  console.log(msg.user,"msg.user")
  const safeMsg: DanmuCommandDTO = {
    realId:msg.user?.realId,
    id: msg.id,
    user: userName,
    content: msg.content ?? '',
    time: msg.time,
    command:action

  };
  (window as any).electronAPI
    .addCommand(safeMsg, action)
    .then(() => {
      console.log(`已发送命令请求: ${userName} -> ${action}`);
    })
    .catch((err: any) => {
      console.error('发送命令失败', err);
    });
}





export function handleGift(msg: DyMessage) {
 
}


export function injectWar3(isInjected:boolean= true) {
//   if(!isInjected){
// (window as any).electronAPI
//     .injectGame()
//     .then(() => {

//       console.log(`已经注入`);
//     })
//     .catch((err: any) => {
//       console.error('注入失败', err);
//     });
//   }  
}

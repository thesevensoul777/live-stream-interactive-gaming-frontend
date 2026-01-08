import { DyMessage,CastMethod } from "./dycast";

const ALLOWED_METHODS = new Set<CastMethod>([
  CastMethod.CHAT,
  CastMethod.LIKE,
  CastMethod.GIFT,
]);

export interface DanmuCommandDTO {
  realId?:string;
  user: string;
  content: string;
  time?: number;
  command?:string
}


export interface GifddDTO {
  realId?:string;
  user: string;
  time?: number;
  giftId?:string
}

export interface LikeDTO {
  realId?:string;
  user: string;
  time?: number;
  likeCount?:string
}





// 弹幕内容 → 行为 映射表
const COMMAND_MAP: Record<string, string> = {
  '1': 'SELECT_1',
  '2': 'SELECT_2',
  '上': 'MOVE_UP',
  '左': 'MOVE_LEFT',
  '右': 'MOVE_RIGHT',
  '666': 'LOTTERY',
  '999': 'CHALLENGE',
  '查询': 'QUERY',
};



export function handleDanmu(msgs: DyMessage[]) {
  msgs.forEach(msg => {
    // ① 类型过滤
    if (!msg.method || !ALLOWED_METHODS.has(msg.method)) {
      return;
    }

    // ② LIKE / GIFT 单独处理
    if (msg.method === CastMethod.LIKE) {
      handleLike(msg);
      return;
    }

    if (msg.method === CastMethod.GIFT) {
      handleGift(msg);
      return;
    }

    // ③ 只对 CHAT 解析命令
    if (msg.method !== CastMethod.CHAT) return;

    const userName = msg.user?.name;
    if (!userName) return;

    const action = msg.content
      ? COMMAND_MAP[msg.content.trim()]
      : undefined;

    if (!action) return;

    const safeMsg: DanmuCommandDTO = {
      realId: msg.user?.realId,
      user: userName,
      content: msg.content!,
      time: msg.time,
      command: action,
    };

    (window as any).electronAPI
      .addCommand(safeMsg, action)
      .then(() => {
        console.log(`命令发送成功: ${userName} -> ${action}`);
      })
      .catch((err: any) => {
        console.error('发送命令失败', err);
      });
  });
}






export function handleGift(msg: DyMessage) {
    const userName = msg.user?.name;
    if (!userName) return;


    const Msg: GifddDTO = {
      realId: msg.user?.realId,
      user: userName,
      time: msg.time,
      giftId: msg.gift?.id,
    };
    (window as any).electronAPI
      .addGift(Msg)
      .then(() => {
        console.log('命令发送成功:', Msg);
      })
      .catch((err: any) => {
        console.error('发送命令失败', err);
      });
 
}


export function handleLike(msg: DyMessage) {
     const userName = msg.user?.name;
    if (!userName) return;


    const Msg: LikeDTO = {
      realId: msg.user?.realId,
      user: userName,
      time: msg.time,
      likeCount: msg.likeCount,
    };
    (window as any).electronAPI
      .addLike(Msg)
      .then(() => {
      console.log('命令发送成功:', Msg);
      })
      .catch((err: any) => {
        console.error('发送命令失败', err);
      });
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

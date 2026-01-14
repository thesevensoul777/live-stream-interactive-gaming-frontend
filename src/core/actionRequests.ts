import { DyMessage,CastMethod } from "./dycast";
import type { DanmuCommandDTO, GifddDTO, LikeDTO } from "@/types/danmu";
import { useDanmuStore } from '@/components/composables/DanmuData'
const ALLOWED_METHODS = new Set<CastMethod>([
  CastMethod.CHAT,
  CastMethod.LIKE,
  CastMethod.GIFT,
]);


const {addUniquePlay} = useDanmuStore()





// 弹幕内容 → 行为 映射表
const COMMAND_MAP: Record<string, string> = {
  '1': 'SELECT_1',
  '2': 'SELECT_2',
  '上': 'MOVE_UP',
  '下': 'MOVE_DOWN',
  '666': 'LOTTERY',
  '999': 'CHALLENGE',
  '查询': 'QUERY',
  '换职业':'CHANGE_CAREER',
  '回':'BACK '
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
    const content = msg.content?.trim();
    if (!userName || !content) return;

    const action = COMMAND_MAP[content];
    if (!action) return;

    const safeMsg: DanmuCommandDTO = {
      realId: msg.user?.realId,
      user: userName,
      content: content,
      time: msg.time,
      command: action,
      avatar: msg.user?.avatar, // 建议带上头像，Overlay可以用
    };

    // --- 核心修改点：针对 1 和 2 的去重判断 ---
    if (content === '1' || content === '2') {

      const isAdded = addUniquePlay(safeMsg);
      // 如果 Store 告诉我们该 ID 已存在，直接中断，不执行后续的 electronAPI
      if (!isAdded) return; 
    }

    // 只有通过了上面的去重（或者是其他非1、2指令），才会执行 IPC 发送
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

   console.log("handleGift",msg)
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

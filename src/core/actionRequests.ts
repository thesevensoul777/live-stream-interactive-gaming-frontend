import { DyMessage,CastMethod } from "./dycast";
import type { DanmuCommandDTO, GifddDTO, LikeDTO } from "@/types/danmu";
import { useDanmuStore } from '@/components/composables/DanmuData'
import { 
  LW_COMMAND_MAP, 
  LW_GIFT_MAP 
} from "@/constants";

const ALLOWED_METHODS = new Set<CastMethod>([
  CastMethod.CHAT,
  CastMethod.LIKE,
  CastMethod.GIFT,
]);


const {addUniquePlay} = useDanmuStore()







export async function handleDanmu(msgs: DyMessage[]) {
  // 1. 变量声明置顶
  let userName: string | undefined;
  let content: string | undefined;
  let action: string | undefined;
  let points: number | null;
  let isRobot: boolean; // 新增：用于判断是否为机器人

  // 2. 使用 for...of 代替 forEach，以支持循环内的 await
  for (const msg of msgs) {
    // ① 类型过滤
    if (!msg.method || !ALLOWED_METHODS.has(msg.method)) {
      continue;
    }

    // ② LIKE / GIFT 单独处理
    if (msg.method === CastMethod.LIKE) {
      handleLike(msg);
      continue;
    }

    if (msg.method === CastMethod.GIFT) {
      handleGift(msg);
      continue;
    }

    // ③ 只对 CHAT 解析命令
    if (msg.method !== CastMethod.CHAT) continue;

    userName = msg.user?.name;
    content = msg.content?.trim();
    if (!userName || !content) continue;

    action = LW_COMMAND_MAP[content];
    if (!action) continue;

    // 构建初始 DTO
    const safeMsg: DanmuCommandDTO = {
      realId: msg.user?.realId,
      user: userName,
      content: content,
      time: msg.time,
      command: action,
      avatar: msg.user?.avatar,
      tierPoints: 0, 
       golds: 0,// 默认初始值
    };

    // --- 核心修改点：处理 1 和 2 的去重与分数获取 ---
    if (content === '1' || content === '2') {

      isRobot = !!msg.user?.realId?.startsWith("robot_");

      if (!isRobot) {
    // 这里的 addUniquePlay 是异步的，等待后端返回分数
      const result = await addUniquePlay(safeMsg);
      
      // 如果返回 null，说明该 realId 已在列表中，直接跳过本次循环
      if (result === null) {
        console.warn(`[Handle] 玩家 ${userName} 已存在，跳过发送`);
        continue;
      }
      
      // 将异步拿到的真实分数赋值给 safeMsg
      safeMsg.tierPoints = result.tierPoints;
     safeMsg.golds = result.golds;
      }else{
safeMsg.tierPoints = 0;
        safeMsg.golds = 0;
      }

  


    }

    // 只有新玩家或非 1/2 指令才会到达这里，执行 IPC 发送给主进程
    (window as any).electronAPI
      .addCommand(safeMsg, action)
      .then(() => {
    //    console.log(`命令发送成功: ${userName} (积分: ${safeMsg.tierPoints}) -> ${action}`);
      })
      .catch((err: any) => {
        console.error('发送命令失败', err);
      });
  }
}






export function handleGift(msg: DyMessage) {

   const userName = msg.user?.name;
    const content = msg.gift?.id;
    const count= msg.gift?.count;
    console.log("msg",msg)
    if (!userName || !content) return;

    
    const action = LW_GIFT_MAP[content];
    if (!action) return;


    const Msg: GifddDTO = {
      realId: msg.user?.realId,
      user: userName,
      time: msg.time,
      command: action,
      count:count
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


export function ManualGiveGift(msg: GifddDTO) {

   const userName = msg.user;
    const content = msg.giftId;
    const count= msg.count;
    console.log("msg",msg)
    if (!userName || !content) return;

    
    const action = LW_GIFT_MAP[content];
    if (!action) return;


    const Msg: GifddDTO = {
      realId: msg.realId,
      user: userName,
      time: msg.time,
      command: action,
      count:count
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

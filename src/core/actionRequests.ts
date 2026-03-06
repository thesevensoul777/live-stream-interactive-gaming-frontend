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
  '中': 'MOVE_MID',
  '下': 'MOVE_DOWN',
  '666': 'LOTTERY',
  '查询': 'QUERY',
  '换职业':'CHANGE_CAREER',
  '回':'BACK',
  '换英雄':'CHANGE_HERO',
  '买1':'BUY_1',
  '买2':'BUY_2',
  '买3':'BUY_3',
  '买4':'BUY_4',
  '买5':'BUY_5',
  '买6':'BUY_6',
};

/**
 * 礼物功能映射表 (基于2026最新数据)
 * 键 (Key): 礼物 ID
 * 值 (Value): 游戏逻辑指令
 */
const GIFT_MAP: Record<string, string> = {
  // --- 1. 基础小礼物 (1-9 抖币) ---


 // '463':   'ADD_INT',            // 小心心: 智力+1：英雄
 // '164':   'ADD_STR',            // 抖音: 力量+1：英雄
 // '3992':  'ADD_AGI',            // 人气票: 敏捷+1：英雄



  '463':'ADD_HP' ,              //小心心：血量：+5
  '164':  'ADD_ATT',            //抖音：攻击力+1
  '3992':  'ADD_SPEED',            // 人气票: 移速+1
  '2002':  'SPAWN_MELEE',        // 大啤酒: 近战单位x1
  '3481':  'SPAWN_RANGE',        // 你最好看: 远程单位x1
  '165':   'SPAWN_MAGIC',        // 棒棒糖: 魔法/控制单位x1
  '3621':  'SPAWN_ELITE',        // 爱你呦: 高级兵种x4
  '3597':  'SPAWN_SIEGE',        // 加油呀: 攻城单位x1
  '2006':  'LEVEL_UP',        // 鲜花：召唤师提升一级
  '781':  'ADD_MONEY',    // 比心: 获得 10000金币
  '3620':  'CHANGE_SUMMONER',        // 送你花花:切换召唤师类型 
  '685':   'TEAM_BUFF_SMALL',    // 粉丝团灯牌: 普通单位+10血量，+10攻击力,+1000金币
  '3447':   'UNLOCK_TOWER',    // 亲吻: 随即解锁两座己方建筑
  '2114':  'ADD_LOW_POWER',      // 奇幻礼花筒:普通单位+500血量，+100攻击力,+50移速



  "5503":"SPAWN_ASSASSIN",    //黄桃罐头:五个刺客，直接出生在对面的基地旁边，攻击对面基地

  '3780':  'ADD_HIGHT_POWER',    // 比心兔兔: 英雄+100全属性，普通单位+100血量，+50攻击力
  '5564':  'SUMMON_SIEGE',  // 闪耀星辰: 攻城单位+*10

};
//经验+200
//5元一座建筑

// '3620':  'CHANGE_SUMMONER',     // 送你花花:  切换英雄化身 (ChangeHero)
  // --- 2. 中大型礼物 (战局逆转) ---
 // '3531':  'SUMMON_EPIC_HERO',   // 私人飞机: 史诗级中立英雄 (持续100s)
  // --- 3. 空中打击 (特定召唤) ---
 // '5503':  'SUMMON_WIND_RIDER',  // 黄桃罐头: 10x 风骑士
  //'3447':  'SUMMON_FROST_WYRM',  // 亲吻: 10x 冰霜巨龙


export async function handleDanmu(msgs: DyMessage[]) {
  // 1. 变量声明置顶
  let userName: string | undefined;
  let content: string | undefined;
  let action: string | undefined;
  let points: number | null;

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

    action = COMMAND_MAP[content];
    if (!action) continue;

    // 构建初始 DTO
    const safeMsg: DanmuCommandDTO = {
      realId: msg.user?.realId,
      user: userName,
      content: content,
      time: msg.time,
      command: action,
      avatar: msg.user?.avatar,
      tierPoints: 0, // 默认初始值
    };

    // --- 核心修改点：处理 1 和 2 的去重与分数获取 ---
    if (content === '1' || content === '2') {
      // 这里的 addUniquePlay 是异步的，等待后端返回分数
      points = await addUniquePlay(safeMsg);
      
      // 如果返回 null，说明该 realId 已在列表中，直接跳过本次循环
      if (points === null) {
        console.warn(`[Handle] 玩家 ${userName} 已存在，跳过发送`);
        continue;
      }
      
      // 将异步拿到的真实分数赋值给 safeMsg
      safeMsg.tierPoints = points;
    }

    // 只有新玩家或非 1/2 指令才会到达这里，执行 IPC 发送给主进程
    (window as any).electronAPI
      .addCommand(safeMsg, action)
      .then(() => {
        console.log(`命令发送成功: ${userName} (积分: ${safeMsg.tierPoints}) -> ${action}`);
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

    
    const action = GIFT_MAP[content];
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

    
    const action = GIFT_MAP[content];
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

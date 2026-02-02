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
};

/**
 * 礼物功能映射表 (基于2026最新数据)
 * 键 (Key): 礼物 ID
 * 值 (Value): 游戏逻辑指令
 */
const GIFT_MAP: Record<string, string> = {
  // --- 1. 基础小礼物 (1-9 抖币) ---
  '463':   'ADD_INT',            // 小心心: 智力+1/0.1护甲
  '164':   'ADD_STR',            // 抖音: 力量+1/10血量
  '3992':  'ADD_AGI',            // 人气票: 敏捷+1/+攻击力
  '2002':  'SPAWN_MELEE',        // 大啤酒: 近战单位
  '3481':  'SPAWN_RANGE',        // 你最好看: 远程单位
  '165':   'SPAWN_MAGIC',        // 棒棒糖: 魔法/控制单位
  '2006':  'SPAWN_ELITE',        // 鲜花: 高级兵种
  '3621':  'CHANGE_HERO',        // 爱你呦: 切换英雄化身 (ChangeHero)
  '3620':  'CHANGE_SUMMONER',     // 送你花花: 切换召唤师类型 
  '2114':  'ADD_GOLD_3000',      // 奇幻礼花筒: 金币 3000
  '781':  'ADD_LUMBER_3000',    // 比心: 木材 3000 

  // --- 2. 中大型礼物 (战局逆转) ---
  '685':   'TEAM_BUFF_SMALL',    // 粉丝团灯牌: 全体+5全属性, 召唤师+200经验
  '3780':  'TEAM_BUFF_LARGE',    // 比心兔兔: 所有召唤单位+50全属性
  '3531':  'SUMMON_EPIC_HERO',   // 私人飞机: 史诗级中立英雄 (持续100s)

  // --- 3. 空中打击 (特定召唤) ---
  '5564':  'SUMMON_HIPPOGRYPH',  // 闪耀星辰: 10x 角鹰兽
  '5503':  'SUMMON_WIND_RIDER',  // 黄桃罐头: 10x 风骑士
  '3447':  'SUMMON_FROST_WYRM',  // 亲吻: 10x 冰霜巨龙
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

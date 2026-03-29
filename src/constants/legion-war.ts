// 礼物功能描述
export const LW_GIFT_DESC: Record<string, string> = {
  'ADD_HP': '血量+5',
  'ADD_ATT': '攻击力+1',
  'ADD_SPEED': '移速+1',
  'ADD_AS': '攻速+2%',
  'ADD_RANGE': '攻击范围+10',
  'SPAWN_MAGIC': '魔法/控制单位x1',
  'SPAWN_ELITE': '高级兵种x4',
  'SPAWN_SIEGE': '攻城单位x1',
  'LEVEL_UP': '召唤师提升一级',
  'ADD_MONEY': '获得 10000金币',
  'CHANGE_SUMMONER': '切换召唤师类型',
  'TEAM_BUFF_SMALL': '团队小增益',
  'UNLOCK_TOWER': '随机解锁两座建筑',
  'ADD_LOW_POWER': '团队大增益',
};

// 礼物 ID 到指令的映射
export const LW_GIFT_MAP: Record<string, string> = {
  // --- 1. 基础小礼物 (1-9 抖币) ---
  '463':'ADD_HP' ,              //小心心：血量：+5
  '164':  'ADD_ATT',            //抖音：攻击力+1
  '3992':  'ADD_SPEED',            // 人气票: 移速+1
 // '2002':  'ADD_AS',        // 大啤酒: 攻速+2%
  //'3481':  'ADD_RANGE',        // 你最好看: 攻击范围+10
  '2002':  'ADD_ALL',        // 大啤酒: 英雄全属+1
  

 // '2002':  'SPAWN_MELEE',        // 大啤酒: 近战单位x1
 // '3481':  'SPAWN_RANGE',        // 你最好看: 远程单位x1

 // '165':   'SPAWN_MAGIC',        // 棒棒糖: 魔法/控制单位x1
 '165':   'SPAWN_BASE',        // 棒棒糖: 近卫+射手X1
  '3621':  'SPAWN_ELITE',        // 爱你呦: 飞龙x3
  '3597':  'SPAWN_SIEGE',        // 加油呀: 攻城兵x1
  '2006':  'LEVEL_UP',        // 鲜花：召唤师提升一级
  '781':  'ADD_MONEY',    // 比心: 获得 10000金币
  '3620':  'CHANGE_SUMMONER',        // 送你花花:切换召唤师类型 
  '685':   'TEAM_BUFF_SMALL',    // 粉丝团灯牌: 普通单位+10血量，+10攻击力,+1000金币
  '3447':   'UNLOCK_TOWER',    // 亲吻: 随即解锁两座己方建筑
  '2114':  'ADD_LOW_POWER',      // 奇幻礼花筒:普通单位+500血量，+100攻击力,+50移速
};

 // '463':   'ADD_INT',            // 小心心: 智力+1：英雄
 // '164':   'ADD_STR',            // 抖音: 力量+1：英雄
 // '3992':  'ADD_AGI',            // 人气票: 敏捷+1：英雄


// "5503":"SPAWN_ASSASSIN",    //黄桃罐头:五个刺客，直接出生在对面的基地旁边，攻击对面基地

 //  '3780':  'ADD_HIGHT_POWER',    // 比心兔兔: 英雄+100全属性，普通单位+100血量，+50攻击力
 //  '5564':  'SUMMON_SIEGE',  // 闪耀星辰: 攻城单位+*10
// '3620':  'CHANGE_SUMMONER',     // 送你花花:  切换英雄化身 (ChangeHero)
  // --- 2. 中大型礼物 (战局逆转) ---
 // '3531':  'SUMMON_EPIC_HERO',   // 私人飞机: 史诗级中立英雄 (持续100s)
  // --- 3. 空中打击 (特定召唤) ---
 // '5503':  'SUMMON_WIND_RIDER',  // 黄桃罐头: 10x 风骑士
  //'3447':  'SUMMON_FROST_WYRM',  // 亲吻: 10x 冰霜巨龙

export const LW_COMMAND_MAP: Record<string, string> = {
  '1': 'SELECT_1',
  '2': 'SELECT_2',
  '上': 'MOVE_UP',
  '中': 'MOVE_MID',
  '下': 'MOVE_DOWN',
  '666': 'LOTTERY',
  '查询': 'QUERY',
  '换职业': 'CHANGE_CAREER',
  '回': 'BACK',
  '换英雄': 'CHANGE_HERO',
  '买1': 'BUY_1',
  '买2': 'BUY_2',
  '买3': 'BUY_3',
  '买4': 'BUY_4',
  '买5': 'BUY_5',
  '买6': 'BUY_6',
  '合成': 'COMBINING',
};

export  const LW_GIFT_NAME_MAP: Record<string, string> = {
  '463':  '小心心（血量：+5）',
  '164':  '抖音（攻击力+1）',
  '3992': '人气票（移速+1）',
  '2002': '大啤酒（英雄全属+1）',
//  '3481': '你最好看（英雄全属+1）',
  '165':  '棒棒糖（近卫+射手x1）',
  '3621': '爱你呦（飞龙x3）',
  '3597': '加油呀（攻城兵x1）',
  '2006': '鲜花（召唤师提升一级）',
  '781':  '比心（获得 10000金币）',
  '3620': '送你花花（切换召唤师类型）',
  '685':  '粉丝团灯牌（普通单位+10血量，+10攻击力,+1000金币）',
  '3447': '亲吻（随机解锁两座建筑）',
  '2114': '奇幻礼花筒（普通单位+500血量，+100攻击力,+50移速）'
};
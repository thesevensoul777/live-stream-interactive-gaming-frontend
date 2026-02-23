import { CastMethod, type DyMessage } from "../core/dycast";
import { handleDanmu } from "../core/actionRequests";

// 随机用户池
const MOCK_USERS = [
  { name: "隔壁老王", realId: "2291855252522311" },
  { name: "萌妹子", realId: "2291855252522312" },
  { name: "榜一大哥", realId: "2291855252522313" },
  { name: "路人小明", realId: "2291855252522314" },
    { name: "77777", realId: "2291855252522315" },
      { name: "8888", realId: "2291855252522316" }
];

export function runDanmuTest() {
  console.log("%c [Test] 开始：123名发1，45名发2，随后开启随机模式...", "color: #00ff00; font-weight: bold;");

  let step = 0;
  let timer: any = null;

  const execute = () => {
    // 随机用户（用于阶段 2）
    let randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    let mockMsg: DyMessage = {
      time: Date.now(),
      user: { ...randomUser, avatar: "" }
    };

    // --- 阶段 1: 指定用户输入 1 和 2 (共 6 步) ---
    if (step < 6) {
      let currentUser;
      let content;

      if (step < 3) {
        // 第 1, 2, 3 名用户 (索引 0, 1, 2)
        currentUser = MOCK_USERS[step];
        content = "1";
      } else {
        // 第 4, 5 名用户 (索引 3, 4)，这里循环利用一下保证跑满 step
        currentUser = MOCK_USERS[step % 5]; 
        content = "2";
      }

      mockMsg.user = { ...currentUser, avatar: "" };
      mockMsg.method = CastMethod.CHAT;
      mockMsg.content = content;

      console.log(`%c [初始化] 用户:${currentUser.name} -> 内容:${content} (Step:${step})`, "color: #f1c40f;");
      handleDanmu([mockMsg]);
      step++;

      // 初始化完成，切换频率
      if (step === 6) {
        clearInterval(timer);
        console.log("%c [Test] 指定输入完成，进入 5s 随机压测模式", "color: #3498db;");
        timer = setInterval(execute, 5000);
      }
    } 
    // --- 阶段 2: 随机压测逻辑保持不变 ---
    else {
      const type = Math.random();
      if (type < 0.1) {
        mockMsg.method = CastMethod.CHAT;
        mockMsg.content = ["上", "下","中",  "换职业", "666","回"][Math.floor(Math.random() * 4)];
        console.log(`[测试-弹幕] ${randomUser.name}: ${mockMsg.content}`);
      } 
      else if (type < 1) {
//        const giftIds = [
//   "463",  "164",  "3992", "2001", "3597", 
//   "2002", "3481", "165",  "2006", "2114", 
//   "3780", "5564", "685",  "781"
// ];

       const giftIds = [
"2006","2002","165","3481"
 ];
        const giftId = giftIds[Math.floor(Math.random() * giftIds.length)];
        mockMsg.method = CastMethod.GIFT;
        mockMsg.gift = { id: giftId, count: Math.floor(Math.random() * 5) + 1, name: "测试礼物" };
        console.log(`[测试-礼物] ${randomUser.name}: ID(${giftId}) x${mockMsg.gift.count}`);
      } 
      else {
        mockMsg.method = CastMethod.LIKE;
        mockMsg.likeCount = String(Math.floor(Math.random() * 50));
        console.log(`[测试-点赞] ${randomUser.name}: ${mockMsg.likeCount}次`);
      }
      handleDanmu([mockMsg]);
    }
  };

  // 初始每 2 秒跑一步初始化
  timer = setInterval(execute, 2000);

  return { stop: () => clearInterval(timer) };
}


<template>
  <div class="panel">
<div class="row">
  <!-- 弹幕状态 -->
  <div class="field">
    <span class="label">弹幕状态：</span>
    <span :class="connectStatus==1 ? 'connected' : 'disconnected'">
      {{ connectStatus==1 ? '已连接' : '未连接' }}
    </span>
  </div>

  <!-- 抖音号 -->
  <div class="field">
    <span class="label">抖音号：</span>
      <input class="field-input" v-model="douyinId" placeholder="抖音号" />
    <!-- <span class="text">{{ douyinId }}</span> -->
  </div>

  <!-- 秘钥 -->
  <div class="field">
    <span class="label">秘钥：</span>
    <input class="field-input" v-model="secret" placeholder="秘钥" />
  </div>

  <!-- 操作按钮 -->
  <div class="actions">

    

    <button
      :class="{'confirmed': confirmed}"
      @click="chooseFolder"
    >
      {{ buttonText }}
    </button>
    <button
      :class="connectStatus ==1 ? 'btn-running' : ''"
      @click="toggleListen"
    >
      {{ connectStatus==1 ? '监听中' : '启动监听' }}
    </button>
    <button 
  class="btn-launch" 
  :disabled="!path" 
  @click="launchGame"
>
   启动游戏
</button>


    <!-- <button @click="stop">断开</button> -->
  </div>
</div>
    <div class="row">
        <div class="field field-player">
      <select v-model="player">
        <option value="" disabled>选择玩家</option>
     <option 
      v-for="p in currentPlay" 
      :key="p.realId" 
      :value="p.realId"
    >
      {{ p.user }}
    </option>
      </select>
        </div>

          <div class="field field-count">
      <input v-model.number="count" type="number" placeholder="数量" />
          </div>

<div class="field field field-gift">
  <span class="label">选择礼物：</span>
  <select v-model="gift" style="width: 260px;">
    <option 
      v-for="(val, key) in GIFT_NAME_MAP" 
      :key="key" 
      :value="key"
    >
      {{ val }}
    </option>
  </select>
</div>


  
  <div class="actions">
        <button 
  @click="toggleTest"
>
  测试礼物
</button>
<button @click="send">补送</button>
<button @click="openOverlay">开启特效</button>
  </div>
      
    </div>
    
  </div>
</template>
<script setup lang="ts">
import { ref,useTemplateRef,computed,watch  } from 'vue'
import {
  CastMethod,
  DyCast,
  DyCastCloseCode,
  RoomStatus,
  type ConnectStatus,
  type DyMessage,
  type DyLiveInfo,
  type LiveRoom
} from '@/core/dycast'

import { RelayCast } from '@/core/relay';
import { injectWar3} from '@/core/actionRequests';
import { useDanmuStore } from '@/components/composables/DanmuData'
import { useAuthStore } from '@/stores/auth'
import { handleDanmu,ManualGiveGift } from '@/core/actionRequests';
import { runDanmuTest } from '@/test/testMock';
import type { GifddDTO } from "@/types/danmu";

const authStore = useAuthStore()
const testTimer = ref<any>(null);
const ManualGiveGiftData= ref<GifddDTO>();

const user = computed(() => authStore.user)

const { appendCasts, clearDanmu,currentPlay } = useDanmuStore()

// 状态
// 连接状态
const connectStatus = ref<ConnectStatus>(0);
const douyinId = ref<string>('10438864178')
const secret = ref<string>('1')


//房间信息
const followCount = ref<string | number>('*****');
const memberCount = ref<string | number>('*****');
const userCount = ref<string | number>('*****');
const likeCount = ref<string | number>('*****');

// 玩家 / 礼物
const player = ref<string>('')
const count = ref<number>(1)
const gift = ref<string>('463');

const GIFT_NAME_MAP: Record<string, string> = {
  '463':  '小心心（血量：+5）',
  '164':  '抖音（攻击力+1）',
  '3992': '人气票（移速+1）',
  '2002': '大啤酒（近战单位x1）',
  '3481': '你最好看（远程单位x1）',
  '165':  '棒棒糖（魔法/控制单位x1）',
  '3621': '爱你呦（高级兵种x4）',
  '3597': '加油呀（攻城单位x1）',
  '2006': '鲜花（召唤师提升一级）',
  '781':  '比心（获得 10000金币）',
  '3620': '送你花花（切换召唤师类型）',
  '685':  '粉丝团灯牌（团队小增益）',
  '3447': '亲吻（随机解锁两座建筑）',
  '2114': '奇幻礼花筒（团队大增益）'
};

// 其它弹幕
const otherRef = useTemplateRef('otherEl');
// 所有弹幕
const allCasts: DyMessage[] = [];

// 转发客户端
let relayWs: RelayCast | undefined;



const path = ref('')
const confirmed = ref(false)
const buttonText = ref('游戏文件夹')

// 弹幕客户端
let castWs: DyCast | undefined
const castSet: Set<string> = new Set()

function toggleListen(): void {
  if (connectStatus.value!=0) {
    stop()
    return
  }

  if (!douyinId.value || !secret.value) {
    alert('请填写抖音号和秘钥')
    return
  }
  connectLive();
   injectWar3(false);

}


const toggleTest = () => {
  if (testTimer.value) {
    clearInterval(testTimer.value);
    testTimer.value = null;
  } else {
    testTimer.value = runDanmuTest();
  }
};



// 调用 actionRequests 中的注入方法或直接触发 IPC
async function launchGame() {
  if (!path.value) {
    alert('请先选择游戏文件夹');
    return;
  }
  // 这里可以调用你已经导入的 injectWar3，或者直接通过 API 启动
  console.log('正在启动魔兽并准备注入...');
  // 假设你在 preload 中暴露了 gameAPI
  const success = await (window as any).gameAPI.launchWar3(path.value);
  if (success) {
    console.log('游戏启动命令已发送');
  }
}


function connectLive(): void {
  try {
    castSet.clear()
    allCasts.length = 0

    const cast = new DyCast(douyinId.value)

    cast.on('open', (_ev?: Event, info?: DyLiveInfo) => {
      console.log('DyCast 房间连接成功')
      connectStatus.value = 1
      setRoomInfo(info)
      console.log("info",info)
   
    })

    cast.on('error', (err: Error) => {
      console.error('DyCast 连接出错 =>', err)
      connectStatus.value = 0
    })

    cast.on('close', (code: DyCastCloseCode, reason: string) => {
      console.log(`DyCast 房间已关闭[${code}] => ${reason}`)
      connectStatus.value = 0
    })

    cast.on('message', (msgs: DyMessage[]) => {

      handleMessages(msgs)
    })

    cast.connect()
    castWs = cast
  } catch (err) {
    console.error('房间连接过程出错:', err)
    connectStatus.value = 0
    castWs = undefined
  }
}


function setRoomInfo(info?: DyLiveInfo): void {
  if (!info) return
  // TODO: 设置房间信息
}


async function chooseFolder() {
  // @ts-ignore
  const result = await (window as any).fileAPI.selectFolder()
  if (result) {
    path.value = result
    confirmed.value = true
    buttonText.value = '已确认'
  } else {
    // 用户取消选择时，恢复原状
    confirmed.value = false
    buttonText.value = '选择游戏文件夹'
  }
}

/**
 * 处理消息列表
 */
const handleMessages = function (msgs: DyMessage[]) {
  const newCasts: DyMessage[] = [];
  const mainCasts: DyMessage[] = [];
  const otherCasts: DyMessage[] = [];
  try {

    for (const msg of msgs) {
      if (!msg.id) continue;
      if (castSet.has(msg.id)) continue;
      castSet.add(msg.id);
      switch (msg.method) {
        case CastMethod.CHAT:
          newCasts.push(msg);
          mainCasts.push(msg);
          break;
        case CastMethod.GIFT:
          if (!msg?.gift?.repeatEnd) {
            newCasts.push(msg);
            mainCasts.push(msg);
          }
          break;
        case CastMethod.LIKE:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.MEMBER:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.SOCIAL:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.EMOJI_CHAT:
          newCasts.push(msg);
          mainCasts.push(msg);
          break;
        case CastMethod.ROOM_USER_SEQ:
          setRoomCount(msg.room);
          break;
        case CastMethod.ROOM_STATS:
          setRoomCount(msg.room);
          break;
        case CastMethod.CONTROL:
          if (msg?.room?.status !== RoomStatus.LIVING) {
            // 已经下播
            newCasts.push(msg);
            otherCasts.push(msg);
            disconnectLive();
          }
          break;
      }
    }
  } catch (err) {}
  allCasts.push(...newCasts);
 handleDanmu(newCasts);

  appendCasts(allCasts, mainCasts, otherCasts)
  if (relayWs && relayWs.isConnected()) {
    relayWs.send(JSON.stringify(msgs));
  }


};




function stop(): void {
  if (castWs) castWs.close(1000, '手动断开')

  clearDanmu();
  appendCasts([], [], [])
  allCasts.length=0;
  connectStatus.value = 0
}


/**
 * 设置房间统计信息
 * @param room
 * @returns
 */
const setRoomCount = function (room?: LiveRoom) {
  
  if (!room) return;
  if (room.audienceCount) memberCount.value = `${room.audienceCount}`;
  if (room.followCount) followCount.value = `${room.followCount}`;
  if (room.likeCount) likeCount.value = `${room.likeCount}`;
  if (room.totalUserCount) userCount.value = `${room.totalUserCount}`;
};


/** 断开连接 */
const disconnectLive = function () {
  if (castWs) castWs.close(1000, '断开连接');
};



function send(): void {
  // 1. 校验输入
  if (!player.value) {
    alert("请选择目标玩家");
    return;
  }

  // 2. 从 currentPlay 查找选中玩家的完整信息（为了获取 realId）
  const targetPlayer = currentPlay.value.find(p => p.realId === player.value);
  
  // 3. 构造 GifddDTO 格式的数据
  const payload: any = {
    realId: player.value , 
    user: targetPlayer?.user|| 'manual-send',                           // 对应函数里的 msg.user
    giftId: gift.value,                           // 对应函数里的 msg.giftId (即 463 等 ID)
    count: count.value,                           // 对应函数里的 msg.count
    time: new Date().toLocaleTimeString(),        // 时间戳
  };
 debugger;
  // 4. 调用接口
  ManualGiveGift(payload);
  
  console.log('已执行补送:', payload);
}

function openOverlay() {
  (window as any).newWindow.openOverlay();
}


watch(
  () => user.value?.douyinAccount,
  (val) => {
    if (val) {
      douyinId.value = val
    }
  },
  { immediate: true }
)

</script>


<style scoped>

  .row {
  display: flex;
  align-items: center;
  gap: 24px;          /* 字段组之间的距离（远） */
  margin-bottom: 10px;
}

/* 每一组 label + 内容 */
.field {
  display: inline-flex;
  align-items: center;
  gap: 6px;           /* label 与内容之间（近） */
}

/* label 统一样式 */
.label {
  color: #666;
  white-space: nowrap;
}

/* 显示用文本 */
.text {
  font-weight: 500;
}

/* 按钮区域 */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto; /* 🔥 把按钮整体推到最右侧 */
}

.panel {
  border: 1px solid #ccc;
  padding: 10px;
}

.row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 18px;
}

.connected {
  color: #2ecc71;
  font-weight: bold;
}

.disconnected {
  color: #e74c3c;
  font-weight: bold;
}

.btn-running {
  background-color: #2ecc71;
  color: white;
  border-color: #2ecc71;
}
.row select,
.row input {
  height: 28px;
  min-width: 15px;
  padding: 0 10px;
  font-size: 14px;
}
button.confirmed {
  background-color: #4caf50; /* 绿色 */
  color: white;
  border-color: #4caf50;
}
.field-input{
  width: 7rem;
}

.field-player {
  width: 15%;
}
.field-count {
  width:10%;
}
.field-gift {
  /* 礼物框通常比较长 */
  width: 30%; 
}

/* 确保内部的 select 和 input 自动撑满 field 的宽度 */
.field select, 
.field input {
  width: 100%;
}
</style>

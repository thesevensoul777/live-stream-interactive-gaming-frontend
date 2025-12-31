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
      <input v-model="douyinId" placeholder="抖音号" />
    <!-- <span class="text">{{ douyinId }}</span> -->
  </div>

  <!-- 秘钥 -->
  <div class="field">
    <span class="label">秘钥：</span>
    <input v-model="secret" placeholder="秘钥" />
  </div>

  <!-- 操作按钮 -->
  <div class="actions">
    <button
      :class="connectStatus ==1 ? 'btn-running' : ''"
      @click="toggleListen"
    >
      {{ connectStatus==1 ? '监听中' : '启动监听' }}
    </button>

    <button @click="stop">断开</button>
  </div>
</div>


    <div class="row">
        <div class="field">
      <select v-model="player">
        <option v-for="p in players" :key="p" :value="p">{{ p }}</option>
      </select>
        </div>

          <div class="field">
      <input v-model.number="count" type="number" placeholder="弹幕数量" />
          </div>

 <div class="field">

    <select v-model="gift">
        <option v-for="g in gifts" :key="g">{{ g }}</option>
      </select>
 </div>


  
  <div class="actions">
<button @click="send">补送</button>
  </div>
      
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref,useTemplateRef } from 'vue'
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

const { appendCasts, clearDanmu } = useDanmuStore()

// 状态
// 连接状态
const connectStatus = ref<ConnectStatus>(0);
const douyinId = ref<string>('844740081525')
const secret = ref<string>('1')


//房间信息
const followCount = ref<string | number>('*****');
const memberCount = ref<string | number>('*****');
const userCount = ref<string | number>('*****');
const likeCount = ref<string | number>('*****');

// 玩家 / 礼物
const player = ref<string>('电脑玩家A')
const count = ref<number>(1)
const gift = ref<string>('玫瑰')

const players: string[] = ['电脑玩家A', '电脑玩家B']
const gifts: string[] = ['玫瑰', '飞机', '火箭']

// 其它弹幕
const otherRef = useTemplateRef('otherEl');
// 所有弹幕
const allCasts: DyMessage[] = [];


// 转发客户端
let relayWs: RelayCast | undefined;



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
  // 记录

  allCasts.push(...newCasts);
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
  console.log('send gift', player.value, gift.value, count.value)
}
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
  min-width: 140px;
  padding: 0 10px;
  font-size: 14px;
}

</style>

<template>
   <div class="table-wrapper"> 
  <table class="table">
    <thead>
      <tr>
        <th>{{ t('records.giftId') }}</th>
        <th>{{ t('records.sender') }}</th>
        <th>{{ t('records.gift') }}</th>
        <th>{{ t('records.count') }}</th>
        <th>{{ t('records.giftValue') }}</th>
        <th>{{ t('records.time') }}</th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="item in casts" :key="item.time">
          <td>{{ item.gift?.id }}</td>
        <td>{{ item.user?.name }}</td>
        <td>{{ item.gift?.name }}</td>
        <td>{{ item.gift?.count }}</td>
        <td>{{ formatGiftValue(item.gift) }}</td>
        <td>{{ item.time ? formatTime(item.time) : '' }}</td> 
      </tr>
    </tbody>
  </table>
  </div>
</template>

<script setup lang="ts">

import { useDanmuStore } from '@/components/composables/DanmuData'
import { watch,onMounted } from 'vue'
import type { CastType } from '@/components/CastTypeBtn/type';
import { CastMethod, type DyMessage } from '@/core/dycast';
import { ref } from 'vue';
import { pushGiftApi } from '@/api/gift'
import type { GiftRecordRequest } from '@/api/dto/giftRecord'
import type { PlayerDelta } from '@/api/dto/Player'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { platformMainCasts } = useDanmuStore()

const giftBuffer: GiftRecordRequest[] = []

const playerDeltaMap = new Map<string, PlayerDelta>()

/** 显示弹幕 */
const casts = ref<DyMessage[]>([]);



// 类型控制器
const typeMap: Map<CastMethod, boolean> = new Map();


/**
 * 设置弹幕类型显隐状态
 * @param type
 * @param flag
 */
const setCastType = function (type: CastType, flag?: boolean) {
  switch (type) {
    case 'chat':
      typeMap.set(CastMethod.CHAT, !!flag);
      typeMap.set(CastMethod.EMOJI_CHAT, !!flag);
      break;
    case 'gift':
      typeMap.set(CastMethod.GIFT, !!flag);
      break;
    case 'like':
      typeMap.set(CastMethod.LIKE, !!flag);
      break;
    case 'social':
      typeMap.set(CastMethod.SOCIAL, !!flag);
      break;
    case 'member':
      typeMap.set(CastMethod.MEMBER, !!flag);
      break;
  }
};

// script setup
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
};

const formatGiftValue = (gift?: DyMessage['gift']) => {
  if (!gift) return ''
  const value = Number(gift.price || 0)
  if (gift.platform === 'bilibili') {
    const unit = gift.coinType === 'silver'
      ? t('records.silverCoins')
      : t('records.goldCoins')
    return `${value} ${unit}`
  }
  return `${value} ${t('records.soundWave')}`
}



/**
 * 设置弹幕显示
 */
const addCasts = function (msgs: DyMessage[], isClear: boolean = false) {
  const list: DyMessage[] = msgs.filter(item => {
    if (item.method) return !!typeMap.get(item.method);
    else return false;
  });

  if(list.length!=0)   pushGift(list);
  if (isClear) casts.value = list;
  else casts.value.push(...list);

};


// const pushGift = async (rowData: DyMessage[]) => {
//   try {
//     const promises = rowData
//       .filter(row => row.gift?.repeatEnd === undefined || row.gift?.repeatEnd === 1)
//       .map(row => 
//         pushGiftApi({
//           id: row.gift?.id,
//           name: row.gift?.name,
//           price: row.gift?.price,
//           type: row.gift?.type,
//           icon: row.gift?.icon,
//           count: row.gift?.count,
//           repeatEnd: row.gift?.repeatEnd,
//           senderId: row.user?.id,
//           senderName: row.user?.name,
//           gameTypeId:"261CE843-5F44-418A-8D10-E49F5DEB191D"
//         })
//       );

//     await Promise.all(promises);
//   } catch (err: any) {
//     alert(err.response?.data?.message || err.message || '操作失败');
//   }


// };


const pushGift = async (rowData: DyMessage[]) => {
  const tasks = rowData
    .filter(row =>
      row.gift?.platform !== 'bilibili' &&
      (row.gift?.repeatEnd === undefined || row.gift?.repeatEnd === 1),
    )
    .map(row =>
      onGiftReceived({
        id: row.gift?.id,
        name: row.gift?.name,
        price: row.gift?.price,
        type: row.gift?.type,
        icon: row.gift?.icon,
        count: row.gift?.count,
        senderId: row.user?.id,
        senderName: row.user?.name,
        gameTypeId: "261CE843-5F44-418A-8D10-E49F5DEB191D"
      })
    )

  await Promise.all(tasks)
}



const onGiftReceived = async (gift: GiftRecordRequest) =>{
  (window as any).buffer.addGift(gift)
}

// function onKillEnemy(playerId: string, gameTypeId: string) {
//   (window as any).buffer.addPlayerDelta({
//     douyinUserId: playerId,
//     gameTypeId,
//     addedRankPoints: 10,
//     addedTierPoints: 5
//   })
// }

// function onGameWin(playerId: string, gameTypeId: string) {
//   (window as any)..buffer.addPlayerDelta({
//     douyinUserId: playerId,
//     gameTypeId,
//     addedRankPoints: 100,
//     addedTierPoints: 50
//   })
// }



// Track the last seen message per platform so RecordTable only processes new gifts
const lastSeenId: Record<string, string | number | undefined> = {}

watch(
  platformMainCasts,
  (platforms) => {
    for (const [platform, list] of Object.entries(platforms)) {
      if (!list.length) {
        delete lastSeenId[platform]
        continue
      }
      const lastId = lastSeenId[platform]
      if (lastId === undefined) {
        // First time seeing this platform: take everything
        addCasts(list, false)
      } else {
        const lastIdx = list.findIndex((m) => m.id === lastId)
        // If the list was reset/capped, fall back to the full list
        const newItems = lastIdx === -1 ? list : list.slice(lastIdx + 1)
        addCasts(newItems, false)
      }

      lastSeenId[platform] = list[list.length - 1]?.id
    }
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  setCastType("gift", true);

});


</script>

<style scoped>
  .table-wrapper {
  height: 300px;          /* 固定高度，可按你页面改 */
  overflow-y: auto;       /* 纵向滚动 */
  border: 1px solid #ddd;
}

.table-wrapper {
  height: 300px;          /* 固定高度，可按你页面改 */
  overflow-y: auto;       /* 纵向滚动 */
  border: 1px solid #ddd;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 6px;
  text-align: center;
  white-space: nowrap;    /* 防止内容换行撑高 */
}

</style>

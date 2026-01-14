// useDanmuStore.ts
import { ref } from 'vue'
import type { DyMessage } from '@/core/dycast'
import type { DanmuCommandDTO } from "@/types/danmu";

const allCasts = ref<DyMessage[]>([])
const mainCasts = ref<DyMessage[]>([])
const otherCasts = ref<DyMessage[]>([])
// 存储当前 1 或 2 的玩家指令
const currentPlay = ref<DanmuCommandDTO[]>([])

export function useDanmuStore() {
  
  // 核心逻辑：判断 realId 是否已存在，不存在则存入并返回 true
  function addUniquePlay(msg: DanmuCommandDTO): boolean {
    if (!msg.realId) return false;
    
    // 检查 realId 是否已经在当前列表中
    const isExist = currentPlay.value.some(item => item.realId === msg.realId);
    console.log("msg.realId",msg.realId)
    if (!isExist) {
      currentPlay.value.push(msg);

      // 💡 关键：同步给主进程，主进程会转交给 Overlay
      const rawList = JSON.parse(JSON.stringify(currentPlay.value));
      (window as any).electronAPI.syncCurrentPlay(rawList);
      console.log(`[Store] 玩家 ${msg.user} 成功加入 currentPlay`);
      return true; // 表示是新玩家，可以执行后续逻辑
    }
    console.log("currentPlay",currentPlay)
    console.warn(`[Store] 玩家 ${msg.user} (ID: ${msg.realId}) 已在列表中，跳过`);
    return false; // 表示已存在
  }

  function clearCurrentPlay() {
    currentPlay.value = [];
    console.log("[Store] currentPlay 已清空");
  }

  function appendCasts(newAll: DyMessage[], newMain: DyMessage[], newOther: DyMessage[]) {
    if (newAll.length) allCasts.value = newAll
    if (newMain.length) mainCasts.value = newMain
    if (newOther.length) otherCasts.value = newOther
  }

  function clearDanmu() {
    allCasts.value.length = 0
    mainCasts.value.length = 0
    otherCasts.value.length = 0
  }

  return {
    allCasts,
    mainCasts,
    otherCasts,
    currentPlay, // 导出供组件使用
    appendCasts,
    clearDanmu,
    addUniquePlay,
    clearCurrentPlay
  }
}
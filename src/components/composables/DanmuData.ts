import { ref } from 'vue'
import type { DyMessage } from '@/core/dycast'
import type { DanmuCommandDTO } from "@/types/danmu";
import { syncRank } from '@/api/player'

const allCasts = ref<DyMessage[]>([])
const mainCasts = ref<DyMessage[]>([])
const otherCasts = ref<DyMessage[]>([])
// 存储当前 1 或 2 的玩家指令
const currentPlay = ref<DanmuCommandDTO[]>([])

export function useDanmuStore() {
  
  // 辅助方法：将当前列表同步给 Electron (Overlay用)
  const syncToElectron = () => {
    const rawList = JSON.parse(JSON.stringify(currentPlay.value));
    (window as any).electronAPI.syncCurrentPlay(rawList);
  }

  // 核心逻辑：判断 realId 是否已存在，不存在则存入并返回分数
async function addUniquePlay(msg: DanmuCommandDTO): Promise<{ tierPoints: number, golds: number } | null> {
    // 变量声明置顶
    let isExist: boolean;
    let player: DanmuCommandDTO | undefined;
    let res: any; // 用于存储异步请求结果
    let resultObj: { rankPoints: number, golds: number };

    if (!msg.realId) return null;

    // 检查是否已在列表中
    isExist = currentPlay.value.some(item => item.realId === msg.realId);

    if (!isExist) {
        // 1. 先加入本地列表
        currentPlay.value.push(msg);

        // 2. 立即同步一次
        syncToElectron();
        
        try {
            res = await syncRank({
                douyinUserId: msg.realId,
                douyinName: msg.user,
                gameTypeId: "261CE843-5F44-418A-8D10-E49F5DEB191D",
                avatarUrl: msg.avatar,
                golds: msg.golds
            });

            if (res.data.success) {
                // 3. 更新本地存储
                player = currentPlay.value.find(p => p.realId === msg.realId);
                if (player) {
                    player.rankPoints = res.data.rankPoints;
                    player.tierPoints = res.data.tierPoints;
                    player.tier = res.data.tier;
                    player.golds = res.data.golds;
                }

                // 4. 数据更新后同步
                syncToElectron();

                // 返回包含两个属性的对象
                return {
                    tierPoints: res.data.tierPoints,
                    golds: res.data.golds
                };
            }
        } catch (err) {
            console.error("同步失败", err);
        }

        // 如果 API 失败，返回默认值对象
        return { rankPoints: 0, golds: 0 };
    }

    // 玩家已存在，返回 null
    console.warn(`[Store] 玩家 ${msg.user} 已在列表中`);
    return null;
}

 async function clearCurrentPlay() {
    currentPlay.value = [];
    syncToElectron(); // 清空时也同步一下
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
    currentPlay,
    appendCasts,
    clearDanmu,
    addUniquePlay,
    clearCurrentPlay
  }
}
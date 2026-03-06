import api from './index'
import type { SyncPlayerRankRequest, PlayerRankResponse } from '@/api/dto/Player'

// 添加 <PlayerRankResponse> 泛型，这样你在组件里调用时，
// res.data 就会自动识别出 rankPoints, tier 等字段
export const syncRank = (data: SyncPlayerRankRequest) => {
  return api.post<PlayerRankResponse>('/player/sync-rank', data)
}
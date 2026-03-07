import api from './index'
import type { SyncPlayerRankRequest, PlayerRankResponse,GameSummaryRequest,GameSummaryResponse,LeaderboardItem } from '@/api/dto/Player'

// 添加 <PlayerRankResponse> 泛型，这样你在组件里调用时，
// res.data 就会自动识别出 rankPoints, tier 等字段
export const syncRank = (data: SyncPlayerRankRequest) => {
  return api.post<PlayerRankResponse>('/player/sync-rank', data)
}


// 游戏结束时的批量结算接口
export const postGameSummary = (data: GameSummaryRequest) => {
  return api.post<GameSummaryResponse>('/player/game-summary', data)
}



/**
 * 3. 获取月度排行榜（前 20 名）
 * 核心：用于渲染你那个带炫酷动态相框的榜单
 */
export const getMonthlyLeaderboard = (gameTypeId: string) => {
  // 返回数组格式：{ success: boolean, data: LeaderboardItem[] }
  return api.get<{ success: boolean; data: LeaderboardItem[] }>(`/Player/monthly-leaderboard/${gameTypeId}`)
}
/**
 * 跨窗口同步的所有频道定义
 * 统一在这里管理，防止命名冲突
 */
export const SYNC_CHANNELS = {
  // 1. 排行榜数据同步 (全量列表)
  RANK_LIST_UPDATE: 'sync:rank-list',
  
  // 2. 观众进场特效 (单个用户信息)
  USER_ENTRANCE: 'sync:user-entrance',
  
  // 3. 实时点赞数更新
  LIKE_COUNT_UPDATE: 'sync:like-update',
  
  // 4. 游戏全局配置同步 (比如当前的关卡、倍率)
  GAME_CONFIG_SYNC: 'sync:game-config',
  
  // 5. 紧急广播消息 (比如弹幕滚动通知)
  EMERGENCY_BROADCAST: 'sync:broadcast'
} as const;

// 导出类型，方便 TypeScript 提供代码提示
export type SyncChannelType = typeof SYNC_CHANNELS[keyof typeof SYNC_CHANNELS];
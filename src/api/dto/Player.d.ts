
export {} 

export interface PlayerDelta {
  douyinUserId: string
  gameTypeId: string
  addedRankPoints: number
  addedTierPoints: number
}


export interface SyncPlayerRankRequest {
  douyinUserId: string;
  gameTypeId: string;
  douyinName?: string; // 顺便把名字传过去，方便后端创建新玩家
  avatarUrl?: string; // 头像路径
}


// 3. 接收：服务器返回的统一格式
export interface PlayerRankResponse {
  douyinUserId: string;
  playerId: string;
  rankPoints: number;
  tierPoints:number;
  rank: number; // 排名
  tier:string //名字
  success: boolean;
}

// 每一个玩家的结算项
export interface PlayerSummaryItem {
  douyinUserId: string;
  rankPoints: number; // 本局增量
  tierPoints: number; // 魔兽传来的最新总分
  kills: number;      // 本局增量
}

// 整个结算请求的 Payload
export interface GameSummaryRequest {
  gameTypeId: string;
  players: PlayerSummaryItem[];
}

// 后端返回的结果
export interface GameSummaryResponse {
  success: boolean;
  message?: string;
  processed?: number;
}
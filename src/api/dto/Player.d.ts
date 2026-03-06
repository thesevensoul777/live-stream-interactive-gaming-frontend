
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
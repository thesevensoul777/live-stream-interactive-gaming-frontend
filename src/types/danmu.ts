export interface DanmuCommandDTO {
  realId?: string;
  user: string;
  content: string;
  time?: number;
  command?: string;
  avatar?: string;
  rankPoints?: number; // 新增：存储分数
  tierPoints?: number; // 新增：段位分数
  tier?:string //d段位名称
}

export interface GifddDTO {
  realId?: string;
  user: string;
  time?: number;
   command?: string;
  giftId?: string;
  avatar?: string;
  count?:string|number|undefined;
}

export interface LikeDTO {
  realId?: string;
  user: string;
  time?: number;
  likeCount?: string;
  command?: string;
  avatar?: string;
}

export {};
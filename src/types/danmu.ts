export interface DanmuCommandDTO {
  realId?: string;
  user: string;
  content: string;
  time?: number;
  command?: string;
  avatar?: string;
}

export interface GifddDTO {
  realId?: string;
  user: string;
  time?: number;
  giftId?: string;
  avatar?: string;
}

export interface LikeDTO {
  realId?: string;
  user: string;
  time?: number;
  likeCount?: string;
  avatar?: string;
}

export {};
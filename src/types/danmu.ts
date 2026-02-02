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
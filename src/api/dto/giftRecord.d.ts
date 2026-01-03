export interface GiftRecordRequest {
  id?: string;
  name?: string;
  // 抖音币 diamond_count
  price?: number;
  type?: number;
  // 描述
  desc?: string;
  // 图片
  icon?: string;
  // 数量 repeat_count | combo_count
  count?: number | string;
  // 礼物消息可能重复发送，0 表示第一次，未重复
  repeatEnd?: number;
  //发送人ID
  senderId?:string;
   //发送人的姓名
  senderName?:string;
  //游戏类型
  gameTypeId: string

}



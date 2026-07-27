import api from './index';
import type { LiveRoomResponse } from './dto/LiveRoom';

type RoomIdFields = keyof Pick<LiveRoomResponse, 'douyinRoomId' | 'bilibiliRoomId' | 'tikTokRoomId'>;

export const getLiveRoomApi = () =>
  api.get<LiveRoomResponse>('/live-room');

export const updateLiveRoomApi = (data: Partial<Pick<LiveRoomResponse, RoomIdFields>>) =>
  api.put<LiveRoomResponse>('/live-room', data);

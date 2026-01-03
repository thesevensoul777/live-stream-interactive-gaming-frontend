import api from './index'
import type { GiftRecordRequest } from '@/api/dto/giftRecord'

export const pushGiftApi = (data: GiftRecordRequest) => {
  return api.post('/gift/record', data)
}
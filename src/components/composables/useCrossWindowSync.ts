import { onMounted, onUnmounted } from 'vue';
import { SyncChannelType } from '@/constants/syncChannels';

export function useCrossWindowSync(channel: SyncChannelType, callback?: (data: any) => void) {
  // --- 1. 发送逻辑 ---
  const sync = (data: any) => {

        
 //   if ((window as any).electronAPI && (window as any).electronAPI.sendData) {
      // 统一走主进程的 sync-to-overlay 中转频道
      // 我们把真正的子频道 (channel) 包装在数据里
      (window as any).electronAPI.sendData('sync-to-overlay', {
        subChannel: channel,
        payload: data
      });

//   }
  };

  // --- 2. 接收逻辑 ---
  onMounted(() => {
    if (callback && (window as any).electronAPI && (window as any).electronAPI.onReceiveData) {
      // 监听主进程分发的总线
      (window as any).electronAPI.onReceiveData('global-sync-bus', (wrapper: any) => {
        // 只有子频道匹配时，才执行回调
        if (wrapper.subChannel === channel) {
          callback(wrapper.payload);
        }
      });
    }
  });

  return { sync };
}
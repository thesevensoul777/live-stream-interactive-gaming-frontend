import { contextBridge, ipcRenderer } from 'electron';

// 定义一个可安全传递的类型
export interface DanmuCommandDTO {
  id: string;
  user: string;
  content: string;
  time: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 发送一个命令到主进程
   * @param msg 可序列化的弹幕对象
   * @param action 动作字符串
   */
  addCommand: (msg: DanmuCommandDTO, action: string) =>
    ipcRenderer.invoke('add-command', { msg, action }),

  /**
   * 获取所有已保存的命令
   */
  getCommands: () =>
    ipcRenderer.invoke('get-commands') as Promise<
      { msg: DanmuCommandDTO; action: string; time: number }[]
    >,
});

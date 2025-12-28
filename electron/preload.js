import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 发送一个命令到主进程
   * @param msg 可序列化的弹幕对象
   * @param action 动作字符串
   */
  addCommand: (msg, action) =>
    ipcRenderer.invoke('add-command', { msg, action }),

  /**
   * 获取所有已保存的命令
   */
  getCommands: () =>
    ipcRenderer.invoke('get-commands'),
});

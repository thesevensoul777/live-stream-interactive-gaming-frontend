// 告诉 TS 这是一个模块，不污染全局
export {};

declare global {
  interface Window {
    electronAPI: {
      /**
       * 发送一个命令给主进程
       * @param msg 可安全序列化的弹幕数据
       * @param action 指令动作字符串
       */
      addCommand: (
        msg: {
          id: string;
          user: string;
          content: string;
          time: number;
        },
        action: string
      ) => Promise<void>;

      /**
       * 获取所有已保存的命令
       */
      getCommands: () => Promise<
        {
          msg: {
            id: string;
            user: string;
            content: string;
            time: number;
          };
          action: string;
          time: number;
        }[]
      >;
    };
  }
}

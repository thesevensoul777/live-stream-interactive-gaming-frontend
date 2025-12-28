import { ipcMain } from 'electron';
import { saveCommand } from './war3.js';

export function registerIpcHandlers(win) {
  ipcMain.handle('add-command', (event, payload) => {
    saveCommand(payload);
    return true;
  });

  ipcMain.on('maximize-window', () => {
    if (win) {
      win.setBounds({ x: 100, y: 100, width: 1300, height: 1000 });
    }
  });
}

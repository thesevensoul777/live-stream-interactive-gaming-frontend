import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取 __dirname（ESM 下没有默认 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(port = 5174) {
  const app = express();

  // 静态文件（Vite build 后的 dist）
  app.use(express.static(path.join(__dirname, '../dist')));

  // SPA fallback
  app.get(/^(?!\/assets\/).*/, (_, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log('[server] running at http://127.0.0.1:' + port);
      resolve(server);
    });
    server.on('error', reject);
  });
}

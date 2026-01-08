import { net, session } from 'electron';
 class NetworkService {
  constructor() {
    this.ttwid = '';
    this.ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  // 获取最新的 ttwid
  async refreshTtwid() {
    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url: 'https://live.douyin.com',
        headers: { 'User-Agent': this.ua }
      });
      request.on('response', (res) => {
        const cookies = res.headers['set-cookie'] || [];
        const ttwidCookie = cookies.find(c => c.includes('ttwid='));
        this.ttwid = ttwidCookie ? ttwidCookie.split(';')[0] : '';
        resolve(this.ttwid);
      });
      request.on('error', () => resolve(null));
      request.end();
    });
  }

  // 注入拦截器
  setupInterceptor() {
    session.defaultSession.setUserAgent(this.ua);
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.douyin.com/*', 'wss://*.douyin.com/*'] },
      (details, callback) => {
        details.requestHeaders['Origin'] = 'https://live.douyin.com';
        details.requestHeaders['Referer'] = 'https://live.douyin.com/';
        if (this.ttwid && !details.requestHeaders['Cookie']?.includes('ttwid=')) {
          const cur = details.requestHeaders['Cookie'] || '';
          details.requestHeaders['Cookie'] = cur ? `${cur}; ${this.ttwid}` : this.ttwid;
        }
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }
}
// 使用这种显式导出方式
export { NetworkService };
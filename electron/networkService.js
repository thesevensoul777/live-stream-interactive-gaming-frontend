import { net, session } from 'electron';

function mergeCookieStrings(...cookieStrings) {
  const cookieMap = new Map();

  for (const cookieString of cookieStrings) {
    if (!cookieString) continue;
    for (const part of cookieString.split(';')) {
      const item = part.trim();
      if (!item) continue;
      const separator = item.indexOf('=');
      if (separator <= 0) continue;
      cookieMap.set(item.slice(0, separator).trim(), item.slice(separator + 1).trim());
    }
  }

  return Array.from(cookieMap, ([name, value]) => `${name}=${value}`).join('; ');
}

class NetworkService {
  constructor() {
    this.ttwid = '';
    this.douyinCookieString = '';
    this.ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Store the active Douyin session cookies (called after login/restore).
   * @param {Array<{name: string, value: string}>} cookies
   */
  setDouyinCookies(cookies) {
    if (!Array.isArray(cookies) || !cookies.length) return;
    const ttwidCookie = cookies.find((c) => c.name === 'ttwid');
    this.ttwid = ttwidCookie?.value || '';
    this.douyinCookieString = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    console.log('[NetworkService] Douyin cookies updated.');
  }

  getDouyinCookieString() {
    return this.douyinCookieString;
  }

  clearDouyinCookies() {
    this.ttwid = '';
    this.douyinCookieString = '';
  }

  // Fetch the latest ttwid from Douyin live page
  async refreshTtwid() {
    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url: 'https://live.douyin.com',
        headers: { 'User-Agent': this.ua }
      });
      request.on('response', (res) => {
        const cookies = res.headers['set-cookie'] || [];
        const ttwidCookie = cookies.find((c) => c.includes('ttwid='));
        this.ttwid = ttwidCookie ? ttwidCookie.split(';')[0].replace('ttwid=', '') : '';
        if (this.ttwid && !this.douyinCookieString.includes('ttwid=')) {
          this.douyinCookieString = this.douyinCookieString
            ? `${this.douyinCookieString}; ttwid=${this.ttwid}`
            : `ttwid=${this.ttwid}`;
        }
        resolve(this.ttwid);
      });
      request.on('error', () => resolve(null));
      request.end();
    });
  }

  // Inject Douyin cookies into every Douyin request made through the default session
  setupInterceptor() {
    session.defaultSession.setUserAgent(this.ua);
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.douyin.com/*', 'wss://*.douyin.com/*'] },
      (details, callback) => {
        details.requestHeaders['Origin'] = 'https://live.douyin.com';
        details.requestHeaders['Referer'] = 'https://live.douyin.com/';
        const current = details.requestHeaders['Cookie'] || '';
        const fallbackCookies = this.ttwid ? `ttwid=${this.ttwid}` : '';
        details.requestHeaders['Cookie'] = mergeCookieStrings(
          current,
          fallbackCookies,
          this.douyinCookieString,
        );
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }
}

export { NetworkService };

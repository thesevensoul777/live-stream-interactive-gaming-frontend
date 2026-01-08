export class Tools {
  encodeValue(str) {
    return String(str)
      // 移除 Emoji / 非 BMP
      .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
      // 移除控制字符
      .replace(/[\x00-\x1F\x7F]/g, '')
      // 保留安全字符
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.\-_,]/g, '')
      .trim();
  }
}




export class tools {

    encodeValue(str) {
        return String(str)
            // 1️⃣ 移除所有 Emoji / 非 BMP 字符
            .replace(/[\u{10000}-\u{10FFFF}]/gu, '')

            // 2️⃣ 移除其他不可见 / 控制字符
            .replace(/[\x00-\x1F\x7F]/g, '')

            // 3️⃣ 移除特殊符号（包括 ✪ 等）
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.\-_,]/g, '');
            // 保留：中文、英文、数字、空格、点、逗号、下划线、破折号
    }

}

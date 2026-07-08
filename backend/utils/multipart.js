// ============================================================
// 共享 multipart/form-data 解析工具 + 文件验证
// 统一替代各路由中重复的解析逻辑
// ============================================================

const path = require('path');

const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

const MAGIC_NUMBERS = {
  '.png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
  '.jpg': Buffer.from([0xFF, 0xD8, 0xFF]),
  '.jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
  '.gif': Buffer.from([0x47, 0x49, 0x46]),
  '.webp': Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

/**
 * 校验文件魔术数字（文件签名）
 * @param {Buffer} fileData - 文件原始二进制数据
 * @param {string} ext - 文件扩展名（含点号，如 '.png'）
 * @returns {boolean} 魔术数字是否匹配
 */
function validateMagicBytes(fileData, ext) {
  const normalizedExt = ext.toLowerCase();
  const expected = MAGIC_NUMBERS[normalizedExt];
  if (!expected) return false;
  if (!fileData || fileData.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (fileData[i] !== expected[i]) return false;
  }
  return true;
}

/**
 * 校验文件扩展名是否允许
 * @param {string} filename - 原始文件名
 * @returns {{ ext: string, valid: boolean }} 扩展名和是否合法
 */
function validateExtension(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return { ext, valid: ALLOWED_IMAGE_EXTENSIONS.includes(ext) };
}

/**
 * 统一的 multipart/form-data Buffer 解析器
 * 使用纯 Buffer 操作，安全处理二进制数据
 *
 * @param {Buffer} buffer - 完整请求体
 * @param {string} boundary - multipart boundary 字符串
 * @returns {{ fields: Object<string, string>, files: Object<string, { filename: string, data: Buffer, ext: string } > }}
 */
function parseMultipart(buffer, boundary) {
  const result = { fields: {}, files: {} };
  const boundaryBuf = Buffer.from('--' + boundary);
  const crlfcrlf = Buffer.from('\r\n\r\n');
  const crlf = Buffer.from('\r\n');

  let pos = 0;
  while (pos < buffer.length) {
    const boundaryStart = buffer.indexOf(boundaryBuf, pos);
    if (boundaryStart === -1) break;
    pos = boundaryStart + boundaryBuf.length;

    // 结束边界 --boundary--
    if (pos < buffer.length && buffer[pos] === 0x2D && buffer[pos + 1] === 0x2D) break;

    // 跳过 boundary 后的 \r\n
    if (pos + 1 < buffer.length && buffer[pos] === 0x0D && buffer[pos + 1] === 0x0A) {
      pos += 2;
    }

    // 找 header 结束位置 \r\n\r\n
    const headerEnd = buffer.indexOf(crlfcrlf, pos);
    if (headerEnd === -1) break;

    const header = buffer.slice(pos, headerEnd).toString('utf-8');
    const dataStart = headerEnd + 4;

    // 找下一个 boundary 作为数据结束位置（减去前面的 \r\n）
    const nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
    if (nextBoundary === -1) break;
    const dataEnd = nextBoundary - 2; // 减去 \r\n
    if (dataEnd < dataStart) { pos = nextBoundary; continue; }

    const data = buffer.slice(dataStart, dataEnd);

    const nameMatch = header.match(/name="([^"]+)"/);
    const filenameMatch = header.match(/filename="([^"]+)"/);

    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        const ext = path.extname(filenameMatch[1]).toLowerCase();
        result.files[name] = { filename: filenameMatch[1], data, ext };
      } else {
        result.fields[name] = data.toString('utf-8').trim();
      }
    }

    pos = nextBoundary;
  }

  return result;
}

/**
 * 从请求流中收集 body 为 Buffer（带大小限制）
 * @param {import('http').IncomingMessage} req
 * @param {number} maxSize - 最大字节数
 * @returns {Promise<Buffer>}
 */
function collectBody(req, maxSize) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        reject(new Error('请求体过大'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = {
  ALLOWED_IMAGE_EXTENSIONS,
  MAGIC_NUMBERS,
  validateMagicBytes,
  validateExtension,
  parseMultipart,
  collectBody,
};

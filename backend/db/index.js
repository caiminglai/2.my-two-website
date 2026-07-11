const { Client } = require('pg');
const deasync = require('deasync');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const pgConfig = {
  user: 'postgres',
  password: process.env.PG_PASSWORD || 'MAliang@911023',
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'match_db'
};

let client = null;
let connecting = false;

// 异步初始化连接（在 server.js 启动时调用）
async function initConnection() {
  if (client) return;
  connecting = true;
  client = new Client(pgConfig);
  client.on('end', () => { client = null; });
  client.on('error', () => { client = null; });
  await client.connect();
  connecting = false;
}

function getClient() {
  if (!client && !connecting) {
    // 首次同步连接（兼容旧代码，但推荐在启动时调用 initConnection）
    client = new Client(pgConfig);
    client.on('end', () => { client = null; });
    client.on('error', () => { client = null; });
    const connectSync = deasync(client.connect.bind(client));
    connectSync();
  }
  return client;
}

// 断线重置
function resetClient() {
  client = null;
}

function prepare(sql) {
  function runQuery(method, ...params) {
    let pgClient = getClient();
    try {
      const querySync = deasync(pgClient.query.bind(pgClient));
      const result = querySync(sql, params);
      return result;
    } catch (e) {
      // 连接断开，重置后重试一次
      if (e.message && (e.message.includes('Connection terminated') || e.message.includes('Connection ended'))) {
        resetClient();
        pgClient = getClient();
        const querySync = deasync(pgClient.query.bind(pgClient));
        const result = querySync(sql, params);
        return result;
      }
      throw e;
    }
  }
  return {
    get: (...params) => {
      const result = runQuery('get', ...params);
      return result.rows.length > 0 ? result.rows[0] : null;
    },
    all: (...params) => {
      const result = runQuery('all', ...params);
      return result.rows;
    },
    run: (...params) => {
      const result = runQuery('run', ...params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0] && result.rows[0].id
      };
    },
    exec: () => {
      runQuery('exec');
    }
  };
}

function exec(sql) {
  const pgClient = getClient();
  const querySync = deasync(pgClient.query.bind(pgClient));
  querySync(sql);
}

function getDb() {
  return {
    prepare,
    exec,
    transaction: (fn) => {
      const pgClient = getClient();
      const querySync = deasync(pgClient.query.bind(pgClient));
      querySync('BEGIN');
      try {
        const result = fn();
        querySync('COMMIT');
        return result;
      } catch (e) {
        querySync('ROLLBACK');
        throw e;
      }
    }
  };
}

function closeDb() {
  if (client) {
    const endSync = deasync(client.end.bind(client));
    endSync();
    client = null;
  }
}

const _isProd = process.env.NODE_ENV === 'production';
const TOKEN_SECRET = process.env.TOKEN_SECRET || (
  _isProd
    ? (() => { throw new Error('生产环境必须设置 TOKEN_SECRET 环境变量'); })()
    : crypto.createHash('sha256').update('dev-only-' + crypto.randomBytes(16).toString('hex')).digest('hex')
);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (
  _isProd
    ? (() => { throw new Error('生产环境必须设置 ENCRYPTION_KEY 环境变量'); })()
    : crypto.createHash('sha256').update('dev-only-' + crypto.randomBytes(16).toString('hex')).digest()
);
const IV_LENGTH = 16;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  if (!hash) return false;
  try {
    if (hash.length === 64 && !hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
      const computed = crypto.createHash('sha256').update(password).digest('hex');
          const a = Buffer.from(computed, 'utf8');
          const b = Buffer.from(hash, 'utf8');
          return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

function hashPasswordSync(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPasswordSync(password, hash) {
  if (!hash) return false;
  try {
    if (hash.length === 64 && !hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
      const computed = crypto.createHash('sha256').update(password).digest('hex');
          const a = Buffer.from(computed, 'utf8');
          const b = Buffer.from(hash, 'utf8');
          return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}

function generateToken(userId, role = 'user') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const payload = `${userId}:${timestamp}:${random}:${role}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
  const data = `${payload}:${signature}`;
  return Buffer.from(data).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 4) return null;
    const signature = parts.pop();
    const payload = parts.join(':');
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
    if (signature !== expectedSig) return null;
    const [userId, timestamp] = payload.split(':');
    if (Date.now() - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) return null;
    return userId;
  } catch {
    return null;
  }
}

function generateAdminToken(username) {
  return generateToken(username, 'admin');
}

function verifyAdminToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 5) return null;
    const signature = parts.pop();
    const payload = parts.join(':');
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
    if (signature !== expectedSig) return null;
    const [username, timestamp, , role] = payload.split(':');
    if (role !== 'admin') return null;
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) return null;
    return username;
  } catch {
    return null;
  }
}

module.exports = {
  getDb,
  initConnection,
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
  encrypt,
  decrypt,
  generateToken,
  verifyToken,
  generateAdminToken,
  verifyAdminToken,
  closeDb
};
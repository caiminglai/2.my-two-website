// ============================================================
// 数据访问层 - 数据库连接入口（纯 SQL，无业务逻辑）
// 职责：初始化数据库连接、表结构、提供通用数据库实例
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// 数据库路径（data/ 目录下，与部署分离）
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'match.db');

let db = null;

// 获取数据库实例（懒加载 + 单例）
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('encoding = "UTF-8"');
    initTables();
  }
  return db;
}

// 初始化表结构（仅包含 CREATE TABLE 和 ALTER TABLE）
function initTables() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      created_at INTEGER NOT NULL,
      last_login INTEGER
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      deposit INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      name TEXT,
      gender TEXT,
      age TEXT,
      height TEXT,
      weight TEXT,
      skin_tone TEXT,
      zodiac TEXT,
      blood_type TEXT,
      city TEXT,
      marriage TEXT,
      children TEXT,
      education TEXT,
      job TEXT,
      income TEXT,
      house TEXT,
      car TEXT,
      face_type TEXT,
      eye_type TEXT,
      mouth_type TEXT,
      body_type TEXT,
      hobbies TEXT,
      food TEXT,
      sport TEXT,
      music TEXT,
      smoke TEXT,
      drink TEXT,
      religion TEXT,
      pet TEXT,
      personality TEXT,
      expectation TEXT,
      contact TEXT,
      interest_tags TEXT,
      purpose TEXT,
      extra_data TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES auth_users(id)
    )
  `);

  try { database.exec('ALTER TABLE users ADD COLUMN status TEXT DEFAULT \'pending\''); } catch (e) {}
  try { database.exec('ALTER TABLE users ADD COLUMN interest_tags TEXT'); } catch (e) {}
  try { database.exec('ALTER TABLE users ADD COLUMN purpose TEXT'); } catch (e) {}
  try { database.exec('ALTER TABLE users ADD COLUMN avatar TEXT'); } catch (e) {}

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rater_id TEXT NOT NULL,
      rated_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (rater_id) REFERENCES users(id),
      FOREIGN KEY (rated_id) REFERENCES users(id),
      UNIQUE(rater_id, rated_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id TEXT NOT NULL,
      reported_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      description TEXT,
      proof_path TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      admin_note TEXT,
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (reported_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS contact_unlocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      viewer_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      unlocked_at INTEGER,
      admin_note TEXT,
      proof_path TEXT,
      method TEXT DEFAULT 'manual',
      amount REAL DEFAULT 9.9,
      UNIQUE(viewer_id, target_id)
    )
  `);

  database.exec('CREATE INDEX IF NOT EXISTS idx_contact_unlocks_viewer ON contact_unlocks(viewer_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target ON contact_unlocks(target_id)');

  try { database.exec('ALTER TABLE contact_unlocks ADD COLUMN proof_path TEXT'); } catch (e) {}
  try { database.exec('ALTER TABLE contact_unlocks ADD COLUMN method TEXT DEFAULT \'manual\''); } catch (e) {}
  try { database.exec('ALTER TABLE contact_unlocks ADD COLUMN amount REAL DEFAULT 9.9'); } catch (e) {}

  try { database.exec('ALTER TABLE user_reports ADD COLUMN proof_path TEXT'); } catch (e) {}

  database.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      proof_path TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      approved_at TEXT,
      admin_note TEXT,
      FOREIGN KEY (user_id) REFERENCES auth_users(id)
    )
  `);

  database.exec('CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status)');

  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      paid_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES auth_users(id)
    )
  `);

  database.exec('CREATE INDEX IF NOT EXISTS idx_payment_orders_order ON payment_orders(order_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status)');

  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      FOREIGN KEY (from_user_id) REFERENCES auth_users(id),
      FOREIGN KEY (to_user_id) REFERENCES auth_users(id)
    )
  `);

  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)');

  // 迁移：如果 messages 表的外键指向 users，则重建为指向 auth_users
  try {
    const fkList = database.prepare("PRAGMA foreign_key_list(messages)").all();
    const hasWrongFk = fkList.some(fk => fk.table === 'users');
    if (hasWrongFk) {
      try {
        database.exec(`
          CREATE TABLE messages_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            created_at INTEGER NOT NULL,
            read_at INTEGER,
            FOREIGN KEY (from_user_id) REFERENCES auth_users(id),
            FOREIGN KEY (to_user_id) REFERENCES auth_users(id)
          );
          INSERT INTO messages_new (id, from_user_id, to_user_id, content, status, created_at, read_at)
            SELECT id, from_user_id, to_user_id, content, status, created_at, read_at FROM messages;
          DROP TABLE messages;
          ALTER TABLE messages_new RENAME TO messages;
        `);
      } catch (copyErr) {
        // 旧数据无法迁移时直接清空重建
        database.exec('DROP TABLE IF EXISTS messages');
        database.exec(`
          CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            created_at INTEGER NOT NULL,
            read_at INTEGER,
            FOREIGN KEY (from_user_id) REFERENCES auth_users(id),
            FOREIGN KEY (to_user_id) REFERENCES auth_users(id)
          )
        `);
      }
    }
  } catch (e) {
    // 忽略迁移失败，避免启动崩溃
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS custom_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_key TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT DEFAULT 'text',
      field_options TEXT,
      description TEXT,
      use_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )
  `);

  try {
    const cols = database.prepare('PRAGMA table_info(custom_filters)').all();
    const hasOptions = cols.some(c => c.name === 'field_options');
    if (!hasOptions) {
      database.exec('ALTER TABLE custom_filters ADD COLUMN field_options TEXT');
    }
  } catch (e) {}

  database.exec('CREATE INDEX IF NOT EXISTS idx_custom_filters_key ON custom_filters(field_key)');

  try {
    const existingRows = database.prepare('SELECT field_key FROM custom_filters').all();
    const existingKeys = new Set(existingRows.map(r => r.field_key));
    const defaultFields = [
      ['genshin', '原神角色', 'select', '火神,水神,草神,雷神,冰神,岩神,风神', '原神游戏角色喜好'],
      ['anime_char', '动漫角色', 'select', '名侦探柯南,火影忍者,海贼王,鬼灭之刃,JOJO,进击的巨人,灌篮高手,龙珠,咒术回战,葬送的芙莉莲', '喜爱的动漫角色类型'],
      ['cosplay', 'cosplay爱好', 'select', '汉服,洛丽塔,JK,古风,二次元,游戏cos,动漫cos', 'cosplay相关爱好'],
      ['photography', '摄影风格', 'select', '人像摄影,风光摄影,街拍,胶片摄影,静物摄影,微距摄影', '摄影相关偏好'],
      ['mbti', 'MBTI性格', 'select', 'INTJ,INTP,ENTJ,ENTP,INFJ,INFP,ENFJ,ENFP,ISTJ,ISFJ,ESTJ,ESFJ,ISTP,ISFP,ESTP,ESFP', 'MBTI 16型人格'],
    ];
    const insert = database.prepare('INSERT INTO custom_filters (field_key, field_label, field_type, field_options, description, use_count, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)');
    const now = Date.now();
    for (const f of defaultFields) {
      if (!existingKeys.has(f[0])) {
        try { insert.run(f[0], f[1], f[2], f[3], f[4], now); } catch (e) {}
      }
    }
  } catch (e) {}

  database.exec('CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_age ON users(age)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)');
  try { database.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)'); } catch (e) {}
}

// ========== Token 与加密工具（纯函数，无状态变更） ==========

const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.createHash('sha256').update('match-platform-secret-key-' + (process.env.ADMIN_PASSWORD || 'default')).digest('hex');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update('contact-encryption-key-' + (process.env.ADMIN_PASSWORD || 'default')).digest();
const IV_LENGTH = 16;

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
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
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
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
    // 兼容旧版 4 段 token（无 role）和新版 5 段 token
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

// ========== 数据库备份工具 ==========

function backupDatabase() {
  const database = getDb();
  const backupPath = path.join(__dirname, '..', '..', 'data', 'backups', 'backup_' + Date.now() + '.db');
  if (!fs.existsSync(path.join(__dirname, '..', '..', 'data', 'backups'))) {
    fs.mkdirSync(path.join(__dirname, '..', '..', 'data', 'backups'), { recursive: true });
  }
  database.backup(backupPath);
  return backupPath;
}

function getBackupList() {
  const backupsDir = path.join(__dirname, '..', '..', 'data', 'backups');
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupsDir, f),
      time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
}

function restoreFromBackup(backupPath) {
  if (!fs.existsSync(backupPath)) return false;
  const database = getDb();
  database.close();
  fs.copyFileSync(backupPath, DB_PATH);
  db = null;
  getDb();
  return true;
}

module.exports = {
  getDb,
  hashPassword,
  encrypt,
  decrypt,
  generateToken,
  verifyToken,
  generateAdminToken,
  verifyAdminToken,
  backupDatabase,
  getBackupList,
  restoreFromBackup,
  DB_PATH
};

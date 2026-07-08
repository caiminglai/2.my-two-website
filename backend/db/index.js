// ============================================================
// 数据访问层 - 数据库连接入口（纯 SQL，无业务逻辑）
// 职责：初始化数据库连接、表结构、提供通用数据库实例
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

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

  // 私信功能已移除，不再创建 messages 表

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

  // ========== 用户自定义字段键值表（EAV 模式） ==========
  // 固定列（users 表 30+ 列）覆盖常见维度，用户自创的新字段存此表
  // 搜索时固定列与键值表 JOIN 合并，对用户透明

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES auth_users(id)
    )
  `);

  database.exec('CREATE INDEX IF NOT EXISTS idx_ucf_user ON user_custom_fields(user_id)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_ucf_key ON user_custom_fields(field_key)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_ucf_value ON user_custom_fields(field_value)');
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ucf_user_key ON user_custom_fields(user_id, field_key)');

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

  // ========== 字段中文映射表 ==========
  // 统一管理所有字段的中文标签、分类、类型、选项，作为前后端唯一数据源
  database.exec(`
    CREATE TABLE IF NOT EXISTS field_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_key TEXT UNIQUE NOT NULL,
      field_label TEXT NOT NULL,
      field_category TEXT,
      field_type TEXT DEFAULT 'text',
      field_options TEXT,
      field_order INTEGER DEFAULT 0,
      is_filterable INTEGER DEFAULT 1,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )
  `);
  database.exec('CREATE INDEX IF NOT EXISTS idx_fm_category ON field_mappings(field_category)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_fm_order ON field_mappings(field_order)');

  // 填充映射数据（仅首次创建时写入，已存在的字段不覆盖）
  try {
    const existingKeys = new Set(
      database.prepare('SELECT field_key FROM field_mappings').all().map(r => r.field_key)
    );
    const now = Date.now();
    const insertMapping = database.prepare(
      `INSERT INTO field_mappings (field_key, field_label, field_category, field_type, field_options, field_order, is_filterable, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // 字段定义：[key, label, category, type, options, order, filterable, description]
    const mappings = [
      // ===== 基本信息 =====
      ['purpose', '目的', '基本', 'select', '相亲交友,拓展圈子,兴趣交流,运动伙伴,学习搭子,同城活动,寻找知己,人生伴侣,恋爱结婚,先交朋友,找个伴,同城约会,周末玩伴,一起旅行,一起运动,一起学习,一起吃饭,一起看电影,一起打游戏,一起健身', 1, 1, '交友目的'],
      ['name', '昵称', '基本', 'text', null, 2, 1, '用户昵称'],
      ['gender', '性别', '基本', 'select', '男,女', 3, 1, '性别'],
      ['age', '年龄', '基本', 'text', null, 4, 1, '年龄（支持范围筛选如25-30）'],
      ['height', '身高', '基本', 'text', null, 5, 1, '身高(cm)'],
      ['weight', '体重', '基本', 'text', null, 6, 1, '体重(kg)'],
      ['city', '城市', '基本', 'select', '北京,上海,广州,深圳,杭州,成都,武汉,南京,西安,重庆,苏州,郑州,长沙,青岛,沈阳,宁波,东莞,无锡,合肥,佛山,大连,福州,厦门,哈尔滨,济南,昆明,温州,石家庄,长春,常州', 7, 1, '所在城市'],
      // ===== 外貌特征 =====
      ['skinTone', '肤色', '外貌', 'select', '白皙,偏白,自然,小麦色,偏黑,健康色', 10, 1, '肤色'],
      ['faceType', '脸型', '外貌', 'select', '圆脸,方脸,瓜子脸,鹅蛋脸,长脸,菱形脸,三角脸', 11, 1, '脸型'],
      ['eyeType', '眼型', '外貌', 'select', '杏眼,桃花眼,丹凤眼,圆眼,细长眼,下垂眼,单眼皮,双眼皮', 12, 1, '眼型'],
      ['mouthType', '嘴型', '外貌', 'select', '樱桃嘴,薄唇,厚唇,微笑唇,嘟嘟唇', 13, 1, '嘴型'],
      ['bodyType', '身材', '外貌', 'select', '纤细,匀称,丰满,健硕,偏瘦,偏胖,运动型', 14, 1, '身材类型'],
      // ===== 个人属性 =====
      ['zodiac', '星座', '属性', 'select', '白羊座,金牛座,双子座,巨蟹座,狮子座,处女座,天秤座,天蝎座,射手座,摩羯座,水瓶座,双鱼座', 20, 1, '星座'],
      ['bloodType', '血型', '属性', 'select', 'A型,B型,AB型,O型', 21, 1, '血型'],
      ['marriage', '婚姻', '属性', 'select', '未婚,离异,丧偶', 22, 1, '婚姻状况'],
      ['children', '子女', '属性', 'select', '无,1个,2个,2个以上', 23, 1, '子女情况'],
      ['education', '学历', '属性', 'select', '初中,高中,专科,本科,硕士,博士', 24, 1, '最高学历'],
      ['job', '职业', '属性', 'text', null, 25, 1, '职业'],
      ['income', '收入', '属性', 'select', '5万以下,5-10万,10-20万,20-30万,30-50万,50万以上', 26, 1, '年收入'],
      ['house', '住房', '属性', 'select', '无房,租房,与父母同住,有房(贷款),有房(全款)', 27, 1, '住房情况'],
      ['car', '购车', '属性', 'select', '无车,有车(贷款),有车(全款)', 28, 1, '购车情况'],
      // ===== 个性特征 =====
      ['personality', '性格', '个性', 'select', '温柔,开朗,内向,幽默,沉稳,活泼,直爽,细腻,独立,随和', 30, 1, '性格特点'],
      ['smoke', '吸烟', '个性', 'select', '否,偶尔,经常', 31, 1, '吸烟习惯'],
      ['drink', '饮酒', '个性', 'select', '否,偶尔,经常', 32, 1, '饮酒习惯'],
      ['religion', '宗教信仰', '个性', 'select', '无,佛教,基督教,伊斯兰教,道教,其他', 33, 1, '宗教信仰'],
      ['pet', '宠物', '个性', 'select', '无,猫,狗,鱼,鸟,仓鼠,其他', 34, 1, '宠物偏好'],
      // ===== 兴趣爱好 =====
      ['hobbies', '兴趣爱好', '兴趣', 'tags', '动漫,游戏,看书,摄影,旅行,美食,电影,音乐,绘画,书法,手工,DIY,收藏,烹饪,烘焙,园艺,宠物,钓鱼,露营,徒步,桌游,剧本杀,K歌,跳舞,乐器,天文,科技,编程,投资,理财', 40, 1, '兴趣爱好（可多选）'],
      ['food', '美食偏好', '兴趣', 'tags', '火锅,烧烤,川菜,粤菜,日料,西餐,韩餐,甜品,小吃,海鲜,面食,湘菜,东北菜,江浙菜,西北菜,素食,快餐,下午茶,咖啡,奶茶', 41, 1, '美食偏好（可多选）'],
      ['sport', '运动爱好', '兴趣', 'tags', '跑步,游泳,篮球,足球,羽毛球,乒乓球,网球,瑜伽,健身,骑行,登山,滑雪,冲浪,潜水,高尔夫,保龄球,攀岩,击剑,拳击,武术', 42, 1, '运动爱好（可多选）'],
      ['music', '音乐偏好', '兴趣', 'tags', '流行,摇滚,民谣,古典,爵士,电子,R&B,嘻哈,古风,轻音乐,重金属,朋克,蓝调,乡村,拉丁,世界音乐,纯音乐,影视原声,动漫音乐,说唱', 43, 1, '音乐偏好（可多选）'],
      ['interestTags', '兴趣标签', '兴趣', 'tags', '动漫,游戏,看书,摄影,旅行,美食,电影,音乐,绘画,书法,手工,DIY,收藏,烹饪,烘焙,园艺,宠物,钓鱼,露营,徒步,桌游,剧本杀,K歌,跳舞,乐器,天文,科技,编程,投资,理财,跑步,游泳,篮球,足球,羽毛球,乒乓球,网球,瑜伽,健身,骑行,登山,滑雪,冲浪,潜水,高尔夫,保龄球,攀岩,击剑,拳击,武术', 44, 1, '兴趣标签（可多选）'],
      // ===== 其他 =====
      ['expectation', '期望', '其他', 'text', null, 50, 1, '对另一半的期望'],
      ['contact', '联系方式', '其他', 'text', null, 51, 0, '联系方式（不参与筛选）'],
    ];
    for (const m of mappings) {
      if (!existingKeys.has(m[0])) {
        try { insertMapping.run(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], now); } catch (e) {}
      }
    }
  } catch (e) {}

  // ========== 扩展字段映射（迁移：已有数据库也能自动新增） ==========
  try {
    const existingKeys2 = new Set(
      database.prepare('SELECT field_key FROM field_mappings').all().map(r => r.field_key)
    );
    const now2 = Date.now();
    const insertMapping2 = database.prepare(
      `INSERT INTO field_mappings (field_key, field_label, field_category, field_type, field_options, field_order, is_filterable, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    // 从 custom_filters 迁移过来的字段（保留原选项）
    const migrateFromCF = [
      ['genshin', '原神角色', '兴趣', 'select', 45, 1, '原神游戏角色喜好'],
      ['anime_char', '动漫角色', '兴趣', 'select', 46, 1, '喜爱的动漫角色类型'],
      ['cosplay', 'cosplay爱好', '兴趣', 'tags', 47, 1, 'cosplay相关爱好'],
      ['photography', '摄影风格', '兴趣', 'select', 48, 1, '摄影相关偏好'],
    ];
    for (const [key, label, cat, type, order, filterable, desc] of migrateFromCF) {
      if (!existingKeys2.has(key)) {
        let options = null;
        try {
          const cf = database.prepare('SELECT field_options FROM custom_filters WHERE field_key = ?').get(key);
          if (cf) options = cf.field_options;
        } catch (e) {}
        try { insertMapping2.run(key, label, cat, type, options, order, filterable, desc, now2); } catch (e) {}
      }
    }
    // 从 custom_filters 移除已迁移的字段
    try { database.prepare("DELETE FROM custom_filters WHERE field_key IN ('genshin','anime_char','cosplay','photography')").run(); } catch (e) {}

    // 新增标准字段
    const newMappings = [
      // ===== 基本信息（补充） =====
      ['birthday', '生日', '基本', 'text', null, 8, 1, '生日（如1995-06或19950615）'],
      ['relationship_status', '感情状态', '基本', 'select', '单身,暧昧中,恋爱中,已婚,离异,丧偶,不想透露', 9, 1, '当前感情状态'],
      // ===== 外貌特征（补充） =====
      ['hairstyle', '发型', '外貌', 'select', '长发,短发,中长发,卷发,直发,马尾,丸子头,寸头,光头,其他', 15, 1, '发型偏好'],
      ['glasses', '是否戴眼镜', '外貌', 'select', '不戴,近视镜,隐形眼镜,墨镜,其他', 16, 1, '眼镜佩戴习惯'],
      // ===== 个性特征（补充） =====
      ['attachment_style', '依恋类型', '个性', 'select', '安全型,焦虑型,回避型,混乱型', 35, 1, '依恋类型'],
      ['love_language', '爱情语言', '个性', 'select', '肯定的言辞,精心的时刻,接受礼物,服务的行动,身体的接触', 36, 1, '爱情语言'],
      ['want_children', '是否想要孩子', '个性', 'select', '想要,不想要,还没想好,随缘', 37, 1, '是否想要孩子'],
      ['sleep_schedule', '作息', '个性', 'select', '早睡早起,晚睡晚起,不规律,看情况', 38, 1, '作息习惯'],
      ['social_frequency', '社交频率', '个性', 'select', '宅家派,偶尔出门,社交达人,看心情', 39, 1, '社交频率'],
      ['most_values', '最看重特质', '个性', 'select', '颜值,才华,经济条件,性格,三观,家庭背景,共同语言,幽默感', 39, 1, '最看重的特质'],
      // ===== 兴趣爱好（补充） =====
      ['game_preference', '游戏偏好', '兴趣', 'tags', '手游,端游,主机游戏,桌游,派对游戏,不玩游戏', 52, 1, '游戏偏好'],
      ['social_apps', '常用社交软件', '兴趣', 'tags', '微信,QQ,微博,小红书,抖音,B站,知乎,豆瓣,Instagram,Twitter,其他', 53, 1, '常用社交软件'],
      ['spending_habits', '消费观', '兴趣', 'select', '节俭型,理性消费,享受型,月光族,投资型', 54, 1, '消费习惯'],
      ['travel_frequency', '旅行频率', '兴趣', 'select', '经常旅行,偶尔旅行,很少旅行,宅家不出门', 55, 1, '旅行频率'],
      ['music_platform', '音乐平台', '兴趣', 'select', '网易云音乐,QQ音乐,酷狗音乐,Apple Music,Spotify,YouTube Music,其他', 56, 1, '常用音乐平台'],
      ['show_preference', '追剧偏好', '兴趣', 'tags', '国产剧,美剧,韩剧,日剧,泰剧,动漫,纪录片,综艺,电影,不怎么看', 57, 1, '追剧偏好'],
      ['reading_preference', '阅读偏好', '兴趣', 'tags', '小说,社科,科技,历史,哲学,漫画,杂志,不怎么看', 58, 1, '阅读偏好'],
    ];
    for (const m of newMappings) {
      if (!existingKeys2.has(m[0])) {
        try { insertMapping2.run(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], now2); } catch (e) {}
      }
    }
  } catch (e) {}
}

// ========== Token 与加密工具（纯函数，无状态变更） ==========

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
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
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

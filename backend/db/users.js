// ============================================================
// 数据访问层 - 用户相关（纯 SQL，无业务逻辑）
// 职责：仅负责 users 表 / auth_users 表的增删改查
// 所有函数只做一件事：执行 SQL，返回原始数据
// ============================================================

const { getDb, encrypt, decrypt } = require('./index');

// 用户表的所有字段（用于 INSERT / UPDATE 的映射）
const ALL_FIELDS = [
  'id', 'user_id', 'deposit', 'created_at', 'name', 'gender', 'age', 'height', 'weight',
  'skin_tone', 'zodiac', 'blood_type', 'city', 'marriage', 'children', 'education', 'job',
  'income', 'house', 'car', 'face_type', 'eye_type', 'mouth_type', 'body_type',
  'hobbies', 'food', 'sport', 'music', 'smoke', 'drink', 'religion', 'pet',
  'personality', 'expectation', 'contact', 'interest_tags', 'purpose', 'extra_data',
  'avatar'
];

// 将前端 JSON 对象转换为数据库行（处理加密、字段映射）
function jsonToDbRow(jsonRow) {
  const data = jsonRow.data || {};
  const extraData = {};
  for (const key of Object.keys(data)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
    if (!ALL_FIELDS.slice(4).includes(snakeKey)) {
      extraData[key] = data[key];
    }
  }
  return [
    jsonRow.id,
    jsonRow.user_id || null,
    jsonRow.deposit || 0,
    jsonRow.createdAt || Date.now(),
    data.name || '',
    data.gender || '',
    String(data.age || ''),
    String(data.height || ''),
    data.weight || '',
    data.skinTone || '',
    data.zodiac || '',
    data.bloodType || '',
    data.city || '',
    data.marriage || '',
    data.children || '',
    data.education || '',
    data.job || '',
    data.income || '',
    data.house || '',
    data.car || '',
    data.faceType || '',
    data.eyeType || '',
    data.mouthType || '',
    data.bodyType || '',
    data.hobbies || '',
    data.food || '',
    data.sport || '',
    data.music || '',
    data.smoke || '',
    data.drink || '',
    data.religion || '',
    data.pet || '',
    data.personality || '',
    data.expectation || '',
    encrypt(data.contact || ''),
    data.interestTags || '',
    data.purpose || '',
    JSON.stringify(extraData),
    data.avatar || ''
  ];
}

// 将数据库行转换为前端 JSON 对象（处理解密、字段映射）
function dbRowToJson(row) {
  if (!row) return null;
  const statusVal = typeof row.status !== 'undefined' ? row.status : 'approved';
  const extraData = row.extra_data ? JSON.parse(row.extra_data) : {};
  return {
    id: row.id,
    user_id: row.user_id,
    deposit: row.deposit,
    createdAt: row.created_at,
    status: statusVal,
    data: {
      ...extraData,
      name: row.name,
      gender: row.gender,
      age: row.age,
      height: row.height,
      weight: row.weight,
      skinTone: row.skin_tone,
      zodiac: row.zodiac,
      bloodType: row.blood_type,
      city: row.city,
      marriage: row.marriage,
      children: row.children,
      education: row.education,
      job: row.job,
      income: row.income,
      house: row.house,
      car: row.car,
      faceType: row.face_type,
      eyeType: row.eye_type,
      mouthType: row.mouth_type,
      bodyType: row.body_type,
      hobbies: row.hobbies,
      food: row.food,
      sport: row.sport,
      music: row.music,
      smoke: row.smoke,
      drink: row.drink,
      religion: row.religion,
      pet: row.pet,
      personality: row.personality,
      expectation: row.expectation,
      contact: decrypt(row.contact),
      interestTags: row.interest_tags,
      purpose: row.purpose,
      avatar: row.avatar
    }
  };
}

// ========== users 表 CRUD ==========

function getAllUsers(page = 1, limit = 20) {
  const database = getDb();
  const offset = (page - 1) * limit;
  const stmt = database.prepare(
    `SELECT ${ALL_FIELDS.join(', ')}, status FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  return stmt.all(limit, offset).map(dbRowToJson);
}

function getUserCount() {
  const database = getDb();
  return database.prepare('SELECT COUNT(*) as count FROM users').get().count;
}

function getUserById(id) {
  const database = getDb();
  const stmt = database.prepare(
    `SELECT ${ALL_FIELDS.join(', ')}, status FROM users WHERE id = ?`
  );
  const row = stmt.get(id);
  return row ? dbRowToJson(row) : null;
}

function getUsersByUserId(userId) {
  const database = getDb();
  const stmt = database.prepare(
    `SELECT ${ALL_FIELDS.join(', ')}, status FROM users WHERE user_id = ? ORDER BY created_at DESC`
  );
  return stmt.all(userId).map(dbRowToJson);
}

function addUser(jsonRow) {
  const database = getDb();
  const values = jsonToDbRow(jsonRow);
  const placeholders = ALL_FIELDS.map(() => '?').join(', ');
  const stmt = database.prepare(`INSERT INTO users (${ALL_FIELDS.join(', ')}) VALUES (${placeholders})`);
  stmt.run(...values);
  return jsonRow;
}

function updateUser(id, jsonRow) {
  const database = getDb();
  const values = jsonToDbRow({ ...jsonRow, id });
  const updateFields = ALL_FIELDS.slice(2).map(f => f + ' = ?').join(', ');
  const updateValues = values.slice(2);
  updateValues.push(id);
  const stmt = database.prepare(`UPDATE users SET ${updateFields} WHERE id = ?`);
  stmt.run(...updateValues);
  return jsonRow;
}

function deleteUser(id, ownerUserId, isAdmin = false) {
  const database = getDb();
  const user = database.prepare('SELECT user_id FROM users WHERE id = ?').get(id);
  if (!user) return false;
  if (!isAdmin) {
    if (!user.user_id) return false;
    if (user.user_id !== ownerUserId) return false;
  }
  // 清理外键关联数据
  database.prepare('DELETE FROM user_ratings WHERE rater_id = ? OR rated_id = ?').run(id, id);
  database.prepare('DELETE FROM user_reports WHERE reporter_id = ? OR reported_id = ?').run(id, id);
  database.prepare('DELETE FROM messages WHERE from_user_id = ? OR to_user_id = ?').run(id, id);
  const stmt = database.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);
  return true;
}

function batchSaveUsers(jsonRows) {
  const database = getDb();
  const placeholders = ALL_FIELDS.map(() => '?').join(', ');
  const insertStmt = database.prepare(`INSERT INTO users (${ALL_FIELDS.join(', ')}) VALUES (${placeholders})`);
  const updateFields = ALL_FIELDS.slice(2).map(f => f + ' = ?').join(', ');
  const updateStmt = database.prepare(`UPDATE users SET ${updateFields} WHERE id = ?`);

  const transaction = database.transaction(() => {
    for (const jsonRow of jsonRows) {
      if (jsonRow.id) {
        const existing = database.prepare('SELECT id FROM users WHERE id = ?').get(jsonRow.id);
        if (existing) {
          const values = jsonToDbRow({ ...jsonRow });
          const updateValues = values.slice(2);
          updateValues.push(jsonRow.id);
          updateStmt.run(...updateValues);
          continue;
        }
      }
      insertStmt.run(...jsonToDbRow(jsonRow));
    }
  });
  transaction();
}

// ========== 用户审核 ==========

function approveUser(id) {
  const database = getDb();
  const stmt = database.prepare('UPDATE users SET status = ? WHERE id = ?');
  stmt.run('approved', id);
  return true;
}

function rejectUser(id) {
  const database = getDb();
  const stmt = database.prepare('UPDATE users SET status = ? WHERE id = ?');
  stmt.run('rejected', id);
  return true;
}

function getPendingUsers() {
  const database = getDb();
  try {
    const stmt = database.prepare(
      `SELECT ${ALL_FIELDS.join(', ')}, status FROM users WHERE status = 'pending' ORDER BY created_at DESC`
    );
    return stmt.all().map(dbRowToJson);
  } catch (e) {
    return [];
  }
}

// ========== 用户搜索 ==========

function searchUsers(criteria, page = 1, limit = 20) {
  const database = getDb();
  const conditions = [];
  const params = [];
  const isExact = criteria.exact === 'true' || criteria.exact === true;

  const addLikeOrExact = (field, value) => {
    if (!value) return;
    if (isExact) {
      conditions.push(`${field} = ?`);
      params.push(value);
    } else {
      conditions.push(`${field} LIKE ?`);
      params.push('%' + escapeLikeString(value) + '%');
    }
  };

  if (criteria.gender) {
    conditions.push('gender = ?');
    params.push(criteria.gender);
  }
  addLikeOrExact('city', criteria.city);
  if (criteria.age_min) {
    conditions.push('CAST(age AS INTEGER) >= ?');
    params.push(parseInt(criteria.age_min));
  }
  if (criteria.age_max) {
    conditions.push('CAST(age AS INTEGER) <= ?');
    params.push(parseInt(criteria.age_max));
  }
  addLikeOrExact('education', criteria.education);
  addLikeOrExact('income', criteria.income);
  addLikeOrExact('name', criteria.name);
  addLikeOrExact('contact', criteria.contact);
  if (criteria.keyword) {
    if (isExact) {
      conditions.push('(name = ? OR city = ? OR contact = ?)');
      params.push(criteria.keyword, criteria.keyword, criteria.keyword);
    } else {
      conditions.push('(name LIKE ? OR city LIKE ? OR contact LIKE ?)');
      const kw = '%' + escapeLikeString(criteria.keyword) + '%';
      params.push(kw, kw, kw);
    }
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) as count FROM users ${whereClause}`;
  const countStmt = database.prepare(countSql);
  const count = countStmt.get(...params).count;

  const sql = `SELECT ${ALL_FIELDS.join(', ')}, status FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const stmt = database.prepare(sql);
  const data = stmt.all(...params, limit, offset).map(dbRowToJson);

  return { data, count };
}

function escapeLikeString(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}

// ========== auth_users 表（注册/登录账号） ==========

function createAuthUser(phone, password, nickname) {
  const database = getDb();
  const id = 'u' + Date.now().toString(32) + Math.random().toString(36).substring(2, 6);
  const salt = Math.random().toString(36).substring(2, 10);
  const { hashPassword } = require('./index');
  const hashedPassword = hashPassword(password, salt);
  const createdAt = Date.now();

  const stmt = database.prepare(
    'INSERT INTO auth_users (id, phone, password, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, phone, hashedPassword + ':' + salt, nickname || '', createdAt);
  return id;
}

function verifyAuthUser(phone, password) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM auth_users WHERE phone = ?');
  const user = stmt.get(phone);
  if (!user) return null;

  const [hash, salt] = user.password.split(':');
  const { hashPassword } = require('./index');
  if (hashPassword(password, salt) === hash) {
    database.prepare('UPDATE auth_users SET last_login = ? WHERE id = ?').run(Date.now(), user.id);
    return { id: user.id, phone: user.phone, nickname: user.nickname };
  }
  return null;
}

function getAuthUserById(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT id, phone, nickname, created_at, last_login FROM auth_users WHERE id = ?');
  return stmt.get(id) || null;
}

function getAuthUserByIdWithPassword(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT id, phone, password, nickname, created_at, last_login FROM auth_users WHERE id = ?');
  return stmt.get(id) || null;
}

function updateAuthUserPassword(userId, newPassword) {
  const database = getDb();
  const salt = Math.random().toString(36).substring(2, 10);
  const { hashPassword } = require('./index');
  const hashedPassword = hashPassword(newPassword, salt);
  database.prepare('UPDATE auth_users SET password = ? WHERE id = ?').run(hashedPassword + ':' + salt, userId);
  return true;
}

// ========== 统计 ==========

function getUserStats() {
  const database = getDb();
  const rows = database.prepare("SELECT age FROM users WHERE age IS NOT NULL AND age != ''").all();
  const ageDistribution = {};
  for (const row of rows) {
    const age = String(row.age);
    ageDistribution[age] = (ageDistribution[age] || 0) + 1;
  }
  return {
    total: database.prepare('SELECT COUNT(*) as count FROM users').get().count,
    male: database.prepare("SELECT COUNT(*) as count FROM users WHERE gender = '男'").get().count,
    female: database.prepare("SELECT COUNT(*) as count FROM users WHERE gender = '女'").get().count,
    ageDistribution
  };
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserCount,
  getUsersByUserId,
  addUser,
  updateUser,
  deleteUser,
  batchSaveUsers,
  searchUsers,
  approveUser,
  rejectUser,
  getPendingUsers,
  createAuthUser,
  verifyAuthUser,
  getAuthUserById,
  getAuthUserByIdWithPassword,
  updateAuthUserPassword,
  getUserStats,
  jsonToDbRow,
  dbRowToJson,
  ALL_FIELDS
};

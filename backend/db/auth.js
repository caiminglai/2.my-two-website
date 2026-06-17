// ============================================================
// 数据访问层 - 认证（纯 SQL，无业务逻辑）
// ============================================================

const { getDb, hashPassword } = require('./index');

function createAuthUser(phone, password, nickname) {
  const database = getDb();
  const id = 'u' + Date.now().toString(32) + Math.random().toString(36).substring(2, 6);
  const salt = Math.random().toString(36).substring(2, 10);
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
  const hashedPassword = hashPassword(newPassword, salt);
  database.prepare('UPDATE auth_users SET password = ? WHERE id = ?').run(hashedPassword + ':' + salt, userId);
  return true;
}

module.exports = {
  createAuthUser,
  verifyAuthUser,
  getAuthUserById,
  getAuthUserByIdWithPassword,
  updateAuthUserPassword
};

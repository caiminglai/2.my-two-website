// ============================================================
// 数据访问层 - 管理员/自定义筛选字段（纯 SQL，无业务逻辑）
// ============================================================

const { getDb } = require('./index');

// ========== 管理员设置 ==========

function getAdminPassword() {
  const database = getDb();
  const stmt = database.prepare('SELECT value FROM admin_settings WHERE key = ?');
  const row = stmt.get('admin_password');
  return row ? row.value : null;
}

function setAdminPassword(password) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO admin_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  );
  stmt.run('admin_password', password, Date.now());
  return true;
}

function addAdminLog(action, targetId, details, ipAddress) {
  const database = getDb();
  const stmt = database.prepare('INSERT INTO admin_logs (action, target_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(action, targetId || null, details ? JSON.stringify(details) : null, ipAddress || null, Date.now());
}

function getAdminLogs(limit = 50) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit);
}

function logAdminAction(action, targetId, details) {
  const database = getDb();
  const stmt = database.prepare('INSERT INTO admin_logs (action, target_id, details, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(action, targetId || null, details ? JSON.stringify(details) : null, Date.now());
}

// ========== 自定义筛选字段 ==========

function getAllCustomFilters() {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM custom_filters ORDER BY use_count DESC, created_at DESC');
  return stmt.all();
}

function addCustomFilter(fieldKey, fieldLabel, fieldType = 'text', description = '', fieldOptions = '') {
  const database = getDb();
  const now = Date.now();
  const existing = database.prepare('SELECT * FROM custom_filters WHERE field_key = ?').get(fieldKey);
  if (existing) {
    const stmt = database.prepare('UPDATE custom_filters SET field_label = ?, field_type = ?, field_options = ?, description = ?, updated_at = ? WHERE field_key = ?');
    stmt.run(fieldLabel, fieldType, fieldOptions, description, now, fieldKey);
    return database.prepare('SELECT * FROM custom_filters WHERE field_key = ?').get(fieldKey);
  }
  const stmt = database.prepare('INSERT INTO custom_filters (field_key, field_label, field_type, field_options, description, use_count, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)');
  const info = stmt.run(fieldKey, fieldLabel, fieldType, fieldOptions, description, now);
  return database.prepare('SELECT * FROM custom_filters WHERE id = ?').get(info.lastInsertRowid);
}

function deleteCustomFilter(id) {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM custom_filters WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

function incrementCustomFilterUse(fieldKey) {
  const database = getDb();
  const stmt = database.prepare('UPDATE custom_filters SET use_count = use_count + 1 WHERE field_key = ?');
  stmt.run(fieldKey);
}

module.exports = {
  getAdminPassword,
  setAdminPassword,
  addAdminLog,
  getAdminLogs,
  logAdminAction,
  getAllCustomFilters,
  addCustomFilter,
  deleteCustomFilter,
  incrementCustomFilterUse
};

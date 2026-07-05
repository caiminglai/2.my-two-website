// ============================================================
// 字段中文映射表 - 数据访问层
// 职责：查询字段映射数据，供前端动态获取字段定义
// ============================================================

const { getDb } = require('./index.js');

// 获取所有字段映射（按 field_order 排序）
function getAllFieldMappings() {
  const db = getDb();
  const rows = db.prepare(
    `SELECT field_key, field_label, field_category, field_type, field_options, field_order, is_filterable, description
     FROM field_mappings
     ORDER BY field_order ASC`
  ).all();
  // 将 field_options 字符串转为数组，is_filterable 转为布尔值
  return rows.map(row => ({
    field_key: row.field_key,
    field_label: row.field_label,
    field_category: row.field_category,
    field_type: row.field_type,
    options: row.field_options ? row.field_options.split(',').filter(o => o.trim()) : [],
    field_order: row.field_order,
    is_filterable: row.is_filterable === 1,
    description: row.description || ''
  }));
}

// 按分类获取字段映射
function getFieldMappingsByCategory(category) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT field_key, field_label, field_category, field_type, field_options, field_order, is_filterable, description
     FROM field_mappings
     WHERE field_category = ?
     ORDER BY field_order ASC`
  ).all(category);
  return rows.map(row => ({
    field_key: row.field_key,
    field_label: row.field_label,
    field_category: row.field_category,
    field_type: row.field_type,
    options: row.field_options ? row.field_options.split(',').filter(o => o.trim()) : [],
    field_order: row.field_order,
    is_filterable: row.is_filterable === 1,
    description: row.description || ''
  }));
}

// 获取字段标签映射表（field_key -> field_label）
function getFieldLabelMap() {
  const db = getDb();
  const rows = db.prepare('SELECT field_key, field_label FROM field_mappings').all();
  const map = {};
  for (const row of rows) {
    map[row.field_key] = row.field_label;
  }
  return map;
}

// 获取缓存版本号（field_mappings 表中最新的 updated_at）
function getCacheVersion() {
  const db = getDb();
  const row = db.prepare('SELECT MAX(updated_at) as ver FROM field_mappings').get();
  return String(row?.ver || 0);
}

module.exports = {
  getAllFieldMappings,
  getFieldMappingsByCategory,
  getFieldLabelMap,
  getCacheVersion
};

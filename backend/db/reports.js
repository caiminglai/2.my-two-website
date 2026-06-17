// ============================================================
// 数据访问层 - 举报（纯 SQL，无业务逻辑）
// ============================================================

const { getDb } = require('./index');

function addReport(reporterId, reportedId, reportType, description, proofPath) {
  const database = getDb();
  const createdAt = Date.now();
  const stmt = database.prepare(
    'INSERT INTO user_reports (reporter_id, reported_id, report_type, description, proof_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(reporterId, reportedId, reportType, description || '', proofPath || null, 'pending', createdAt);
  return true;
}

function getAllReports(status = null) {
  const database = getDb();
  let sql = 'SELECT r.*, u1.name as reporter_name, u1.avatar as reporter_avatar, u2.name as reported_name, u2.avatar as reported_avatar, u2.contact as reported_contact FROM user_reports r LEFT JOIN users u1 ON r.reporter_id = u1.id LEFT JOIN users u2 ON r.reported_id = u2.id';
  const params = [];
  if (status) {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY r.created_at DESC';
  const stmt = database.prepare(sql);
  return stmt.all(...params);
}

function updateReportStatus(reportId, status, adminNote) {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE user_reports SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
  );
  stmt.run(status, adminNote || '', Date.now(), reportId);
  return true;
}

function deleteReport(reportId) {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM user_reports WHERE id = ?');
  stmt.run(reportId);
  return true;
}

module.exports = {
  addReport,
  getAllReports,
  updateReportStatus,
  deleteReport
};

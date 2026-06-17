// ============================================================
// 业务逻辑层 - 管理员服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const adminDb = require('../db/admin');
const userDb = require('../db/users');

function verifyAdminPassword(inputPassword) {
  const adminPwd = process.env.ADMIN_PASSWORD || adminDb.getAdminPassword();
  return inputPassword === adminPwd;
}

function updateAdminPassword(newPassword) {
  if (!newPassword) {
    return { success: false, message: '密码不能为空' };
  }
  adminDb.setAdminPassword(newPassword);
  return { success: true };
}

function logAction(action, targetId, details, ipAddress) {
  adminDb.addAdminLog(action, targetId, details, ipAddress);
}

function getLogs(limit) {
  return adminDb.getAdminLogs(limit || 50);
}

function approveUser(userId) {
  return userDb.approveUser(userId);
}

function rejectUser(userId) {
  return userDb.rejectUser(userId);
}

function getPendingUsers() {
  return userDb.getPendingUsers();
}

function getAllCustomFilters() {
  return adminDb.getAllCustomFilters();
}

function addCustomFilter(fieldKey, fieldLabel, fieldType, description, fieldOptions) {
  if (!fieldKey || !fieldLabel) {
    return { success: false, message: '字段名和标签不能为空' };
  }
  const filter = adminDb.addCustomFilter(fieldKey, fieldLabel, fieldType, description, fieldOptions);
  return { success: true, data: filter };
}

function deleteCustomFilter(id) {
  const result = adminDb.deleteCustomFilter(id);
  return { success: result };
}

function incrementFilterUse(fieldKey) {
  adminDb.incrementCustomFilterUse(fieldKey);
}

module.exports = {
  verifyAdminPassword,
  updateAdminPassword,
  logAction,
  getLogs,
  approveUser,
  rejectUser,
  getPendingUsers,
  getAllCustomFilters,
  addCustomFilter,
  deleteCustomFilter,
  incrementFilterUse
};

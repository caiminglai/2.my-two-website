// ============================================================
// 业务逻辑层 - 管理员服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const adminDb = require('../db/admin');
const userDb = require('../db/users');
const { verifyAdminToken } = require('../db/index');
const bcrypt = require('bcrypt');

// 统一默认管理员账号（兼容旧版单一密码）
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || adminDb.getAdminPassword();
if (!DEFAULT_ADMIN_PASSWORD) {
  console.error('[FATAL] ADMIN_PASSWORD not configured. Set it in .env or database.');
  process.exit(1);
}

function getAdminWhitelist() {
  const whitelist = adminDb.getAdminWhitelist();
  // 如果未配置任何白名单，默认将环境变量中的管理员账号加入白名单，避免锁死后台
  if (whitelist.length === 0) {
    return [DEFAULT_ADMIN_USERNAME];
  }
  return whitelist;
}

function isAdminUsername(username) {
  if (!username) return false;
  const whitelist = getAdminWhitelist();
  return whitelist.includes(username);
}

// 密码比较：兼容明文密码（旧数据）和 bcrypt 哈希（新数据），登录成功后自动升级
async function comparePassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  // bcrypt 哈希以 $2a$ 或 $2b$ 开头
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  // 明文密码直接比较
  const match = (inputPassword === storedPassword);
  if (match) {
    // 自动升级为 bcrypt 哈希
    try {
      const hashed = await bcrypt.hash(inputPassword, 10);
      adminDb.setAdminPassword(hashed);
      console.log('[Admin] 密码已自动升级为 bcrypt 哈希');
    } catch (e) {
      console.warn('[Admin] 密码升级失败:', e.message);
    }
  }
  return match;
}

async function verifyAdminAccount(username, inputPassword) {
  if (!username || !inputPassword) {
    return { success: false, message: '请输入管理员账号和密码' };
  }
  const whitelist = getAdminWhitelist();
  if (!whitelist.includes(username)) {
    return { success: false, message: '该账号无管理员权限' };
  }

  // 优先读取该账号独立密码；未设置则回退到默认管理员密码
  let expectedPassword = adminDb.getAdminAccountPassword(username);
  let isAccountPassword = true;
  if (!expectedPassword) {
    expectedPassword = DEFAULT_ADMIN_PASSWORD;
    isAccountPassword = false;
  }

  const match = await comparePassword(inputPassword, expectedPassword);
  if (!match) {
    return { success: false, message: '管理员账号或密码错误' };
  }
  return { success: true, username };
}

async function verifyAdminPassword(inputPassword) {
  const adminPwd = DEFAULT_ADMIN_PASSWORD;
  return comparePassword(inputPassword, adminPwd);
}

function isAdminToken(token) {
  if (!token) return false;
  const username = verifyAdminToken(token);
  return !!username && isAdminUsername(username);
}

async function updateAdminPassword(newPassword) {
  if (!newPassword) {
    return { success: false, message: '密码不能为空' };
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  adminDb.setAdminPassword(hashed);
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
  getAdminWhitelist,
  isAdminUsername,
  verifyAdminAccount,
  verifyAdminPassword,
  isAdminToken,
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

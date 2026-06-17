// ============================================================
// 业务逻辑层 - 认证服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const authDb = require('../db/auth');
const { generateToken, verifyToken } = require('../db/index');

function register(phone, password, nickname) {
  if (!phone || !password) {
    return { success: false, message: '缺少手机号或密码' };
  }
  const userId = authDb.createAuthUser(phone, password, nickname);
  const token = generateToken(userId);
  return { success: true, token, user: { id: userId, phone, nickname } };
}

function login(phone, password) {
  const user = authDb.verifyAuthUser(phone, password);
  if (!user) {
    return { success: false, message: '手机号或密码错误' };
  }
  const token = generateToken(user.id);
  return { success: true, token, user };
}

function getCurrentUser(token) {
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  return authDb.getAuthUserById(userId);
}

function changePassword(userId, newPassword) {
  if (!userId || !newPassword) {
    return { success: false, message: '参数不完整' };
  }
  authDb.updateAuthUserPassword(userId, newPassword);
  return { success: true };
}

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword
};

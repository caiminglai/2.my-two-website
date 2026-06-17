// ============================================================
// API 路由层 - 认证（只做 HTTP 解析 + 调用 Service + 返回 JSON）
// ============================================================

const authService = require('../services/auth.service');
const adminService = require('../services/admin.service');

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(obj));
}

// ========== POST /api/auth/register
function register(req, res, readBodyWithLimit) {
  return readBodyWithLimit(req).then(body => {
    try {
      const data = JSON.parse(body);
      const result = authService.register(data.phone, data.password, data.nickname);
      sendJson(res, result.success ? 200 : 400, result);
    } catch (e) {
      sendJson(res, 500, { success: false, message: '注册失败' });
    }
  }).catch(e => {
    sendJson(res, 413, { success: false, message: e.message || '请求体过大' });
  });
}

// ========== POST /api/auth/login
function login(req, res, readBodyWithLimit, checkLoginRateLimit) {
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  if (!checkLoginRateLimit(clientIp)) {
    sendJson(res, 429, { success: false, message: '登录尝试过多，请5分钟后再试' });
    return;
  }
  return readBodyWithLimit(req).then(body => {
    try {
      const data = JSON.parse(body);
      const result = authService.login(data.phone, data.password);
      sendJson(res, result.success ? 200 : 401, result);
    } catch (e) {
      sendJson(res, 400, { success: false, message: '登录失败' });
    }
  }).catch(e => {
    sendJson(res, 413, { success: false, message: e.message || '请求体过大' });
  });
}

// ========== POST /api/admin/login
function adminLogin(req, res, readBodyWithLimit, ADMIN_TOKEN, checkLoginRateLimit) {
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  if (!checkLoginRateLimit(clientIp)) {
    sendJson(res, 429, { success: false, message: '登录尝试过多，请5分钟后再试' });
    return;
  }
  return readBodyWithLimit(req).then(body => {
    try {
      const data = JSON.parse(body);
      if (adminService.verifyAdminPassword(data.password)) {
        sendJson(res, 200, { success: true, token: ADMIN_TOKEN });
      } else {
        sendJson(res, 401, { success: false });
      }
    } catch (e) {
      sendJson(res, 400, { success: false });
    }
  }).catch(e => {
    sendJson(res, 413, { success: false, message: e.message || '请求体过大' });
  });
}

module.exports = { register, login, adminLogin };

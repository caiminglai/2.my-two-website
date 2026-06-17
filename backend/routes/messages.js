// ============================================================
// API 路由层 - 消息（只做 HTTP 解析 + 调用 Service + 返回 JSON）
// ============================================================

const messagesService = require('../services/messages.service');

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
  });
}

// ========== POST /api/messages/send
async function handleSendMessage(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { sendJson(res, 401, { success: false, message: '未登录' }); return; }
  try {
    const body = await readBody(req);
    const result = messagesService.sendMessage(token, body.toUserId, body.content);
    sendJson(res, result.success ? 200 : 400, result);
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message || '发送失败' });
  }
}

// ========== GET /api/messages/conversations
async function handleGetConversations(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { sendJson(res, 401, { success: false, message: '未登录' }); return; }
  try {
    const result = messagesService.getConversations(token);
    sendJson(res, result.success ? 200 : 401, result);
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message || '获取失败' });
  }
}

// ========== GET /api/messages?userId=xxx
async function handleGetMessages(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { sendJson(res, 401, { success: false, message: '未登录' }); return; }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const otherUserId = url.searchParams.get('userId');
    if (!otherUserId) { sendJson(res, 400, { success: false, message: '缺少参数' }); return; }
    const result = messagesService.getConversationMessages(token, otherUserId);
    sendJson(res, result.success ? 200 : 401, result);
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message || '获取失败' });
  }
}

// ========== GET /api/messages/unread
async function handleGetUnreadCount(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { sendJson(res, 401, { success: false, message: '未登录' }); return; }
  try {
    const result = messagesService.getUnreadCount(token);
    sendJson(res, result.success ? 200 : 401, result);
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message || '获取失败' });
  }
}

module.exports = {
  handleSendMessage,
  handleGetConversations,
  handleGetMessages,
  handleGetUnreadCount
};

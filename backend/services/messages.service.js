// ============================================================
// 业务逻辑层 - 消息服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const messagesDb = require('../db/messages');
const userDb = require('../db/users');
const { verifyToken } = require('../db/index');

function sanitizeString(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sendMessage(token, toUserId, content) {
  const user = verifyToken(token);
  if (!user) {
    return { success: false, message: 'token无效' };
  }
  if (!toUserId || !content) {
    return { success: false, message: '缺少参数' };
  }
  const targetUser = userDb.getUserById(toUserId);
  if (!targetUser) {
    return { success: false, message: '用户不存在' };
  }
  if (toUserId === user.id) {
    return { success: false, message: '不能给自己发消息' };
  }
  const sanitizedContent = sanitizeString(content).substring(0, 500);
  const messageId = messagesDb.sendMessage(user.id, toUserId, sanitizedContent);
  return { success: true, message: '消息发送成功', messageId };
}

function getConversations(token) {
  const user = verifyToken(token);
  if (!user) {
    return { success: false, message: 'token无效' };
  }
  const conversations = messagesDb.getUserConversations(user.id);
  const result = conversations.map(conv => {
    const otherUser = userDb.getUserById(conv.other_user_id);
    if (!otherUser) return null;
    return {
      userId: conv.other_user_id,
      name: otherUser.data?.name || otherUser.name || '未知',
      avatar: otherUser.data?.avatar || otherUser.avatar || '',
      lastMessage: conv.last_message || '',
      lastTime: conv.last_time,
      unreadCount: conv.unread_count || 0
    };
  }).filter(Boolean);
  return { success: true, data: result };
}

function getConversationMessages(token, otherUserId) {
  const user = verifyToken(token);
  if (!user) {
    return { success: false, message: 'token无效' };
  }
  messagesDb.markMessagesAsRead(user.id, otherUserId);
  const messages = messagesDb.getConversationMessages(user.id, otherUserId);
  const result = messages.map(msg => ({
    id: msg.id,
    fromUserId: msg.from_user_id,
    toUserId: msg.to_user_id,
    content: msg.content,
    status: msg.status,
    createdAt: msg.created_at,
    isMe: msg.from_user_id === user.id
  }));
  return { success: true, data: result };
}

function getUnreadCount(token) {
  const user = verifyToken(token);
  if (!user) {
    return { success: false, message: 'token无效' };
  }
  return { success: true, count: messagesDb.getUnreadCount(user.id) };
}

module.exports = {
  sendMessage,
  getConversations,
  getConversationMessages,
  getUnreadCount
};

// ============================================================
// 数据访问层 - 消息（纯 SQL，无业务逻辑）
// ============================================================

const { getDb } = require('./index');

function sendMessage(fromUserId, toUserId, content) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO messages (from_user_id, to_user_id, content, status, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(fromUserId, toUserId, content, 'sent', Date.now());
  return result.lastInsertRowid;
}

function getUserConversations(userId) {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT 
      CASE 
        WHEN from_user_id = ? THEN to_user_id 
        ELSE from_user_id 
      END AS other_user_id,
      MAX(created_at) AS last_time,
      COUNT(CASE WHEN status = 'sent' AND to_user_id = ? THEN 1 END) AS unread_count,
      SUBSTR(MAX(CASE WHEN created_at = (SELECT MAX(created_at) FROM messages WHERE (from_user_id = ? AND to_user_id = other_user_id) OR (from_user_id = other_user_id AND to_user_id = ?)) THEN content END), 1, 50) AS last_message
    FROM messages 
    WHERE from_user_id = ? OR to_user_id = ?
    GROUP BY other_user_id
    ORDER BY last_time DESC
  `);
  return stmt.all(userId, userId, userId, userId, userId, userId);
}

function getConversationMessages(userId, otherUserId) {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM messages 
    WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
    ORDER BY created_at ASC
  `);
  return stmt.all(userId, otherUserId, otherUserId, userId);
}

function markMessagesAsRead(userId, otherUserId) {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE messages SET status = ?, read_at = ? WHERE from_user_id = ? AND to_user_id = ? AND status = ?'
  );
  stmt.run('read', Date.now(), otherUserId, userId, 'sent');
  return true;
}

function getUnreadCount(userId) {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT COUNT(*) AS count FROM messages WHERE to_user_id = ? AND status = ?'
  );
  const result = stmt.get(userId, 'sent');
  return result ? result.count : 0;
}

module.exports = {
  sendMessage,
  getUserConversations,
  getConversationMessages,
  markMessagesAsRead,
  getUnreadCount
};

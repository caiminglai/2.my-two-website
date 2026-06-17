// ============================================================
// 数据访问层 - 支付/保证金/联系方式解锁（纯 SQL，无业务逻辑）
// ============================================================

const { getDb, decrypt } = require('./index');

// ========== 联系方式解锁 ==========

function createContactUnlock(viewerId, targetId) {
  const database = getDb();
  const createdAt = Date.now();
  try {
    const stmt = database.prepare(
      'INSERT OR IGNORE INTO contact_unlocks (viewer_id, target_id, status, created_at) VALUES (?, ?, ?, ?)'
    );
    stmt.run(viewerId, targetId, 'pending', createdAt);
    return true;
  } catch (e) {
    return false;
  }
}

function unlockContact(viewerId, targetId, adminNote = '') {
  const database = getDb();
  const unlockedAt = Date.now();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO contact_unlocks (viewer_id, target_id, status, created_at, unlocked_at, admin_note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(viewerId, targetId, 'unlocked', Date.now(), unlockedAt, adminNote);
  return true;
}

function checkContactUnlocked(viewerId, targetId) {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT status FROM contact_unlocks WHERE viewer_id = ? AND target_id = ? AND status = ?'
  );
  const result = stmt.get(viewerId, targetId, 'unlocked');
  return !!result;
}

function getUnlocksByTarget(targetId) {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT * FROM contact_unlocks WHERE target_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(targetId);
}

function getAllUnlockRecords() {
  const database = getDb();
  const stmt = database.prepare(
    `SELECT cl.*, 
      u1.name as viewer_name, u1.avatar as viewer_avatar, u1.contact as viewer_contact, u1.user_id as viewer_user_id,
      u2.name as target_name, u2.avatar as target_avatar, u2.contact as target_contact, u2.user_id as target_user_id
    FROM contact_unlocks cl
    LEFT JOIN users u1 ON cl.viewer_id = u1.user_id OR cl.viewer_id = u1.id
    LEFT JOIN users u2 ON cl.target_id = u2.user_id OR cl.target_id = u2.id
    ORDER BY cl.created_at DESC LIMIT 100`
  );
  return stmt.all();
}

// ========== 联系方式解锁请求（带支付凭证） ==========

function addContactUnlockRequest(viewerId, targetId, proofPath, method, amount) {
  const database = getDb();
  const now = Date.now();
  try {
    const stmt = database.prepare(
      'INSERT INTO contact_unlocks (viewer_id, target_id, proof_path, method, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(viewerId, targetId, proofPath, method || 'manual', amount || 9.9, 'pending', now);
    return { success: true, id: database.lastInsertRowid };
  } catch (e) {
    try {
      const stmt = database.prepare(
        'UPDATE contact_unlocks SET proof_path = ?, method = ?, amount = ?, status = ?, created_at = ? WHERE viewer_id = ? AND target_id = ?'
      );
      stmt.run(proofPath, method || 'manual', amount || 9.9, 'pending', now, viewerId, targetId);
      return { success: true, updated: true };
    } catch(e2) {
      return { success: false, error: e.message };
    }
  }
}

function getAllContactUnlockRequests() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT cu.*,
      au.nickname as viewer_name, au.phone as viewer_phone,
      u.name as target_name, u.contact as target_contact, u.avatar as target_avatar,
      u.user_id as target_user_id,
      uv.avatar as viewer_avatar
    FROM contact_unlocks cu
    LEFT JOIN auth_users au ON cu.viewer_id = au.id
    LEFT JOIN users u ON cu.target_id = u.id OR cu.target_id = u.user_id
    LEFT JOIN users uv ON uv.user_id = cu.viewer_id OR uv.id = cu.viewer_id
    ORDER BY cu.created_at DESC
    LIMIT 200
  `).all();
  return rows.map(row => ({
    ...row,
    target_contact: decrypt(row.target_contact)
  }));
}

function approveContactUnlockRequest(id, adminNote = '') {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE contact_unlocks SET status = ?, unlocked_at = ?, admin_note = ? WHERE id = ?'
  );
  stmt.run('unlocked', Date.now(), adminNote, id);
  return true;
}

function rejectContactUnlockRequest(id, adminNote = '') {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE contact_unlocks SET status = ?, admin_note = ? WHERE id = ?'
  );
  stmt.run('rejected', adminNote, id);
  return true;
}

function deleteContactUnlockRequest(id) {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM contact_unlocks WHERE id = ?');
  stmt.run(id);
  return true;
}

// ========== 支付订单 ==========

function addPaymentOrder(order) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO payment_orders (order_id, user_id, amount, channel, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(order.order_id, order.user_id, order.amount, order.channel, 'pending', Date.now());
  return true;
}

function getPaymentOrder(orderId) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM payment_orders WHERE order_id = ?');
  return stmt.get(orderId);
}

function updatePaymentOrder(orderId, status) {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE payment_orders SET status = ?, paid_at = ? WHERE order_id = ?'
  );
  stmt.run(status, status === 'paid' ? Date.now() : null, orderId);
  return true;
}

// ========== 保证金 ==========

function approveDepositByUserId(userId, amount) {
  const database = getDb();
  const existingStmt = database.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
  const existing = existingStmt.get(userId);
  if (existing) {
    const updateStmt = database.prepare(
      'UPDATE deposits SET status = ?, approved_at = ?, admin_note = ? WHERE id = ?'
    );
    updateStmt.run('approved', Date.now(), '自动支付通过', existing.id);
  } else {
    const insertStmt = database.prepare(
      'INSERT INTO deposits (user_id, amount, status, created_at, approved_at, admin_note) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(userId, amount, 'approved', Date.now(), Date.now(), '自动支付通过');
  }
  return true;
}

function getAllDeposits(status = null) {
  const database = getDb();
  let sql = `SELECT d.*, u.name as user_name, u.gender, u.city, u.contact, u.avatar as user_avatar
    FROM deposits d
    LEFT JOIN users u ON d.user_id = u.user_id`;
  const params = [];
  if (status) {
    sql += ' WHERE d.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY d.created_at DESC';
  const stmt = database.prepare(sql);
  return stmt.all(...params);
}

function updateDepositStatus(depositId, status, adminNote = '') {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE deposits SET status = ?, admin_note = ?, approved_at = ? WHERE id = ?'
  );
  stmt.run(status, adminNote || '', status === 'approved' ? Date.now() : null, depositId);
  return true;
}

function addDeposit(userId, amount, proofPath) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO deposits (user_id, amount, proof_path, status, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(userId, amount, proofPath, 'pending', new Date().toISOString());
  return true;
}

function getMyDeposit(userId) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
  return stmt.get(userId);
}

function approveDepositsBatch(ids, adminNote) {
  const database = getDb();
  const now = new Date().toISOString();
  const stmt = database.prepare(
    'UPDATE deposits SET status = \'approved\', approved_at = ?, admin_note = ? WHERE id = ? AND status = \'pending\''
  );
  let successCount = 0;
  for (const id of ids) {
    const result = stmt.run(now, adminNote || '审核通过', id);
    if (result && result.changes > 0) successCount++;
  }
  return successCount;
}

function rejectDepositsBatch(ids, adminNote) {
  const database = getDb();
  const now = new Date().toISOString();
  const stmt = database.prepare(
    'UPDATE deposits SET status = \'rejected\', approved_at = ?, admin_note = ? WHERE id = ? AND status = \'pending\''
  );
  let successCount = 0;
  for (const id of ids) {
    const result = stmt.run(now, adminNote || '审核未通过', id);
    if (result && result.changes > 0) successCount++;
  }
  return successCount;
}

function getPaymentOrdersByUser(userId) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId);
}

module.exports = {
  createContactUnlock,
  unlockContact,
  checkContactUnlocked,
  getUnlocksByTarget,
  getAllUnlockRecords,
  addContactUnlockRequest,
  getAllContactUnlockRequests,
  approveContactUnlockRequest,
  rejectContactUnlockRequest,
  deleteContactUnlockRequest,
  addPaymentOrder,
  getPaymentOrder,
  updatePaymentOrder,
  approveDepositByUserId,
  getAllDeposits,
  updateDepositStatus,
  getPaymentOrdersByUser,
  addDeposit,
  getMyDeposit,
  approveDepositsBatch,
  rejectDepositsBatch
};

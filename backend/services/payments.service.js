// ============================================================
// 业务逻辑层 - 支付/保证金/解锁服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const paymentsDb = require('../db/payments');
const { verifyToken } = require('../db/index');

function submitUnlockRequest(token, targetId, proofPath, method, amount) {
  const userId = verifyToken(token);
  if (!userId) {
    return { success: false, message: 'token无效' };
  }
  if (!targetId || !proofPath) {
    return { success: false, message: '缺少参数' };
  }
  const result = paymentsDb.addContactUnlockRequest(userId, targetId, proofPath, method, amount);
  return result;
}

function approveUnlockRequest(id, adminNote) {
  paymentsDb.approveContactUnlockRequest(id, adminNote);
  return { success: true };
}

function rejectUnlockRequest(id, adminNote) {
  paymentsDb.rejectContactUnlockRequest(id, adminNote);
  return { success: true };
}

function deleteUnlockRequest(id) {
  paymentsDb.deleteContactUnlockRequest(id);
  return { success: true };
}

function getAllUnlockRequests() {
  return paymentsDb.getAllContactUnlockRequests();
}

function getAllUnlockRecords() {
  return paymentsDb.getAllUnlockRecords();
}

function checkUnlocked(viewerId, targetId) {
  return paymentsDb.checkContactUnlocked(viewerId, targetId);
}

function createOrder(order) {
  if (!order.order_id || !order.user_id || !order.amount || !order.channel) {
    return { success: false, message: '订单参数不完整' };
  }
  paymentsDb.addPaymentOrder(order);
  return { success: true };
}

function getOrder(orderId) {
  return paymentsDb.getPaymentOrder(orderId);
}

function updateOrderStatus(orderId, status) {
  paymentsDb.updatePaymentOrder(orderId, status);
  return { success: true };
}

function autoApproveDeposit(userId, amount) {
  if (!userId || !amount) {
    return { success: false, message: '参数不完整' };
  }
  paymentsDb.approveDepositByUserId(userId, amount);
  return { success: true };
}

function getAllDeposits(status) {
  return paymentsDb.getAllDeposits(status);
}

function updateDepositStatus(depositId, status, adminNote) {
  paymentsDb.updateDepositStatus(depositId, status, adminNote);
  return { success: true };
}

function getUserPaymentOrders(userId) {
  return paymentsDb.getPaymentOrdersByUser(userId);
}

module.exports = {
  submitUnlockRequest,
  approveUnlockRequest,
  rejectUnlockRequest,
  deleteUnlockRequest,
  getAllUnlockRequests,
  getAllUnlockRecords,
  checkUnlocked,
  createOrder,
  getOrder,
  updateOrderStatus,
  autoApproveDeposit,
  getAllDeposits,
  updateDepositStatus,
  getUserPaymentOrders
};

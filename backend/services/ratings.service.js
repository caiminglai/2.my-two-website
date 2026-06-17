// ============================================================
// 业务逻辑层 - 评价服务（纯业务规则，无 SQL，无 HTTP）
// ============================================================

const ratingsDb = require('../db/ratings');
const userDb = require('../db/users');
const { verifyToken } = require('../db/index');

function addRating(token, ratedId, rating, comment) {
  const userId = verifyToken(token);
  if (!userId) {
    return { success: false, message: 'token无效' };
  }
  const users = userDb.getUsersByUserId(userId);
  if (users.length === 0) {
    return { success: false, message: '请先创建个人资料' };
  }
  if (!ratedId || !rating) {
    return { success: false, message: '缺少参数' };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, message: '评分必须在 1-5 之间' };
  }
  const targetUser = userDb.getUserById(ratedId);
  if (!targetUser) {
    return { success: false, message: '被评价用户不存在' };
  }
  if (ratedId === users[0].id) {
    return { success: false, message: '不能评价自己' };
  }

  const existingRating = ratingsDb.checkUserRated(users[0].id, ratedId);
  if (existingRating) {
    return { success: false, message: '您已经评价过该用户，每人只能评价一次' };
  }

  try {
    ratingsDb.addRating(users[0].id, ratedId, rating, comment);
    return { success: true, message: '评价成功' };
  } catch (e) {
    return { success: false, message: '评价失败：' + (e.message || '数据库错误') };
  }
}

function getUserRatings(ratedId) {
  const ratings = ratingsDb.getRatingsForUser(ratedId);
  const average = ratingsDb.getAverageRating(ratedId);
  return { ratings, average };
}

module.exports = {
  addRating,
  getUserRatings
};

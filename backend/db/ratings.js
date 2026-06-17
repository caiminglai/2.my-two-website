// ============================================================
// 数据访问层 - 评价（纯 SQL，无业务逻辑）
// ============================================================

const { getDb } = require('./index');

function addRating(raterId, ratedId, rating, comment) {
  const database = getDb();
  const createdAt = Date.now();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO user_ratings (rater_id, rated_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(raterId, ratedId, rating, comment || '', createdAt);
  return true;
}

function getRatingsForUser(ratedId) {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT r.*, u.name as rater_name FROM user_ratings r LEFT JOIN users u ON r.rater_id = u.id WHERE r.rated_id = ? ORDER BY r.created_at DESC'
  );
  return stmt.all(ratedId);
}

function getAverageRating(ratedId) {
  const database = getDb();
  const stmt = database.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM user_ratings WHERE rated_id = ?'
  );
  const result = stmt.get(ratedId);
  return { avg: result.avg || 0, count: result.count || 0 };
}

function checkUserRated(raterId, ratedId) {
  const database = getDb();
  const stmt = database.prepare('SELECT id FROM user_ratings WHERE rater_id = ? AND rated_id = ? LIMIT 1');
  return stmt.get(raterId, ratedId);
}

module.exports = {
  addRating,
  getRatingsForUser,
  getAverageRating,
  checkUserRated
};

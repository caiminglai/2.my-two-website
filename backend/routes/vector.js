const Router = require('koa-router');
const vectorService = require('../services/vector.service');
const { verifyToken } = require('../db');

const router = new Router({ prefix: '/api/vector' });

router.get('/stats', async (ctx) => {
  try {
    const stats = vectorService.getStats();
    ctx.body = { success: true, data: stats };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { success: false, message: e.message };
  }
});

router.post('/generate/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;
    const result = await vectorService.generateAndStoreUserVector(userId);
    ctx.body = { success: true, data: result };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { success: false, message: e.message };
  }
});

router.get('/similar/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { type = 'profile', limit = 10 } = ctx.query;
    const results = await vectorService.findSimilarUsers(userId, type, parseInt(limit));
    ctx.body = { success: true, data: results };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { success: false, message: e.message };
  }
});

router.get('/match/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { limit = 10 } = ctx.query;
    const results = await vectorService.findMutualMatches(userId, parseInt(limit));
    ctx.body = { success: true, data: results };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { success: false, message: e.message };
  }
});

router.post('/batch', async (ctx) => {
  try {
    const { limit = 100 } = ctx.request.body || {};
    const results = await vectorService.batchGenerateVectors(parseInt(limit));
    ctx.body = { success: true, data: results };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { success: false, message: e.message };
  }
});

module.exports = router;

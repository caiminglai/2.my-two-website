const vectorService = require('../services/vector.service');

/**
 * 向量搜索API路由（原生HTTP）
 */
async function handleVectorRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // GET /api/vector/stats - 获取向量统计
  if (method === 'GET' && pathname === '/api/vector/stats') {
    try {
      const stats = vectorService.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: stats }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return true;
  }

  // POST /api/vector/generate/:userId - 生成用户向量
  if (method === 'POST' && pathname.match(/^\/api\/vector\/generate\/([^/]+)$/)) {
    const userId = pathname.match(/^\/api\/vector\/generate\/([^/]+)$/)[1];
    try {
      const result = await vectorService.generateAndStoreUserVector(userId);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return true;
  }

  // GET /api/vector/similar/:userId - 查找相似用户
  if (method === 'GET' && pathname.match(/^\/api\/vector\/similar\/([^/]+)$/)) {
    const userId = pathname.match(/^\/api\/vector\/similar\/([^/]+)$/)[1];
    const type = url.searchParams.get('type') || 'profile';
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    try {
      const results = await vectorService.findSimilarUsers(userId, type, limit);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: results }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return true;
  }

  // GET /api/vector/match/:userId - 双向匹配推荐
  if (method === 'GET' && pathname.match(/^\/api\/vector\/match\/([^/]+)$/)) {
    const userId = pathname.match(/^\/api\/vector\/match\/([^/]+)$/)[1];
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    try {
      const results = await vectorService.findMutualMatches(userId, limit);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data: results }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return true;
  }

  // POST /api/vector/batch - 批量生成向量
  if (method === 'POST' && pathname === '/api/vector/batch') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { limit = 100 } = body ? JSON.parse(body) : {};
        const results = await vectorService.batchGenerateVectors(parseInt(limit));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, data: results }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: e.message }));
      }
    });
    return true;
  }

  return false; // 未处理的路由
}

module.exports = { handleVectorRequest };

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const dbIndex = require('./db/index.js');
const paymentsDb = require('./db/payments.js');
const userDb = require('./db/users.js');

// ========== 加载环境变量 ==========
const envFile = path.join(__dirname, process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=');
      if (key && val.length > 0 && !process.env[key]) {
        process.env[key] = val.join('=');
      }
    }
  });
}

// ========== 管理员安全配置（兼容 .env） ==========
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your_admin_password';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// ========== 从独立文件加载管理后台HTML ==========
const ADMIN_HTML = fs.readFileSync(path.join(__dirname, 'admin', 'login.html'), 'utf8');
const MAIN_HTML = fs.readFileSync(path.join(__dirname, 'admin', 'main.html'), 'utf8');
const M_LOGIN_HTML = fs.readFileSync(path.join(__dirname, 'admin', 'm-login.html'), 'utf8');
const M_HTML = fs.readFileSync(path.join(__dirname, 'admin', 'm.html'), 'utf8');

// ========== 管理员认证 ==========
function getAdminTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies.admin_token || null;
}

function checkAdminAuth(req) {
  const token = getAdminTokenFromRequest(req);
  return adminService.isAdminToken(token);
}

// ========== CORS 配置 ==========
const SERVER_ORIGIN = process.env.SERVER_ORIGIN || 'http://your_server_ip';
const ALLOWED_ORIGINS = [
  'http://localhost:4000',
  'http://localhost:8080',
  SERVER_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean);

// ========== 路由模块 ==========
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const ratingRoutes = require('./routes/ratings.js');
const reportRoutes = require('./routes/reports.js');
const uploadRoutes = require('./routes/upload.js');
const paymentRoutes = require('./routes/payment.js');

// 初始化支付配置
paymentRoutes.initConfig(process.env);

// ========== 速率限制 ==========
const rateLimitMap = new Map();
const loginLimitMap = new Map();
const registerLimitMap = new Map();

function checkLimitMap(map, ip, limit, windowMs) {
  const now = Date.now();
  const record = map.get(ip) || { count: 0, startTime: now };
  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count++;
  }
  map.set(ip, record);
  return record.count <= limit;
}

function cleanupLimitMap(map, windowMs) {
  const now = Date.now();
  for (const [key, val] of map) {
    if (now - val.startTime > windowMs) map.delete(key);
  }
}

setInterval(() => {
  cleanupLimitMap(rateLimitMap, 60000);
  cleanupLimitMap(loginLimitMap, 300000);
  cleanupLimitMap(registerLimitMap, 3600000);
}, 5 * 60 * 1000);

function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  return checkLimitMap(rateLimitMap, ip, limit, windowMs);
}

function checkLoginRateLimit(ip, limit = 100, windowMs = 300000) {
  return checkLimitMap(loginLimitMap, ip, limit, windowMs);
}

function checkRegisterRateLimit(ip, limit = 5, windowMs = 3600000) {
  return checkLimitMap(registerLimitMap, ip, limit, windowMs);
}

// ========== 请求体读取 ==========
const MAX_BODY_SIZE = 5 * 1024 * 1024;
function readBodyWithLimit(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('请求体过大，最大允许5MB'));
        req.destroy();
        return;
      }
      body += c;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ========== 统一路径处理（核心修复）==========
// 把 /jzxr/api/xxx 统一转成 /api/xxx，后续只处理 /api/xxx
function normalizePath(pathname) {
  return pathname.replace(/^\/jzxr\//, '/');
}

// 从路径中提取ID，如 /api/users/abc123 -> abc123
function extractId(pathname, prefix) {
  const parts = pathname.split('/').filter(p => p);
  const idx = parts.indexOf(prefix);
  if (idx !== -1 && idx + 1 < parts.length) {
    return parts[idx + 1];
  }
  return null;
}

// ========== 创建服务器 ==========
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = url.parse(req.url, true);
  const rawPath = parsedUrl.pathname;
  const pathname = normalizePath(rawPath);  // ← 统一处理路径

  // ========== 静态文件服务 ==========
  // 收款码图片
  if (req.method === 'GET' && (pathname === '/wechat-qr.png' || pathname === '/alipay-qr.png')) {
    const fileName = pathname.includes('wechat') ? 'wechat-qr.png' : 'alipay-qr.png';
    const filePath = path.join(__dirname, '..', 'app', 'public', fileName);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404); res.end('File Not Found');
      } else {
        res.writeHead(200, {'Content-Type': 'image/png'}); res.end(data);
      }
    });
    return;
  }

  // 头像图片
  if (req.method === 'GET' && pathname.startsWith('/avatars/')) {
    const fileName = pathname.replace('/avatars/', '');
    const filePath = path.join(__dirname, '..', 'uploads', 'avatars', fileName);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('File Not Found'); }
      else { res.writeHead(200, {'Content-Type': mimeTypes[ext] || 'image/jpeg'}); res.end(data); }
    });
    return;
  }

  // ========== 管理后台页面 ==========
  if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin/')) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(ADMIN_HTML); return;
  }
  if (req.method === 'GET' && (pathname === '/admin/m' || pathname === '/admin/m/')) {
    if (!checkAdminAuth(req)) {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(M_LOGIN_HTML); return;
    }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(M_HTML); return;
  }
  if (req.method === 'GET' && (pathname === '/admin/main' || pathname === '/admin/main/')) {
    if (!checkAdminAuth(req)) {
      res.writeHead(302, {'Location': '/jzxr/admin/'}); res.end(); return;
    }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(MAIN_HTML); return;
  }

  // 管理后台静态文件
  if (req.method === 'GET' && pathname.startsWith('/admin/')) {
    const filePath = path.join(__dirname, 'admin', path.basename(pathname));
    fs.readFile(filePath, function(err, data){
      if (err) {
        res.writeHead(404); res.end('Not Found');
      } else {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = { '.css': 'text/css', '.js': 'application/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
        res.writeHead(200, {
          'Content-Type': (mimeTypes[ext] || 'application/octet-stream') + '; charset=utf-8',
          'Content-Length': data.length,
          'Cache-Control': 'no-cache'
        });
        res.end(data);
      }
    });
    return;
  }

  // ========== API 路由（统一只处理 /api/xxx）==========

  // --- 上传 ---
  if (req.method === 'POST' && pathname === '/api/upload/avatar') {
    uploadRoutes.uploadAvatar(req, res); return;
  }
  if (req.method === 'POST' && pathname === '/api/deposit/upload-proof') {
    uploadRoutes.uploadDepositProof(req, res); return;
  }
  if (req.method === 'GET' && pathname === '/api/admin/deposits') {
    uploadRoutes.getDeposits(req, res, checkAdminAuth); return;
  }
  if (req.method === 'PUT' && /^\/api\/admin\/deposits\/\d+\/approve$/.test(pathname)) {
    uploadRoutes.approveDeposit(req, res, readBodyWithLimit, checkAdminAuth, pathname); return;
  }
  if (req.method === 'PUT' && /^\/api\/admin\/deposits\/\d+\/reject$/.test(pathname)) {
    uploadRoutes.rejectDeposit(req, res, readBodyWithLimit, checkAdminAuth, pathname); return;
  }
  if (req.method === 'GET' && pathname === '/api/users/my-deposit') {
    uploadRoutes.getMyDeposit(req, res); return;
  }
  if (req.method === 'GET' && /^\/api\/admin\/deposits\/proof\/\d+$/.test(pathname)) {
    uploadRoutes.getDepositProofById(req, res, checkAdminAuth, pathname); return;
  }
  if (req.method === 'DELETE' && /^\/api\/admin\/deposits\/\d+$/.test(pathname)) {
    uploadRoutes.deleteDeposit(req, res, checkAdminAuth, pathname); return;
  }

  // --- 查看联系方式支付 ---
  // 自动支付接口（预留）
  if (req.method === 'POST' && pathname === '/api/payments/view-contact') {
    res.writeHead(501, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: false, message: '自动支付暂未开通，请使用手动上传凭证'})); return;
  }
  // 手动提交凭证
  if (req.method === 'POST' && pathname === '/api/unlock-contact/submit') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const viewerId = token ? dbIndex.verifyToken(token) : null;
    if (!viewerId) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '请先登录'})); return;
    }
    // 确保上传目录存在
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'contact-unlock');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // 解析 multipart/form-data
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) { res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify({success: false, message: '无效的上传格式'})); return; }
    const MAX_SIZE = 5 * 1024 * 1024;
    let chunks = [];
    let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > MAX_SIZE) { req.destroy(); return; } chunks.push(chunk); });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = body.toString('binary').split('--' + boundary);
        let proofPath = null, targetId = null, method = 'manual', amount = '9.9';
        for (const p of parts) {
          if (p.includes('filename=')) {
            const fnMatch = p.match(/filename="([^"]+)"/);
            const contentType = p.match(/Content-Type:\s*([\w\/\-\+]+)/i);
            if (fnMatch && fnMatch[1]) {
              const ext = path.extname(fnMatch[1]) || '.jpg';
              const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
              if (!allowed.includes(ext.toLowerCase())) continue;
              const fileStart = p.indexOf('\r\n\r\n') + 4;
              const fileEnd = p.indexOf('\r\n--', fileStart);
              const fileData = Buffer.from(p.substring(fileStart, fileEnd > -1 ? fileEnd : p.length), 'binary');
              const fileName = `contact_${viewerId}_${Date.now()}${ext}`;
              fs.writeFileSync(path.join(uploadsDir, fileName), fileData);
              proofPath = `uploads/contact-unlock/${fileName}`;
            }
          } else if (p.includes('name="target_user_id"')) {
            const m = p.match(/name="target_user_id"\s*\r\n\r\n([^\r\n]+)/);
            if (m) targetId = m[1].trim();
          } else if (p.includes('name="method"')) {
            const m = p.match(/name="method"\s*\r\n\r\n([^\r\n]+)/);
            if (m) method = m[1].trim();
          } else if (p.includes('name="amount"')) {
            const m = p.match(/name="amount"\s*\r\n\r\n([^\r\n]+)/);
            if (m) amount = m[1].trim();
          }
        }
        if (!proofPath || !targetId) {
          res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
          res.end(JSON.stringify({success: false, message: '凭证和目标用户信息必填'})); return;
        }
        const result = paymentsDb.addContactUnlockRequest(String(viewerId), targetId, proofPath, method, parseFloat(amount));
        if (result.success) {
          res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
          res.end(JSON.stringify({success: true, message: '凭证提交成功，等待管理员审核', proof_path: proofPath}));
        } else {
          res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
          res.end(JSON.stringify({success: false, message: result.error || '提交失败'}));
        }
      } catch(e) {
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: false, message: e.message}));
      }
    });
    return;
  }
  // 管理员查看联系方式审核列表
  if (req.method === 'GET' && pathname === '/api/admin/unlock-contact-requests') {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const records = paymentsDb.getAllContactUnlockRequests();
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: true, data: records})); return;
  }
  // 管理员审核通过
  if (req.method === 'PUT' && /^\/api\/admin\/unlock-contact-requests\/\d+\/approve$/.test(pathname)) {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const idMatch = pathname.match(/\/(\d+)\/approve/);
    const id = parseInt(idMatch[1]);
    readBodyWithLimit(req).then(body => {
      try {
        const data = JSON.parse(body);
        paymentsDb.approveContactUnlockRequest(id, data.admin_note || '');
        userDb.logAdminAction('approve_contact_unlock', String(id), { note: data.admin_note || '' });
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: true, message: '已通过审核'}));
      } catch(e) { res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify({success: false, message: e.message})); }
    });
    return;
  }
  // 管理员审核拒绝
  if (req.method === 'PUT' && /^\/api\/admin\/unlock-contact-requests\/\d+\/reject$/.test(pathname)) {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const idMatch = pathname.match(/\/(\d+)\/reject/);
    const id = parseInt(idMatch[1]);
    readBodyWithLimit(req).then(body => {
      try {
        const data = JSON.parse(body);
        paymentsDb.rejectContactUnlockRequest(id, data.admin_note || '');
        userDb.logAdminAction('reject_contact_unlock', String(id), { note: data.admin_note || '' });
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: true, message: '已拒绝'}));
      } catch(e) { res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify({success: false, message: e.message})); }
    });
    return;
  }
  // 管理员删除解锁记录
  if (req.method === 'DELETE' && /^\/api\/admin\/unlock-contact-requests\/\d+$/.test(pathname)) {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const idMatch = pathname.match(/\/(\d+)$/);
    const id = parseInt(idMatch[1]);
    paymentsDb.deleteContactUnlockRequest(id);
    userDb.logAdminAction('delete_contact_unlock', String(id), {});
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: true, message: '已删除'})); return;
  }

  if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
    uploadRoutes.serveUploadedFile(req, res, pathname); return;
  }

  // --- 认证 ---
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    authRoutes.register(req, res, readBodyWithLimit, checkRegisterRateLimit, clientIp); return;
  }
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    authRoutes.login(req, res, readBodyWithLimit, checkLoginRateLimit); return;
  }
  if (req.method === 'POST' && pathname === '/api/auth/change-password') {
    authRoutes.changePassword(req, res, readBodyWithLimit); return;
  }
  // 短信验证预留接口
  if (req.method === 'POST' && pathname === '/api/auth/sms/register-code') {
    authRoutes.sendRegisterSmsCode(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'POST' && pathname === '/api/auth/sms/verify-register-code') {
    authRoutes.verifyRegisterSmsCode(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'POST' && (pathname === '/api/admin/login' || pathname === '/api/admin')) {
    authRoutes.adminLogin(req, res, readBodyWithLimit, checkLoginRateLimit); return;
  }

  // --- 管理员统计 ---
  if (req.method === 'GET' && pathname === '/api/admin/stats') {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const stats = userDb.getUserStats();
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: true, stats})); return;
  }

  // --- 用户路由 ---
  if (req.method === 'GET' && pathname === '/api/users') {
    userRoutes.getUsers(req, res, null, parsedUrl); return;
  }
  if (req.method === 'POST' && pathname === '/api/users') {
    userRoutes.addUser(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'POST' && pathname === '/api/users/batch') {
    userRoutes.batchSaveUsers(req, res, readBodyWithLimit, checkAdminAuth); return;
  }
  if (req.method === 'GET' && pathname === '/api/users/my') {
    userRoutes.getMyUser(req, res); return;
  }
  if (req.method === 'PUT' && pathname === '/api/users/my') {
    userRoutes.updateMyUser(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'DELETE' && pathname === '/api/users/my') {
    userRoutes.deleteMyUser(req, res); return;
  }
  if (req.method === 'GET' && pathname === '/api/users/pending') {
    userRoutes.getPendingUsers(req, res, checkAdminAuth); return;
  }
  if (req.method === 'GET' && pathname === '/api/users/search') {
    userRoutes.searchUsers(req, res, parsedUrl); return;
  }
  // 带ID的用户路由
  if (req.method === 'PUT' && /^\/api\/users\/[^\/]+$/.test(pathname)) {
    userRoutes.editUser(req, res, readBodyWithLimit, checkAdminAuth, pathname); return;
  }
  if (req.method === 'DELETE' && /^\/api\/users\/[^\/]+$/.test(pathname)) {
    userRoutes.deleteUser(req, res, null, pathname); return;
  }
  if (req.method === 'POST' && /^\/api\/users\/[^\/]+\/approve$/.test(pathname)) {
    userRoutes.approveUser(req, res, checkAdminAuth, pathname); return;
  }
  if (req.method === 'POST' && /^\/api\/users\/[^\/]+\/reject$/.test(pathname)) {
    userRoutes.rejectUser(req, res, checkAdminAuth, pathname); return;
  }
  // --- 解锁联系方式（移到 routes 调用）---
  if (req.method === 'POST' && /^\/api\/users\/[^\/]+\/unlock-contact$/.test(pathname)) {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const targetId = extractId(pathname, 'users');
    readBodyWithLimit(req).then(body => {
      try {
        const data = JSON.parse(body);
        const viewerId = data.viewer_id || '';
        if (viewerId) paymentsDb.unlockContact(viewerId, targetId, '手动解锁');
        userDb.logAdminAction('unlock_contact', targetId, { viewerId, action: 'admin_unlock' });
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: true, message: '解锁成功'}));
      } catch (e) {
        res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: false, message: '请求格式错误'}));
      }
    }).catch(e => {
      res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: e.message}));
    });
    return;
  }
  if (req.method === 'GET' && /^\/api\/users\/[^\/]+\/check-unlock$/.test(pathname)) {
    const targetId = extractId(pathname, 'users');
    const viewerId = new URLSearchParams(parsedUrl.query).get('viewer_id') || '';
    const unlocked = paymentsDb.checkContactUnlocked(viewerId, targetId);
    let targetContact = null;
    if (unlocked) {
      const database = dbIndex.getDb();
      const stmt = database.prepare('SELECT contact FROM users WHERE user_id = ? OR id = ? LIMIT 1');
      const row = stmt.get(targetId, targetId);
      if (row && row.contact) targetContact = dbIndex.decrypt(row.contact);
    }
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: true, unlocked, contact: targetContact})); return;
  }
  if (req.method === 'GET' && pathname === '/api/admin/unlock-records') {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const records = paymentsDb.getAllUnlockRecords();
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: true, data: records})); return;
  }

  // --- 评价 ---
  if (req.method === 'POST' && pathname === '/api/ratings') {
    ratingRoutes.addRating(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'GET' && /^\/api\/users\/[^\/]+\/ratings$/.test(pathname)) {
    ratingRoutes.getRatings(req, res, pathname); return;
  }

  // --- 举报 ---
  if (req.method === 'POST' && pathname === '/api/reports') {
    reportRoutes.addReport(req, res); return;
  }
  if (req.method === 'GET' && pathname === '/api/reports') {
    reportRoutes.getAllReports(req, res, checkAdminAuth); return;
  }
  if (req.method === 'PUT' && /^\/api\/reports\/\d+\/status$/.test(pathname)) {
    reportRoutes.updateReportStatus(req, res, checkAdminAuth, pathname); return;
  }
  if (req.method === 'DELETE' && /^\/api\/reports\/\d+$/.test(pathname)) {
    reportRoutes.deleteReport(req, res, checkAdminAuth, pathname); return;
  }
  // --- 支付 ---
  if (req.method === 'POST' && pathname === '/api/payment/create') {
    paymentRoutes.createPayment(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'POST' && pathname === '/api/payment/notify-wechat') {
    paymentRoutes.wechatNotify(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'POST' && pathname === '/api/payment/notify-alipay') {
    paymentRoutes.alipayNotify(req, res, readBodyWithLimit); return;
  }
  if (req.method === 'GET' && pathname === '/api/payment/mock-pay') {
    paymentRoutes.mockPay(req, res, parsedUrl); return;
  }
  if (req.method === 'GET' && pathname === '/api/payment/status') {
    paymentRoutes.queryPaymentStatus(req, res, parsedUrl); return;
  }

  // --- 自定义筛选字段 ---
  if (req.method === 'GET' && pathname === '/api/custom-fields') {
    try {
      const fields = userDb.getAllCustomFilters();
      const parsed = fields.map(f => ({
        ...f,
        options: f.field_options ? f.field_options.split(',').filter(o => o.trim()) : []
      }));
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: true, data: parsed})); return;
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: err.message})); return;
    }
  }
  if (req.method === 'POST' && pathname === '/api/admin/custom-fields') {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    readBodyWithLimit(req).then(body => {
      try {
        const data = JSON.parse(body);
        if (!data.field_key || !data.field_label) {
          res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
          res.end(JSON.stringify({success: false, message: '字段名和显示名必填'})); return;
        }
        let fieldOptions = '';
        if (Array.isArray(data.field_options)) fieldOptions = data.field_options.join(',');
        else if (typeof data.field_options === 'string') fieldOptions = data.field_options;
        const field = userDb.addCustomFilter(
          data.field_key.trim(), data.field_label.trim(),
          data.field_type || 'text', data.description || '', fieldOptions
        );
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: true, data: field}));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({success: false, message: err.message}));
      }
    }).catch(e => {
      res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: e.message}));
    });
    return;
  }
  if (req.method === 'DELETE' && /^\/api\/admin\/custom-fields\/\d+$/.test(pathname)) {
    if (!checkAdminAuth(req)) {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '需要管理员权限'})); return;
    }
    const parts = pathname.split('/');
    const id = parseInt(parts[parts.length - 1]);
    if (!id) {
      res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({success: false, message: '无效的 ID'})); return;
    }
    const deleted = userDb.deleteCustomFilter(id);
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({success: deleted, message: deleted ? '删除成功' : '未找到'})); return;
  }

  // 404
  res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
  res.end('Not Found');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  // server is running
});

// ============================================================
// API 路由层 - 举报（只做 HTTP 解析 + 调用 Service + 返回 JSON）
// ============================================================

const reportsService = require('../services/reports.service');
const fs = require('fs');
const path = require('path');

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(obj));
}

function extractReportId(pathname) {
  const parts = pathname.split('/').filter(p => p);
  const idx = parts.indexOf('reports');
  if (idx !== -1 && idx + 1 < parts.length) {
    return parseInt(parts[idx + 1]);
  }
  return null;
}

// ========== POST /api/reports（含 multipart 文件上传）
function addReport(req, res, readBodyWithLimit) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { success: false, message: '未登录' });
    return;
  }
  const token = authHeader.slice(7);

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const contentType = req.headers['content-type'] || '';

  // multipart 表单
  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) { sendJson(res, 400, { success: false, message: '无效的表单数据' }); return; }
    const MAX_SIZE = 5 * 1024 * 1024;
    let chunks = [], size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > MAX_SIZE) { req.destroy(); return; } chunks.push(chunk); });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const boundaryBuf = Buffer.from('--' + boundary);
        const crlf = Buffer.from('\r\n');
        let reportedId = null, reportType = null, description = null, proofPath = null;
        
        let pos = 0;
        while (pos < body.length) {
          const boundaryStart = body.indexOf(boundaryBuf, pos);
          if (boundaryStart === -1) break;
          pos = boundaryStart + boundaryBuf.length;

          // 检查是否为结束边界 --boundary--
          if (body[pos] === 0x2D && body[pos + 1] === 0x2D) break;

          const headerStart = body.indexOf(crlf, pos) + 2;
          const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos) + 4;
          // 跳过无效边界，避免死循环
          if (headerStart < 4 || headerEnd < 4) { pos = boundaryStart + 1; continue; }

          const header = body.slice(headerStart, headerEnd - 4).toString('utf-8');

          if (header.includes('filename=')) {
            const fnMatch = header.match(/filename="([^"]+)"/);
            if (fnMatch && fnMatch[1]) {
              const ext = path.extname(fnMatch[1]);
              const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
              if (!allowed.includes(ext.toLowerCase())) { pos = body.indexOf(crlf, headerEnd) + 2; continue; }
              const dataStart = headerEnd;
              const dataEnd = body.indexOf(boundaryBuf, dataStart) - 2;
              if (dataEnd > dataStart) {
                const fileData = body.slice(dataStart, dataEnd);
                const fileName = 'report_' + Date.now() + ext;
                fs.writeFileSync(path.join(uploadsDir, fileName), fileData);
                proofPath = '/uploads/reports/' + fileName;
              }
            }
          } else {
            const nameMatch = header.match(/name="([^"]+)"/);
            if (nameMatch) {
              const fieldName = nameMatch[1];
              const valueStart = headerEnd;
              const valueEnd = body.indexOf(crlf, valueStart);
              if (valueEnd > valueStart) {
                const value = body.slice(valueStart, valueEnd).toString('utf-8');
                if (fieldName === 'reportedId') reportedId = value.trim();
                else if (fieldName === 'reportType') reportType = value.trim();
                else if (fieldName === 'description') description = value.trim();
              }
            }
          }
          pos = body.indexOf(crlf, headerEnd) + 2;
        }
        
        const result = reportsService.submitReport(token, reportedId, reportType, description, proofPath);
        sendJson(res, result.success ? 200 : 400, result);
      } catch(e) { sendJson(res, 500, { success: false, message: '举报失败' }); }
    });
    return;
  }

  // JSON - use readBodyWithLimit if available
  const readBody = readBodyWithLimit
    ? readBodyWithLimit(req)
    : new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => resolve(body));
        req.on('error', reject);
      });
  readBody.then(body => {
    try {
      const data = JSON.parse(body || '{}');
      const result = reportsService.submitReport(token, data.reportedId, data.reportType, data.description, null);
      sendJson(res, result.success ? 200 : 400, result);
    } catch (e) { sendJson(res, 500, { success: false, message: '举报失败' }); }
  }).catch(() => {
    sendJson(res, 500, { success: false, message: '读取请求体失败' });
  });
}

// ========== GET /api/admin/reports
function getAllReports(req, res, checkAdminAuth) {
  if (!checkAdminAuth(req)) {
    sendJson(res, 401, { success: false, message: '需要管理员权限' });
    return;
  }
  const reports = reportsService.getAllReportsForAdmin();
  sendJson(res, 200, reports);
}

// ========== PUT /api/admin/reports/:id
function updateReportStatus(req, res, checkAdminAuth, pathname) {
  if (!checkAdminAuth(req)) {
    sendJson(res, 401, { success: false, message: '需要管理员权限' });
    return;
  }
  const reportId = extractReportId(pathname);
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const result = reportsService.updateStatus(reportId, data.status, data.adminNote);
      sendJson(res, 200, result);
    } catch (e) { sendJson(res, 500, { success: false, message: '更新失败' }); }
  });
}

// ========== DELETE /api/admin/reports/:id
function deleteReport(req, res, checkAdminAuth, pathname) {
  if (!checkAdminAuth(req)) {
    sendJson(res, 401, { success: false, message: '需要管理员权限' });
    return;
  }
  const reportId = extractReportId(pathname);
  const result = reportsService.removeReport(reportId);
  sendJson(res, 200, result);
}

module.exports = { addReport, getAllReports, updateReportStatus, deleteReport };

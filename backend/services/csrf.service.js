const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_TTL_MS = 15 * 60 * 1000;
const csrfStore = new Map();

function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CSRF_TTL_MS;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${sessionId}:${token}:${expiresAt}`)
    .digest('hex');
  
  csrfStore.set(token, { sessionId, expiresAt, signature });
  
  cleanupExpired();
  
  return `${token}:${signature}`;
}

function verifyCsrfToken(token, sessionId) {
  cleanupExpired();
  
  if (!token) return false;
  
  const [csrfToken, signature] = token.split(':');
  if (!csrfToken || !signature) return false;
  
  const stored = csrfStore.get(csrfToken);
  if (!stored) return false;
  
  if (stored.sessionId !== sessionId) return false;
  
  if (Date.now() > stored.expiresAt) {
    csrfStore.delete(csrfToken);
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${sessionId}:${csrfToken}:${stored.expiresAt}`)
    .digest('hex');
  
  if (signature !== expectedSignature) return false;
  
  csrfStore.delete(csrfToken);
  return true;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [token, data] of csrfStore) {
    if (now > data.expiresAt) {
      csrfStore.delete(token);
    }
  }
}

function getCsrfTokenFromRequest(req) {
  return req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || null;
}

module.exports = {
  generateCsrfToken,
  verifyCsrfToken,
  getCsrfTokenFromRequest,
  cleanupExpired
};
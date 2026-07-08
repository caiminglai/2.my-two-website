// ============================================================
// Cookie 工具 - httpOnly cookie 管理
// 用于替代 localStorage 存储 auth_token，防止 XSS 攻击
// ============================================================

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [key, ...rest] = pair.split('=');
    const k = key && key.trim();
    if (k) cookies[k] = decodeURIComponent(rest.join('=').trim());
  });
  return cookies;
}

function getAuthTokenFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.auth_token || null;
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `auth_token=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800'
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0');
}

module.exports = { parseCookies, getAuthTokenFromCookie, setAuthCookie, clearAuthCookie };

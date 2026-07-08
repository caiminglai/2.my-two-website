/**
 * 带认证的 fetch 封装
 * - 自动附加 Authorization header（从 localStorage 读取）
 * - 自动携带 credentials: 'include'（发送 httpOnly cookie）
 * - 后端同时支持 header 和 cookie 两种认证方式
 */

import { API_BASE_URL } from './config';

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authToken = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers || {});
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * 构建完整 API URL
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

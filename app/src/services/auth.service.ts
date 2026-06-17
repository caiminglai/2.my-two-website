/**
 * 认证服务（业务逻辑层）
 * 负责：登录注册、Token 管理、用户会话
 */

import { API_BASE_URL, API_ENDPOINTS } from '../api/config';

const LS_USER_ID = 'user_id';
const LS_USER_NICKNAME = 'user_nickname';
const LS_AUTH_TOKEN = 'auth_token';
const LS_ADMIN_TOKEN = 'admin_token';

export async function login(phone: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.login}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (data.success) {
      if (data.token) localStorage.setItem(LS_AUTH_TOKEN, data.token);
      if (data.user?.id) localStorage.setItem(LS_USER_ID, String(data.user.id));
      if (data.user?.nickname) localStorage.setItem(LS_USER_NICKNAME, data.user.nickname);
      return { success: true };
    }
    return { success: false, message: data.message || '登录失败' };
  } catch (e) {
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

export async function register(phone: string, password: string, nickname: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.register}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, nickname })
    });
    const data = await res.json();
    if (data.success) {
      if (data.token) localStorage.setItem(LS_AUTH_TOKEN, data.token);
      if (data.user?.id) localStorage.setItem(LS_USER_ID, String(data.user.id));
      if (data.user?.nickname) localStorage.setItem(LS_USER_NICKNAME, data.user.nickname);
      return { success: true };
    }
    return { success: false, message: data.message || '注册失败' };
  } catch (e) {
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

export function logout(): void {
  localStorage.removeItem(LS_AUTH_TOKEN);
  localStorage.removeItem(LS_USER_ID);
  localStorage.removeItem(LS_USER_NICKNAME);
}

export function getCurrentUser(): { id: string; nickname: string; token: string } | null {
  const id = localStorage.getItem(LS_USER_ID);
  const nickname = localStorage.getItem(LS_USER_NICKNAME);
  const token = localStorage.getItem(LS_AUTH_TOKEN);
  if (!id || !token) return null;
  return { id, nickname: nickname || '', token };
}

export function getToken(): string | null {
  return localStorage.getItem(LS_AUTH_TOKEN);
}

export function getUserId(): string | null {
  return localStorage.getItem(LS_USER_ID);
}

export function getUserNickname(): string | null {
  return localStorage.getItem(LS_USER_NICKNAME);
}

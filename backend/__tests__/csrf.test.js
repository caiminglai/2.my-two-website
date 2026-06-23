const { generateCsrfToken, verifyCsrfToken, getCsrfTokenFromRequest } = require('../services/csrf.service');

describe('CSRF Token 功能', () => {
  test('generateCsrfToken 应该生成有效的 CSRF Token', () => {
    const sessionId = 'testsession123';
    const token = generateCsrfToken(sessionId);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split(':').length).toBe(2);
  });

  test('verifyCsrfToken 应该正确验证有效的 Token', () => {
    const sessionId = 'testsession123';
    const token = generateCsrfToken(sessionId);
    
    expect(verifyCsrfToken(token, sessionId)).toBe(true);
  });

  test('verifyCsrfToken 应该拒绝无效的 Token', () => {
    const sessionId = 'testsession123';
    const token = generateCsrfToken(sessionId);
    
    expect(verifyCsrfToken('invalid-token', sessionId)).toBe(false);
    expect(verifyCsrfToken('', sessionId)).toBe(false);
    expect(verifyCsrfToken(null, sessionId)).toBe(false);
  });

  test('verifyCsrfToken 应该拒绝不同会话的 Token', () => {
    const sessionId1 = 'session1';
    const sessionId2 = 'session2';
    const token = generateCsrfToken(sessionId1);
    
    expect(verifyCsrfToken(token, sessionId2)).toBe(false);
  });

  test('Token 只能使用一次', () => {
    const sessionId = 'testsession123';
    const token = generateCsrfToken(sessionId);
    
    expect(verifyCsrfToken(token, sessionId)).toBe(true);
    expect(verifyCsrfToken(token, sessionId)).toBe(false);
  });

  test('getCsrfTokenFromRequest 应该从请求头获取 Token', () => {
    const req = {
      headers: {
        'x-csrf-token': 'test-csrf-token'
      }
    };
    expect(getCsrfTokenFromRequest(req)).toBe('test-csrf-token');
  });

  test('getCsrfTokenFromRequest 应该支持 x-xsrf-token 头', () => {
    const req = {
      headers: {
        'x-xsrf-token': 'test-xsrf-token'
      }
    };
    expect(getCsrfTokenFromRequest(req)).toBe('test-xsrf-token');
  });

  test('getCsrfTokenFromRequest 在没有 Token 时应该返回 null', () => {
    const req = { headers: {} };
    expect(getCsrfTokenFromRequest(req)).toBe(null);
  });
});
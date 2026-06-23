const { hashPasswordSync, verifyPasswordSync, generateToken, verifyToken, generateAdminToken, verifyAdminToken } = require('../db/index');

describe('密码哈希功能', () => {
  test('hashPasswordSync 应该生成 bcrypt 哈希', () => {
    const password = 'test123456';
    const hash = hashPasswordSync(password);
    
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(50);
    expect(hash.startsWith('$2b$') || hash.startsWith('$2a$')).toBe(true);
  });

  test('verifyPasswordSync 应该正确验证 bcrypt 密码', () => {
    const password = 'test123456';
    const hash = hashPasswordSync(password);
    
    expect(verifyPasswordSync(password, hash)).toBe(true);
    expect(verifyPasswordSync('wrongpassword', hash)).toBe(false);
  });

  test('verifyPasswordSync 应该向后兼容 SHA256 密码', () => {
    const password = 'test123456';
    const sha256Hash = require('crypto').createHash('sha256').update(password).digest('hex');
    
    expect(verifyPasswordSync(password, sha256Hash)).toBe(true);
    expect(verifyPasswordSync('wrongpassword', sha256Hash)).toBe(false);
  });

  test('verifyPasswordSync 应该处理无效哈希', () => {
    expect(verifyPasswordSync('password', null)).toBe(false);
    expect(verifyPasswordSync('password', '')).toBe(false);
    expect(verifyPasswordSync('password', 'invalidhash')).toBe(false);
  });
});

describe('Token 功能', () => {
  test('generateToken 应该生成有效 Token', () => {
    const userId = 'testuser123';
    const token = generateToken(userId);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  test('verifyToken 应该正确验证 Token', () => {
    const userId = 'testuser123';
    const token = generateToken(userId);
    
    const verifiedUserId = verifyToken(token);
    expect(verifiedUserId).toBe(userId);
  });

  test('verifyToken 应该拒绝无效 Token', () => {
    expect(verifyToken('invalid.token')).toBe(null);
    expect(verifyToken('')).toBe(null);
    expect(verifyToken(null)).toBe(null);
  });

  test('generateAdminToken 和 verifyAdminToken 应该正常工作', () => {
    const username = 'admin';
    const token = generateAdminToken(username);
    
    expect(token).toBeDefined();
    
    const verifiedUsername = verifyAdminToken(token);
    expect(verifiedUsername).toBe(username);
  });

  test('verifyAdminToken 应该拒绝普通用户 Token', () => {
    const userId = 'testuser123';
    const userToken = generateToken(userId);
    
    expect(verifyAdminToken(userToken)).toBe(null);
  });
});
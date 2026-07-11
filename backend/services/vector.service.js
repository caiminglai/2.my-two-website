const vectorDb = require('../db/vector');
const userDb = require('../db/users');

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || '';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-ada-002';

function buildProfileText(userData) {
  const parts = [];
  if (userData.gender) parts.push(`性别：${userData.gender}`);
  if (userData.age) parts.push(`年龄：${userData.age}岁`);
  if (userData.height) parts.push(`身高：${userData.height}cm`);
  if (userData.weight) parts.push(`体重：${userData.weight}kg`);
  if (userData.skin_tone) parts.push(`肤色：${userData.skin_tone}`);
  if (userData.zodiac) parts.push(`星座：${userData.zodiac}`);
  if (userData.blood_type) parts.push(`血型：${userData.blood_type}`);
  if (userData.city) parts.push(`所在城市：${userData.city}`);
  if (userData.marriage) parts.push(`婚姻状况：${userData.marriage}`);
  if (userData.education) parts.push(`学历：${userData.education}`);
  if (userData.job) parts.push(`职业：${userData.job}`);
  if (userData.income) parts.push(`收入：${userData.income}`);
  if (userData.hobbies) parts.push(`兴趣爱好：${userData.hobbies}`);
  if (userData.personality) parts.push(`性格特点：${userData.personality}`);
  if (userData.purpose) parts.push(`交友目的：${userData.purpose}`);
  return parts.join('；');
}

function buildExpectationText(userData) {
  const parts = [];
  if (userData.expectation) parts.push(userData.expectation);
  if (userData.interest_tags) parts.push(`兴趣标签：${userData.interest_tags}`);
  return parts.join('；');
}

async function generateEmbedding(text) {
  if (!text || !text.trim()) return null;

  if (EMBEDDING_PROVIDER === 'mock') {
    return generateMockEmbedding(text);
  }

  if (!EMBEDDING_API_KEY) {
    throw new Error('未配置 EMBEDDING_API_KEY，请设置环境变量或使用 mock 模式');
  }

  const url = EMBEDDING_PROVIDER === 'openai'
    ? 'https://api.openai.com/v1/embeddings'
    : process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EMBEDDING_API_KEY}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`向量生成失败: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function generateMockEmbedding(text) {
  const dim = vectorDb.VECTOR_DIMENSION;
  const vector = new Array(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const seed = (hash * (i + 1)) % 10000 / 10000;
    vector[i] = seed * 2 - 1;
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  return vector.map(v => v / norm);
}

async function generateAndStoreUserVector(userId) {
  const user = userDb.getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const profileText = buildProfileText(user);
  const expectationText = buildExpectationText(user);

  const [profileVector, expectationVector] = await Promise.all([
    generateEmbedding(profileText),
    generateEmbedding(expectationText)
  ]);

  const profileVecStr = profileVector ? `[${profileVector.join(',')}]` : null;
  const expectationVecStr = expectationVector ? `[${expectationVector.join(',')}]` : null;

  vectorDb.upsertUserVector(
    userId,
    profileVecStr,
    expectationVecStr,
    profileText,
    expectationText,
    EMBEDDING_MODEL
  );

  return { profileText, expectationText };
}

async function findSimilarUsers(userId, type = 'profile', limit = 10) {
  const userVector = vectorDb.getUserVector(userId);
  if (!userVector) {
    await generateAndStoreUserVector(userId);
  }

  const vector = type === 'profile'
    ? userVector.profile_vector
    : userVector.expectation_vector;

  if (!vector) {
    return [];
  }

  const results = type === 'profile'
    ? vectorDb.findSimilarUsersByProfile(vector, limit, userId)
    : vectorDb.findSimilarUsersByExpectation(vector, limit, userId);

  return results.map(r => {
    const user = userDb.getUserById(r.user_id);
    return {
      ...user,
      similarity: r.similarity
    };
  }).filter(u => u.id);
}

async function findMutualMatches(userId, limit = 10) {
  const userVector = vectorDb.getUserVector(userId);
  if (!userVector) {
    await generateAndStoreUserVector(userId);
  }

  const results = vectorDb.findMutualMatchUsers(userId, limit);
  return results.map(r => {
    const user = userDb.getUserById(r.user_id);
    return {
      ...user,
      profile_match_score: r.profile_match_score,
      expectation_match_score: r.expectation_match_score,
      mutual_score: r.mutual_score
    };
  }).filter(u => u.id);
}

async function batchGenerateVectors(limit = 100) {
  const users = userDb.getUserList(1, limit, {});
  const results = [];

  for (const user of users.users) {
    try {
      await generateAndStoreUserVector(user.id);
      results.push({ userId: user.id, success: true });
    } catch (e) {
      results.push({ userId: user.id, success: false, error: e.message });
    }
  }

  return results;
}

function getStats() {
  return vectorDb.getVectorStats();
}

module.exports = {
  buildProfileText,
  buildExpectationText,
  generateEmbedding,
  generateAndStoreUserVector,
  findSimilarUsers,
  findMutualMatches,
  batchGenerateVectors,
  getStats
};

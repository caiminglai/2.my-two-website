const http = require('http');

const HOST = 'localhost';
const PORT = 8080;
const PREFIX = '/jzxr';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (data) reqHeaders['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: PREFIX + path,
      method,
      headers: reqHeaders,
      timeout: 10000,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve({ status: res.statusCode, data, raw });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function createUserAndProfile(suffix) {
  const ts = Date.now();
  const phone = '1' + String(ts + suffix).slice(-10);
  const password = 'test1234';

  const reg = await request('POST', '/api/auth/register', { phone, password, nickname: 'Tester' + suffix });
  if (!reg.data?.success && !reg.data?.message?.includes('已存在')) {
    throw new Error('注册失败: ' + JSON.stringify(reg.data));
  }

  const login = await request('POST', '/api/auth/login', { phone, password });
  if (!login.data?.success) throw new Error('登录失败: ' + JSON.stringify(login.data));
  const token = login.data.token;

  const profile = await request('POST', '/api/users', {
    name: `测试用户${suffix}`,
    gender: suffix % 2 === 0 ? '女' : '男',
    age: 25 + (suffix % 10),
    city: '北京',
    education: '本科',
    job: '测试工程师',
    purpose: '交友',
    contact: '138' + String(Math.random()).slice(2, 10),
  }, { Authorization: `Bearer ${token}` });

  if (!profile.data?.success && !profile.data?.message?.includes('已创建')) {
    throw new Error('创建资料失败: ' + JSON.stringify(profile.data));
  }

  return { token, phone };
}

async function run() {
  try {
    // 1. 先获取公开用户列表
    let listRes = await request('GET', '/api/users?page=1&limit=5');
    let targetId = null;

    if (listRes.data?.success && Array.isArray(listRes.data.data) && listRes.data.data.length > 0) {
      targetId = listRes.data.data[0].id;
      console.log('使用现有目标用户:', listRes.data.data[0].data?.name || targetId);
    } else {
      // 没有现有用户时，创建一个目标用户
      const target = await createUserAndProfile(999);
      const myRes = await request('GET', '/api/users/my', { Authorization: `Bearer ${target.token}` });
      targetId = myRes.data?.data?.id;
      console.log('创建目标用户:', targetId);
    }

    // 2. 创建 4 个测试评价者并分别评价目标用户
    const comments = [
      { rating: 5, comment: '资料真实，沟通很愉快，推荐认识！' },
      { rating: 4, comment: '人很真诚，见面准时，整体不错。' },
      { rating: 5, comment: '信息准确，没有夸大，值得信赖。' },
      { rating: 3, comment: '还可以，但照片上看起来比实际年轻一些。' },
    ];

    for (let i = 0; i < comments.length; i++) {
      const rater = await createUserAndProfile(i + 1);
      const ratingRes = await request('POST', '/api/ratings', {
        ratedId: targetId,
        rating: comments[i].rating,
        comment: comments[i].comment,
      }, { Authorization: `Bearer ${rater.token}` });

      if (ratingRes.data?.success) {
        console.log(`✓ 评价 ${i + 1} 创建成功: ${comments[i].rating}星`);
      } else {
        console.log(`✗ 评价 ${i + 1} 失败:`, ratingRes.data?.message || ratingRes.raw);
      }
    }

    console.log('\n测试评价已生成，目标用户ID:', targetId);
    console.log('可在前端打开该用户详情页查看评价展示效果。');
  } catch (e) {
    console.error('脚本执行失败:', e.message);
  }
}

run();

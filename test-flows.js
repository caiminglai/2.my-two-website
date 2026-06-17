const http = require('http');

const API = 'http://localhost:8080';
const ADMIN_PASSWORD = 'your_admin_password';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  const report = [];
  const ts = Date.now();
  const phone = '1' + String(ts).slice(-10);
  const password = 'test1234';
  const nickname = 'Tester' + ts;
  let token = null;
  let userId = null;
  let adminToken = null;

  function log(step, ok, detail) {
    report.push({ step, ok, detail });
    console.log(`${ok ? '✓' : '✗'} ${step}: ${detail}`);
  }

  try {
    // 1. 公开用户列表
    const listRes = await request('GET', '/api/users?page=1&limit=5');
    log('公开用户列表', listRes.status === 200 && listRes.data?.success, `status=${listRes.status}, hasData=${!!listRes.data?.data}`);
    const targetId = listRes.data?.data?.[0]?.id || 'some_user_id';

    // 2. 搜索
    const searchRes = await request('GET', '/api/users/search?keyword=' + encodeURIComponent('北京') + '&limit=5');
    log('用户搜索', searchRes.status === 200 && searchRes.data?.success, `status=${searchRes.status}`);

    // 3. 注册
    const regRes = await request('POST', '/api/auth/register', { phone, password, nickname });
    log('用户注册', regRes.status === 200 && regRes.data?.success, `status=${regRes.status}, msg=${regRes.data?.message || ''}`);
    if (regRes.data?.token) {
      token = regRes.data.token;
      userId = regRes.data.user?.id;
    }

    // 4. 登录
    const loginRes = await request('POST', '/api/auth/login', { phone, password });
    log('用户登录', loginRes.status === 200 && loginRes.data?.success, `status=${loginRes.status}, hasToken=${!!loginRes.data?.token}`);
    if (loginRes.data?.token) {
      token = loginRes.data.token;
      userId = loginRes.data.user?.id;
    }

    // 5. 获取当前用户
    const myRes = await request('GET', '/api/users/my', null, { Authorization: `Bearer ${token}` });
    log('获取当前用户', myRes.status === 200 && myRes.data?.success, `status=${myRes.status}, hasUser=${!!myRes.data?.user}`);

    // 6. 发布资料
    const row = {
      id: 'r' + ts,
      user_id: userId,
      deposit: 29.9,
      createdAt: Date.now(),
      data: {
        name: nickname,
        gender: '男',
        age: '25',
        city: '北京',
        contact: '13800138000',
        purpose: '找对象'
      }
    };
    const postRes = await request('POST', '/api/users', row, { Authorization: `Bearer ${token}` });
    log('发布资料', postRes.status === 200 && postRes.data?.success, `status=${postRes.status}, msg=${postRes.data?.message || ''}`);

    // 7. 再次获取当前用户
    const my2Res = await request('GET', '/api/users/my', null, { Authorization: `Bearer ${token}` });
    log('发布后再获取用户', my2Res.status === 200 && my2Res.data?.user, `status=${my2Res.status}`);

    // 8. 修改密码（SettingsPage 调用）
    const changePwdRes = await request('POST', '/api/auth/change-password', { oldPassword: password, newPassword: 'newpass123' }, { Authorization: `Bearer ${token}` });
    log('修改密码', changePwdRes.status === 200 && changePwdRes.data?.success, `status=${changePwdRes.status}, msg=${changePwdRes.data?.message || ''}`);

    // 8.1 用新密码登录验证
    const newLoginRes = await request('POST', '/api/auth/login', { phone, password: 'newpass123' });
    log('新密码登录验证', newLoginRes.status === 200 && newLoginRes.data?.success, `status=${newLoginRes.status}, hasToken=${!!newLoginRes.data?.token}`);

    // 9. 上传头像（模拟，跳过文件内容，只测接口存在性）
    const avatarForm = `--boundary\r\nContent-Disposition: form-data; name="avatar"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n${Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('binary')}\r\n--boundary--\r\n`;
    const avatarRes = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: 'localhost', port: 8080, path: '/api/upload/avatar', method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=boundary', 'Authorization': `Bearer ${token}` } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data), raw: data }); } catch(e) { resolve({ status: res.statusCode, data: null, raw: data }); } });
      });
      req.on('error', reject);
      req.write(avatarForm, 'binary');
      req.end();
    });
    log('上传头像', avatarRes.status !== 404, `status=${avatarRes.status}, msg=${avatarRes.data?.message || avatarRes.raw?.slice(0, 50)}`);

    // 10. 获取保证金状态
    const depRes = await request('GET', '/api/users/my-deposit', null, { Authorization: `Bearer ${token}` });
    log('获取保证金状态', depRes.status === 200 && depRes.data?.success, `status=${depRes.status}`);

    // 11. 提交保证金凭证
    const proofForm = `--boundary\r\nContent-Disposition: form-data; name="proof"; filename="proof.png"\r\nContent-Type: image/png\r\n\r\n${Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('binary')}\r\n--boundary--\r\n`;
    const proofRes = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: 'localhost', port: 8080, path: '/api/deposit/upload-proof', method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=boundary', 'Authorization': `Bearer ${token}` } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data), raw: data }); } catch(e) { resolve({ status: res.statusCode, data: null, raw: data }); } });
      });
      req.on('error', reject);
      req.write(proofForm, 'binary');
      req.end();
    });
    log('提交保证金凭证', proofRes.status !== 404, `status=${proofRes.status}, msg=${proofRes.data?.message || proofRes.raw?.slice(0, 50)}`);

    // 12. 自动支付创建订单
    const payRes = await request('POST', '/api/payment/create', { channel: 'alipay', amount: 29.9 }, { Authorization: `Bearer ${token}` });
    log('创建支付订单', payRes.status === 200 && payRes.data?.success, `status=${payRes.status}, hasPayUrl=${!!payRes.data?.payUrl}`);

    // 13. 提交举报
    const reportRes = await request('POST', '/api/reports', { reportedId: targetId, reportType: '虚假信息', description: '测试举报' }, { Authorization: `Bearer ${token}` });
    log('提交举报(JSON)', reportRes.status === 200 && reportRes.data?.success, `status=${reportRes.status}, msg=${reportRes.data?.message || ''}`);

    // 14. 提交评价
    const ratingRes = await request('POST', '/api/ratings', { ratedId: targetId, rating: 5, comment: '测试评价' }, { Authorization: `Bearer ${token}` });
    log('提交评价', ratingRes.status === 200 && ratingRes.data?.success, `status=${ratingRes.status}, msg=${ratingRes.data?.message || ''}`);

    // 15. 发送消息
    const msgRes = await request('POST', '/api/message/send', { toUserId: targetId, content: '测试消息' }, { Authorization: `Bearer ${token}` });
    log('发送消息', msgRes.status === 200 && msgRes.data?.success, `status=${msgRes.status}, msg=${msgRes.data?.message || ''}`);

    // 16. 检查解锁状态
    const unlockRes = await request('GET', '/api/users/some_user_id/check-unlock?viewer_id=' + userId);
    log('检查解锁状态', unlockRes.status === 200 && unlockRes.data?.success, `status=${unlockRes.status}`);

    // 16. 管理员登录
    const adminLoginRes = await request('POST', '/api/admin/login', { password: ADMIN_PASSWORD });
    log('管理员登录', adminLoginRes.status === 200 && adminLoginRes.data?.success, `status=${adminLoginRes.status}, hasToken=${!!adminLoginRes.data?.token}`);
    if (adminLoginRes.data?.token) adminToken = adminLoginRes.data.token;

    // 17. 管理员获取统计
    const statsRes = await request('GET', '/api/admin/stats', null, { Authorization: `Bearer ${adminToken}` });
    log('管理员统计', statsRes.status === 200 && statsRes.data?.success, `status=${statsRes.status}`);

    // 18. 管理员获取用户列表
    const adminUsersRes = await request('GET', '/api/users?page=1&limit=5', null, { Authorization: `Bearer ${adminToken}` });
    log('管理员用户列表', adminUsersRes.status === 200 && adminUsersRes.data?.success, `status=${adminUsersRes.status}`);

    // 19. 管理员获取举报列表
    const adminReportsRes = await request('GET', '/api/reports', null, { Authorization: `Bearer ${adminToken}` });
    log('管理员举报列表', adminReportsRes.status === 200, `status=${adminReportsRes.status}`);

    // 20. 管理员获取保证金列表
    const adminDepositsRes = await request('GET', '/api/admin/deposits', null, { Authorization: `Bearer ${adminToken}` });
    log('管理员保证金列表', adminDepositsRes.status === 200 && adminDepositsRes.data?.success, `status=${adminDepositsRes.status}`);

    // 21. 管理员获取解锁记录
    const adminUnlockRes = await request('GET', '/api/admin/unlock-contact-requests', null, { Authorization: `Bearer ${adminToken}` });
    log('管理员解锁记录', adminUnlockRes.status === 200 && adminUnlockRes.data?.success, `status=${adminUnlockRes.status}`);

    // 22. 删除当前用户资料
    const delRes = await request('DELETE', '/api/users/my', null, { Authorization: `Bearer ${token}` });
    log('删除当前用户资料', delRes.status === 200 && delRes.data?.success, `status=${delRes.status}, msg=${delRes.data?.message || ''}`);

  } catch (e) {
    console.error('测试异常:', e.message);
  }

  console.log('\n===== 汇总 =====');
  const failed = report.filter(r => !r.ok);
  console.log(`通过: ${report.length - failed.length}/${report.length}`);
  if (failed.length) {
    console.log('失败项:');
    failed.forEach(f => console.log(`  - ${f.step}: ${f.detail}`));
  }
}

runTests();

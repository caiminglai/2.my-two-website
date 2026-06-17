import { Link } from 'react-router';
import { ArrowLeft, Server, Globe, Terminal, FileText, Settings, Rocket } from 'lucide-react';

const CODE_STYLE = { background: '#F5EDE3', border: '1px solid #E8DED0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#3D2E20', fontFamily: 'monospace', overflowX: 'auto' as const };

export default function DeployGuide() {
  return (
    <div className="min-h-screen" style={{ background: '#FAF6F1' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-orange-50" style={{ color: '#B5A698' }}>
            <ArrowLeft size={18} />
          </Link>
          <Rocket size={16} style={{ color: '#E87A5D' }} />
          <h1 className="text-lg font-medium" style={{ color: '#3D2E20' }}>部署指南</h1>
        </div>

        {/* Overview */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(232,122,93,0.04), #FFFDF9)', border: '1px solid #F5D0C4' }}>
          <h2 className="text-sm font-medium mb-2" style={{ color: '#E87A5D' }}>技术架构</h2>
          <div className="text-xs space-y-1" style={{ color: '#8B7B6B' }}>
            <p><strong>前端</strong>：React 19 + TypeScript + Tailwind CSS + Vite</p>
            <p><strong>后端</strong>：Node.js 原生 HTTP + SQLite（better-sqlite3）</p>
            <p><strong>部署</strong>：VPS / 云服务器 + Nginx 反向代理</p>
            <p><strong>数据</strong>：SQLite 文件数据库 + localStorage 前端缓存</p>
          </div>
        </div>

        {/* Option 1: Static Deploy */}
        <div className="rounded-xl p-4 mb-3" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={15} style={{ color: '#6BAF7D' }} />
            <h3 className="text-sm font-medium" style={{ color: '#3D2E20' }}>方案一：纯静态部署（最简单）</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B7B6B' }}>数据存在用户浏览器里，不需要服务器和数据库。适合小规模使用。</p>

          <h4 className="text-xs font-medium mb-1" style={{ color: '#3D2E20' }}>1. 构建</h4>
          <pre style={CODE_STYLE}>{`cd app
npm install
npm run build`}</pre>

          <h4 className="text-xs font-medium mb-1 mt-3" style={{ color: '#3D2E20' }}>2. 部署到任何静态服务器</h4>
          <pre style={CODE_STYLE}>{`# app/dist/ 目录就是完整前端网站
# 上传到以下任意平台：`}</pre>

          <div className="mt-2 text-xs space-y-1" style={{ color: '#8B7B6B' }}>
            <p>• <strong>Vercel</strong>：把 app/dist 推送到 GitHub，连接 Vercel 自动部署</p>
            <p>• <strong>Netlify</strong>：直接拖拽 app/dist 文件夹上传</p>
            <p>• <strong>Cloudflare Pages</strong>：连接 Git 仓库自动构建</p>
            <p>• <strong>阿里云 OSS / 腾讯云 COS</strong>：开启静态网站托管</p>
            <p>• <strong>Nginx</strong>：把 app/dist 放到 /var/www/html</p>
            <p>• <strong>自己的 VPS</strong>：用 scp 上传，用 Nginx 或 Caddy Serve</p>
          </div>
        </div>

        {/* Option 2: Full Stack */}
        <div className="rounded-xl p-4 mb-3" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Server size={15} style={{ color: '#E87A5D' }} />
            <h3 className="text-sm font-medium" style={{ color: '#3D2E20' }}>方案二：全栈部署（有后端+数据库）</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B7B6B' }}>数据存在 SQLite 数据库里，支持多用户、真实认证、数据持久化。</p>

          <h4 className="text-xs font-medium mb-1" style={{ color: '#3D2E20' }}>1. 环境要求</h4>
          <div className="text-xs space-y-1 mb-3" style={{ color: '#8B7B6B' }}>
            <p>• Node.js 18+</p>
            <p>• 域名（可选，用于 HTTPS）</p>
          </div>

          <h4 className="text-xs font-medium mb-1" style={{ color: '#3D2E20' }}>2. 配置后端</h4>
          <pre style={CODE_STYLE}>{`cd backend
npm install

# 复制环境变量配置文件
cp .env.example .env
# 编辑 .env 修改管理员密码等配置

# 启动后端服务（默认端口 8080）
node server.js`}</pre>

          <h4 className="text-xs font-medium mb-1 mt-3" style={{ color: '#3D2E20' }}>3. 已有后端代码文件</h4>
          <div className="text-xs space-y-1" style={{ color: '#8B7B6B' }}>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>server.js</code> — HTTP 服务器 + 路由调度</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>database.js</code> — SQLite 数据库操作</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>routes/auth.js</code> — 注册/登录认证</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>routes/users.js</code> — 用户 CRUD + 搜索 + 审核</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>routes/ratings.js</code> — 评价系统</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>routes/reports.js</code> — 举报管理</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>routes/upload.js</code> — 头像上传 + 静态文件服务</p>
            <p>• <code style={{ background: '#F5EDE3', padding: '1px 4px', borderRadius: '3px' }}>.env</code> — 端口、管理员密码、跨域配置</p>
          </div>

          <h4 className="text-xs font-medium mb-1 mt-3" style={{ color: '#3D2E20' }}>4. 生产环境启动</h4>
          <pre style={CODE_STYLE}>{`# 构建前端
cd app && npm run build

# 启动后端（同时服务API和前端静态文件）
cd backend && node server.js

# 默认端口 8080，用 Nginx 反向代理到 80/443`}</pre>
        </div>

        {/* Option 3: Docker */}
        <div className="rounded-xl p-4 mb-3" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={15} style={{ color: '#E87A5D' }} />
            <h3 className="text-sm font-medium" style={{ color: '#3D2E20' }}>方案三：Docker 部署</h3>
          </div>
          <pre style={CODE_STYLE}>{`# Dockerfile
FROM node:20-alpine
WORKDIR /app

# 安装后端依赖
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# 安装前端依赖并构建
COPY app/package*.json ./app/
RUN cd app && npm ci
COPY app/ ./app/
RUN cd app && npm run build

# 复制后端代码
COPY backend/ ./backend/

EXPOSE 8080
CMD ["node", "backend/server.js"]

# docker-compose.yml
version: '3'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - ADMIN_PASSWORD=your_secure_password
      - FRONTEND_URL=http://your-domain.com
    volumes:
      - ./data:/app/backend/match.db
      - ./uploads:/app/backend/uploads`}</pre>
        </div>

        {/* File Structure */}
        <div className="rounded-xl p-4 mb-3" style={{ background: '#FFFDF9', border: '1px solid #F0E4D4' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} style={{ color: '#B5A698' }} />
            <h3 className="text-sm font-medium" style={{ color: '#3D2E20' }}>项目文件结构</h3>
          </div>
          <pre style={CODE_STYLE}>{`app/src/                  # 前端
  pages/
    Home.tsx         # 首页（筛选面板 + 卡片列表）
    PostPage.tsx     # 发布资料页
    DepositPage.tsx  # 保证金制度页
    QrPage.tsx       # 微信分享/二维码页
    DeployGuide.tsx  # 部署指南页
    LoginPage.tsx    # 登录/注册页
    ProfilePage.tsx  # 个人中心页
    CirclesPage.tsx  # 圈子页
    SettingsPage.tsx # 设置页
  components/        # 可复用组件
    UserCard.tsx     # 用户卡片
    DetailModal.tsx  # 详情弹窗
    RatingModal.tsx  # 评价弹窗
    ReportModal.tsx  # 举报弹窗
  data/
    table.ts         # 列定义 + 行操作 + 匹配算法
  App.tsx            # 路由配置
  main.tsx           # 入口文件

backend/                 # 后端
  server.js             # HTTP 服务器 + 路由调度
  database.js           # SQLite 数据库操作
  routes/
    auth.js             # 注册/登录认证
    users.js            # 用户 CRUD + 搜索 + 审核
    ratings.js          # 评价系统
    reports.js          # 举报管理
    upload.js           # 头像上传 + 静态文件
  admin/
    login.html          # 管理后台登录页
    main.html           # 管理后台主页
    style.css           # 管理后台样式
    app.js              # 管理后台逻辑
  .env                  # 环境变量配置`}</pre>
        </div>

        {/* Current Status */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(107,175,125,0.04)', border: '1px solid #C4E0CC' }}>
          <div className="flex items-center gap-2 mb-3">
            <Settings size={15} style={{ color: '#6BAF7D' }} />
            <h3 className="text-sm font-medium" style={{ color: '#3D2E20' }}>当前版本状态</h3>
          </div>
          <div className="text-xs space-y-1" style={{ color: '#8B7B6B' }}>
            <p>✅ 前端页面完整（首页、发布、保证金、二维码、登录、个人中心、圈子、设置）</p>
            <p>✅ 后端 API 完整（Node.js + SQLite，用户认证、CRUD、评价、举报）</p>
            <p>✅ 匹配算法完整（多条件 + 范围 + 比较 + 多关键词）</p>
            <p>✅ 保证金制度前端逻辑完整</p>
            <p>✅ 管理后台完整（用户管理、举报管理、审核、筛选、导出CSV）</p>
            <p>✅ 安全措施（速率限制、JWT认证、文件上传校验、XSS防护）</p>
            <p>⬜ 需要配置支付接口才能实现真实的保证金缴纳</p>
          </div>
        </div>

        <Link to="/" className="block w-full text-center py-3 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #E87A5D, #D96A4D)' }}>
          返回首页
        </Link>
      </div>
    </div>
  );
}

# 精准匹配 - 相亲平台

基于 Web 的相亲匹配平台。给一个人贴很多标签，按特定标签筛选，相当于线上 Excel 表格。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS |
| 后端 | Node.js 原生 HTTP 服务器（非 Express） |
| 数据库 | SQLite (better-sqlite3) |
| 部署 | 阿里云 + Nginx + PM2 |

## 目录结构

```
2.my-two-website/
├── app/                    # 前端（React + Vite）
│   ├── src/
│   │   ├── components/     # 公共组件（13 个）
│   │   ├── pages/          # 页面组件（11 个）
│   │   ├── services/       # 业务服务层
│   │   └── api/            # API 请求配置
│   └── vite.config.ts
│
├── backend/                # 后端（三层架构）
│   ├── db/                 # 数据访问层（8 个文件）
│   ├── routes/             # API 路由层（6 个文件）
│   ├── services/           # 业务逻辑层（8 个文件）
│   ├── admin/              # 管理后台 HTML 模板
│   ├── server.js           # 服务器入口

│
├── data/                   # 数据库
│   └── match.db
│
└── uploads/                # 用户上传文件
```

## 快速启动

```bash
# 后端（终端1）
cd E:\website\2.my-two-website\backend
npm start
# -> http://localhost:8080

# 前端（终端2）
cd E:\website\2.my-two-website\app
npm run dev
# -> http://localhost:4000/jzxr
```

## 访问地址

| 环境 | 地址 |
|------|------|
| 本地前端 | http://localhost:4000/jzxr |
| 本地后端 | http://localhost:8080/api |
| 管理后台 | http://localhost:8080/admin |
| 生产环境 | https://your_other_domain.com/ |

## 核心功能

- 用户注册/登录（手机号 + 密码）
- 资料发布（40+ 字段）
- 关键词搜索 + 多条件筛选
- 多条件 AND 匹配
- 评价体系
- 举报系统
- 保证金机制
- 联系方式加密解锁
- 管理后台（用户管理、审核、统计）

## 文档

| 文档 | 内容 |
|------|------|
| [项目总览](docs/项目总览.md) | 项目入口，技术栈，快速启动 |
| [架构与API](docs/架构与API.md) | 三层架构，数据库 Schema，API 接口 |
| [部署运维](docs/部署运维.md) | 服务器配置，Nginx，PM2，部署流程 |
| [运维记录](docs/运维记录.md) | 改进报告，修复记录，测试指南 |

## 环境要求

- Node.js >= 18.0.0（推荐 v20.20.2）
- npm >= 10.0.0
- Windows 开发需要 Visual Studio C++ Build Tools（better-sqlite3 编译依赖）

## License

Private

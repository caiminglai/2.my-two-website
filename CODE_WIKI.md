# 精准匹配平台 - Code Wiki 文档

## 1. 项目概述

本项目是一个**精准匹配平台**，为用户提供基于多维度属性的匹配服务。平台支持用户注册、资料完善、搜索匹配、联系方式解锁等核心功能，并配备完整的管理后台。

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.2.0 |
| 前端语言 | TypeScript | 5.9.3 |
| 构建工具 | Vite | 7.2.4 |
| 样式框架 | Tailwind CSS | 3.4.19 |
| 路由 | React Router | 7.17.0 |
| 后端语言 | Node.js | >=18.0.0 |
| 数据库 | SQLite (better-sqlite3) | 12.10.0 |

### 1.2 核心功能

- **用户系统**: 注册、登录、资料管理、审核机制
- **匹配搜索**: 多维度筛选、关键词搜索、自定义筛选字段
- **联系方式解锁**: 付费查看联系方式（支持凭证审核）
- **保证金系统**: 发布信息需缴纳保证金
- **评价系统**: 用户间互相评价
- **举报系统**: 违规举报与审核处理
- **消息系统**: 用户间私信沟通
- **管理后台**: 用户管理、审核管理、数据统计

---

## 2. 项目架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (app/)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Pages      │  │  Components  │  │    Services         │  │
│  │  (页面组件)  │  │  (通用组件)  │  │  (业务逻辑层)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                    │
│              ┌────────────────────────┐                         │
│              │   React Router         │                         │
│              │   (路由管理)           │                         │
│              └──────────┬─────────────┘                         │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP API
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (backend/)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Routes     │  │  Services    │  │        DB           │  │
│  │  (路由层)    │  │  (业务层)    │  │  (数据访问层)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                    │
│              ┌────────────────────────┐                         │
│              │   Node.js HTTP Server  │                         │
│              │   (核心服务器)         │                         │
│              └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
2.my-two-website/
├── app/                              # 前端应用
│   ├── src/
│   │   ├── api/                      # API配置
│   │   │   └── config.ts             # API基础配置
│   │   ├── components/               # UI组件
│   │   │   ├── DetailModal.tsx       # 详情弹窗
│   │   │   ├── ErrorBoundary.tsx     # 错误边界
│   │   │   ├── ImagePreview.tsx      # 图片预览
│   │   │   ├── RatingModal.tsx       # 评价弹窗
│   │   │   ├── ReportModal.tsx       # 举报弹窗
│   │   │   ├── SearchPanel.tsx       # 搜索面板
│   │   │   ├── TabBar.tsx            # 底部导航栏
│   │   │   └── UserCard.tsx          # 用户卡片
│   │   ├── data/                     # 数据层
│   │   │   ├── constants.ts          # 常量定义
│   │   │   └── types.ts              # TypeScript类型
│   │   ├── pages/                    # 页面组件
│   │   │   ├── CircleDetailPage.tsx  # 圈子详情页
│   │   │   ├── CirclesPage.tsx       # 圈子列表页
│   │   │   ├── DeployGuide.tsx       # 部署指南
│   │   │   ├── DepositPage.tsx       # 保证金页
│   │   │   ├── Home.tsx              # 首页
│   │   │   ├── LoginPage.tsx         # 登录页
│   │   │   ├── MessagesPage.tsx      # 消息页
│   │   │   ├── MyPostsPage.tsx       # 我的发布页
│   │   │   ├── PostPage.tsx          # 发布页
│   │   │   ├── ProfilePage.tsx       # 个人主页
│   │   │   ├── QrPage.tsx            # 收款码页
│   │   │   └── SettingsPage.tsx      # 设置页
│   │   ├── services/                 # 业务服务
│   │   │   ├── auth.service.ts       # 认证服务
│   │   │   ├── match.service.ts      # 匹配服务
│   │   │   └── user.service.ts       # 用户服务
│   │   ├── utils/                    # 工具函数
│   │   │   └── errorHandler.ts       # 错误处理
│   │   ├── App.tsx                   # 应用入口组件
│   │   ├── bootstrap.tsx             # 启动配置
│   │   ├── index.css                 # 全局样式
│   │   └── main.tsx                  # 入口文件
│   ├── index.html                    # HTML模板
│   ├── package.json                  # 依赖配置
│   ├── vite.config.ts                # Vite配置
│   └── tailwind.config.js            # Tailwind配置
├── backend/                          # 后端服务
│   ├── admin/                        # 管理后台页面
│   │   ├── login.html                # 管理员登录页
│   │   ├── main.html                 # 管理后台主页
│   │   ├── m-login.html              # 移动端登录页
│   │   └── m.html                    # 移动端管理页
│   ├── db/                           # 数据访问层
│   │   ├── admin.js                  # 管理员相关DB操作
│   │   ├── auth.js                   # 认证相关DB操作
│   │   ├── index.js                  # DB入口(初始化/加密)
│   │   ├── messages.js               # 消息相关DB操作
│   │   ├── payments.js               # 支付相关DB操作
│   │   ├── ratings.js                # 评价相关DB操作
│   │   ├── reports.js                # 举报相关DB操作
│   │   └── users.js                  # 用户相关DB操作
│   ├── routes/                       # API路由层
│   │   ├── auth.js                   # 认证路由
│   │   ├── messages.js               # 消息路由
│   │   ├── payment.js                # 支付路由
│   │   ├── ratings.js                # 评价路由
│   │   ├── reports.js                # 举报路由
│   │   ├── upload.js                 # 上传路由
│   │   └── users.js                  # 用户路由
│   ├── services/                     # 业务逻辑层
│   │   ├── admin.service.js          # 管理员服务
│   │   ├── auth.service.js           # 认证服务
│   │   ├── messages.service.js       # 消息服务
│   │   ├── payments.service.js       # 支付服务
│   │   ├── ratings.service.js        # 评价服务
│   │   ├── reports.service.js        # 举报服务
│   │   └── user.service.js           # 用户服务
│   ├── package.json                  # 依赖配置
│   └── server.js                     # 服务器入口
└── PROJECT_HANDBOOK.md               # 项目手册
```

---

## 3. 前端架构

### 3.1 核心组件

#### 3.1.1 App.tsx - 应用主入口

**职责**: 路由配置、懒加载管理、全局布局

**关键特性**:
- 使用 React Router 7.x 进行路由管理
- 实现组件懒加载优化首屏加载速度
- 自定义 Loading 骨架屏提升用户体验
- 根据路由动态显示/隐藏 TabBar

**路由映射**:

| 路径 | 页面组件 | 是否显示TabBar |
|------|----------|----------------|
| `/` | Home | 是 |
| `/post` | PostPage | 是 |
| `/deposit` | DepositPage | 是 |
| `/profile` | ProfilePage | 是 |
| `/my-posts` | MyPostsPage | 是 |
| `/settings` | SettingsPage | 是 |
| `/circles` | CirclesPage | 是 |
| `/circle/:circleKey/:tag` | CircleDetailPage | 是 |
| `/login` | LoginPage | 否 |
| `/deploy` | DeployGuide | 否 |
| `/qr` | QrPage | 否 |
| `/messages` | MessagesPage | 否 |
| `/messages/:userId` | MessagesPage | 否 |

#### 3.1.2 TabBar.tsx - 底部导航

**职责**: 提供底部导航切换

**包含导航项**:
- 首页
- 发布
- 我的

#### 3.1.3 UserCard.tsx - 用户卡片

**职责**: 展示用户简要信息

**显示内容**:
- 头像
- 昵称
- 基本属性（性别、年龄、城市）
- 兴趣标签
- 匹配度标识

### 3.2 页面组件

| 页面 | 职责 | 核心功能 |
|------|------|----------|
| Home | 首页 | 用户列表、搜索筛选、快速匹配 |
| LoginPage | 登录注册页 | 手机号登录、注册 |
| PostPage | 发布页 | 完善个人资料、提交审核 |
| ProfilePage | 个人主页 | 查看/编辑个人信息 |
| MyPostsPage | 我的发布 | 管理已发布信息 |
| DepositPage | 保证金页 | 查看/充值保证金 |
| SettingsPage | 设置页 | 修改密码、注销账号 |
| MessagesPage | 消息页 | 私信列表、聊天界面 |
| CirclesPage | 圈子页 | 圈子分类浏览 |
| CircleDetailPage | 圈子详情 | 特定圈子用户列表 |

### 3.3 服务层

#### 3.3.1 auth.service.ts - 认证服务

**职责**: 处理用户认证相关业务

| 方法 | 功能 | 参数 | 返回值 |
|------|------|------|--------|
| `login` | 用户登录 | `phone: string, password: string` | `{ success: boolean, message?: string }` |
| `register` | 用户注册 | `phone: string, password: string, nickname: string` | `{ success: boolean, message?: string }` |
| `logout` | 退出登录 | 无 | `void` |
| `getCurrentUser` | 获取当前用户 | 无 | `{ id, nickname, token } \| null` |
| `getToken` | 获取Token | 无 | `string \| null` |
| `getUserId` | 获取用户ID | 无 | `string \| null` |

#### 3.3.2 user.service.ts - 用户服务

**职责**: 管理用户数据、本地存储同步

| 方法 | 功能 | 参数 | 返回值 |
|------|------|------|--------|
| `loadRows` | 加载用户列表（优先本地） | 无 | `Row[]` |
| `saveRows` | 保存用户列表 | `rows: Row[]` | `void` |
| `syncRowsFromServer` | 从服务器同步数据 | 无 | `Promise<Row[]>` |
| `loadColumns` | 加载字段配置 | 无 | `Column[]` |
| `addRow` | 添加用户 | `rows: Row[], row: Row` | `Row[]` |
| `deleteRow` | 删除用户 | `id: string` | `Row[]` |

#### 3.3.3 数据类型 (types.ts)

**Row 接口**:

```typescript
interface Row {
  id: string;
  user_id?: string;
  deposit: number;           // 保证金金额
  createdAt: number;         // 创建时间戳
  data?: {
    name: string;            // 昵称
    gender: string;          // 性别
    age: number | string;    // 年龄
    height: number | string; // 身高(cm)
    weight: string;          // 体重(kg)
    skinTone: string;        // 肤色
    zodiac: string;          // 星座
    bloodType: string;       // 血型
    city: string;            // 城市
    marriage: string;        // 婚姻状况
    children: string;        // 子女情况
    education: string;       // 学历
    job: string;             // 职业
    income: string;          // 收入
    house: string;           // 住房
    car: string;             // 购车
    faceType: string;        // 脸型
    eyeType: string;         // 眼型
    mouthType: string;       // 嘴型
    bodyType: string;        // 身材
    hobbies: string;         // 兴趣爱好
    food: string;            // 美食偏好
    sport: string;           // 运动爱好
    music: string;           // 音乐偏好
    smoke: string;           // 吸烟
    drink: string;           // 饮酒
    religion: string;        // 宗教信仰
    pet: string;             // 宠物
    personality: string;     // 性格
    expectation: string;     // 期望
    contact: string;         // 联系方式(加密存储)
    interestTags: string;    // 兴趣标签
    purpose: string;         // 目的
  };
}
```

#### 3.3.4 常量配置 (constants.ts)

**主要常量**:

| 常量 | 类型 | 说明 |
|------|------|------|
| `GENDER_OPTIONS` | `string[]` | 性别选项 |
| `CITY_OPTIONS` | `string[]` | 城市列表(30个主要城市) |
| `HOUSE_OPTIONS` | `string[]` | 住房情况 |
| `CAR_OPTIONS` | `string[]` | 购车情况 |
| `EDUCATION_OPTIONS` | `string[]` | 学历选项 |
| `INCOME_OPTIONS` | `string[]` | 收入区间 |
| `HOBBY_OPTIONS` | `string[]` | 兴趣爱好选项(30项) |
| `FOOD_OPTIONS` | `string[]` | 美食偏好(20项) |
| `SPORT_OPTIONS` | `string[]` | 运动爱好(20项) |
| `MUSIC_OPTIONS` | `string[]` | 音乐偏好(20项) |
| `DEPOSIT_RULES` | `string[] & { amount, platformFee, ... }` | 保证金规则 |

---

## 4. 后端架构

### 4.1 核心模块

#### 4.1.1 server.js - 服务器入口

**职责**: HTTP服务器启动、路由分发、中间件配置

**核心功能**:
- 环境变量加载
- CORS配置
- 速率限制（防暴力破解）
- 请求体大小限制（5MB）
- 统一路径处理（`/jzxr/api/xxx` → `/api/xxx`）
- 静态文件服务（头像、收款码）
- 管理后台页面路由

**速率限制策略**:
- 普通请求: 60次/分钟
- 登录请求: 100次/5分钟

#### 4.1.2 db/index.js - 数据库入口

**职责**: 数据库初始化、加密工具、Token管理

**表结构**:

| 表名 | 用途 | 核心字段 |
|------|------|----------|
| `auth_users` | 认证用户 | `id, phone, password, nickname` |
| `users` | 用户资料 | `id, user_id, status, contact(加密)` |
| `user_ratings` | 用户评价 | `rater_id, rated_id, rating, comment` |
| `user_reports` | 用户举报 | `reporter_id, reported_id, report_type, status` |
| `contact_unlocks` | 联系方式解锁记录 | `viewer_id, target_id, status, proof_path` |
| `deposits` | 保证金记录 | `user_id, amount, status, proof_path` |
| `payment_orders` | 支付订单 | `order_id, user_id, amount, channel, status` |
| `messages` | 消息记录 | `from_user_id, to_user_id, content, status` |
| `custom_filters` | 自定义筛选字段 | `field_key, field_label, field_options` |
| `admin_logs` | 管理员操作日志 | `action, target_id, details` |

**加密工具**:

| 方法 | 功能 |
|------|------|
| `hashPassword` | SHA256密码哈希 |
| `encrypt` | AES-256-CBC加密（联系方式） |
| `decrypt` | AES-256-CBC解密 |
| `generateToken` | 生成JWT风格Token |
| `verifyToken` | 验证Token有效性（有效期7天） |

**数据库工具**:

| 方法 | 功能 |
|------|------|
| `getDb` | 获取数据库实例（单例模式） |
| `backupDatabase` | 备份数据库到 `data/backups/` |
| `restoreFromBackup` | 从备份恢复数据库 |

### 4.2 路由层

#### 4.2.1 auth.js - 认证路由

| 方法 | 路径 | 功能 |
|------|------|------|
| `register` | `POST /api/auth/register` | 用户注册 |
| `login` | `POST /api/auth/login` | 用户登录 |
| `adminLogin` | `POST /api/admin/login` | 管理员登录 |

#### 4.2.2 users.js - 用户路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `getUsers` | `GET /api/users` | 获取用户列表 | 管理员/登录用户 |
| `addUser` | `POST /api/users` | 创建用户资料 | 登录用户 |
| `batchSaveUsers` | `POST /api/users/batch` | 批量保存用户 | 管理员 |
| `getMyUser` | `GET /api/users/my` | 获取当前用户 | 登录用户 |
| `updateMyUser` | `PUT /api/users/my` | 更新当前用户 | 登录用户 |
| `deleteMyUser` | `DELETE /api/users/my` | 删除当前用户 | 登录用户 |
| `getPendingUsers` | `GET /api/users/pending` | 获取待审核用户 | 管理员 |
| `searchUsers` | `GET /api/users/search` | 搜索用户 | 公开 |
| `approveUser` | `POST /api/users/:id/approve` | 通过审核 | 管理员 |
| `rejectUser` | `POST /api/users/:id/reject` | 拒绝审核 | 管理员 |
| `editUser` | `PUT /api/users/:id` | 编辑用户 | 管理员 |
| `deleteUser` | `DELETE /api/users/:id` | 删除用户 | 管理员 |

#### 4.2.3 upload.js - 上传路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `uploadAvatar` | `POST /api/upload/avatar` | 上传头像 | 登录用户 |
| `uploadDepositProof` | `POST /api/deposit/upload-proof` | 上传保证金凭证 | 登录用户 |
| `getDeposits` | `GET /api/admin/deposits` | 获取保证金列表 | 管理员 |
| `approveDeposit` | `PUT /api/admin/deposits/:id/approve` | 通过保证金审核 | 管理员 |
| `rejectDeposit` | `PUT /api/admin/deposits/:id/reject` | 拒绝保证金审核 | 管理员 |

#### 4.2.4 payment.js - 支付路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `createPayment` | `POST /api/payment/create` | 创建支付订单 | 登录用户 |
| `wechatNotify` | `POST /api/payment/notify-wechat` | 微信支付回调 | 内部 |
| `alipayNotify` | `POST /api/payment/notify-alipay` | 支付宝回调 | 内部 |
| `queryPaymentStatus` | `GET /api/payment/status` | 查询支付状态 | 登录用户 |

#### 4.2.5 ratings.js - 评价路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `addRating` | `POST /api/ratings` | 添加评价 | 登录用户 |
| `getRatings` | `GET /api/users/:id/ratings` | 获取用户评价 | 公开 |

#### 4.2.6 reports.js - 举报路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `addReport` | `POST /api/reports` | 添加举报 | 登录用户 |
| `getAllReports` | `GET /api/reports` | 获取举报列表 | 管理员 |
| `updateReportStatus` | `PUT /api/reports/:id/status` | 更新举报状态 | 管理员 |
| `deleteReport` | `DELETE /api/reports/:id` | 删除举报 | 管理员 |

#### 4.2.7 messages.js - 消息路由

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| `handleSendMessage` | `POST /api/message/send` | 发送消息 | 登录用户 |
| `handleGetConversations` | `GET /api/message/conversations` | 获取会话列表 | 登录用户 |
| `handleGetMessages` | `GET /api/message/list` | 获取消息列表 | 登录用户 |
| `handleGetUnreadCount` | `GET /api/message/unread` | 获取未读数量 | 登录用户 |

### 4.3 服务层

#### 4.3.1 auth.service.js - 认证服务

**职责**: 用户注册/登录业务逻辑

| 方法 | 功能 |
|------|------|
| `register` | 验证手机号格式、检查重复、创建用户 |
| `login` | 验证密码、更新登录时间、生成Token |

#### 4.3.2 user.service.js - 用户服务

**职责**: 用户资料管理业务逻辑

| 方法 | 功能 |
|------|------|
| `createUser` | 创建用户资料（关联认证用户） |
| `getUserList` | 分页获取用户列表 |
| `getMyUser` | 获取当前登录用户资料 |
| `updateMyUser` | 更新用户资料 |
| `removeMyUser` | 删除用户资料（软删除） |
| `approveUser` | 审核通过用户 |
| `rejectUser` | 拒绝用户审核 |
| `searchUsers` | 多条件搜索用户 |
| `batchSave` | 批量保存用户数据 |

#### 4.3.3 payments.service.js - 支付服务

**职责**: 支付相关业务逻辑

| 方法 | 功能 |
|------|------|
| `createOrder` | 创建支付订单 |
| `updateOrderStatus` | 更新订单状态 |
| `unlockContact` | 解锁联系方式 |
| `checkContactUnlocked` | 检查联系方式是否已解锁 |

#### 4.3.4 messages.service.js - 消息服务

**职责**: 消息发送与管理

| 方法 | 功能 |
|------|------|
| `sendMessage` | 发送消息 |
| `getConversations` | 获取会话列表 |
| `getMessages` | 获取消息历史 |
| `markAsRead` | 标记消息已读 |
| `getUnreadCount` | 获取未读消息数量 |

---

## 5. 数据库设计

### 5.1 用户表 (users)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 用户唯一标识 |
| `user_id` | TEXT | FOREIGN KEY | 关联auth_users.id |
| `deposit` | INTEGER | DEFAULT 0 | 保证金金额(分) |
| `created_at` | INTEGER | NOT NULL | 创建时间戳 |
| `status` | TEXT | DEFAULT 'pending' | 状态(pending/approved/rejected) |
| `name` | TEXT | - | 昵称 |
| `gender` | TEXT | - | 性别 |
| `age` | TEXT | - | 年龄 |
| `height` | TEXT | - | 身高(cm) |
| `weight` | TEXT | - | 体重(kg) |
| `contact` | TEXT | - | 联系方式(加密) |
| `avatar` | TEXT | - | 头像路径 |
| `extra_data` | TEXT | - | 扩展数据(JSON) |

### 5.2 联系方式解锁表 (contact_unlocks)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| `viewer_id` | TEXT | NOT NULL | 查看者ID |
| `target_id` | TEXT | NOT NULL | 目标用户ID |
| `status` | TEXT | DEFAULT 'pending' | 状态(pending/approved/rejected) |
| `created_at` | INTEGER | NOT NULL | 创建时间 |
| `unlocked_at` | INTEGER | - | 解锁时间 |
| `proof_path` | TEXT | - | 支付凭证路径 |
| `method` | TEXT | DEFAULT 'manual' | 支付方式 |
| `amount` | REAL | DEFAULT 9.9 | 金额 |

### 5.3 索引设计

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| users | idx_users_gender | gender | 性别筛选 |
| users | idx_users_city | city | 城市筛选 |
| users | idx_users_age | age | 年龄筛选 |
| users | idx_users_status | status | 状态筛选 |
| contact_unlocks | idx_contact_unlocks_viewer | viewer_id | 查询用户解锁记录 |
| contact_unlocks | idx_contact_unlocks_target | target_id | 查询被解锁记录 |
| deposits | idx_deposits_user | user_id | 用户保证金查询 |
| deposits | idx_deposits_status | status | 状态筛选 |
| messages | idx_messages_from | from_user_id | 发送者消息 |
| messages | idx_messages_to | to_user_id | 接收者消息 |

---

## 6. API 接口规范

### 6.1 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {...},
  "total": 100
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "错误描述"
}
```

### 6.2 认证方式

**用户认证**: 请求头携带 `Authorization: Bearer <token>`

**管理员认证**: 请求头携带 `Authorization: Bearer <ADMIN_PASSWORD>`

### 6.3 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 权限不足 |
| 404 | 资源未找到 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 7. 运行与部署

### 7.1 前端运行

**开发模式**:
```bash
cd app
npm install
npm run dev
```

**构建生产版本**:
```bash
cd app
npm run build
```

### 7.2 后端运行

**开发模式**:
```bash
cd backend
npm install
npm run dev
```

**生产模式**:
```bash
cd backend
npm start
```

### 7.3 环境变量

后端支持通过 `.env` 或 `.env.production` 文件配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 8080 |
| `ADMIN_PASSWORD` | 管理员密码 | your_admin_password |
| `TOKEN_SECRET` | Token加密密钥 | 自动生成 |
| `ENCRYPTION_KEY` | 数据加密密钥 | 自动生成 |
| `SERVER_ORIGIN` | 服务器地址 | http://your_server_ip |
| `FRONTEND_URL` | 前端地址 | - |

### 7.4 目录权限

确保以下目录可写：
- `data/` - 数据库文件
- `data/backups/` - 数据库备份
- `uploads/avatars/` - 头像上传
- `uploads/contact-unlock/` - 解锁凭证

---

## 8. 核心业务流程

### 8.1 用户注册流程

```
用户提交注册 → 验证手机号格式 → 检查手机号是否已存在 → 密码哈希存储 → 生成Token → 返回成功
```

### 8.2 用户登录流程

```
用户提交登录 → 检查登录频率 → 查询用户 → 验证密码 → 更新登录时间 → 生成Token → 返回成功
```

### 8.3 发布信息流程

```
完善资料 → 提交审核 → 管理员审核 → 审核通过(显示)/拒绝(提示)
```

### 8.4 联系方式解锁流程

```
查看用户详情 → 点击解锁 → 提交支付凭证 → 管理员审核 → 审核通过(显示联系方式)
```

### 8.5 消息发送流程

```
选择会话 → 输入消息 → 保存消息记录 → 标记为未读 → 返回成功
```

---

## 9. 安全机制

### 9.1 密码安全

- 使用 SHA256 哈希存储密码
- 支持强密码策略

### 9.2 数据加密

- 联系方式字段使用 AES-256-CBC 加密存储
- Token使用 HMAC-SHA256 签名

### 9.3 防护措施

- **速率限制**: 登录100次/5分钟，普通请求60次/分钟
- **请求体限制**: 最大5MB
- **CORS限制**: 仅允许白名单域名
- **SQL注入防护**: 使用参数化查询
- **文件上传限制**: 仅允许图片格式，最大5MB

---

## 10. 代码规范

### 10.1 前端规范

- 使用 TypeScript 严格模式
- 组件命名采用 PascalCase
- 文件命名采用 camelCase
- 使用 React Hooks 管理状态
- 组件懒加载优化性能

### 10.2 后端规范

- 路由层只处理HTTP解析，不直接操作数据库
- 业务逻辑放在 Service 层
- 数据库操作放在 DB 层
- 统一响应格式
- 使用 `sendJson` 工具函数返回JSON

---

## 11. 扩展建议

### 11.1 性能优化

- 引入 Redis 缓存热门数据
- 数据库查询优化（添加更多索引）
- 前端图片懒加载
- 接口响应压缩

### 11.2 功能扩展

- 即时消息推送（WebSocket）
- 用户在线状态
- 高级搜索筛选
- 数据导出功能
- 移动端APP

### 11.3 安全增强

- 添加验证码登录
- 支持OAuth第三方登录
- 操作日志审计
- 敏感操作二次验证

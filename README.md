# 旅游日记 - 后台管理系统文档

本文档介绍后台管理系统的相关信息，包括功能模块和对应代码实现。

## 技术栈

- Remix 框架
- React
- TypeScript
- Tailwind CSS 
- PostgreSQL 数据库
- React Icons 库 (提供UI图标)

## 系统架构

后台管理系统采用基于Remix的单页应用架构，主要包含以下核心部分：

1. **布局组件**: `app/routes/admin.tsx`
   - 提供后台共享布局
   - 实现导航菜单和权限控制

2. **服务层**: `app/services/admin.server.ts`
   - 处理管理员身份验证
   - 提供会话管理

3. **数据操作**: `app/services/notes.server.ts`
   - 提供笔记数据操作方法
   - 实现审核功能

## 已实现功能与代码对应关系

### 1. 管理员账户系统

#### 管理员登录 (`app/routes/admin.login.tsx`)

#### 用户角色与权限控制 (`app/services/admin.server.ts`)

#### 管理员登出 (`app/routes/admin.logout.tsx`)

### 2. 游记审核管理系统

#### 审核列表与筛选 (`app/routes/admin._index.tsx`)

#### 审核操作 (`app/routes/admin._index.tsx`)

#### 审核状态更新服务 (`app/services/notes.server.ts`)

### 3. 管理界面 UI 组件

#### 布局组件 (`app/routes/admin.tsx`)

#### 审核列表界面 (`app/routes/admin._index.tsx`)

## 数据流程

1. **登录流程**
   - 用户输入管理员账号/密码
   - `admin.login.tsx` 处理登录请求
   - `adminLogin` 函数验证凭据
   - `createAdminSession` 创建会话并重定向到管理界面

2. **审核流程**
   - 管理员/审核员查看待审核游记列表
   - 查看游记详情，包括内容和媒体文件
   - 执行审核操作：批准、拒绝或删除
   - 更新操作通过 `updateNoteStatus` 或 `adminDeleteNote` 函数处理

## 启动与运行

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 测试账号

- 管理员账号: admin / admin123
  - 拥有全部权限，包括删除游记
  
## 路由结构

```
app/routes/
├── admin.tsx           # 管理后台布局组件
│   ├── loader          # 验证管理员登录状态
│   └── UI              # 提供导航和布局
│
├── admin._index.tsx    # 管理后台主页（游记审核列表）
│   ├── loader          # 加载游记列表，支持分页和筛选
│   ├── action          # 处理审核操作
│   └── UI              # 审核界面和控件
│
├── admin.login.tsx     # 管理员登录页面
│   ├── loader          # 检查是否已登录
│   ├── action          # 处理登录请求
│   └── UI              # 登录表单
│
└── admin.logout.tsx    # 管理员登出处理
    └── action          # 销毁管理员会话
```

# 旅游日记 - 移动端应用文档

本文档介绍移动端（用户侧）应用的相关信息，包括功能模块和对应的代码实现。

## 技术栈

- Remix 框架
- React
- TypeScript
- Tailwind CSS
- PostgreSQL 数据库
- 其他库：date-fns, lucide-react, react-icons

## 系统架构

移动端应用采用基于Remix的单页应用架构，主要包含以下核心部分：

1. **入口组件**: `app/root.tsx` 和 `app/entry.client.tsx`
   - 提供全局布局和样式
   - 设置错误边界和元数据

2. **路由组件**: `app/routes/_user.tsx`
   - 提供用户侧共享布局
   - 实现导航菜单和认证状态管理

3. **服务层**: 
   - `app/services/auth.server.ts` - 用户认证
   - `app/services/notes.server.ts` - 游记操作

4. **数据库交互**: `app/db/index.ts` 和相关模型定义

## 已实现功能与代码对应关系

### 1. 用户账户管理

#### 用户注册与登录 (`app/routes/_user.login.tsx`)

#### 个人资料设置 (`app/routes/_user.settings.tsx`)

#### 用户登出 (`app/routes/logout.tsx`)

### 2. 旅行笔记管理

#### 浏览旅行笔记 (`app/routes/_user._index.tsx`)

#### 发布旅行笔记 (`app/routes/_user.publish.tsx`)

#### 管理个人旅行笔记 (`app/routes/_user.my-notes.tsx`)

#### 编辑已有笔记 (`app/routes/_user.edit.$id.tsx`)

### 3. 媒体处理

#### 文件上传 API (`app/routes/api.upload.tsx`)

#### 访问上传的文件 (`app/routes/upload.$filename.tsx`)

### 4. 布局和UI组件

#### 用户布局 (`app/routes/_user.tsx`)

### 5. 服务层实现

#### 用户认证服务 (`app/services/auth.server.ts`)

#### 笔记服务 (`app/services/notes.server.ts`)

## 数据流程

1. **用户认证流程**
   - 用户注册/登录在 `app/routes/_user.login.tsx` 处理
   - 认证服务在 `app/services/auth.server.ts` 中实现
   - 会话管理使用 Remix 的 Cookie Session Storage

2. **游记发布流程**
   - 用户创建游记，上传媒体文件
   - 文件上传通过 `app/routes/api.upload.tsx` 处理
   - 游记内容通过 `createNote` 函数保存到数据库
   - 默认设置为待审核状态

3. **游记浏览流程**
   - 首页通过 `getPublishedNotes` 获取已审核通过的游记
   - 用户可通过搜索、筛选查找感兴趣的内容
   - 游记详情页显示完整内容和媒体文件

## 启动与运行

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 数据库

应用使用 PostgreSQL 数据库。

## 目录结构

```
app/
├── db/                  # 数据库相关代码，包括模型定义和种子数据
├── routes/              # 应用路由和页面组件
│   ├── _index.tsx       # 首页路由（重定向到用户首页）
│   ├── _user.tsx        # 用户布局组件 
│   │   └── loader       # 加载用户状态，提供布局UI
│   │
│   ├── _user._index.tsx # 用户首页（游记列表）
│   │   └── loader       # 加载已发布游记和热门目的地
│   │
│   ├── _user.login.tsx  # 用户登录页面
│   │   ├── action       # 处理登录和注册请求
│   │   └── UI           # 登录和注册表单
│   │
│   ├── _user.publish.tsx # 发布游记页面
│   │   ├── loader       # 验证用户登录状态
│   │   ├── action       # 处理游记发布
│   │   └── UI           # 游记编辑器和媒体上传
│   │
│   ├── _user.edit.$id.tsx # 编辑游记页面
│   │   ├── loader       # 加载指定ID的游记
│   │   ├── action       # 处理游记更新
│   │   └── UI           # 游记编辑器和媒体管理
│   │
│   ├── _user.my-notes.tsx # 我的游记页面
│   │   ├── loader       # 加载用户的所有游记
│   │   ├── action       # 处理游记删除
│   │   └── UI           # 游记列表和状态管理
│   │
│   ├── _user.note.$id.tsx # 游记详情页面
│   │   ├── loader       # 加载指定ID的游记详情
│   │   └── UI           # 游记内容和媒体展示
│   │
│   ├── _user.settings.tsx # 用户设置页面
│   │   ├── loader       # 加载用户信息
│   │   ├── action       # 处理用户资料更新
│   │   └── UI           # 用户资料编辑表单
│   │
│   ├── api.upload.tsx   # 文件上传API
│   │   └── action       # 处理文件上传
│   │
│   ├── logout.tsx       # 登出处理
│   │   └── action       # 销毁用户会话
│   │
│   └── upload.$filename.tsx # 上传文件访问
│       └── loader       # 提供上传文件的访问
│
├── services/            # 服务层，包含业务逻辑
│   ├── auth.server.ts   # 用户认证服务
│   └── notes.server.ts  # 游记相关服务
│
├── styles/              # 样式文件
├── entry.client.tsx     # 客户端入口
├── entry.server.tsx     # 服务端入口
├── root.tsx             # 根组件
├── tailwind.css         # Tailwind CSS入口
└── types.ts             # 类型定义
```

# 旅游日记 - 数据库

本文档介绍项目数据库的相关信息。

## 数据库类型

- PostgreSQL

## Schema 定义

数据库的详细 Schema 定义、表结构、关系和初始数据可以参考项目根目录下的 `pg.sql` 文件。

## 主要表结构

- `admins`: 管理员信息表
  - `id`: UUID, 主键
  - `username`: VARCHAR(255), 用户名, 唯一
  - `password_hash`: TEXT, 哈希后的密码
  - `name`: VARCHAR(255), 管理员名称
  - `role`: "admin_role" (ENUM: 'admin', 'auditor'), 角色
  - `created_at`: TIMESTAMPTZ, 创建时间
  - `updated_at`: TIMESTAMPTZ, 更新时间
- `users`: 用户信息表
  - `id`: UUID, 主键
  - `username`: VARCHAR(255), 用户名, 唯一
  - `password_hash`: TEXT, 哈希后的密码
  - `nickname`: VARCHAR(255), 昵称, 唯一
  - `avatar_url`: TEXT, 头像链接
  - `role`: "user_role" (ENUM: 'auditor', 'admin', 'user'), 角色 (此处的 'auditor', 'admin' 角色定义似乎与 admins 表有重叠，需要确认)
  - `created_at`: TIMESTAMPTZ, 创建时间
  - `updated_at`: TIMESTAMPTZ, 更新时间
- `travel_notes`: 旅行笔记表
  - `id`: UUID, 主键
  - `user_id`: UUID, 外键关联 `users.id`
  - `title`: VARCHAR(255), 标题
  - `content`: TEXT, 内容
  - `status`: "note_status" (ENUM: 'pending', 'approved', 'rejected'), 笔记状态
  - `rejection_reason`: TEXT, 拒绝原因
  - `is_deleted`: BOOL, 是否删除
  - `created_at`: TIMESTAMPTZ, 创建时间
  - `updated_at`: TIMESTAMPTZ, 更新时间
  - `location`: TEXT, 地点
- `note_media`: 笔记媒体文件表
  - `id`: INT, 主键, 自增
  - `note_id`: UUID, 外键关联 `travel_notes.id`
  - `media_type`: "media_type" (ENUM: 'image', 'video'), 媒体类型
  - `url`: TEXT, 文件链接
  - `order`: INT, 媒体顺序
  - `created_at`: TIMESTAMPTZ, 创建时间

## 枚举类型 (ENUMs)

- `admin_role`: ('admin', 'auditor')
- `media_type`: ('image', 'video')
- `note_status`: ('pending', 'approved', 'rejected')
- `user_role`: ('auditor', 'admin', 'user')

## 数据库迁移与填充

项目使用 `drizzle-kit` 进行数据库迁移和管理。

- 生成迁移文件: `npm run db:generate`
- 应用迁移: `npm run db:push`
- 打开 Drizzle Studio: `npm run db:studio`
- 填充种子数据: `npm run db:seed` (脚本路径: `app/db/seed.ts`)

## 注意事项

- `users` 表中的 `role` 字段包含 'admin' 和 'auditor'，这可能与 `admins` 表的功能有所重叠或冲突，建议在后续开发中明确各自的职责和权限划分。
- 所有涉及文件上传的功能，应确保正确存储和管理媒体文件的URL。
- 数据库中删除游记使用的是软删除（`is_deleted` 标志），而不是物理删除记录。
- 在开发和部署环境中，应确保数据库密码和敏感信息的安全存储。



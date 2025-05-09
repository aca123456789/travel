# 旅游日记平台项目文档

## 项目概述

旅游日记平台是一个允许用户分享和管理旅行体验的web应用程序。该平台分为两个主要系统：
1. **用户系统（移动端）**：用于游记发布、浏览和管理
2. **审核管理系统（PC站点）**：用于内容合规检查和管理

## 技术栈

### 前端
- **核心框架**：React 18
- **元框架**：Remix.js (v2.16.5)
- **样式解决方案**：TailwindCSS
- **UI组件库**：
  - Headless UI (@headlessui/react)
  - Heroicons (@heroicons/react)
  - Lucide React
  - React Icons
- **工具库**：
  - clsx/tailwind-merge：用于条件性样式合并
  - date-fns：日期格式化和处理

### 后端
- **服务端渲染**：Remix.js (服务端组件)
- **运行时环境**：Node.js (v20+)
- **数据库**：PostgreSQL
- **ORM**：Drizzle ORM
- **身份验证**：基于会话的Cookie认证 (remix-session)
- **密码加密**：bcryptjs

### 开发工具
- **构建工具**：Vite
- **包管理工具**：pnpm
- **类型检查**：TypeScript
- **数据库管理**：
  - drizzle-kit (生成迁移文件)
  - drizzle-studio (数据库可视化管理)

## 数据库设计

### 主要表结构

1. **用户表(users)**
   - id: uuid (主键)
   - username: 用户名 (唯一)
   - passwordHash: 密码哈希
   - nickname: 昵称 (唯一)
   - avatarUrl: 头像URL (可为空)
   - role: 角色 (user/auditor/admin)
   - createdAt: 创建时间
   - updatedAt: 更新时间

2. **管理员表(admins)**
   - id: uuid (主键)
   - username: 用户名 (唯一)
   - passwordHash: 密码哈希
   - name: 姓名
   - role: 角色 (auditor/admin)
   - createdAt: 创建时间
   - updatedAt: 更新时间

3. **游记表(travel_notes)**
   - id: uuid (主键)
   - userId: 用户ID (外键关联users表)
   - title: 标题
   - content: 内容
   - location: 位置 (可为空)
   - status: 状态 (pending/approved/rejected)
   - rejectionReason: 拒绝原因 (可为空)
   - isDeleted: 是否删除 (逻辑删除)
   - createdAt: 创建时间
   - updatedAt: 更新时间

4. **媒体表(note_media)**
   - id: serial (主键)
   - noteId: 游记ID (外键关联travel_notes表)
   - mediaType: 媒体类型 (image/video)
   - url: 媒体URL
   - order: 排序顺序
   - createdAt: 创建时间

## 功能实现

### 1. 用户认证系统

#### 用户登录/注册
- 基于用户名/密码的标准认证流程
- 使用bcryptjs进行密码哈希处理
- 通过Remix的cookie会话存储实现持久化登录状态
- 支持用户头像上传和自定义昵称

#### 管理员认证
- 独立的管理员登录入口和会话管理
- 基于角色的权限控制系统 (审核人员和管理员)

### 2. 游记管理功能

#### 发布游记
- 支持富文本内容编辑
- 多图片上传功能（压缩处理以优化性能）
- 单视频上传支持
- 位置标记功能
- 自动保存草稿功能

#### 游记展示
- 响应式瀑布流布局展示游记列表
- 图片轮播和放大查看功能
- 视频播放支持
- 游记详情页面展示完整内容和多媒体资源

#### 个人游记管理
- 查看个人发布的所有游记及其审核状态
- 编辑和删除功能
- 查看审核拒绝原因

### 3. 审核管理系统

#### 审核工作流
- 所有新发布游记需要通过审核才能公开展示
- 审核人员和管理员可以通过或拒绝游记
- 拒绝时需提供拒绝原因，用户可查看

#### 管理员功能
- 强大的筛选和搜索功能（按状态、标题、作者等）
- 只有管理员可以删除游记（逻辑删除）
- 分页展示提高大量数据处理效率

### 4. 媒体处理

#### 图片处理
- 客户端图片压缩以优化性能
- 图片上传到服务器存储
- 图片浏览和缩放功能

#### 视频处理
- 视频上传和存储
- 基本的视频播放功能

### 5. 搜索功能
- 全文搜索游记标题和内容
- 按作者昵称搜索
- 管理后台高级筛选功能

## 项目结构

```
travel_note/
├── app/                    # 主应用代码
│   ├── db/                 # 数据库相关
│   │   ├── index.ts        # 数据库连接配置
│   │   ├── schema.ts       # 数据库模式定义
│   │   └── seed.ts         # 数据库种子数据
│   ├── routes/             # 应用路由
│   │   ├── _index.tsx      # 主页（游记列表）
│   │   ├── _user.tsx       # 用户布局
│   │   ├── _user.login.tsx # 用户登录
│   │   ├── _user.my-notes.tsx # 我的游记
│   │   ├── _user.publish.tsx  # 发布游记
│   │   ├── _user.note.$id.tsx # 游记详情
│   │   ├── admin.tsx       # 管理员布局
│   │   ├── admin._index.tsx  # 管理员主页（审核列表）
│   │   └── admin.login.tsx   # 管理员登录
│   ├── services/           # 服务层
│   │   ├── auth.server.ts  # 用户认证
│   │   ├── admin.server.ts # 管理员认证
│   │   └── notes.server.ts # 游记服务
│   ├── styles/             # 样式文件
│   └── types.ts            # 类型定义
├── public/                 # 静态资源
│   └── upload/             # 用户上传文件目录
└── package.json            # 项目依赖
```

## 部署和运维

### 部署流程
1. 构建前端资源：`pnpm build`
2. 服务前端资源：`pnpm start`
3. 确保PostgreSQL数据库配置正确

### 数据库管理
- 生成数据库迁移：`pnpm db:generate`
- 应用数据库迁移：`pnpm db:push`
- 填充初始数据：`pnpm db:seed`
- 数据库可视化管理：`pnpm db:studio`

### 环境变量
- DATABASE_URL：PostgreSQL连接字符串
- SESSION_SECRET：会话密钥
- PORT：应用运行端口（可选）

## 性能优化

1. **图片优化**：
   - 上传前压缩图片
   - 使用适当的图片格式和尺寸

2. **数据库优化**：
   - 使用UUID作为主键
   - 添加适当的索引
   - 分页查询减少一次性数据加载量

3. **前端优化**：
   - 使用服务端渲染提高首屏加载速度
   - 懒加载图片和视频资源

## 安全考量

1. **身份验证**：
   - 密码哈希存储
   - 基于Cookie的安全会话管理
   - CSRF保护

2. **授权**：
   - 基于角色的访问控制
   - 适当的权限验证

3. **内容安全**：
   - 游记内容审核机制
   - 防止XSS攻击

## 未来扩展

1. **社交功能**：
   - 游记评论和点赞
   - 用户关注系统
   
2. **增强媒体支持**：
   - 更先进的图片编辑工具
   - 更好的视频播放控件

3. **第三方集成**：
   - 社交媒体分享
   - 地图服务集成

4. **移动应用**：
   - 开发原生移动应用
   - 支持离线编辑和同步

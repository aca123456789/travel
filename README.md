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
```typescript
// 登录表单处理
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const { user } = await adminLogin({ username, password });
    return createAdminSession(user, "/admin");
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "登录失败" },
      { status: 400 }
    );
  }
};
```

#### 用户角色与权限控制 (`app/services/admin.server.ts`)
```typescript
// 权限检查函数
export const requireAdminUser = async (request: Request) => {
  const adminUser = await getLoggedInAdmin(request);
  
  if (!adminUser) {
    throw redirect("/admin/login");
  }
  
  return adminUser;
};

// 超级管理员权限检查
export const requireAdminRole = async (request: Request) => {
  const adminUser = await requireAdminUser(request);
  
  if (adminUser.role !== "admin") {
    throw json({ error: "需要管理员权限" }, { status: 403 });
  }
  
  return adminUser;
};
```

#### 管理员登出 (`app/routes/admin.logout.tsx`)
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  return destroyAdminSession(request);
};
```

### 2. 游记审核管理系统

#### 审核列表与筛选 (`app/routes/admin._index.tsx`)
```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 认证检查
  const user = await requireAdminUser(request);
  
  // 解析查询参数
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as TravelNoteStatus | undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || undefined;
  
  // 获取审核列表
  const { notes, pagination } = await getNotesForReview({ 
    status, 
    page,
    search
  });
  
  return json({ 
    user,
    notes,
    pagination,
    params: { status, page, search }
  });
};
```

#### 审核操作 (`app/routes/admin._index.tsx`)
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  // 认证检查
  const user = await requireAdminUser(request);
  
  // 解析表单数据
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  const noteId = formData.get("noteId") as string;
  
  switch (action) {
    case "approve":
      // 批准游记
      await updateNoteStatus({ noteId, status: "approved" });
      return json({ success: true });
      
    case "reject": {
      // 拒绝游记
      const rejectionReason = formData.get("rejectionReason") as string;
      await updateNoteStatus({ noteId, status: "rejected", rejectionReason });
      return json({ success: true });
    }
      
    case "delete":
      // 删除游记（仅管理员）
      if (user.role !== "admin") {
        return json({ error: "没有权限执行此操作" }, { status: 403 });
      }
      await adminDeleteNote(noteId);
      return json({ success: true });
  }
};
```

#### 审核状态更新服务 (`app/services/notes.server.ts`)
```typescript
// 更新笔记状态
export const updateNoteStatus = async ({ 
  noteId, 
  status, 
  rejectionReason 
}: { 
  noteId: string; 
  status: TravelNoteStatus; 
  rejectionReason?: string;
}) => {
  try {
    await db.update(travelNotes)
      .set({ 
        status, 
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        updatedAt: new Date()
      })
      .where(eq(travelNotes.id, noteId));
    
    return { success: true };
  } catch (error) {
    console.error("Error updating note status:", error);
    return { error: "更新游记状态失败" };
  }
};
```

### 3. 管理界面 UI 组件

#### 布局组件 (`app/routes/admin.tsx`)
```tsx
export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-primary-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin" className="flex items-center">
                <MdAdminPanelSettings className="h-8 w-8 mr-2" />
                <span className="font-semibold text-xl">游记管理</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                {user.name} ({user.role === "admin" ? "管理员" : "审核员"})
              </div>
              <Form method="post" action="/admin/logout">
                <button
                  type="submit"
                  className="text-white hover:text-gray-200 focus:outline-none px-2 py-1 rounded text-sm"
                >
                  <MdLogout className="h-5 w-5" />
                </button>
              </Form>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
```

#### 审核列表界面 (`app/routes/admin._index.tsx`)
```tsx
export default function AdminIndex() {
  const { notes, pagination, params, user } = useLoaderData<typeof loader>();
  
  // UI 渲染代码...
  return (
    <div>
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总游记数"
          count={pagination.totalItems}
          icon={<MdArticle className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="待审核"
          count={pendingCount}
          icon={<MdWarning className="h-6 w-6 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title="已通过"
          count={approvedCount}
          icon={<MdCheckCircle className="h-6 w-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title="已拒绝"
          count={rejectedCount}
          icon={<MdCancel className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>
      
      {/* 筛选与搜索 */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        {/* 状态筛选 */}
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange("")}
            className={getStatusButtonClass("")}
          >
            全部
          </button>
          <button
            onClick={() => handleStatusChange("pending")}
            className={getStatusButtonClass("pending")}
          >
            <MdWarning className="inline-block mr-1" />
            待审核
          </button>
          {/* 其他状态按钮 */}
        </div>
        
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex">
          <input
            type="text"
            name="searchQuery"
            placeholder="搜索游记标题或内容..."
            className="border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={params.search || ""}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none"
          >
            <MdSearch className="h-5 w-5" />
          </button>
        </form>
      </div>
      
      {/* 游记列表 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* 表格或卡片列表... */}
      </div>
      
      {/* 分页控件 */}
      <div className="mt-6">
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          isLoading={navigation.state !== "idle"}
        />
      </div>
      
      {/* 拒绝理由模态窗 */}
      {showRejectionModal && (
        <Modal
          title="拒绝原因"
          onClose={() => setShowRejectionModal(false)}
        >
          <div className="mt-4">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="请输入拒绝原因"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowRejectionModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
            >
              确认拒绝
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

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

```typescript
// 登录表单处理
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const action = formData.get("_action") as string;
  
  if (action === "login") {
    // 处理登录
    try {
      const { user } = await login({ username, password });
      return createUserSession(user, "/");
    } catch (error) {
      return json({ errors: { login: "用户名或密码错误" } });
    }
  } else if (action === "register") {
    // 处理注册
    try {
      const user = await register({ 
        username, 
        password, 
        nickname: formData.get("nickname") as string 
      });
      return createUserSession(user, "/");
    } catch (error) {
      return json({ errors: { register: "注册失败，用户名或昵称可能已被使用" } });
    }
  }
  
  return json({ errors: { general: "无效的操作" } });
};
```

#### 个人资料设置 (`app/routes/_user.settings.tsx`)

```typescript
// 修改用户资料
export const action = async ({ request }: ActionFunction) => {
  const user = await getLoggedInUser(request);
  
  if (!user) {
    return json({ error: "未登录" }, { status: 401 });
  }
  
  const formData = await request.formData();
  const nickname = formData.get("nickname")?.toString();
  const avatarUrl = formData.get("avatarUrl")?.toString();
  
  try {
    // 更新用户资料
    await db.update(users).set({
      nickname,
      avatarUrl: avatarUrl || user.avatarUrl,
    }).where(eq(users.id, user.id));
    
    return json({ success: true });
  } catch (error) {
    return json({ error: "更新资料失败，请稍后再试" }, { status: 500 });
  }
};
```

#### 用户登出 (`app/routes/logout.tsx`)

```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  return destroyUserSession(request);
};
```

### 2. 旅行笔记管理

#### 浏览旅行笔记 (`app/routes/_user._index.tsx`)

```typescript
export const loader: LoaderFunction = async ({ request }) => {
  // 获取用户登录状态
  const user = await getLoggedInUser(request);
  
  // 从数据库获取已审核通过的游记列表
  const publishedNotes = await getPublishedNotes({ limit: 20 });
  
  // 获取热门目的地（按地点分组，计算每个地点的游记数量）
  const popularDestinations = await db
    .select({
      location: sql<string>`location`,
      count: sql<number>`count(*)::int`,
    })
    .from(travelNotesTable)
    .where(
      eq(travelNotesTable.status, "approved"),
    )
    .groupBy(sql`location`)
    .orderBy(desc(sql`count(*)`))
    .limit(6);
  
  return json({
    travelNotes: publishedNotes,
    popularDestinations,
    user
  });
};
```

#### 发布旅行笔记 (`app/routes/_user.publish.tsx`)

```typescript
export const action: ActionFunction = async ({ request }) => {
  // 确保用户已登录
  const user = await requireLoggedInUser(request) as User;
  
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const location = formData.get("location") as string;
  const mediaUrls = formData.getAll("mediaUrls[]") as string[];
  const mediaTypes = formData.getAll("mediaTypes[]") as string[];
  
  // 验证表单输入
  const errors: ActionData["errors"] = {};
  // ... 验证逻辑 ...
  
  try {
    // 处理媒体项
    const mediaArray = mediaUrls.map((url, index) => ({
      type: mediaTypes[index] as "image" | "video",
      url,
      order: index
    }));
    
    // 在数据库中创建笔记
    const noteResult = await createNote({
      userId: user.id,
      title,
      content,
      location,
      media: mediaArray
    });
    
    // 重定向到用户的旅行笔记页面
    return redirect("/my-notes");
  } catch (error) {
    return json<ActionData>(
      { errors: { general: "游记发布失败，请稍后重试" } },
      { status: 500 }
    );
  }
};
```

#### 管理个人旅行笔记 (`app/routes/_user.my-notes.tsx`)

```typescript
export const loader: LoaderFunction = async ({ request }) => {
  // 获取登录用户，或重定向到登录页面
  const user = await requireLoggedInUser(request) as User;

  // 获取该用户的所有笔记
  const notes = await getUserNotes(user.id);
  
  // 过滤掉已删除的笔记
  const activeNotes = notes.filter(note => !note.isDeleted);

  return json({ notes: activeNotes, user });
};

export const action: ActionFunction = async ({ request }) => {
  // 获取登录用户，或重定向到登录页面
  const user = await requireLoggedInUser(request) as User;

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'delete') {
    const noteId = formData.get('noteId') as string;
    // 删除笔记（软删除）
    const result = await deleteNote(noteId, user.id);
    return json({ success: true });
  }

  return json({ error: '无效的操作' }, { status: 400 });
};
```

#### 编辑已有笔记 (`app/routes/_user.edit.$id.tsx`)

```typescript
export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await requireLoggedInUser(request) as User;
  const noteId = params.id;
  
  if (!noteId) {
    throw new Response("笔记ID必须提供", { status: 400 });
  }

  // 获取笔记详情
  const note = await getNoteById(noteId);
  
  // 检查是否是笔记所有者
  if (note.userId !== user.id) {
    throw new Response("没有权限编辑这篇笔记", { status: 403 });
  }

  return json({ note, user });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireLoggedInUser(request) as User;
  const noteId = params.id;
  
  if (!noteId) {
    return json({ errors: { general: "笔记ID必须提供" } }, { status: 400 });
  }
  
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const location = formData.get("location") as string;
  const mediaUrls = formData.getAll("mediaUrls[]") as string[];
  const mediaTypes = formData.getAll("mediaTypes[]") as string[];
  
  // ... 验证和更新逻辑 ...
  
  try {
    // 更新笔记
    const result = await updateNote({
      id: noteId,
      userId: user.id,
      title,
      content,
      location,
      media: /* 媒体项处理 */
    });
    
    return redirect("/my-notes");
  } catch (error) {
    return json(
      { errors: { general: "更新游记失败，请稍后重试" } },
      { status: 500 }
    );
  }
};
```

### 3. 媒体处理

#### 文件上传 API (`app/routes/api.upload.tsx`)

```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  // 检查用户是否已登录
  await requireLoggedInUser(request);
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return json({ error: "请提供文件" }, { status: 400 });
    }
    
    // 验证文件类型
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      return json(
        { error: "只支持图片和视频文件" },
        { status: 400 }
      );
    }
    
    // 生成唯一文件名
    const fileExtension = file.name.split(".").pop();
    const newFilename = `${crypto.randomUUID()}.${fileExtension}`;
    
    // 保存文件
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    
    // 确保上传目录存在
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    
    // 写入文件
    await fs.writeFile(path.join(UPLOAD_DIR, newFilename), fileBuffer);
    
    // 返回文件URL
    return json({
      success: true,
      url: `/upload/${newFilename}`,
    });
  } catch (error) {
    console.error("文件上传错误:", error);
    return json(
      { error: "文件上传失败，请稍后重试" },
      { status: 500 }
    );
  }
};
```

#### 访问上传的文件 (`app/routes/upload.$filename.tsx`)

```typescript
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const filename = params.filename;
  if (!filename) {
    throw new Response("文件名必须提供", { status: 400 });
  }
  
  // 生成完整文件路径
  const filePath = path.join(UPLOAD_DIR, filename);
  
  try {
    // 检查文件是否存在
    await fs.access(filePath);
    
    // 读取文件
    const file = await fs.readFile(filePath);
    
    // 确定MIME类型
    const mimeType = getMimeType(filename);
    
    // 设置缓存控制
    return new Response(file, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    throw new Response("文件不存在", { status: 404 });
  }
};
```

### 4. 布局和UI组件

#### 用户布局 (`app/routes/_user.tsx`)

```tsx
export default function UserLayout() {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <span className="text-primary-600 font-bold text-xl">旅游日记</span>
              </Link>
            </div>
            
            {/* 用户菜单 */}
            <div className="flex items-center">
              {user ? (
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nickname} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                    )}
                    <span className="ml-2 text-sm text-gray-700">{user.nickname}</span>
                    <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                  </button>
                  
                  {/* 下拉菜单 */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
                      <Link to="/my-notes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的游记</Link>
                      <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">账号设置</Link>
                      <Form method="post" action="/logout">
                        <button type="submit" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">登出</button>
                      </Form>
                    </div>
                  )}
                </div>
              ) : !isLoginPage ? (
                <Link to="/login" className="text-primary-600 hover:text-primary-900 font-medium">登录 / 注册</Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="flex-1 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Outlet />
        </div>
      </main>
      
      {/* 页脚 */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; 2025 旅游日记 - 分享您的旅行记忆
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### 5. 服务层实现

#### 用户认证服务 (`app/services/auth.server.ts`)

```typescript
// 处理用户登录
export async function login({ username, password }: LoginForm) {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username)
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error("密码不正确");
  }

  return { user };
}

// 处理用户注册
export async function register({ username, password, nickname }: RegisterForm) {
  // 密码加密
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // 创建新用户
    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        nickname,
        role: "user"
      })
      .returning();

    return user;
  } catch (error) {
    // 处理唯一约束错误
    console.error("注册失败:", error);
    throw new Error("用户名或昵称已被使用");
  }
}

// 会话管理
export async function createUserSession(user: User, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", user.id);
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session)
    }
  });
}
```

#### 笔记服务 (`app/services/notes.server.ts`)

```typescript
// 获取已发布的游记
export const getPublishedNotes = async ({ 
  limit = 10, 
  offset = 0 
}: { 
  limit?: number; 
  offset?: number;
}) => {
  try {
    const notes = await db.query.travelNotes.findMany({
      where: and(
        eq(travelNotes.status, "approved"),
        eq(travelNotes.isDeleted, false)
      ),
      with: {
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true
          }
        },
        media: true
      },
      orderBy: [desc(travelNotes.createdAt)],
      limit,
      offset
    });
    
    return notes;
  } catch (error) {
    console.error("Error fetching published notes:", error);
    return [];
  }
};

// 创建新游记
export const createNote = async ({ 
  userId, 
  title, 
  content,
  location,
  media 
}: CreateNoteParams) => {
  try {
    // 开始数据库事务
    return await db.transaction(async (tx) => {
      // 创建游记
      const [note] = await tx
        .insert(travelNotes)
        .values({
          userId,
          title,
          content,
          location,
          status: "pending" // 新游记默认为待审核状态
        })
        .returning();
      
      // 如果有媒体文件，添加到数据库
      if (media && media.length > 0) {
        await tx.insert(noteMedia).values(
          media.map((item, index) => ({
            noteId: note.id,
            mediaType: item.type,
            url: item.url,
            order: index
          }))
        );
      }
      
      return note;
    });
  } catch (error) {
    console.error("Error creating note:", error);
    throw error;
  }
};
```

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

应用使用 PostgreSQL 数据库，详细信息请参考 `app/README.db.md`。

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



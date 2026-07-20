# KeKe ExamHub · 考试信息管理系统

> **一套代码，四端协同**：管理员后台 / 教室端大屏 / 学生端 / 教师端，统一管理考试、教室、教师、学生、公告、域名与 SSL 证书，内置 AI 助手（Function Calling + 危险操作确认）。

| 项目 | 信息 |
|------|------|
| 作者 | 落梦陳 (KeKe0904) |
| 社交 | B站 / 抖音：落梦陳 |
| GitHub | https://github.com/KeKe0904/KeKe-ExamHub |
| 开发工具 | Trae IDE |
| License | MIT |
| 当前版本 | **v1.2.1** |

---

## 目录

- [一、项目简介](#一项目简介)
- [二、核心特性](#二核心特性)
- [三、技术栈](#三技术栈)
- [四、环境要求](#四环境要求)
- [五、快速开始（开发环境）](#五快速开始开发环境)
- [六、生产部署（install.sh v4.0）](#六生产部署installsh-v40)
- [七、项目结构](#七项目结构)
- [八、前端路由总览](#八前端路由总览)
- [九、后端 API 总览](#九后端-api-总览)
- [十、AI 助手架构](#十ai-助手架构)
- [十一、安全机制](#十一安全机制)
- [十二、响应式设计](#十二响应式设计)
- [十三、Cookie 与本地存储](#十三cookie-与本地存储)
- [十四、开发命令](#十四开发命令)
- [十五、常见问题](#十五常见问题)
- [十六、更新日志](#十六更新日志)
- [十七、开发者信息](#十七开发者信息)

---

## 一、项目简介

KeKe ExamHub 是一个面向学校/考试机构的考试信息管理系统，采用**前后端分离架构**，单一代码库同时提供四端入口：

- **管理员后台**（`/admin/*`）：考试、公告、教学楼、教室、教师、学生、班级、注册码、IP 黑名单、域名 SSL、审计日志、服务器监控、环境重装、AI 助手等全功能管理。
- **教室端大屏**（`/classroom/*`）：一体机友好，黑色监考大屏 + 实时倒计时，仅显示被分配到本教室的考试。
- **学生端**（`/student/*`）：查看本人考试安排、班级信息。
- **教师端**（`/teacher/*`）：查看所授班级、学生名单、考试安排。

系统支持**一键部署**（`install.sh v4.0`，8 步流程，含域名 DNS 校验 + SSL 证书四选项 + 断点续传）、**JWT 四端互斥认证**（7 天有效期）、**AI 助手**（27 个工具，分级 safe/dangerous/forbidden）、**域名访问控制**（绑定域名后拒绝 IP 直连）等生产级特性。

---

## 二、核心特性

| # | 特性 | 说明 |
|---|------|------|
| 1 | 四端协同 | 管理员 / 教室 / 学生 / 教师，独立 JWT 互斥 |
| 2 | AI 助手 | OpenAI 兼容 API + Function Calling + SSE 流式 + 危险操作二次确认 |
| 3 | 域名与 SSL | DNS 校验、证书上传/检测/自动申请（Let's Encrypt）、绑定域名后拒绝 IP 直连 |
| 4 | 一键部署 | `install.sh v4.0`，Debian/Ubuntu 全自动，8 步完成 |
| 5 | 安全加固 | JWT 强密钥、rate-limit、IP 黑名单、XSS 过滤、Cookie 安全、CRLF 注入防护 |
| 6 | 响应式 | 5 断点（<400 / <768 / 768-1023 / 1024-1199 / ≥1200），平板/手机专属样式 |
| 7 | 深色模式 | 基于 `class` 的深色模式，CSS 变量驱动，状态持久化 |
| 8 | 审计日志 | 所有管理员操作自动记录，支持按动作/管理员/日期检索 |
| 9 | 服务器监控 | CPU/内存/磁盘/运行时长/负载实时监控 |
| 10 | 安装向导 | 首次访问 `/setup` 引导建库、生成 `.env`、创建管理员账号 |
| 11 | 环境重装 | 后台支持后端/前端/完整重装，自动恢复 PM2 进程 |

---

## 三、技术栈

### 前端

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | React | ^18.3.1 |
| 语言 | TypeScript | ~5.8.3 |
| 构建 | Vite | ^6.3.5 |
| 路由 | React Router DOM | ^7.3.0 |
| 状态 | Zustand | ^5.0.3 |
| 样式 | Tailwind CSS | ^3.4.17 |
| 富文本 | TipTap | ^3.27.1（含 StarterKit / Table / Image / Link / Placeholder / TextAlign / TextStyle / Color / Underline） |
| 日期 | date-fns ^4.4.0 + react-day-picker ^10.0.1 |
| 安全 | DOMPurify ^3.4.11 |
| 工具 | clsx ^2.1.1 + tailwind-merge ^3.0.2 |

### 后端

| 分类 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | ≥18（推荐 20 LTS） |
| 框架 | Fastify | ^4.28.1 |
| 语言 | TypeScript | ~5.8.3 |
| 数据库 | MySQL / MariaDB | mysql2 ^3.11.0 |
| 认证 | @fastify/jwt | ^8.0.1 |
| 限流 | @fastify/rate-limit | ^9.1.0 |
| 跨域 | @fastify/cors | ^9.0.1 |
| 加密 | bcryptjs | ^2.4.3 |
| 安全 | isomorphic-dompurify | ^3.18.0 |
| 配置 | dotenv | ^16.4.5 |
| 开发 | tsx | ^4.19.2 |

### 部署

| 分类 | 技术 |
|------|------|
| 进程守护 | PM2 |
| 反向代理 | Nginx |
| SSL | Let's Encrypt（acme.sh）/ 自签名 / 用户上传 |
| 一键部署 | `install.sh v4.0`（Debian 11/12、Ubuntu 20.04/22.04/24.04） |

---

## 四、环境要求

### 开发环境

- **Node.js** ≥ 18.0.0（推荐 20 LTS）
- **npm** ≥ 9
- **MySQL 8.0** 或 **MariaDB 10.6+**（本地或远程）
- **Git**

### 生产环境

- **操作系统**：Debian 11/12、Ubuntu 20.04/22.04/24.04（基于 apt 的 Linux）
- **权限**：root 或 sudo 用户
- **端口**：80（HTTP）/ 443（HTTPS）/ 22（SSH）
- **内存**：≥ 1GB（PM2 限制单进程 500MB）
- **磁盘**：≥ 5GB

---

## 五、快速开始（开发环境）

### 5.1 克隆仓库

```bash
git clone https://github.com/KeKe0904/KeKe-ExamHub.git
cd KeKe-ExamHub
```

### 5.2 安装前端依赖

```bash
npm install
```

### 5.3 安装后端依赖

```bash
cd api
npm install
cd ..
```

### 5.4 准备数据库

启动 MySQL/MariaDB，创建数据库：

```bash
mysql -u root -p -e "CREATE DATABASE examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 5.5 配置后端环境变量

复制示例并编辑：

```bash
cp api/.env.example api/.env
```

`api/.env` 关键字段（开发环境推荐）：

```ini
# 服务器配置
PORT=3001                       # 开发环境推荐 3001，避免与生产 3000 冲突
HOST=0.0.0.0
NODE_ENV=development

# MySQL 数据库配置（TCP 方式）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=examhub

# Socket 连接方式（本地 root 免密时使用，优先级高于 TCP）
# DB_SOCKET=/var/run/mysqld/mysqld.sock

# JWT 配置（必须 ≥ 16 字符，否则后端拒绝启动）
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# 管理员默认账号（仅 npm run migrate 时使用）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> **端口约定**：
> - **开发环境**：后端 `PORT=3001`，前端 `vite.config.ts` 代理 `/api` → `http://localhost:3001`
> - **生产环境**：后端 `PORT=3000`（由安装向导写入 `.env`），Nginx 反代 `/api` → `127.0.0.1:3000`

### 5.6 执行数据库迁移

```bash
cd api
npm run migrate
```

迁移脚本会：
1. 创建核心表（admins、exams、announcements、settings、buildings、registration_codes、classrooms、exam_classrooms）
2. 插入默认管理员账号（admin / admin123）
3. 纯净系统：不插入任何示例数据
4. 执行 `init.sql` 创建其余 12 张表（teacher_roles、teachers、classes、students、exam_students、exam_invigilators、ip_blacklist、classroom_login_logs、classroom_trusted_ips、classroom_countdowns、domains、admin_logs）
5. 动态创建 admin_logs、domains 表

### 5.7 启动服务

**启动后端**（开发模式，tsx watch 热重载）：

```bash
cd api
npm run dev
# 后端运行在 http://localhost:3001
```

**启动前端**（另开一个终端）：

```bash
npm run dev
# 前端运行在 http://localhost:5173
# /api 请求自动代理到 http://localhost:3001
```

### 5.8 访问应用

| 入口 | 地址 |
|------|------|
| 公共首页 | http://localhost:5173/ |
| 管理员登录 | http://localhost:5173/admin/login |
| 教室端登录 | http://localhost:5173/classroom/login |
| 学生端登录 | http://localhost:5173/student/login |
| 教师端登录 | http://localhost:5173/teacher/login |
| 安装向导 | http://localhost:5173/setup |

**默认管理员账号**：`admin` / `admin123`（首次登录后请立即在「设置 → 修改密码」中修改）

---

## 六、生产部署（install.sh v4.0）

### 6.1 一键部署（推荐）

适用于 Debian 11/12、Ubuntu 20.04/22.04/24.04 等 apt 系 Linux。

```bash
# 克隆代码
git clone https://github.com/KeKe0904/KeKe-ExamHub.git
cd KeKe-ExamHub

# 标准部署（推荐）
sudo ./install.sh

# 可选参数
sudo ./install.sh --force-build    # 强制重新构建
sudo ./install.sh --skip-update    # 跳过 git pull，仅构建当前代码
sudo ./install.sh --skip-db-init   # 跳过数据库初始化（已建好库时）
sudo ./install.sh --help           # 显示帮助
```

### 6.2 部署流程（8 步）

| 步骤 | 函数 | 说明 |
|------|------|------|
| 0/8 | `check_privilege` | 检查 root/sudo 权限 |
| 1/8 | `check_and_install_environment` | 安装 Node.js 20 LTS / Nginx / MariaDB / PM2 |
| 2/8 | `setup_database` | 交互式创建数据库和用户（密码必填 + 二次确认 + 强度检查） |
| 3/8 | `setup_domain_ssl` | 域名 DNS 校验 + SSL 证书配置（四选项） |
| 4/8 | `build_backend` | 后端 TypeScript 编译（`tsc`） |
| 5/8 | `build_frontend` | 前端构建（`tsc -b && vite build`） |
| 6/8 | `setup_pm2` | 生成 `ecosystem.config.cjs`，启动 PM2 进程 |
| 7/8 | `setup_nginx` | 动态生成 Nginx 配置（含域名/SSL/反代） |
| 8/8 | `check_firewall` + `print_summary` | 防火墙检查 + 部署总结 |

### 6.3 步骤 3 详解：域名与 SSL 配置

**3.1 询问是否配置域名**（`y/N`）：选 `N` 跳过，后续可在后台「域名管理」添加。

**3.2 输入域名并自动校验 DNS 解析**：
- 自动获取服务器公网 IP（依次尝试 `api.ipify.org`、`ifconfig.me`、`icanhazip.com`）
- 自动解析域名指向 IP（依次尝试 `dig`、`host`、`getent`、`nslookup`）
- 比对解析 IP 与服务器 IP，不一致时报错"没有解析到当前的 IP"
- 用户可选择重新输入或跳过

**3.3 SSL 证书配置四选项**：

| 选项 | 说明 |
|------|------|
| `0` 不配置 SSL | 仅 HTTP |
| `1` 自己上传 SSL 证书 | 输入 `fullchain.pem` 和 `privkey.pem` 路径，自动校验 PEM 格式 |
| `2` 自动检测已有 SSL 证书 | 扫描 `letsencrypt`、`nginx/ssl`、`/root/certs`、`/home/certs`、项目目录 |
| `3` 自动申请免费 SSL 证书 | Let's Encrypt，自动安装 acme.sh，standalone 模式申请 |

**3.4 配置汇总确认** → **3.5 写入临时文件**（`/tmp/examhub_domain_config.conf`，chmod 600）→ **3.6 同步 SITE_URL** 到 `.env`

### 6.4 Nginx 配置三种情况

| 情况 | 配置 |
|------|------|
| A：域名 + SSL | IP 访问返回 444、HTTP→HTTPS 301、HTTPS 主服务 |
| B：域名 + 无 SSL | IP 访问拒绝 + 域名 HTTP 服务 |
| C：无域名 | catch-all，直接 IP 访问 |

所有情况均包含：安全响应头、gzip、静态资源缓存、SPA 路由回退、API 反向代理（`/api/` → `127.0.0.1:3000`）。

### 6.5 部署后配置

访问 `http(s)://你的域名/setup` 完成安装向导：
1. 填写数据库连接信息
2. 设置管理员账号密码
3. 点击「安装」→ 系统自动建表、生成 `.env`、重启后端

### 6.6 域名访问控制（核心特性）

- **Nginx 层**：绑定域名后，IP 访问返回 `444 Connection Closed Without Response`
- **后端层**：`domainAccessMiddleware` 拦截，IP 访问返回 403 + JSON 提示
- **未绑定任何域名**：所有访问放行（兼容首次部署）
- **前提条件**：域名必须已解析到当前 IP（脚本步骤 3.2 自动校验）

### 6.7 手动部署（可选）

如不使用一键脚本，需手动完成：

```bash
# 1. 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 安装 Nginx、MariaDB、PM2
sudo apt install -y nginx mariadb-server
sudo npm install -g pm2

# 3. 创建数据库
mysql -u root -p -e "CREATE DATABASE examhub CHARACTER SET utf8mb4;"

# 4. 安装依赖
npm install
cd api && npm install && cd ..

# 5. 配置 .env（参考 5.5 节，PORT 改为 3000）

# 6. 数据库迁移
cd api && npm run migrate && cd ..

# 7. 构建
cd api && npm run build && cd ..
npm run build

# 8. PM2 启动后端
pm2 start api/dist/server.js --name examhub-api
pm2 save

# 9. Nginx 配置（参考 6.4 节）

# 10. 访问 /setup 完成安装向导
```

### 6.8 Nginx 配置示例（HTTPS + 域名）

```nginx
# IP 访问拒绝
server {
    listen 80 default_server;
    listen 443 default_server;
    server_name _;
    return 444;
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

# HTTPS 主服务
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/examhub;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

---

## 七、项目结构

```
KeKe-ExamHub/
├── api/                              # 后端服务
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts           # 数据库连接池（TCP/Socket 双模式）
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT 认证中间件
│   │   │   ├── domain-access.ts      # 域名访问控制（生产环境，拒绝 IP 直连）
│   │   │   └── ip-blacklist.ts       # IP 黑名单中间件
│   │   ├── migrations/
│   │   │   ├── init.sql              # 数据库初始化 SQL（20 张表）
│   │   │   └── run.ts                # 迁移执行脚本
│   │   ├── routes/                   # 23 个路由模块
│   │   │   ├── ai.ts                 # AI 助手（管理员专用）
│   │   │   ├── announcements.ts      # 公告管理
│   │   │   ├── audit-logs.ts         # 审计日志
│   │   │   ├── auth.ts               # 管理员认证
│   │   │   ├── buildings.ts          # 教学楼管理
│   │   │   ├── classes.ts            # 班级管理
│   │   │   ├── classroom.ts          # 教室端登录/注册
│   │   │   ├── classroom-countdowns.ts # 教室端倒计时
│   │   │   ├── classrooms.ts         # 教室端账号管理（管理端）
│   │   │   ├── domains.ts            # 域名管理（含 SSL）
│   │   │   ├── environment.ts        # 服务器环境（含重装）
│   │   │   ├── exams.ts              # 考试管理
│   │   │   ├── ip-blacklist.ts       # IP 黑名单 + 异常登录
│   │   │   ├── monitor.ts            # 服务器监控
│   │   │   ├── registration-codes.ts # 注册码管理
│   │   │   ├── school-info.ts        # 学校信息
│   │   │   ├── settings.ts           # 系统设置
│   │   │   ├── setup.ts              # 安装向导
│   │   │   ├── student-auth.ts       # 学生端认证
│   │   │   ├── students.ts           # 学生管理
│   │   │   ├── teacher-auth.ts       # 教师端认证
│   │   │   ├── teachers.ts           # 教师管理（含角色）
│   │   │   └── weather.ts            # 天气查询
│   │   ├── utils/
│   │   │   ├── acme.ts               # ACME SSL 证书申请/检测/上传/自签名
│   │   │   ├── ai-prompt.ts          # AI 提示词模板
│   │   │   ├── ai-tools.ts           # AI 工具调用（27 个工具）
│   │   │   ├── audit-log.ts          # 审计日志工具
│   │   │   ├── localize-error.ts     # 错误本地化
│   │   │   ├── response.ts           # 统一响应格式
│   │   │   └── xss.ts                # XSS 过滤（sanitizeText/sanitizeHtml）
│   │   └── server.ts                 # 服务入口
│   ├── .env.example                  # 后端环境变量示例
│   ├── package.json
│   └── tsconfig.json
├── public/
│   ├── favicon.svg
│   └── fonts/
│       └── JiYingHuiPianHuiSong.ttf  # 极影偏辉宋体（标题字体）
├── src/                              # 前端源码
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AdminLayout.tsx       # 管理员布局（侧边栏 + 抽屉）
│   │   │   ├── StudentLayout.tsx     # 学生端布局
│   │   │   ├── TeacherLayout.tsx     # 教师端布局
│   │   │   └── UserLayout.tsx        # 公共用户布局
│   │   ├── ui/                       # UI 基础组件库（7 个）
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Select.tsx
│   │   │   └── index.ts
│   │   ├── admin/
│   │   │   └── AiConfigPanel.tsx     # AI 配置面板
│   │   ├── CookieConsent.tsx         # Cookie 同意横幅
│   │   ├── Countdown.tsx             # 倒计时组件
│   │   ├── DateTimePicker.tsx        # 日期时间选择器
│   │   ├── ExamCard.tsx              # 考试卡片
│   │   ├── Hero.tsx                  # 首页 Hero 区
│   │   ├── Markdown.tsx              # Markdown 渲染器
│   │   ├── MathIcon.tsx              # 数学函数生成 SVG 图标
│   │   ├── RichTextEditor.tsx        # TipTap 富文本编辑器
│   │   ├── ScrollToTop.tsx           # 路由切换滚动到顶部
│   │   ├── SearchFilterBar.tsx       # 搜索过滤栏
│   │   ├── StatusBadge.tsx           # 状态徽章
│   │   ├── ThemeToggle.tsx           # 主题切换
│   │   ├── ProtectedRoute.tsx        # 管理员路由守卫
│   │   ├── ClassroomProtectedRoute.tsx
│   │   ├── StudentProtectedRoute.tsx
│   │   └── TeacherProtectedRoute.tsx
│   ├── hooks/
│   │   ├── useCookieConsent.ts       # Cookie 同意偏好
│   │   ├── useResponsive.ts          # 设备检测（mobile/tablet/desktop）
│   │   ├── useSchoolName.ts          # 学校名称
│   │   └── useSidebar.ts             # 侧边栏状态
│   ├── pages/
│   │   ├── Home.tsx                  # 公共首页
│   │   ├── ExamDetail.tsx            # 考试详情
│   │   ├── Monitor.tsx               # 公开监控页
│   │   ├── SchoolInfo.tsx            # 学校信息
│   │   ├── Setup.tsx                 # 安装向导
│   │   ├── admin/                    # 管理后台（21 个页面）
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DataDashboard.tsx
│   │   │   ├── AiChat.tsx            # AI 助手对话
│   │   │   ├── ExamList.tsx
│   │   │   ├── ExamForm.tsx
│   │   │   ├── AnnouncementList.tsx
│   │   │   ├── AnnouncementForm.tsx
│   │   │   ├── Classes.tsx
│   │   │   ├── Students.tsx
│   │   │   ├── Teachers.tsx
│   │   │   ├── Buildings.tsx
│   │   │   ├── Classrooms.tsx
│   │   │   ├── RegistrationCodes.tsx
│   │   │   ├── AbnormalLogin.tsx
│   │   │   ├── IpBlacklist.tsx
│   │   │   ├── AuditLogs.tsx
│   │   │   ├── Domains.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── ServerMonitor.tsx
│   │   │   └── Environment.tsx
│   │   ├── classroom/                # 教室端（4 个页面）
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Home.tsx
│   │   │   └── Invigilation.tsx
│   │   ├── student/                  # 学生端（2 个页面）
│   │   │   ├── Login.tsx
│   │   │   └── Home.tsx
│   │   └── teacher/                  # 教师端（4 个页面）
│   │       ├── Login.tsx
│   │       ├── Home.tsx
│   │       ├── Students.tsx
│   │       └── Exams.tsx
│   ├── store/                        # Zustand 状态（8 个）
│   │   ├── aiChatStore.ts            # AI 对话状态
│   │   ├── authStore.ts              # 管理员认证
│   │   ├── classroomAuthStore.ts     # 教室端认证
│   │   ├── examStore.ts              # 考试数据
│   │   ├── schoolStore.ts            # 学校信息
│   │   ├── studentStore.ts           # 学生端认证
│   │   ├── teacherStore.ts           # 教师端认证
│   │   └── themeStore.ts             # 主题切换
│   ├── utils/
│   │   ├── api.ts                    # API 请求封装
│   │   ├── cookie.ts                 # Cookie 安全工具
│   │   ├── safeStorage.ts            # 安全本地存储
│   │   ├── date.ts                   # 日期格式化
│   │   ├── localize-error.ts         # 错误本地化
│   │   └── announcement-templates.ts # 公告模板
│   ├── App.tsx                       # 路由定义（39 条路由）
│   ├── main.tsx                      # React 入口
│   └── index.css                     # 全局样式 + 响应式断点
├── .env.example                      # 前端环境变量示例
├── CHANGELOG.md                      # 更新日志
├── LICENSE                           # MIT 许可证
├── README.md                         # 本文档
├── install.sh                        # 一键部署脚本 v4.0（1279 行）
├── package.json                      # 前端包配置
├── tailwind.config.js                # Tailwind 配置
├── tsconfig.json                     # 前端 TS 配置
└── vite.config.ts                    # Vite 配置
```

---

## 八、前端路由总览

共 **39 条路由**（10 公开 + 28 受保护 + 1 兜底），定义在 `src/App.tsx`。

### 8.1 公开路由（无需登录）

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `Home` | 公共首页（考试列表、搜索、倒计时） |
| `/exam/:id` | `ExamDetail` | 考试详情 |
| `/exam/:id/monitor` | `Monitor` | 公开监控页 |
| `/school-info` | `SchoolInfo` | 学校信息 |
| `/setup` | `Setup` | 安装向导 |
| `/admin/login` | `Login` | 管理员登录 |
| `/classroom/login` | `ClassroomLogin` | 教室端登录 |
| `/classroom/register` | `ClassroomRegister` | 教室端注册 |
| `/student/login` | `StudentLogin` | 学生端登录 |
| `/teacher/login` | `TeacherLogin` | 教师端登录 |

### 8.2 受保护路由

| 路径 | 守卫 | 组件 | 说明 |
|------|------|------|------|
| `/admin` | `ProtectedRoute` | `Dashboard` | 管理员仪表盘 |
| `/admin/data-dashboard` | `ProtectedRoute` | `DataDashboard` | 数据看板 |
| `/admin/ai-chat` | `ProtectedRoute` | `AiChat` | AI 助手 |
| `/admin/exams` | `ProtectedRoute` | `ExamList` | 考试列表 |
| `/admin/exams/new` | `ProtectedRoute` | `ExamForm` | 新建考试 |
| `/admin/exams/:id/edit` | `ProtectedRoute` | `ExamForm` | 编辑考试 |
| `/admin/announcements` | `ProtectedRoute` | `AnnouncementList` | 公告列表 |
| `/admin/announcements/new` | `ProtectedRoute` | `AnnouncementForm` | 新建公告 |
| `/admin/announcements/:id/edit` | `ProtectedRoute` | `AnnouncementForm` | 编辑公告 |
| `/admin/classes` | `ProtectedRoute` | `Classes` | 班级管理 |
| `/admin/students` | `ProtectedRoute` | `Students` | 学生管理 |
| `/admin/teachers` | `ProtectedRoute` | `Teachers` | 教师管理 |
| `/admin/buildings` | `ProtectedRoute` | `Buildings` | 教学楼管理 |
| `/admin/classrooms` | `ProtectedRoute` | `Classrooms` | 教室端账号管理 |
| `/admin/registration-codes` | `ProtectedRoute` | `RegistrationCodes` | 注册码管理 |
| `/admin/abnormal-login` | `ProtectedRoute` | `AbnormalLogin` | 异常登录记录 |
| `/admin/ip-blacklist` | `ProtectedRoute` | `IpBlacklist` | IP 黑名单 |
| `/admin/audit-logs` | `ProtectedRoute` | `AuditLogs` | 审计日志 |
| `/admin/domains` | `ProtectedRoute` | `Domains` | 域名管理 |
| `/admin/settings` | `ProtectedRoute` | `Settings` | 系统设置 |
| `/admin/monitor` | `ProtectedRoute` | `ServerMonitor` | 服务器监控 |
| `/admin/environment` | `ProtectedRoute` | `Environment` | 环境重装 |
| `/student` | `StudentProtectedRoute` | `StudentHome` | 学生首页 |
| `/teacher` | `TeacherProtectedRoute` | `TeacherHome` | 教师首页 |
| `/teacher/students` | `TeacherProtectedRoute` | `TeacherStudents` | 教师查看学生 |
| `/teacher/exams` | `TeacherProtectedRoute` | `TeacherExams` | 教师查看考试 |
| `/classroom` | `ClassroomProtectedRoute` | `ClassroomHome` | 教室端大屏 |
| `/classroom/invigilation` | `ClassroomProtectedRoute` | `ClassroomInvigilation` | 监考模式 |

### 8.3 兜底

- `*` → `<Navigate to="/" replace />`（404 重定向到首页）

---

## 九、后端 API 总览

共 **23 个路由模块 + 1 个内联健康检查**，所有路由前缀 `/api/`，定义在 `api/src/server.ts`。

### 9.1 路由模块清单

| 前缀 | 文件 | 说明 | 鉴权 |
|------|------|------|------|
| `/api/health` | `server.ts` 内联 | 健康检查 | 无 |
| `/api/setup` | `setup.ts` | 安装向导（建库、生成 .env） | 无 |
| `/api/auth` | `auth.ts` | 管理员登录/登出/修改密码 | 部分 |
| `/api/exams` | `exams.ts` | 考试 CRUD + 教室分配 | 部分 |
| `/api/announcements` | `announcements.ts` | 公告 CRUD + 置顶 | 部分 |
| `/api/settings` | `settings.ts` | 系统设置 + 管理员信息 | 部分 |
| `/api/school-info` | `school-info.ts` | 学校信息 | 部分 |
| `/api/monitor` | `monitor.ts` | 服务器监控数据 | 需登录 |
| `/api/environment` | `environment.ts` | 服务器环境 + 一键重装 | 需登录 |
| `/api/buildings` | `buildings.ts` | 教学楼 CRUD | 部分 |
| `/api/registration-codes` | `registration-codes.ts` | 注册码生成/查询/删除 | 需登录 |
| `/api/classrooms` | `classrooms.ts` | 教室端账号管理（审核/重置密码） | 需登录 |
| `/api/classroom` | `classroom.ts` | 教室端登录/注册 | 无 |
| `/api/audit-logs` | `audit-logs.ts` | 审计日志查询 | 需登录 |
| `/api/domains` | `domains.ts` | 域名 CRUD + SSL 证书管理 | 需登录 |
| `/api/ip-blacklist` | `ip-blacklist.ts` | IP 黑名单 + 异常登录 | 需登录 |
| `/api/teachers` | `teachers.ts` | 教师 CRUD + 角色管理 | 部分 |
| `/api/classroom-countdowns` | `classroom-countdowns.ts` | 教室端倒计时 | 需登录 |
| `/api/weather` | `weather.ts` | 天气查询 | 部分 |
| `/api/classes` | `classes.ts` | 班级 CRUD + 班主任分配 | 需登录 |
| `/api/students` | `students.ts` | 学生 CRUD + 批量导入 | 需登录 |
| `/api/student` | `student-auth.ts` | 学生端登录/登出 | 无 |
| `/api/teacher` | `teacher-auth.ts` | 教师端登录/登出 | 无 |
| `/api/ai` | `ai.ts` | AI 助手（管理员专用） | 需登录 |

### 9.2 AI 助手端点（`/api/ai`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai/config` | 获取 AI 配置（API Key 脱敏） |
| PUT | `/api/ai/config` | 更新 AI 配置 |
| GET | `/api/ai/models` | 获取可用模型列表 |
| POST | `/api/ai/test` | AI 连接测试 |
| POST | `/api/ai/upload` | 上传图片/文档（base64） |
| POST | `/api/ai/chat` | 流式对话（SSE + Function Calling） |
| POST | `/api/ai/chat/confirm` | 危险操作确认执行 |

### 9.3 统一响应格式

所有 API 返回统一 JSON 结构：

```typescript
// 成功
{ "success": true, "data": any, "message"?: string }

// 失败
{ "success": false, "message": string, "code"?: string }
```

### 9.4 速率限制

- 全局：100 次/分钟，基于 `request.ip`（不信任可伪造的 `X-Forwarded-For`）
- 超限返回 429：`{ "success": false, "message": "请求过于频繁，请稍后再试", "code": "RATE_LIMITED" }`

---

## 十、AI 助手架构

### 10.1 总体架构

```
前端 AiChat.tsx
    ↓ SSE 流式请求
后端 /api/ai/chat
    ↓ OpenAI 兼容 API
AI 模型（GPT/Claude/通义/DeepSeek 等）
    ↓ Function Calling
后端 executeAiTool()
    ↓ 分级处理
┌─────────────────────────────────┐
│ safe（13 个）    → 自动执行     │
│ dangerous（14 个）→ 二次确认     │
│ forbidden        → AI 拒绝引导   │
└─────────────────────────────────┘
```

### 10.2 工具分级（共 27 个工具）

**safe 类（13 个，自动执行）**：

| 工具 | 说明 |
|------|------|
| `query_exams` | 查询考试列表（按科目/地点/状态） |
| `query_teachers` | 查询教师列表 |
| `query_students` | 查询学生列表（分页） |
| `query_classes` | 查询班级列表 |
| `query_stats` | 查询系统统计（考试/教师/学生/班级数量） |
| `query_audit_logs` | 查询审计日志 |
| `query_abnormal_logins` | 查询异常登录记录 |
| `query_ip_blacklist` | 查询 IP 黑名单 |
| `query_system_health` | 查询系统健康状态 |
| `query_buildings` | 查询教学楼列表 |
| `query_classrooms` | 查询教室端账号 |
| `query_domains` | 查询域名列表 |
| `query_exam_students` | 查询考试学生名单 |

**dangerous 类（14 个，需用户在前端弹窗二次确认）**：

| 工具 | 危险提示 |
|------|---------|
| `create_exam` | 将创建一场新考试并写入数据库 |
| `import_teachers` | 将批量创建教师账号（含默认密码） |
| `import_students` | 将批量创建学生账号（含默认密码） |
| `create_class` | 将创建一个新班级 |
| `create_teacher` | 将创建一个教师账号 |
| `create_student` | 将创建一个学生账号 |
| `reset_teacher_password` | 将重置教师密码为工号后 6 位 |
| `reset_student_password` | 将重置学生密码为学号后 6 位 |
| `toggle_user_status` | 将启用/停用用户账号 |
| `create_announcement` | 将发布一条新公告，前端可见 |
| `edit_exam` | 将修改考试信息 |
| `edit_teacher` | 将修改教师信息 |
| `edit_student` | 将修改学生信息 |
| `assign_head_teacher` | 将为班级分配/更换班主任 |

**forbidden 类**：删除系统内容（删除考试/教师/班级/公告、重装环境、删除域名、解封 IP 等）—— AI 不提供工具，应拒绝并引导管理员手动操作。

### 10.3 稳定性保障

| 机制 | 说明 |
|------|------|
| `max_tokens: 4096` | 防止 tool_calls 被截断 |
| 上下文滑窗 | 最多保留最近 30 条消息 |
| 工具执行超时 | 30 秒（Promise.race） |
| 工具结果截断 | 超过 4000 字符自动截断 |
| 参数解析失败反馈 | JSON 解析失败时返回错误给 AI，不静默执行 |
| SSE 流中断处理 | 前端 catch 异常，提示"AI 响应流中断，请重试" |

### 10.4 危险操作确认流程

1. AI 调用 dangerous 工具 → 后端返回 `dangerous_pending` 事件（含工具名、参数、危险提示）
2. 前端弹出确认对话框（红色警告样式）
3. 用户确认 → 前端重新请求 `/api/ai/chat/confirm`，带 `autoConfirmDangerous: true`
4. 后端执行工具，返回结果给 AI，AI 继续生成回复

---

## 十一、安全机制

### 11.1 后端安全

| 机制 | 实现 |
|------|------|
| JWT 强密钥 | `JWT_SECRET` 必须由环境变量提供，长度 ≥ 16 字符，否则拒绝启动 |
| JWT 四端互斥 | admin / classroom / student / teacher 独立 token，7 天有效期 |
| 速率限制 | 100 次/分钟，基于 `request.ip`，不信任可伪造的 `X-Forwarded-For` |
| IP 黑名单 | 全局中间件，命中黑名单返回 403 |
| 域名访问控制 | 生产环境绑定域名后拒绝 IP 直连 |
| XSS 过滤 | `sanitizeText` / `sanitizeHtml`（基于 isomorphic-dompurify） |
| SQL 注入防护 | 全部使用 mysql2 参数化查询 |
| 密码加密 | bcryptjs，10 轮 salt |
| 随机初始密码 | 学生/教师创建或重置密码时使用 `crypto.randomInt` 生成随机 6 位数字，不再使用学号/工号后 6 位等可推导信息 |
| 首次登录强制改密 | 学生/教师 JWT 中携带 `isFirstLogin` 标记，首次登录后仅允许访问 `/change-password` 与 `/me`，改密成功后重签 token 解除限制 |
| 敏感字段保护 | 公开接口 `GET /api/settings/` 黑名单过滤 `ai_api_key` 等 |
| CORS | 生产环境基于 `SITE_URL` 白名单 |
| 全局错误处理 | 500 错误在生产环境隐藏内部细节 |

### 11.2 前端安全

| 机制 | 实现 |
|------|------|
| Cookie 安全 | `Secure`（HTTPS/localhost 自动启用）、`SameSite=Lax`（防 CSRF） |
| CRLF 注入防护 | Cookie 值包含 `\r\n` 时拒绝写入 |
| Cookie 4KB 限制 | `MAX_COOKIE_VALUE_LENGTH = 3500`，超出拒绝写入 |
| 安全本地存储 | `safeStorage.ts`，按 Cookie 同意偏好分级授权 |
| 认证存储白名单 | `safeClearAuthStorage()` 仅清除认证 key |
| 路由守卫 | 4 端独立 ProtectedRoute，token 过期自动清除 |

---

## 十二、响应式设计

### 12.1 断点定义

| 断点 | 宽度范围 | 设备类型 |
|------|---------|---------|
| xs | < 400px | 小屏手机 |
| sm | 400-767px | 手机 |
| md | 768-1023px | 平板 |
| lg | 1024-1199px | 小桌面 |
| xl | ≥ 1200px | 大桌面 |

### 12.2 `useResponsive` Hook

```typescript
const { device, isMobile, isTablet, isDesktop, width, height } = useResponsive();
// device: "mobile" | "tablet" | "desktop"
// 使用 requestAnimationFrame 防抖
// 监听 resize 与 orientationchange
// SSR 兼容（首次渲染默认 desktop）
```

### 12.3 全局响应式样式（`src/index.css`）

| 设备 | 优化项 |
|------|--------|
| 平板（768-1023px） | 触摸区域 40×40px、表单输入框 0.95rem、标题行高 1.3 |
| 手机（<768px） | 根字体 15px、卡片圆角 0.75rem、表格字体 0.8rem |
| 小屏手机（<400px） | 根字体 14px、紧凑内边距 |
| 横屏手机 | 减小顶部内边距、适配 `env(safe-area-inset-top)` |
| 深色模式 | 8px 滚动条，zinc 色阶 |

### 12.4 移动端工具类

| 类名 | 作用 |
|------|------|
| `.touch-target` | min 44×44px（iOS HIG 规范） |
| `.no-select-mobile` | 禁用文本选择 |
| `.safe-bottom` / `.safe-top` | iPhone 刘海/底部横条安全区域 |

---

## 十三、Cookie 与本地存储

### 13.1 Cookie 同意偏好

系统首次访问会显示 Cookie 同意横幅，用户可选择：

| 类别 | 说明 | 默认 |
|------|------|------|
| essential | 认证 token、会话状态 | 始终允许 |
| functional | 用户名记忆、UI 偏好 | 需同意 |
| analytics | 使用统计（预留） | 需同意 |
| preferences | 主题、语言 | 需同意 |

### 13.2 认证存储 Key

| 端 | Key | 存储 |
|----|-----|------|
| 管理员 | `examhub-token` / `examhub-username` | Cookie |
| 教室端 | `examhub-classroom-token` / `examhub-classroom-info` | Cookie |
| 学生端 | `examhub-student-token` / `examhub-student-info` | Cookie |
| 教师端 | `examhub-teacher-token` / `examhub-teacher-info` | Cookie |
| 主题 | `examhub-theme` | Cookie |
| Cookie 同意 | `examhub-cookie-consent` | Cookie |

---

## 十四、开发命令

### 前端（项目根目录）

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器（http://localhost:5173）
npm run build        # 生产构建（tsc -b && vite build）
npm run lint         # ESLint 检查
npm run check        # TypeScript 类型检查（不输出文件）
npm run preview      # 预览生产构建
```

### 后端（`api/` 目录）

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器（tsx watch，热重载）
npm run build        # TypeScript 编译（输出到 dist/）
npm start            # 运行编译后的代码（node dist/server.js）
npm run migrate      # 执行数据库迁移
```

### 部署脚本

```bash
sudo ./install.sh                    # 标准部署
sudo ./install.sh --force-build      # 强制重新构建
sudo ./install.sh --skip-update      # 跳过 git pull
sudo ./install.sh --skip-db-init     # 跳过数据库初始化
sudo ./install.sh --help             # 显示帮助
```

---

## 十五、常见问题

### Q1：启动后端报错"JWT_SECRET 未配置或长度不足 16 字符"

**A**：在 `api/.env` 中设置 `JWT_SECRET` 为至少 16 字符的强随机字符串（推荐 32 字符以上），例如：

```bash
openssl rand -hex 32
```

### Q2：开发环境前端调用 API 报 404

**A**：检查后端是否启动（默认端口 3001），`vite.config.ts` 中代理配置是否正确（`/api` → `http://localhost:3001`）。

### Q3：生产环境访问 IP 被拒绝

**A**：系统在绑定域名后会拒绝 IP 直连。请通过域名访问，或在后台「域名管理」删除域名绑定。

### Q4：安装向导访问 `/setup` 报 403

**A**：检查是否已存在 `.setup-complete` 锁文件（位于 `api/` 目录）。如需重新安装，删除该文件后重启后端。

### Q5：AI 助手不调用工具

**A**：检查以下几项：
1. 后台「设置 → AI 助手」是否已启用
2. AI 接口地址、API Key、模型是否配置正确
3. 点击「连接测试」验证连通性
4. 查看后端日志是否有工具执行错误

### Q6：AI 助手报 `Incorrect arguments to mysqld_stmt_execute`

**A**：已在 v1.1.6 修复。原因是 `pool.execute()` 使用 prepared statements，`LIMIT ?` 占位符要求严格整数类型，AI 传入的参数类型不匹配。修复后所有 `LIMIT`/`OFFSET` 值先经 `Number()|0` 强制整数转换再拼接。

### Q7：PM2 进程状态 stopped

**A**：可能是环境重装触发了进程自杀 Bug（已在 v1.1.3 修复）。手动启动：

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### Q8：7 天后自动登录失效

**A**：已在 v1.1.6 修复。`ProtectedRoute` 现在会在 token 未过期时调用 `checkAuth()` 向后端验证，同步 `isAuthenticated` 状态。

### Q9：换行显示源码（`<br/>` 被转义）

**A**：已在 v1.1.6 修复。`Markdown.tsx` 的 `renderInline` 会对内容做 HTML 转义，旧代码先 join 再 renderInline 导致 `<br/>` 被转义。修复后改为每行单独 renderInline 再用 `<br/>` 连接。

### Q10：如何修改默认管理员密码

**A**：登录后台 → 「设置 → 修改密码」，或直接访问 `/admin/settings`。

---

## 十六、更新日志

完整更新日志见 [CHANGELOG.md](./CHANGELOG.md)。以下为近期版本摘要：

### v1.2.1（2026-07-20，安全补丁版本）

**安全漏洞修复**：
- 修复学生/教师默认密码可预测漏洞（MED-01）：默认密码改为 `crypto.randomInt` 生成的随机 6 位数字，不再使用学号/工号后 6 位等可推导信息
- 新增首次登录强制改密机制：学生/教师 JWT 中携带 `isFirstLogin` 标记，首次登录后仅允许访问 `/change-password` 和 `/me`，改密成功后重签 token 解除限制
- 涉及文件：`api/src/utils/password.ts`（新增）、`students.ts`、`teachers.ts`、`student-auth.ts`、`teacher-auth.ts`、`ai-tools.ts`

### v1.2.0（2026-07-10，正式发布版本）

**严重 Bug 修复**：
- 修复安装向导只创建 9 张表的严重 bug（缺少 teachers/students/classes 等 9 张关键业务表）
- 修复 6 个分页列表接口因 `pool.execute()` LIMIT/OFFSET 参数导致的 500 错误
- 补充 admin_logs 和 domains 表到 init.sql（之前仅 run.ts 动态创建）

**安全漏洞修复**：
- 修复 acme.ts 命令注入漏洞（execSync 拼接 shell → execFileSync 参数数组）
- 修复 acme.ts 路径遍历漏洞（domain 参数未校验 ../）
- 修复 auth.ts IP 伪造漏洞（X-Forwarded-For → getClientIp）
- 修复前端公告 XSS（增加 DOMPurify 二次净化）
- 修复 setup.ts 明文密码泄露（.env 不再写入 ADMIN_PASSWORD）
- 增加学生/教师密码复杂度要求（必须包含字母和数字）
- 注册码改用 crypto.randomInt 替代 Math.random

**install.sh v4.0 全面重构**：
- set -Eeuo pipefail + trap ERR 错误处理 + 日志落盘
- --step 断点续传，DNS 解析修复（[0-9] 替代 \d）
- 显式查公共 DNS，CDN/NAT 场景提供强制使用选项

### v1.1.7（2026-07-07）

开源安全加固（纯净系统）：.env.bak 移除、.env.example 敏感字段留空、CORS fail-closed、JWT 弱密钥黑名单、run.ts 移除默认密码回退。

### v1.1.6（2026-07-06）

**域名与 SSL 全面升级**：
- `install.sh` v3.0 → v3.1，新增 `setup_domain_ssl()` 函数（步骤 3/8）
- DNS 解析自动校验、SSL 证书四选项（不配置/上传/检测/自动申请）
- Nginx 动态生成配置（IP 拒绝/HTTP 重定向/HTTPS 主服务）
- 新增 `api/src/middleware/domain-access.ts`，绑定域名后拒绝 IP 直连
- 重写 `api/src/utils/acme.ts`，新增证书检测/上传/自签名兜底
- 新增 `POST /api/domains/:id/upload-cert` 和 `POST /api/domains/:id/detect-cert`

### v1.1.6.1（2026-07-07）

**安全审计修复**：
- `server.ts`：JWT_SECRET 未配置或 <16 字符时拒绝启动
- `server.ts`：rate-limit keyGenerator 改用 `request.ip`，防止 X-Forwarded-For 伪造绕过
- `settings.ts`：公开接口 `GET /api/settings/` 添加 `SENSITIVE_KEYS` 黑名单，防止泄露 `ai_api_key`
- `ai-tools.ts`：`toolCreateAnnouncement` 使用 `sanitizeHtml` 处理 content，修复存储型 XSS

**AI 稳定性修复**：
- `ai.ts`：添加 `max_tokens: 4096` 防止 tool_calls 截断
- `ai.ts`：修复流式 `arguments` undefined 拼接 bug
- `ai.ts`：添加 `MAX_INPUT_MESSAGES=30` 滑动窗口
- `ai.ts`：工具执行 30s 超时（Promise.race）
- `ai.ts`：工具结果 4000 字符自动截断
- `ai.ts`：工具参数 JSON 解析失败时反馈错误给 AI
- `ai-tools.ts`：修复 `query_exams` 等 5 个工具的 `LIMIT ?` 参数导致的 `mysqld_stmt_execute` 错误

**用户反馈 Bug 修复**：
- `Markdown.tsx`：修复换行显示源码 bug（`<br/>` 被转义）
- `ProtectedRoute.tsx`：修复 7 天自动登录失效（token 未过期时调用 `checkAuth()` 同步状态）
- `authStore.ts`：`checkAuth` 区分 401（清除踢出）和网络错误（保留 token）
- `aiChatStore.ts`：SSE 流中断异常 catch + emoji 替换为文字标签

**UI 简约化与响应式**：
- 全仓 emoji 清理，统一文字标签风格（`[已完成]`、`[失败]`、`[提示]`）
- `Students.tsx`、`AiChat.tsx` 全面响应式适配
- 11 个模态框移动端 `p-4` 适配

### v1.1.5（2026-07-06）

**一键部署脚本 v3.0**：
- ASCII Banner、交互式数据库创建（密码必填 + 二次确认 + 强度检查）
- 新增 `--skip-db-init` 参数
- 流程从 6 步扩展为 7 步
- 彩色日志系统、数据库配置临时保存、部署总结回顾

### v1.1.4（2026-07-06）

**安全加固 + 响应式优化**：
- Cookie 安全全面强化（Secure/SameSite/CRLF/4KB 限制）
- 新增 `src/utils/safeStorage.ts`（安全本地存储 + 分级授权）
- 新增 `src/hooks/useResponsive.ts`（设备检测）
- 全局 CSS 响应式断点（5 断点专属样式）
- 布局组件 + 公共组件 + 教室端页面响应式优化

### v1.1.3（2026-06-27）

**环境重装稳定性修复**：
- 修复 `pm2 stop` 进程自杀 Bug
- 修复 PM2 `NODE_ENV=production` 导致构建失败
- 修复 `CookieConsent.tsx` 缺少 import 导致构建失败

### v1.1.2（2026-06-27）

**教室端功能模块**：
- 教室端注册/登录/大屏首页/监考模式
- 教学楼管理、注册码管理、教室端账号管理（审核流程）
- JWT 四端互斥认证
- 教室分配系统

### v1.0.5（2025）

**初始版本**：
- 考试信息前台展示、后台管理
- 公告管理、管理员登录、系统设置
- 服务器监控、环境检测、安装向导
- 黑白简约风格 + 深色/浅色模式

---

## 十七、开发者信息

| 项目 | 信息 |
|------|------|
| 作者 | 落梦陳 (KeKe0904) |
| 社交 | B站 / 抖音：落梦陳 |
| GitHub | https://github.com/KeKe0904/KeKe-ExamHub |
| 开发工具 | Trae IDE |
| License | MIT |

本项目使用 Trae IDE 开发，欢迎 Star、Issue、PR。

---

## License

[MIT](./LICENSE)

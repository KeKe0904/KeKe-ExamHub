# KeKe ExamHub

数字化考试信息管理平台 — 让考试信息展示更高效、更清晰。

> 本项目由 [Trae IDE](https://www.trae.ai) 制作完成。

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发环境](#开发环境)
- [生产部署（详细指南）](#生产部署详细指南)
  - [部署架构](#部署架构)
  - [前置条件](#前置条件)
  - [第 1 步：上传代码](#第-1-步上传代码)
  - [第 2 步：运行部署脚本](#第-2-步运行部署脚本)
  - [第 3 步：手动创建数据库用户](#第-3-步手动创建数据库用户)
  - [第 4 步：浏览器访问安装向导](#第-4-步浏览器访问安装向导)
  - [第 5 步：验证部署](#第-5-步验证部署)
- [数据库配置说明](#数据库配置说明)
- [环境变量](#环境变量)
- [Nginx 配置](#nginx-配置)
- [PM2 配置](#pm2-配置)
- [常用运维命令](#常用运维命令)
- [更新代码](#更新代码)
- [重新安装](#重新安装)
- [故障排查](#故障排查)
- [API 接口](#api-接口)
- [License](#license)

---

## 项目简介

KeKe ExamHub 是一个面向学校的考试信息展示与管理平台，替代传统手写考试信息方式。提供前台考试信息展示、监考模式全屏显示、后台考试管理、公告发布、系统设置等完整功能。

## 功能特性

### 前台

- **首页展示** — 考试信息列表，支持按状态筛选（即将开始 / 进行中 / 已结束）
- **考试详情** — 科目、时间、地点、监考老师、注意事项
- **监考模式** — 考前 1 小时开放，全屏显示考试信息，实时倒计时
- **公告展示** — 管理员公告实时同步到前台
- **倒计时** — 实时显示距离开考/结束时间

### 后台管理

- **仪表盘** — 考试数据概览统计
- **考试管理** — 发布、编辑、删除考试
- **公告管理** — 发布、编辑、删除公告
- **环境管理** — 一键检测/更新运行环境（Node.js、npm、PM2、Nginx、MariaDB、Git 等），实时日志反馈
- **服务器监控** — 实时 CPU / 内存 / 磁盘使用率，系统负载 + 进程信息
- **系统设置** — 管理员密码、头像、学校名称、站点信息
- **可视化日期选择** — 日历组件选择考试日期与时间

### 设计亮点

- **数学函数图标** — 所有图标由三角函数、参数方程等数学函数生成 SVG，无第三方图标库依赖
- **黑白简约风格** — zinc 灰阶配色，1px 边框，极简设计
- **深色/浅色模式** — 支持主题切换，跟随系统偏好
- **全字库正楷体** — 全局使用正楷字体，提升阅读体验
- **响应式布局** — 适配桌面与移动端

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 18 / 5.8 |
| 构建工具 | Vite | 6 |
| 样式 | TailwindCSS | 3 |
| 状态管理 | Zustand | 5 |
| 路由 | React Router | 7 |
| 日期处理 | date-fns + react-day-picker | 4 / 10 |
| 后端框架 | Fastify + TypeScript | 4 / 5.8 |
| 数据库 | MySQL / MariaDB（mysql2 驱动） | >= 10.5 |
| 认证 | JWT + bcryptjs | — |
| 进程守护 | PM2 | 最新 |
| 反向代理 | Nginx | >= 1.18 |
| 监控数据 | os-utils | 最新 |
| 部署脚本 | Bash（install.sh） | — |

## 项目结构

```
examhub/
├── api/                            # 后端 API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts         # 数据库连接池（支持 TCP + Socket）
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT 认证中间件
│   │   ├── migrations/
│   │   │   ├── init.sql            # 表结构 + 示例数据
│   │   │   └── run.ts              # 命令行迁移工具
│   │   ├── routes/
│   │   │   ├── auth.ts             # 认证（登录/修改密码）
│   │   │   ├── exams.ts            # 考试管理 CRUD
│   │   │   ├── announcements.ts    # 公告管理 CRUD
│   │   │   ├── settings.ts         # 系统设置
│   │   │   ├── school-info.ts      # 学校信息
│   │   │   ├── setup.ts            # 安装向导 API
│   │   │   ├── environment.ts       # 环境检测/一键更新 API
│   │   │   └── monitor.ts           # 服务器监控 API
│   │   └── server.ts               # 后端入口
│   ├── tsconfig.json               # 后端独立 TS 配置
│   ├── package.json
│   └── .env.example                # 后端环境变量示例
├── src/                            # 前端
│   ├── components/                 # 通用组件 + 数学图标
│   ├── pages/
│   │   ├── admin/                  # 后台页面（仪表盘、考试/公告/环境/监控管理）
│   │   └── Setup.tsx               # 安装向导页面
│   ├── hooks/                      # 自定义 Hook
│   ├── store/                      # Zustand 状态管理
│   └── utils/                      # 工具函数（API、日期、Cookie）
├── public/                         # 静态资源（字体、图标）
├── install.sh                      # 一键部署脚本
├── ecosystem.config.cjs            # PM2 配置（由 install.sh 生成）
├── .env.example                    # 前端环境变量示例
├── tsconfig.json                   # 前端 TS 配置（include 仅 src）
└── package.json
```

## 开发环境

### 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18（推荐 24 LTS） | 前后端运行时 |
| MySQL / MariaDB | >= 10.5 | 数据存储 |

### 启动步骤

```bash
# 1. 克隆项目
git clone https://github.com/KeKe0904/KeKe-ExamHub examhub
cd examhub

# 2. 安装后端依赖（先）
cd api
npm install
cd ..

# 3. 安装前端依赖
npm install

# 4. 配置环境变量
cp .env.example .env                  # 前端
cp api/.env.example api/.env          # 后端

# 5. 编辑 api/.env，填入本地数据库信息
#    DB_USER=root / DB_PASSWORD=你的密码 / DB_NAME=examhub

# 6. 创建数据库（本地开发可用 root）
mysql -u root -p
CREATE DATABASE IF NOT EXISTS examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 7. 运行数据库迁移（建表 + 创建管理员）
cd api
npm run migrate

# 8. 启动开发服务器（两个终端）
npm run dev                           # 前端 http://localhost:5173
cd api && npm run dev                 # 后端 http://localhost:3000
```

### 开发环境变量

前端 `.env`（开发环境用后端直连地址）：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

后端 `api/.env`（填入本地数据库凭据）：

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的本地数据库密码
DB_NAME=examhub
JWT_SECRET=dev_secret_change_in_production
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

---

## 生产部署（详细指南）

### 部署架构

```
                    ┌──────────────┐
  浏览器  ────────►  │   Nginx:80   │
                    │  (反代+静态)  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     dist/ (静态文件)          127.0.0.1:3000 (Fastify)
     前端 React SPA            后端 API (PM2 守护)
                                     │
                                     ▼
                            ┌────────────────┐
                            │  MariaDB:3306  │
                            │  examhub 数据库 │
                            └────────────────┘
```

- **Nginx** 监听 80 端口，对外提供服务
- 静态文件（`dist/`）由 Nginx 直接返回，带 gzip 压缩和长缓存
- `/api/` 路径反向代理到后端 Fastify（127.0.0.1:3000）
- 后端由 PM2 守护，崩溃自动重启，开机自启
- 数据库仅限本地连接，不对外暴露

### 前置条件

| 条件 | 说明 |
|------|------|
| 服务器 | Linux（推荐 Debian 12 / Ubuntu 22.04+），1 核 1G 起步 |
| root 权限 | install.sh 需以 root 运行（安装系统级软件） |
| 网络 | 服务器 80 端口可访问（如需 HTTPS 需额外配置 443） |

> Node.js / Nginx / MariaDB / PM2 均由 `install.sh` 自动安装，无需提前准备。
>
> **以下部署步骤均默认你已通过 SSH 连接到服务器**，命令默认在服务器终端执行。如标注「本地终端执行」则在你本地电脑执行。

### 第 1 步：上传代码

将项目代码上传到服务器 `/opt/examhub` 目录：

**方式 A：scp 上传**（本地终端执行）

```bash
scp -r . root@你的服务器IP:/opt/examhub
```

**方式 B：git clone**（服务器终端执行，推荐）

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/KeKe0904/KeKe-ExamHub examhub
cd examhub
```

**方式 C：rsync**（本地终端执行，支持增量同步）

```bash
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='api/dist' \
  . root@你的服务器IP:/opt/examhub
```

### 第 2 步：运行部署脚本

```bash
cd /opt/examhub
chmod +x install.sh
./install.sh
```

`install.sh` 会自动完成以下 6 步：

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1/6 | 环境检测与安装 | 自动安装 Node.js 24 LTS / Nginx / MariaDB / PM2（已安装则跳过），自动升级 npm 到最新 |
| 2/6 | 代码同步（版本检查） | `git fetch` 对比 GitHub，发现新版本自动 `git pull` + 显示变更日志；非 Git 目录提示警告 |
| 3/6 | 构建后端 | `cd api && npm install && npm run build` |
| 4/6 | 构建前端 | `npm install && npm run build` |
| 5/6 | 配置 PM2 | 生成 `ecosystem.config.cjs`，cwd 指向 api 目录，启动后端进程 |
| 6/6 | 配置 Nginx | gzip 压缩 + 静态资源缓存 + SPA 路由 + API 反向代理 |

**脚本特性：**

- **幂等可重复执行** — 已安装的组件自动跳过，可安全重复运行
- **版本自动更新** — 检测到 GitHub 有新版本时自动拉取并重新构建；代码未变更则跳过构建
- **Node.js 自动升级** — 检测当前版本 < 24 时自动覆盖安装到最新 24.x LTS
- **npm 自动升级** — 每次运行都会 `npm install -g npm@latest`，确保 npm 为最新版
- **不做数据库初始化** — 数据库和用户需手动创建，表结构由安装向导创建
- **路径动态化** — 脚本所在目录即为项目目录，不依赖固定路径

脚本执行完成后，终端会显示健康检查结果和后续操作指引。

### 第 3 步：手动创建数据库用户

出于安全考虑，**必须使用专用数据库用户，禁止使用 root 账号**。

执行以下 SQL：

```bash
mysql
```

```sql
-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS examhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. 创建专用用户（请将密码替换为强密码）
CREATE USER 'examhub'@'localhost' IDENTIFIED BY 'YourStrongP@ssw0rd!';

-- 3. 授予 examhub 库的全部权限
GRANT ALL PRIVILEGES ON examhub.* TO 'examhub'@'localhost';

-- 4. 刷新权限
FLUSH PRIVILEGES;

-- 5. 退出
EXIT;
```

**权限说明：**

- `examhub` 用户仅拥有 `examhub` 库的权限
- 无法访问其他数据库、无法创建新用户、无法修改系统配置
- 符合最小权限原则，即使应用被攻破也不会影响整个数据库服务器

### 第 4 步：浏览器访问安装向导

打开浏览器访问：

```
http://你的服务器IP/setup
```

按向导页面完成 4 步配置：

#### 4.1 欢迎页

点击「开始安装」。

#### 4.2 环境检测

自动检测 Node.js / MySQL / Nginx / PM2 是否就绪。4 项全绿即可继续。

#### 4.3 数据库配置

填入第 3 步创建的专用用户凭据：

| 字段 | 填写内容 |
|------|----------|
| 数据库主机 | `localhost` |
| 端口 | `3306` |
| 数据库用户名 | `examhub` |
| 数据库密码 | `YourStrongP@ssw0rd!` |
| 数据库名称 | `examhub` |

点击「测试连接」验证。成功后显示「数据库连接成功（库: examhub）」。

> **若测试失败**：检查用户名/密码是否正确、数据库是否已创建。常见错误见[故障排查](#故障排查)。

#### 4.4 管理员账号

设置后台管理员用户名和密码：

| 字段 | 建议 |
|------|------|
| 用户名 | `admin`（或自定义） |
| 密码 | 至少 8 位，含大小写字母和数字 |

#### 4.5 点击安装

系统自动完成：

1. **创建表结构** — admins / exams / announcements / settings 四张表
2. **创建管理员账号** — bcrypt 加密存储密码
3. **生成 .env 配置文件** — 写入数据库连接信息 + 随机 JWT 密钥
4. **写入安装锁文件** — `.setup-complete`
5. **自动重启后端** — 1.5 秒后执行 `pm2 restart`，加载新 .env 配置

安装完成后，页面显示「安装成功」，后端自动加载新配置，**无需手动重启**。

### 第 5 步：验证部署

```bash
# 1. 检查后端健康状态
curl http://localhost:3000/api/health
# 预期返回: {"status":"ok","timestamp":"..."}

# 2. 检查前端页面
curl -s -o /dev/null -w "%{http_code}" http://localhost/
# 预期返回: 200

# 3. 检查 PM2 进程状态
pm2 status
# 预期: examhub-api 状态为 online

# 4. 浏览器访问
# 首页:     http://你的服务器IP/
# 后台登录: http://你的服务器IP/admin/login
```

用第 4 步设置的管理员账号登录后台，即可开始发布考试信息。

---

## 数据库配置说明

### 安全原则

- **禁止使用 root 账号**连接应用数据库
- 使用专用用户 `examhub`，仅授予 `examhub` 库的权限
- 密码至少 12 位，含大小写字母 + 数字 + 特殊字符
- 用户限制为 `localhost`，不允许远程连接

### 表结构

安装向导自动创建以下 4 张表：

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `admins` | 管理员账号 | id, username, password(bcrypt), avatar |
| `exams` | 考试信息 | id, subject, exam_date, duration, location, invigilator, notes |
| `announcements` | 公告 | id, title, content, is_pinned, is_active |
| `settings` | 系统设置 | setting_key, setting_value |

### 手动建库 SQL（完整版）

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS examhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建用户（请替换密码）
CREATE USER 'examhub'@'localhost' IDENTIFIED BY 'YourStrongP@ssw0rd!';

-- 授权
GRANT ALL PRIVILEGES ON examhub.* TO 'examhub'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 连接方式

后端支持两种数据库连接方式（由 .env 配置决定，安装向导自动选择）：

| 方式 | 配置 | 适用场景 |
|------|------|----------|
| TCP 连接 | `DB_HOST` + `DB_PORT` | 专用用户（推荐生产环境） |
| Socket 连接 | `DB_SOCKET` | root 本地免密（仅开发环境） |

> `DB_SOCKET` 优先级高于 `DB_HOST`。安装向导会根据测试连接的结果自动选择。

---

## 环境变量

### 前端 `.env`

```env
# 生产环境：相对路径，由 Nginx 反向代理到后端
# 开发环境：后端直连地址
VITE_API_BASE_URL=/api
```

### 后端 `api/.env`

> 生产环境由安装向导自动生成，无需手动创建。手动配置参考 `api/.env.example`。

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# 数据库配置（TCP 连接方式）
DB_HOST=localhost
DB_PORT=3306
DB_USER=examhub
DB_PASSWORD=YourStrongP@ssw0rd!
DB_NAME=examhub

# 数据库配置（Socket 连接方式，优先级高于 TCP）
# DB_SOCKET=/run/mysqld/mysqld.sock

# JWT 配置
JWT_SECRET=由安装向导自动生成的64位随机密钥
JWT_EXPIRES_IN=7d

# 管理员默认账号（仅 npm run migrate 使用，/setup 向导会单独创建）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

| 变量 | 说明 | 生产环境 |
|------|------|----------|
| `PORT` | 后端监听端口 | 3000 |
| `HOST` | 监听地址 | 0.0.0.0 |
| `NODE_ENV` | 运行环境 | production |
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USER` | 数据库用户 | examhub |
| `DB_PASSWORD` | 数据库密码 | 强密码 |
| `DB_NAME` | 数据库名 | examhub |
| `DB_SOCKET` | Socket 路径（可选） | /run/mysqld/mysqld.sock |
| `JWT_SECRET` | JWT 签名密钥 | 安装向导自动生成 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 7d |
| `ADMIN_USERNAME` | 默认管理员用户名 | admin |
| `ADMIN_PASSWORD` | 默认管理员密码 | 安装时设置 |

---

## Nginx 配置

`install.sh` 自动生成 Nginx 配置文件 `/etc/nginx/sites-available/examhub`：

```nginx
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root /opt/examhub/dist;
    index index.html;

    # gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json
               application/javascript text/javascript
               application/xml+rss image/svg+xml;

    # 静态资源缓存（Vite 构建产物带 hash，可长期缓存）
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA 路由支持（前端 React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端 Fastify
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

**如需手动修改**，编辑后执行 `nginx -t && systemctl reload nginx` 生效。

---

## PM2 配置

`install.sh` 自动生成 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [{
    name: 'examhub-api',
    script: 'dist/server.js',
    cwd: '/opt/examhub/api',        // 关键：.env 和 .setup-complete 在此目录
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '300M',      // 内存超 300M 自动重启
    exp_backoff_restart_delay: 100,  // 崩溃重启退避策略
    out_file: '/opt/examhub/api/logs/out.log',
    error_file: '/opt/examhub/api/logs/error.log',
    merge_logs: true,
    time: true
  }]
};
```

> `cwd` 必须指向 api 目录，确保 `process.cwd()` 正确，这样 `.env` 和 `.setup-complete` 都在 `/opt/examhub/api/` 下。

---

## 常用运维命令

### PM2 服务管理

```bash
pm2 status                        # 查看后端进程状态
pm2 restart examhub-api           # 重启后端
pm2 stop examhub-api              # 停止后端
pm2 delete examhub-api            # 删除后端进程
pm2 logs examhub-api --lines 50   # 查看最近 50 行日志
pm2 logs examhub-api --err        # 只看错误日志
pm2 monit                         # 实时监控（CPU/内存）
```

### Nginx 管理

```bash
systemctl status nginx            # 查看状态
systemctl reload nginx            # 重载配置（不中断服务）
systemctl restart nginx           # 重启服务
nginx -t                          # 检查配置语法
```

### 数据库管理

```bash
mysql examhub -u examhub -p       # 以 examhub 用户进入数据库
mysqldump examhub -u examhub -p > backup.sql   # 备份数据库
mysql examhub -u examhub -p < backup.sql       # 恢复数据库
```

### 日志查看

```bash
# 后端日志
tail -f /opt/examhub/api/logs/out.log     # 标准输出
tail -f /opt/examhub/api/logs/error.log   # 错误输出

# Nginx 日志
tail -f /var/log/nginx/access.log         # 访问日志
tail -f /var/log/nginx/error.log          # 错误日志
```

---

## 更新代码

代码更新后，重新运行部署脚本即可（幂等，不会破坏已有配置）：

```bash
cd /opt/examhub

# 拉取最新代码（或重新上传）
git pull
# 或本地终端执行: rsync -avz --exclude='node_modules' . root@IP:/opt/examhub

# 重新构建并重启
./install.sh
```

`install.sh` 会：

1. 重新安装依赖（如有变化）
2. 重新构建前后端
3. 重启 PM2 进程（保留 .env 和 .setup-complete）
4. 重载 Nginx 配置

> **数据库数据不会丢失** — install.sh 不操作数据库，表结构和数据保持不变。

---

## 重新安装

如需重新配置系统（例如更换数据库用户或管理员账号）：

```bash
# 1. 删除安装锁文件和 .env 配置
rm /opt/examhub/api/.setup-complete
rm /opt/examhub/api/.env

# 2. 重启后端（加载默认配置，允许访问 /setup）
pm2 restart examhub-api

# 3. 浏览器访问 /setup 重新配置
#    http://你的服务器IP/setup
```

如需完全重置（清空数据）：

```bash
# 1. 删除安装锁文件和配置
rm /opt/examhub/api/.setup-complete
rm /opt/examhub/api/.env

# 2. 清空数据库表（危险操作！会删除所有考试数据）
mysql -u examhub -p examhub -e "
  DROP TABLE IF EXISTS admins, exams, announcements, settings;
"

# 3. 重启后端
pm2 restart examhub-api

# 4. 浏览器访问 /setup 重新安装
```

---

## 故障排查

### install.sh 执行失败

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| apt-get 报锁冲突 | 上一次 apt 未完成 | 等待 1-2 分钟后重新运行 `./install.sh` |
| Node.js 安装失败 | 网络问题 | 重试或手动安装：`curl -fsSL https://deb.nodesource.com/setup_24.x \| bash - && apt-get install -y nodejs` |
| npm install 超时 | 网络问题 | 配置淘宝镜像：`npm config set registry https://registry.npmmirror.com` |

### 安装向导测试连接失败

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `Access denied for user 'examhub'` | 用户名或密码错误 | 检查 CREATE USER 时的密码 |
| `Unknown database 'examhub'` | 数据库未创建 | 执行 `CREATE DATABASE examhub ...` |
| `Can't connect to MySQL server` | MariaDB 未运行 | `systemctl start mariadb` |

### 后端无法启动

```bash
# 查看错误日志
pm2 logs examhub-api --err --lines 30

# 常见原因:
# 1. .env 不存在 → 访问 /setup 完成安装
# 2. 数据库连接失败 → 检查 .env 中的 DB_* 配置
# 3. 端口被占用 → pm2 list 检查是否有重复进程
```

### 前端页面白屏

```bash
# 1. 检查 Nginx 配置
nginx -t

# 2. 检查 dist 目录是否存在
ls /opt/examhub/dist/index.html

# 3. 检查 Nginx root 路径
grep root /etc/nginx/sites-available/examhub
```

### /setup 页面显示「系统已安装」

说明 `.setup-complete` 锁文件已存在。如需重新安装，参考[重新安装](#重新安装)。

### PM2 开机不自启

```bash
# 重新配置开机自启
pm2 startup systemd -u root --hp /root
pm2 save
```

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/setup/status` | 安装状态 |
| GET | `/api/setup/env` | 环境检测 |
| POST | `/api/setup/database/test` | 测试数据库连接 |
| POST | `/api/setup/install` | 执行安装 |
| GET | `/api/exams` | 获取考试列表 |
| GET | `/api/exams/:id` | 获取考试详情 |
| GET | `/api/announcements` | 获取公告列表 |
| GET | `/api/settings` | 获取系统设置 |
| GET | `/api/school-info` | 获取学校信息 |
| GET | `/api/environment/check-updates` | 检测各组件更新 |
| POST | `/api/environment/update-all` | 一键更新所有组件 |
| GET | `/api/environment/update-status/:taskId` | 查询更新任务进度 |
| GET | `/api/monitor` | 获取服务器实时监控数据 |

### 认证接口（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 管理员登录 |
| PUT | `/api/auth/password` | 修改密码 |
| POST | `/api/exams` | 创建考试 |
| PUT | `/api/exams/:id` | 更新考试 |
| DELETE | `/api/exams/:id` | 删除考试 |
| POST | `/api/announcements` | 创建公告 |
| PUT | `/api/announcements/:id` | 更新公告 |
| DELETE | `/api/announcements/:id` | 删除公告 |
| PUT | `/api/settings` | 更新系统设置 |

---

## License

MIT

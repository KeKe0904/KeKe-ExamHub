# CHANGELOG

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

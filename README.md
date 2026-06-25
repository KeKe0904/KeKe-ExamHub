# KeKe ExamHub

数字化考试信息管理平台 - 让考试信息展示更高效

## 项目简介

KeKe ExamHub 是一个面向学校的考试信息展示平台，替代传统手写考试信息的方式，提供清晰、高效的考试信息展示和管理功能。包含前台考试信息展示、监考模式全屏显示、后台考试管理、公告发布、系统设置等功能。

## 功能特性

### 前台功能
- **首页展示** - 考试信息列表，支持按状态筛选（即将开始/进行中/已结束）
- **考试详情** - 显示考试科目、时间、地点、监考老师、注意事项
- **监考模式** - 考前1小时开放，全屏显示考试信息，实时倒计时
  - 考前显示距离考试开始时间
  - 考试中显示距离考试结束时间
  - 支持自动全屏，优化传统手写考试信息方式
- **公告展示** - 管理员发布的公告实时同步到前台
- **倒计时** - 实时显示考试倒计时

### 后台管理
- **仪表盘** - 考试数据统计概览
- **考试管理** - 发布、编辑、删除考试信息
- **公告管理** - 发布、编辑、删除公告
- **系统设置** - 修改管理员密码、上传头像、设置学校名称
- **可视化日期选择** - 日历选择考试日期和时间

### 技术特色
- **数学函数图标** - 所有图标使用三角函数、参数方程等数学函数生成 SVG，无第三方图标库依赖
- **黑白简约风格** - zinc 灰阶配色，1px 边框，无渐变，极简设计
- **响应式布局** - 适配桌面和移动端
- **安装向导** - 可视化部署配置，支持环境检测、数据库连接、管理员创建

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 6 (构建工具)
- TailwindCSS 3 (样式框架)
- Zustand (状态管理)
- React Router 6 (路由)
- date-fns (日期处理)
- react-day-picker (日历选择)

### 后端
- Fastify 4 + TypeScript (API 框架)
- MySQL2 (数据库驱动，支持 TCP 和 Socket 连接)
- bcryptjs (密码加密)
- JWT (身份认证)

### 部署
- PM2 (进程管理)
- Nginx (反向代理)
- MariaDB 10.11 (数据库)

## 项目结构

```
KeKe ExamHub/
├── api/                    # 后端
│   └── src/
│       ├── config/         # 数据库配置
│       ├── middleware/     # 中间件（认证）
│       ├── migrations/     # 数据库迁移
│       ├── routes/         # API 路由
│       │   ├── auth.ts     # 认证
│       │   ├── exams.ts    # 考试管理
│       │   ├── announcements.ts  # 公告管理
│       │   ├── settings.ts # 系统设置
│       │   └── setup.ts    # 安装向导
│       └── server.ts      # 入口文件
├── src/                    # 前端
│   ├── components/         # 组件
│   │   ├── Layout/         # 布局组件
│   │   ├── MathIcon.tsx   # 数学函数图标库
│   │   ├── Hero.tsx       # 首页主视觉
│   │   ├── Countdown.tsx   # 倒计时组件
│   │   └── ...
│   ├── pages/             # 页面
│   │   ├── Home.tsx       # 首页
│   │   ├── ExamDetail.tsx # 考试详情
│   │   ├── Monitor.tsx    # 监考模式
│   │   ├── Setup.tsx      # 安装向导
│   │   └── admin/         # 后台页面
│   ├── hooks/             # 自定义 Hooks
│   ├── store/             # Zustand 状态
│   └── utils/             # 工具函数
├── public/                # 静态资源
├── install.sh             # 服务器安装脚本
└── package.json
```

## 快速开始

### 环境要求
- Node.js >= 18
- MySQL/MariaDB
- PM2 (生产环境)
- Nginx (生产环境)

### 开发环境

1. 安装依赖
```bash
npm install
cd api && npm install
```

2. 配置环境变量
```bash
# 前端 .env
cp .env.example .env

# 后端 api/.env
cp api/.env.example api/.env
# 编辑数据库配置
```

3. 启动开发服务器
```bash
# 前端
npm run dev

# 后端
cd api && npm run dev
```

### 生产部署

1. 上传项目文件到服务器

2. 运行安装脚本
```bash
chmod +x install.sh
./install.sh
```

3. 访问安装向导完成配置
```
http://your-domain/setup
```

4. 按照向导完成：
   - 环境检测
   - 数据库配置
   - 管理员账号创建

## 演示账号

- 账号：admin
- 密码：admin123

## License

MIT

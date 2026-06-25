# KeKe ExamHub

数字化考试信息管理平台 — 让考试信息展示更高效、更清晰。

> 本项目由 [Trae IDE](https://www.trae.ai) 制作完成。

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
- **系统设置** — 管理员密码、头像、学校名称、站点信息
- **可视化日期选择** — 日历组件选择考试日期与时间

### 设计亮点
- **数学函数图标** — 所有图标由三角函数、参数方程等数学函数生成 SVG，无第三方图标库依赖
- **黑白简约风格** — zinc 灰阶配色，1px 边框，极简设计
- **深色/浅色模式** — 支持主题切换，跟随系统偏好
- **全字库正楷体** — 全局使用正楷字体，提升阅读体验
- **响应式布局** — 适配桌面与移动端

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 样式 | TailwindCSS 3 |
| 状态管理 | Zustand |
| 路由 | React Router 6 |
| 日期处理 | date-fns + react-day-picker |
| 后端 | Fastify 4 + TypeScript |
| 数据库 | MySQL2 |
| 认证 | JWT + bcryptjs |
| 部署 | PM2 + Nginx + MariaDB |

## 项目结构

```
KeKe ExamHub/
├── api/                     # 后端 API
│   └── src/
│       ├── config/          # 数据库配置
│       ├── middleware/       # 认证中间件
│       ├── migrations/      # 数据库迁移
│       ├── routes/          # API 路由
│       └── server.ts        # 入口文件
├── src/                     # 前端
│   ├── components/          # 通用组件
│   ├── pages/               # 页面
│   │   └── admin/           # 后台页面
│   ├── hooks/               # 自定义 Hook
│   ├── store/               # 状态管理
│   └── utils/               # 工具函数
├── public/                  # 静态资源
└── install.sh               # 服务器安装脚本
```

## 快速开始

### 环境要求
- Node.js >= 18
- MySQL / MariaDB
- PM2（生产环境）
- Nginx（生产环境）

### 开发环境

```bash
# 安装依赖
npm install
cd api && npm install && cd ..

# 配置环境变量
cp .env.example .env
cp api/.env.example api/.env

# 启动开发服务器
npm run dev          # 前端
cd api && npm run dev  # 后端
```

### 生产部署

```bash
chmod +x install.sh
./install.sh
```

访问 `http://your-domain/setup` 按照安装向导完成配置。

## License

MIT

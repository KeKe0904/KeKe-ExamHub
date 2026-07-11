# 学习工作 · KeKe ExamHub — 学校考试信息数字化管理平台

> 一套代码，五端协同。把教室里那块上万元的大屏，从"下课就黑屏"变成"考试信息终端"。

---

## 关于作者

> 17 岁，高二在读，科技爱好者，二次元浓度过高。

大家好，我是**落梦陳 (KeKe0904)**，一名普通的高中生。平时喜欢折腾各种技术，从写脚本、搭服务器到玩机器人，什么都想试一下。二次元是本命，番剧、游戏、Vtuber 都看，算是个标准的技术宅。

真正让我系统性接触 AI 的，是 **AstrBot**（原 QQ Channel Bot）。那时候想用 AI 做个 QQ 机器人，在群里聊天、回答问题、玩各种花活。为了让机器人更智能，开始研究 LLM、Prompt、插件开发…… 一发不可收拾。

从"让 AI 在群里讲笑话"到"用 AI 写一个完整的全栈项目"，AstrBot 是我真正的 AI 入门启蒙。也正是因为这段折腾机器人的经历，让我对 AI 能做什么、不能做什么有了第一手体感。

做这个项目的初衷其实很简单——**我自己就是学生，我知道考试信息有多容易搞丢**。通知纸丢了、黑板擦了、群消息翻不到了…… 这些痛点我每天都在经历。既然有痛点，又刚好会写代码，那就自己动手解决吧。

> **技术宅改变世界，从自己的教室开始。** 🚀

- **GitHub**：[KeKe0904](https://github.com/KeKe0904)
- **B站 / 抖音**：落梦陳

---

## 一、Demo 简介

**KeKe ExamHub** 是一个面向中小学和考试机构的**全栈考试信息管理平台**。核心目标：**将考试信息从纸质通知迁移到线上，让管理员、教师、学生、教室大屏都能实时获取，不再依赖满楼贴通知纸。**

从报名时的 3 层入口、8 张表，到现在**五端协同、20 张表、123 个 API 端点**——这是一次完全使用 TRAE IDE 从零迭代开发的全栈实践。

技术栈：前端 React 18 + TypeScript + Vite + Tailwind CSS + Zustand；后端 Fastify 4 + TypeScript + mysql2 + @fastify/jwt；部署 Nginx + PM2 + MariaDB。

打开浏览器即可使用，无需购买额外硬件，无需安装客户端。教室里现有的希沃、鸿合等一体机，输入网址即变为考试信息展示终端。

### 五端架构

| 端 | 入口 | 核心能力 |
|----|------|---------|
| **公众前台** | `/` | 考试列表 + 公告 + 搜索筛选，任何人可浏览 |
| **管理员后台** | `/admin` | 考试/教室/教师/学生/公告/IP 黑名单/域名管理，全功能 |
| **教室端大屏** | `/classroom` | 一体机登录，监考模式全屏倒计时 + 5 分钟红色预警 |
| **教师端** | `/teacher` | 查看监考任务、班级学生、个人信息 |
| **学生端** | `/student` | 查看个人考试安排（时间、地点、座位号） |

### 产品截图

**公众前台**（无需登录）

| 截图 | 说明 |
|------|------|
| ![公众首页](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/public-home.png?v=20260711-2) | 首页考试列表，支持搜索和筛选 |
| ![学校信息](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/public-announcements.png?v=20260711-2) | 学校信息页 |

**管理员后台**

| 截图 | 说明 |
|------|------|
| ![管理员登录](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-login.png?v=20260711-2) | 管理员登录 |
| ![仪表盘](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-dashboard.png?v=20260711-2) | 仪表盘，全平台数据一览 |
| ![考试管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-exams.png?v=20260711-2) | 考试管理列表 |
| ![创建考试](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-exam-create.png?v=20260711-2) | 创建新考试 |
| ![公告管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-announcements.png?v=20260711-2) | 公告管理 |
| ![发布公告](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-announcement-create.png?v=20260711-2) | 发布新公告 |
| ![教室管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-classrooms.png?v=20260711-2) | 教室管理，含注册审核 |
| ![教师管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-teachers.png?v=20260711-2) | 教师管理 |
| ![学生管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-students.png?v=20260711-2) | 学生管理 |
| ![注册码管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-registration-codes.png?v=20260711-2) | 注册码批量生成 |
| ![IP黑名单](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-ip-blacklist.png?v=20260711-2) | IP 黑名单管理 |
| ![域名管理](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-domains.png?v=20260711-2) | 域名和 SSL 证书管理 |
| ![操作日志](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-logs.png?v=20260711-2) | 操作审计日志 |
| ![系统设置](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/admin-settings.png?v=20260711-2) | 系统设置 |

**教室端大屏**（重点）

| 截图 | 说明 |
|------|------|
| ![教室端登录](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/classroom-login.png?v=20260711-2) | 教室端登录 |
| ![教室端首页](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/classroom-home.png?v=20260711-2) | 今日考试列表 |
| ![教室端监考大屏](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/classroom-invigilation.png?v=20260711-2) | **监考大屏，全屏倒计时（推荐体验）** |

**教师端 / 学生端**

| 截图 | 说明 |
|------|------|
| ![教师端登录](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/teacher-login.png?v=20260711-2) | 教师端登录 |
| ![教师端首页](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/teacher-home.png?v=20260711-2) | 教师端监考任务 |
| ![学生端登录](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/student-login.png?v=20260711-2) | 学生端登录 |
| ![学生端首页](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/student-home.png?v=20260711-2) | 学生端考试安排 |

**一键安装**

| 截图 | 说明 |
|------|------|
| ![安装向导](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/setup-wizard.png?v=20260711-2) | 浏览器安装向导，4 步完成部署 |

### 核心功能

| 模块 | 实际能力 |
|------|---------|
| **考试全流程** | 创建考试 → 分配多间教室 → 指派监考老师 → 学生按班级关联 → 教室端大屏实时倒计时 |
| **AI 助手** | 27 个 Function Calling 工具，分 safe/dangerous/forbidden 三级，危险操作弹窗二次确认 |
| **五端认证** | 四套独立 JWT 中间件，role 字段互斥，**39 项越权测试全部返回 403** |
| **教室安全** | 注册码注册 + 管理员审核 + IP 信任机制 + IP 黑名单 |
| **一键部署** | `install.sh v4.0`（1279 行），DNS 校验 + SSL 四选项 + 断点续传 + 日志落盘 |
| **安装向导** | 浏览器 `/setup` 4 步走：欢迎 → 环境检测 → 数据库配置 → 初始化建表 |

---

## 二、Demo 创作思路

### 灵感来源：一张贴在教室门口的通知纸

> "每次考试最麻烦的不是复习，而是经常不知道具体时间和监考老师。那张通知纸太容易弄丢了，老师也不一定写黑板，全靠口头说。有的教室连个钟都没有，电脑上的时间小得坐在后排根本看不清。"
>
> —— 我自己就是学生

教室里那块**86 吋的一体机**，希沃、鸿合等品牌集采价约 8700-22500 元。然而上课投屏，下课黑屏。考试信息如此重要的场景，却没有专门的软件来支撑。

如果能让它自动显示考试信息，字号放大，加上倒计时，会比纸质通知可靠得多。

### 五个真实痛点

**1. 信息一致性难以保障**

几十间教室，一次考试，教务老师需要跑遍整栋楼手写通知。时间改动需要重写，字迹潦草则学生无法辨认。信息一致性完全依赖人工维护，缺乏统一的数据源。

**2. 万元一体机资源闲置**

希沃、鸿合一体机价格上万元，但仅在上课时用于投屏，下课后黑屏。考试这一高频刚需场景缺乏专用软件支撑，硬件资源利用率严重不足。

**3. 信息传递链路过长**

教务处 → 教师群 → 班主任 → 班级群 → 家长 → 学生。每经过一层传递，信息失真的风险就增加一分。最终学生在群里反复询问确认，班主任和教务处都被问烦了。

**4. Excel 排表难以发现冲突**

同一时间同一教室是否排重？同一位老师是否被分到两个考场？Excel 不会自动提醒，全靠人工核查。一旦出错，往往到考试当天才发现。

**5. 学生是最后获得信息的人**

考试信息的最终消费者是学生，但学生获取信息的渠道最不可靠——通知纸会丢失，口头传达会遗忘，黑板会被擦除。坐在后排的学生可能根本看不清黑板上的小字。

### 竞品分析

开发前与 TRAE 一起调研了市面上的类似产品：

| 产品 | 特点 | 与 ExamHub 对比 |
|------|------|----------------|
| 希沃云班牌 | 考试模式、走班排课、人脸考勤，需配套希沃硬件 | 商业付费，绑定专用班牌硬件，非开源 |
| 鸿合电子班牌 | 信息发布、签到考勤、空间预约，需配套鸿合硬件 | 上市公司产品，捆绑销售，非开源 |
| AOLSEE 傲视电子班牌 | 六大模式切换（含考试模式），B/S 架构 | 商业系统，需购买专用班牌终端 |
| WHBestSoft 智慧班牌 | 考试信息展示、多场景模式切换 | 商业付费，功能臃肿（含实验室/机房等） |
| 龍威 5G 云班牌 | 考试模式、人脸签到、家校互动 | 需部署专用硬件终端，非开源 |

> **结论**：市面上的班牌产品均为商业付费、闭源、需专用硬件终端。**没有一款免费开源、专注于复用教室现有大屏来展示考试信息的产品。** ExamHub 切中的正是一个被忽视的细分场景。

### 目标用户与使用场景

| 角色 | 核心需求 | 使用设备 | 使用频率 |
|------|---------|---------|---------|
| 教务处 / 管理员 | 统一发布考试、调度教室资源、审核教室注册 | 电脑（后台管理系统） | 考试前 1-2 次/天 |
| 监考老师 / 班主任 | 查看所负责教室的考试信息 | 手机 / 教室一体机 | 考试当天多时段查看 |
| 学生 | 查询考试时间、科目、地点、注意事项 | 手机（浏览器访问） | 考前 24 小时高频访问 |
| 教室一体机 | 固定展示终端，自动显示考试信息 + 实时倒计时 | 86 吋触控大屏 | 考试期间连续运行 |

**三个核心使用场景**：

- **场景 1：考前准备期（T-7 至 T-1）** — 管理员登录后台，创建教学楼，批量生成注册码，录入考试信息，分配教室。公众首页自动展示考试列表，支持按"即将开始/进行中/已结束"筛选。

- **场景 2：教室端激活** — 教室一体机打开浏览器，输入注册码注册，等待管理员审核通过后即可登录。

- **场景 3：考试当天（T-0）** — 每间教室的一体机登录教室端，自动显示本教室今日考试科目及时间，页面每 30 秒自动刷新，**全程零人工操作**。

---

## 三、Demo 体验地址

**网址**：[https://keke.examhub.work](https://keke.examhub.work)

### 体验账号

| 角色 | 入口 | 账号 | 密码 | 体验什么 |
|------|------|------|------|---------|
| 访客 | [首页](https://keke.examhub.work/) | 无需登录 | — | 考试列表、公告、搜索筛选 |
| 管理员 | [后台](https://keke.examhub.work/admin/login) | `admin` | `KeKe@ExamHub2025` | **核心体验，所有功能** |
| 教师 | [教师端](https://keke.examhub.work/teacher/login) | `T001` | `teacher123` | 查看监考任务 |
| 学生 | [学生端](https://keke.examhub.work/student/login) | `S20250001` | `student123` | 个人考试安排 |
| 教室大屏 | [教室端](https://keke.examhub.work/classroom/login) | 1号楼 / 101 | `classroom123` | **监考大屏，必看** |

> 体验站点已预置测试数据，请勿修改密码或删除数据。

### 预置测试数据

| 类别 | 数量 | 内容 |
|------|------|------|
| 教学楼 | 3 栋 | 1号楼、2号楼、3号楼 |
| 教室 | 4 间 | 101、201、202、301（均已审核） |
| 教师 | 4 位 | 张、李、王、赵老师 |
| 学生 | 5 位 | 李、王、刘、陈、杨同学 |
| 班级 | 3 个 | 高三(1)、高三(2)、高二(1) |
| 考试 | 11 场 | 8 场期末考试 + 3 场模拟考试 |
| 公告 | 3 条 | 考试安排、考试纪律、欢迎语 |

### 建议体验顺序

1. **公众首页** — 浏览考试列表和筛选功能
2. **管理员后台** — 登录后体验所有功能
3. **AI 助手** — 输入"帮我查一下下周有几场考试"，观察 Function Calling 的工作方式
4. **教室端** — 输入 1号楼 / 101，进入监考模式，全屏查看倒计时
5. **学生端** — 查看学生视角的考试安排
6. **教师端** — 查看监考任务分配

---

## 四、TRAE 实践过程

> **整个项目从头到尾使用 TRAE IDE 开发**，从第一行代码到 v1.2.0 发布，包括安全审计和漏洞修复。

### 开发过程一览

以下为 TRAE IDE 中的真实开发过程截图：

| 截图 | 说明 |
|------|------|
| ![开发过程 1](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-1.png?v=20260711-2) | TRAE IDE 开发过程（一） |
| ![开发过程 2](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-2.png?v=20260711-2) | TRAE IDE 开发过程（二） |
| ![开发过程 3](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-3.png?v=20260711-2) | TRAE IDE 开发过程（三） |
| ![开发过程 4](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-4.png?v=20260711-2) | TRAE IDE 开发过程（四） |
| ![开发过程 5](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-5.png?v=20260711-2) | TRAE IDE 开发过程（五） |
| ![开发过程 6](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/dev-process-6.png?v=20260711-2) | TRAE IDE 开发过程（六） |

### 4.1 从 0 搭骨架：连竞品分析都是 TRAE 陪我做的

开发前先与 TRAE 一起做了竞品分析。把市面上能找到的智慧班牌系统、在线考试系统列出来，TRAE 帮我整理成对比表格，分析优缺点，**最终确认这个细分场景是空白的**。

然后才开始搭项目骨架：向 AI 描述技术栈需求——React 前端 + Fastify 后端 + MySQL 数据库。TRAE 直接生成了完整的项目骨架：

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- 后端：Fastify 4 + TypeScript + mysql2 + @fastify/jwt
- 目录结构、配置文件、入口文件，全部搭好

> 原本预计搭环境需要两三天，**实际半小时后就开始写业务功能了**。

### 4.2 数据库：从 8 张表演进到 20 张表

报名时只规划了 8 张表：admins、exams、announcements、settings、buildings、registration_codes、classrooms、exam_classrooms。

开发过程中每新增一个功能，就与 TRAE 讨论表结构设计、索引策略、外键约束：

| 新增模块 | 对应新增表 |
|---------|-----------|
| 教师端 | teachers、teacher_roles、exam_invigilators |
| 学生端 | classes、students、exam_students |
| 安全体系 | ip_blacklist、classroom_login_logs、classroom_trusted_ips、admin_logs |
| 域名 SSL | domains |
| 教室个性化 | classroom_countdowns |

> 从 8 张到 20 张表，**每一张都是与 AI 对话中确定的设计**。

### 4.3 五端认证：39 项越权测试全部返回 403

安全是项目的核心关注点。管理员、教室端、学生、教师，**四种角色绝对不能越权**。

与 TRAE 一起设计了四套独立的认证中间件：

```
authMiddleware          → 只放行 role === "admin"
classroomAuthMiddleware → 只放行 role === "classroom"
studentAuthMiddleware   → 只放行 role === "student"
teacherAuthMiddleware   → 只放行 role === "teacher"
```

安全细节：
- 账号不存在时同样执行一次 bcrypt 校验，**防止时序攻击**
- 登录接口加速率限制，管理员 5 次/分钟
- JWT_SECRET 强度不足时进入"仅安装模式"，保护生产环境

后来让 TRAE 执行了一次全面越权测试：用学生身份调用管理员接口、用教师身份调用学生接口……

> **39 项越权测试，全部返回 403。**

### 4.4 教室端监考大屏：反复打磨的视觉效果

教室端是整个项目视觉表现最强的部分。监考模式需要全屏、字号大、剩余时间不足时变红提醒。

与 TRAE 来回调整了多个版本：

- 字号从 `text-5xl` 调到 `text-8xl` — **确保最后一排可见**
- 剩余 5 分钟变红 + 脉冲动画
- 进度条加渐变效果
- Fullscreen API 一键全屏
- 30 秒自动刷新，无需人工干预

![教室端监考大屏](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/classroom-invigilation.png?v=20260711-2)

### 4.5 AI 助手：27 个工具 + 三级安全

管理员可以用自然语言操作后台，例如"帮我查下周有几场数学考试"、"创建一场英语期末考试"。

**三级安全体系**是核心设计：

| 级别 | 数量 | 行为 |
|------|------|------|
| **safe** | 13 个 | 纯查询操作，直接执行 |
| **dangerous** | 14 个 | 写入/修改操作，前端弹出确认框，用户确认后执行 |
| **forbidden** | 不提供工具 | 删除考试、重装环境等高危操作，AI 直接拒绝并引导手动操作 |

技术上解决了多个难题：SSE 流式响应、工具执行超时、结果过长截断、上下文窗口滑动……都是与 TRAE 一起逐一解决的。

![AI 助手](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/ai-assistant.png?v=20260711-2)

### 4.6 install.sh：迭代到 1279 行的部署脚本

部署脚本原本计划简单实现，最终与 TRAE 一起迭代了 4 个大版本：

| 版本 | 新增能力 |
|------|---------|
| v1 | 基础安装：Node + Nginx + PM2 |
| v2 | 域名 + SSL 证书管理 |
| v3 | 错误处理 + 日志落盘 |
| **v4** | `set -Eeuo pipefail`、`trap ERR`、`--step` 断点续传、DNS 多服务器校验、SSL 四选项 |

> **印象最深的 bug**：DNS 解析校验一直不通过，与 TRAE 排查近一小时，**最终发现是 GNU grep 的 ERE 模式不支持 `\d`，需要写成 `[0-9]`**。这种细节自己写的话不知要踩多久坑。

![安装向导](https://gh-proxy.com/https://raw.githubusercontent.com/KeKe0904/KeKe-ExamHub/main/assets/screenshots/setup-wizard.png?v=20260711-2)

### 4.7 发布前的安全审计：TRAE 帮我查漏洞

v1.2.0 发布前，让 TRAE 对整个项目做了一次安全审计。查出了好几个之前未注意到的问题：

| 漏洞 | 级别 | 修复方式 |
|------|------|---------|
| acme.ts 用 execSync 拼 shell，证书内容可注入命令 | **严重** | 改成 execFileSync 传参数数组 |
| .env 里存了管理员明文密码 | **严重** | 安装完就删掉这行 |
| 域名参数没校验，可能路径遍历 | 高 | 加正则校验域名格式 |
| auth.ts 直接读 X-Forwarded-For，IP 可伪造 | 高 | 统一用 getClientIp |
| 前端公告 dangerouslySetInnerHTML 没净化 | 高 | 加 DOMPurify 二次净化 |
| 分页接口 LIMIT 参数 500 报错 | 高 | pool.execute 改 pool.query |
| 注册码用 Math.random 可预测 | 中 | 改成 crypto.randomInt |

> 从发现问题、分析原因到编写修复代码、重新验证，**全程在 TRAE 中完成，一条龙**。

### 4.8 踩过的坑

均是与 TRAE 一起解决的：

1. **ESM 的 `__dirname` 没了** — 后端 `"type": "module"`，`__dirname` 不可用，用 `import.meta.url` 推导路径
2. **mysql2 预处理 LIMIT 参数坑** — `pool.execute()` + `LIMIT ? OFFSET ?` 传 JS 数字会报错，换成 `pool.query()` 即可
3. **DNS 正则的 `\d` 不工作** — GNU grep ERE 不支持 `\d`，必须用 `[0-9]`
4. **pm2 不存在会崩** — `spawn("pm2")` 如果 pm2 没装会触发 uncaught error，加了 `.on("error")`
5. **安装向导建表不全** — 最初只手动建了 9 张表，缺一半，改成直接加载 init.sql
6. **init.sql 的 USE 语句权限错** — init.sql 里写死了 `USE examhub`，用户自定义库名就报错，删掉即可

---

## 五、用数据说话

| 维度 | 数据 |
|------|------|
| 代码量 | 前端约 30000 行 + 后端约 14000 行 + 部署脚本 1279 行 |
| 数据库 | 20 张表，全部 utf8mb4 |
| 后端接口 | 23 个路由模块，123 个端点 |
| 前端页面 | 39 条路由（10 公开 + 28 受保护 + 1 兜底） |
| AI 工具 | 27 个（13 safe / 14 dangerous / forbidden 不提供工具） |
| 功能测试 | **81 项，通过率 96.3%**（v1.2.0 发布前） |
| 安全审计 | **16 项发现，严重和高危已全部修复** |
| 当前版本 | v1.2.0 正式版 |

### 效率提升对比

| 操作 | 传统方式 | KeKe ExamHub | 提升 |
|------|---------|-------------|------|
| 发布全年级考试安排 | 教务处逐间教室手写通知 | 后台一次录入，全端同步 | **从小时级到分钟级** |
| 修改考试时间 | 重新跑楼 + 发群通知 | 后台编辑，全局自动刷新 | **从分钟级到秒级** |
| 学生查询考试信息 | 翻群、问同学、看公告栏 | 打开网页即时查看 | **信息获取即时化** |
| 教室信息更新 | 人工逐个切换 | 30 秒自动刷新，零人工 | **全自动** |
| 系统部署上线 | 找技术人员搭环境（半天到一天） | 一键脚本 + 向导（10 分钟） | **自部署** |

### 与商业方案对比

| 维度 | 商业班牌 | KeKe ExamHub |
|------|---------|-------------|
| **价格** | 硬件 1300-4900 元/台 + 系统年费 | **完全免费开源 (MIT)** |
| **硬件** | 需购买专用班牌终端，每间教室一台 | **零硬件成本，浏览器即用** |
| **一体机** | 上万元一体机考完即黑屏 | **复用现有大屏，不花一分钱** |
| **部署** | 需厂商上门实施 | **10 分钟自部署** |
| **数据安全** | 数据存储于厂商云端 | **数据 100% 留在学校服务器** |

---

## 六、开源信息

| 项目 | 内容 |
|------|------|
| GitHub | https://github.com/KeKe0904/KeKe-ExamHub |
| 作者 | 落梦陳 (KeKe0904) |
| 社交 | B站 / 抖音：落梦陳 |
| 开发工具 | TRAE IDE |
| 协议 | MIT |

欢迎 Star、提 Issue、发 PR。

---

## 七、报名帖链接

https://forum.trae.cn/t/topic/47323

---

## 八、Session ID 汇总

| 序号 | Session ID |
|------|------------|
| 1 | `25b2ab2e105a420bb4039e34abaeafbc` |
| 2 | `e367049616805cbd2edb56cc6bc26e32` |
| 3 | `cabd16065735213a30edd80ba4ab8ba8` |
| 4 | `85f79b69f314b39f198a244293ab513d` |

> 以上均为 TRAE IDE 中的真实对话 Session ID。

# 学习工作 · KeKe ExamHub — 学校考试信息数字化管理平台

> 一套代码，四端协同。把教室里那块万元大屏从"投影仪"变成"数字考试终端"。

---

## 一、Demo 简介

**KeKe ExamHub** 是一个面向中小学和考试机构的**全栈考试信息管理平台**。Web 形态，打开浏览器就能用，不挑硬件，不限品牌。

从报名时的 3 层入口、8 张表，到现在的**四端协同、20 张表、123 个 API 端点** — 这是一次完全用 TRAE IDE 从零迭代开发的全栈实践。

### 四端架构

| 端 | 入口 | 核心能力 |
|----|------|---------|
| **公众前台** | `/` | 考试列表 + 公告 + 搜索筛选，任何人可浏览 |
| **管理员后台** | `/admin` | 考试/教室/教师/学生/公告/IP 黑名单/域名管理，全功能 |
| **教室端大屏** | `/classroom` | 一体机登录，监考模式全屏倒计时 + 5 分钟红色预警 |
| **教师端** | `/teacher` | 查看监考任务、班级学生、个人信息 |
| **学生端** | `/student` | 查看个人考试安排（时间、地点、座位号） |

### 产品截图

**公众前台**

| 截图 | 说明 |
|------|------|
| ![公众首页](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/public-home.png) | 公众前台考试列表，支持搜索筛选 |
| ![学校信息](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/public-announcements.png) | 学校信息页，展示校园概况 |

**管理员后台**

| 截图 | 说明 |
|------|------|
| ![管理员登录](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-login.png) | 管理员登录页 |
| ![仪表盘](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-dashboard.png) | 管理员仪表盘，全功能管理 |
| ![考试管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-exams.png) | 考试管理列表 |
| ![创建考试](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-exam-create.png) | 创建考试表单 |
| ![公告管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-announcements.png) | 公告管理 |
| ![发布公告](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-announcement-create.png) | 发布新公告 |
| ![教室管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-classrooms.png) | 教室管理，审核注册 |
| ![教师管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-teachers.png) | 教师管理 |
| ![学生管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-students.png) | 学生管理 |
| ![注册码管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-registration-codes.png) | 注册码批量生成 |
| ![IP黑名单](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-ip-blacklist.png) | IP 黑名单管理 |
| ![域名管理](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-domains.png) | 域名管理 + SSL |
| ![操作日志](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-logs.png) | 操作审计日志 |
| ![系统设置](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/admin-settings.png) | 系统设置 |

**教室端大屏**

| 截图 | 说明 |
|------|------|
| ![教室端登录](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/classroom-login.png) | 教室端登录页 |
| ![教室端首页](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/classroom-home.png) | 教室端首页，今日考试列表 |
| ![教室端监考大屏](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/classroom-invigilation.png) | **监考模式全屏倒计时（重点）** |

**教师端 / 学生端**

| 截图 | 说明 |
|------|------|
| ![教师端登录](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/teacher-login.png) | 教师端登录 |
| ![教师端首页](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/teacher-home.png) | 教师端首页，监考任务 |
| ![学生端登录](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/student-login.png) | 学生端登录 |
| ![学生端首页](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/student-home.png) | 学生端首页，考试安排 |

**安装向导**

| 截图 | 说明 |
|------|------|
| ![安装向导](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/setup-wizard.png) | 浏览器安装向导，4 步完成部署 |

### 核心功能

| 模块 | 实际能力 |
|------|---------|
| **考试全流程** | 创建考试 → 分配多间教室 → 指派监考老师 → 学生按班级关联 → 教室端大屏实时倒计时 |
| **AI 助手** | 27 个 Function Calling 工具，分 safe/dangerous/forbidden 三级，危险操作弹窗二次确认 |
| **四端认证** | 四套独立 JWT 中间件，role 字段互斥，**39 项越权测试全部返回 403** |
| **教室安全** | 注册码注册 + 管理员审核 + IP 信任机制 + IP 黑名单 |
| **一键部署** | `install.sh v4.0`（1279 行），DNS 校验 + SSL 四选项 + 断点续传 + 日志落盘 |
| **安装向导** | 浏览器 `/setup` 4 步走：欢迎 → 环境检测 → 数据库配置 → 初始化建表 |

---

## 二、Demo 创作思路

### 灵感来源：一张贴在教室门口的通知纸

> "每次考试，最麻烦的不是复习，而是经常不知道具体时间和监考老师。那张通知纸太容易弄丢了，老师也不一定写黑板，全靠口头说。有的教室连个钟都没有，电脑上的时间小得坐在后排根本看不清。"
>
> —— 我自己就是学生

然后我盯着教室里那块**86 吋的一体机**想：这玩意儿上万块钱买的（希沃/鸿合 86 寸集采价约 8700-22500 元），为什么考完试就只是个黑屏？为什么不能直接显示考试信息？字放大，加个倒计时，这不比贴张纸强一万倍？

### 我观察到的 5 个真问题

**1. 信息一致性灾难**

一所几十间教室的学校，一次期中考试，教务处老师要跑遍整栋楼手写通知，耗时耗力。时间改了就得重写，字写得潦草的学生还看不清。

**2. 万元一体机当投影仪用**

教室里的希沃、鸿合一体机，上课投屏，下课黑屏或者挂个静态班牌。考试信息这么高频刚需的场景，居然没有一个专门的软件。

**3. 传话游戏式的信息传递**

教务处 → 教师群 → 班主任 → 班级群 → 家长 → 学生。每传一层就有一次失真的可能。最后学生和家长反复私信确认，班主任和教务处都被问烦了。

**4. Excel 排表看不出冲突**

用 Excel 排考试，同一时间同一教室会不会排重了？同一个老师会不会被安排到两个考场？全靠人眼盯，一不留神就出错。

**5. 学生是最后知道的那个人**

考试信息的最终消费者是学生，但获取渠道最不可靠。通知纸会丢，口传会忘，黑板会擦。没人考虑坐在后排的学生看不看得清。

### 竞品分析：这个赛道是空的

开发前，我跟 TRAE 一起调研了市面上的类似产品，发现它们要么太贵，要么不匹配我的场景：

| 产品 | 特点 | 与 ExamHub 对比 |
|------|------|----------------|
| 希沃云班牌 | 考试模式、走班排课、人脸考勤，需配套希沃硬件 | 商业付费，绑定专用班牌硬件，非开源 |
| 鸿合电子班牌 | 信息发布、签到考勤、空间预约，需配套鸿合硬件 | 上市公司产品，捆绑销售，非开源 |
| AOLSEE 傲视电子班牌 | 六大模式切换（含考试模式），B/S 架构 | 商业系统，需购买专用班牌终端 |
| WHBestSoft 智慧班牌 | 考试信息展示、多场景模式切换 | 商业付费，功能臃肿（含实验室/机房等） |
| 龍威 5G 云班牌 | 考试模式、人脸签到、家校互动 | 需部署专用硬件终端，非开源 |

> **结论**：市面上的班牌产品都需要配套专用硬件终端、商业付费且闭源。没有一款免费、开源、专注于"用教室现有大屏显示考试信息"的产品。ExamHub 切中的是一个被忽视的细分场景。

![竞品分析对比表](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-competitor-analysis.png)

### 目标用户与使用场景

| 用户角色 | 核心需求 | 使用设备 | 使用频率 |
|---------|---------|---------|---------|
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

**在线体验**：[https://keke.examhub.work](https://keke.examhub.work)

### 体验账号

| 角色 | 入口 | 账号 | 密码 | 体验什么 |
|------|------|------|------|---------|
| 访客 | [首页](https://keke.examhub.work/) | 无需登录 | - | 考试列表、公告、搜索筛选 |
| 管理员 | [后台登录](https://keke.examhub.work/admin/login) | `admin` | `KeKe@ExamHub2025` | **核心体验，所有功能** |
| 教师 | [教师端](https://keke.examhub.work/teacher/login) | `T001` | `teacher123` | 查看监考任务 |
| 学生 | [学生端](https://keke.examhub.work/student/login) | `S20250001` | `student123` | 个人考试安排 |
| 教室端 | [教室大屏](https://keke.examhub.work/classroom/login) | 1号楼 / 101 | `classroom123` | **监考大屏，必看** |

> 体验站点已预置测试数据，请勿修改密码或删除数据，谢谢。

### 预置测试数据一览

| 类别 | 数量 | 内容 |
|------|------|------|
| 教学楼 | 3 栋 | 1号楼、2号楼、3号楼 |
| 教室 | 4 间 | 1号楼101、2号楼201/202、3号楼301（均已审核） |
| 教师 | 4 位 | T001 张老师、T002 李老师、T003 王老师、T004 赵老师 |
| 学生 | 5 位 | S20250001~S20250005（李/王/刘/陈/杨同学） |
| 班级 | 3 个 | 高三(1)班、高三(2)班、高二(1)班 |
| 考试 | 8 场 | 数学/语文/英语/物理/化学/生物/历史/地理期末考试（7.15-7.18） |
| 公告 | 3 条 | 期末考试安排、考试纪律、欢迎体验 |

### 建议体验顺序

1. **公众首页** — 感受整体界面和考试列表筛选
2. **管理员后台** — 登录后浏览仪表盘、考试管理、AI 助手
3. **AI 助手** — 说"帮我查一下下周有几场考试"，看 Function Calling 怎么工作
4. **教室端登录** — 输入 1号楼 / 101，打开监考模式，点全屏，感受大屏倒计时
5. **学生端登录** — 看看学生视角的考试安排
6. **教师端登录** — 查看监考任务分配

---

## 四、TRAE 实践过程

> **整个项目从头到尾都是用 TRAE IDE 开发的**，从第一行代码到 v1.2.0 发布，包括安全审计和漏洞修复。下面说几个关键节点。

### 4.1 从 0 搭骨架：连竞品分析都是 TRAE 陪我做的

开发前，我先跟 TRAE 一起做了竞品分析。把市面上能找到的智慧班牌系统、在线考试系统列出来，TRAE 帮我整理成对比表格，分析优缺点，**最终确认这个细分场景是空白的**。

![竞品分析对比表](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-competitor-analysis.png)

然后才开始搭项目骨架：跟 AI 描述我要做什么 — React 前端 + Fastify 后端 + MySQL。TRAE 直接帮我生成了完整的项目骨架：

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- 后端：Fastify 4 + TypeScript + mysql2 + @fastify/jwt
- 目录结构、配置文件、入口文件，全部搭好

> 本来以为要花两三天搭环境，结果**半小时就开始写业务了**。

![项目结构](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-project-structure.png)

### 4.2 数据库：从 8 张表演进到 20 张表

报名的时候我只规划了 8 张表：admins、exams、announcements、settings、buildings、registration_codes、classrooms、exam_classrooms。

开发过程中，每想到一个新功能，就跟 TRAE 讨论要不要加表、怎么加索引、外键怎么设：

| 新增模块 | 对应新增表 |
|---------|-----------|
| 教师端 | teachers、teacher_roles、exam_invigilators |
| 学生端 | classes、students、exam_students |
| 安全体系 | ip_blacklist、classroom_login_logs、classroom_trusted_ips、admin_logs |
| 域名 SSL | domains |
| 教室个性化 | classroom_countdowns |

> 从 8 张到 20 张表，**每一张都是跟 TRAE 对话中确定的设计**。

![数据库设计 init.sql](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-database-design.png)

### 4.3 四端认证：39 项越权测试全部 403

安全是我最在意的部分。管理员、教室端、学生、教师，**这四种角色绝对不能越权**。

跟 TRAE 一起设计了四套独立的中间件：

```
authMiddleware          → 只放行 role === "admin"
classroomAuthMiddleware → 只放行 role === "classroom"
studentAuthMiddleware   → 只放行 role === "student"
teacherAuthMiddleware   → 只放行 role === "teacher"
```

安全细节：
- 账号不存在时照样跑一次 bcrypt，**防止时序攻击**
- 登录接口加速率限制，管理员 5 次/分钟
- JWT_SECRET 太弱就进入"仅安装模式"，保护生产环境

后来让 TRAE 帮我做了一次全面越权测试：用学生 token 调管理员接口、用教师 token 调学生接口......

> **39 项越权测试，全部返回 403。那一刻挺有成就感的。**

![四端认证中间件 auth.ts](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-auth-middleware.png)

### 4.4 教室端监考大屏：反复调出来的视觉效果

教室端是整个项目最"有画面感"的部分。监考模式要全屏、字要大、剩余时间少了要变红提醒。

跟 TRAE 来回改了好多版：

- 字号从 `text-5xl` 调到 `text-8xl` — **最后一排能看清**
- 剩余 5 分钟变红 + 脉冲动画
- 进度条加渐变效果
- Fullscreen API 一键全屏
- 30 秒自动刷新，不用手动点

> 在教室一体机上全屏跑起来，那效果真的比我当初想象的还好。

![教室端监考大屏](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/classroom-invigilation.png)

### 4.5 AI 助手：27 个工具 + 三级安全

AI 助手是后期跟 TRAE 一起加的功能。管理员能用自然语言操作后台，比如"帮我查下周有几场数学考试"、"创建一场英语期末考试"。

**三级安全体系**是这个功能的核心设计：

| 级别 | 数量 | 行为 |
|------|------|------|
| **safe** | 13 个 | 纯查询，直接执行，不用问 |
| **dangerous** | 14 个 | 写入/修改操作，前端弹红色警告框，用户点确认才执行 |
| **forbidden** | 不提供工具 | 删除考试、重装环境等高危操作，**AI 直接拒绝**，引导手动操作 |

技术上踩了不少坑：SSE 流式响应、工具执行超时、结果太长截断、上下文滑窗......都是跟 TRAE 一起一个个解决的。

![AI 助手对话界面](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/ai-assistant.png)

![AI 工具定义 ai-tools.ts](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-ai-tools.png)

### 4.6 install.sh：迭代到 1279 行的部署脚本

部署脚本是个意外的大工程。本来想"写个简单的安装脚本就行"，结果跟 TRAE 一起迭代了 4 个大版本：

| 版本 | 新增能力 |
|------|---------|
| v1 | 基础安装：Node + Nginx + PM2 |
| v2 | 域名 + SSL 证书管理 |
| v3 | 错误处理 + 日志落盘 |
| **v4** | `set -Eeuo pipefail`、`trap ERR`、`--step` 断点续传、DNS 多服务器校验、SSL 四选项 |

> **最难忘的 bug**：DNS 解析校验一直不通过，跟 TRAE 排查了快一个小时，最后发现是 **GNU grep 的 ERE 模式不支持 `\d`**，换成 `[0-9]` 立刻就好了。这种细节自己写的话不知道要踩多久坑。

![安装向导界面](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/setup-wizard.png)

![install.sh 部署脚本](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-install-sh.png)

### 4.7 发布前的安全审计：TRAE 帮我查漏洞

v1.2.0 发布前，我让 TRAE 给整个项目做了一次安全审计。查出了好几个我完全没想到的问题：

| 漏洞 | 级别 | 修复方式 |
|------|------|---------|
| acme.ts 用 execSync 拼 shell，证书内容可注入命令 | **严重** | 改成 execFileSync 传参数数组 |
| .env 里存了管理员明文密码 | **严重** | 安装完就删掉这行 |
| 域名参数没校验，可能路径遍历 | 高 | 加正则校验域名格式 |
| auth.ts 直接读 X-Forwarded-For，IP 可伪造 | 高 | 统一用 getClientIp |
| 前端公告 dangerouslySetInnerHTML 没净化 | 高 | 加 DOMPurify 二次净化 |
| 分页接口 LIMIT 参数 500 报错 | 高 | pool.execute 改 pool.query |
| 注册码用 Math.random 可预测 | 中 | 改成 crypto.randomInt |

> 从发现问题、分析原因到写修复代码、重新跑测试验证，**全程在 TRAE 里完成，一条龙**。

![安全审计修复 acme.ts](https://cdn.jsdelivr.net/gh/KeKe0904/KeKe-ExamHub@811d3cf/assets/screenshots/trae-security-audit.png)

### 4.8 踩过的坑

都是跟 TRAE 一起解决的：

1. **ESM 的 `__dirname` 没了** — 后端 `"type": "module"`，`__dirname` 不能用，用 `import.meta.url` 推导路径
2. **mysql2 预处理 LIMIT 参数坑** — `pool.execute()` + `LIMIT ? OFFSET ?` 传 JS 数字会报错，换成 `pool.query()` 就好
3. **DNS 正则的 `\d` 不工作** — GNU grep ERE 不支持 `\d`，必须用 `[0-9]`
4. **pm2 不存在会崩** — `spawn("pm2")` 如果 pm2 没装会触发 uncaught error，加了 `.on("error")`
5. **安装向导建表不全** — 最初只手动建了 9 张表，缺一半，改成直接加载 init.sql
6. **init.sql 的 USE 语句权限错** — init.sql 里写死了 `USE examhub`，用户自定义库名就报错，删掉就好了

---

## 五、用数据说话

| 维度 | 数据 |
|------|------|
| 代码量 | 前端 ~30000 行 + 后端 ~14000 行 + 部署脚本 1279 行 |
| 数据库 | 20 张表，全部 utf8mb4 |
| API | 23 个路由模块，123 个端点 |
| 前端页面 | 39 条路由（10 公开 + 28 受保护 + 1 兜底） |
| AI 工具 | 27 个（safe 13 / dangerous 14 / forbidden 不提供工具） |
| 功能测试 | **81 项，通过率 96.3%**（v1.2.0 发布前） |
| 安全审计 | **16 项发现，严重和高危已全部修复** |
| 当前版本 | v1.2.0 正式版 |

### 效率提升对比

| 操作 | 传统方式 | KeKe ExamHub | 提升 |
|------|---------|-------------|------|
| 发布全年级考试安排 | 教务处跑楼逐间教室手写通知 | 后台一次录入，全端同步 | **从小时级到分钟级** |
| 临时修改考试时间 | 跑楼重写通知 + 发群通知 | 后台编辑 → 全局自动刷新 | **从分钟级到秒级** |
| 学生查考试信息 | 翻群/问同学/看公告栏 | 打开网页即时查看 | **信息获取即时化** |
| 教室信息更新 | 人工逐个切换 | 30 秒自动刷新，零人工 | **全自动** |
| 系统部署上线 | 找技术人员搭环境（半天~一天） | 一键脚本 + 向导（10 分钟） | **自部署** |

### 与传统方案的差异

| 维度 | 传统方案 | KeKe ExamHub |
|------|---------|-------------|
| **价格** | 智慧班牌硬件约 1300-4900 元/台 + 系统年费 | **完全免费开源 (MIT)** |
| **硬件** | 需购买专用班牌终端，每间教室一台 | **零硬件成本，浏览器即用** |
| **一体机** | 希沃/鸿合 86 寸一体机集采价约 8700-22500 元，考完即黑屏 | **复用现有大屏，不花一分钱** |
| **部署** | 需厂商上门实施 | **10 分钟自部署** |
| **数据安全** | 数据存储厂商云端 | **数据 100% 留在学校服务器** |

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

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'assets', 'screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshotHtml(html, filename, width = 1920, height = 1080) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--window-size=${width},${height}`]
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  await browser.close();
  console.log(`✓ ${filename}`);
}

// 读取代码文件并生成代码截图
function codeToHtml(title, code, theme = 'dark') {
  const bg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const fg = theme === 'dark' ? '#d4d4d4' : '#333333';
  const comment = '#6a9955';
  const keyword = '#569cd6';
  const string = '#ce9178';
  
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${bg}; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; padding: 0; }
  .title-bar { background: #2d2d2d; padding: 8px 16px; display: flex; align-items: center; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .title-text { color: #999; font-size: 14px; margin-left: 8px; font-family: sans-serif; }
  pre { padding: 20px; color: ${fg}; font-size: 14px; line-height: 1.6; overflow: hidden; }
  .comment { color: ${comment}; }
  .keyword { color: ${keyword}; }
  .string { color: ${string}; }
  .header { background: ${theme === 'dark' ? '#252526' : '#f3f3f3'}; padding: 12px 20px; border-bottom: 1px solid #3e3e3e; }
  .header h2 { color: ${theme === 'dark' ? '#4fc1ff' : '#007acc'}; font-size: 16px; font-family: sans-serif; }
</style></head>
<body>
  <div class="title-bar">
    <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
    <span class="title-text">${title}</span>
  </div>
  <div class="header"><h2>${title}</h2></div>
  <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
    .replace(/(--.*$)/gm, '<span class="comment">$1</span>')
    .replace(/\b(import|from|export|const|let|var|function|async|await|return|if|else|for|while|class|new|try|catch|throw|interface|type|extends|implements|public|private|protected|static|readonly|enum|namespace)\b/g, '<span class="keyword">$1</span>')
    .replace(/(['"`])((?:\\.|(?!\1).)*)\1/g, '<span class="string">$1$2$1</span>')
  }</code></pre>
</body></html>`;
}

async function main() {
  // 1. 数据库设计 (init.sql)
  const initSql = fs.readFileSync(path.join(__dirname, 'api/src/migrations/init.sql'), 'utf8');
  const sqlPreview = initSql.split('\n').slice(0, 80).join('\n');
  await screenshotHtml(codeToHtml('init.sql — 18 张表完整定义', sqlPreview), 'trae-database-design.png');
  
  // 2. 四端认证中间件
  const authCode = fs.readFileSync(path.join(__dirname, 'api/src/middleware/auth.ts'), 'utf8');
  const authPreview = authCode.split('\n').slice(0, 80).join('\n');
  await screenshotHtml(codeToHtml('auth.ts — 四端 JWT 互斥认证中间件', authPreview), 'trae-auth-middleware.png');
  
  // 3. AI 助手工具定义
  const aiTools = fs.readFileSync(path.join(__dirname, 'api/src/utils/ai-tools.ts'), 'utf8');
  const aiPreview = aiTools.split('\n').slice(0, 80).join('\n');
  await screenshotHtml(codeToHtml('ai-tools.ts — 27 个 Function Calling 工具', aiPreview), 'trae-ai-tools.png');
  
  // 4. 安全审计修复
  const acmeCode = fs.readFileSync(path.join(__dirname, 'api/src/utils/acme.ts'), 'utf8');
  const acmePreview = acmeCode.split('\n').slice(0, 60).join('\n');
  await screenshotHtml(codeToHtml('acme.ts — SSL 证书管理（安全审计修复后）', acmePreview), 'trae-security-audit.png');
  
  // 5. install.sh
  const installSh = fs.readFileSync(path.join(__dirname, 'install.sh'), 'utf8');
  const installPreview = installSh.split('\n').slice(0, 60).join('\n');
  await screenshotHtml(codeToHtml('install.sh v4.0 — 一键部署脚本', installPreview), 'trae-install-sh.png');
  
  // 6. 项目结构
  const projectStructure = `KeKe-ExamHub/
├── api/                          # 后端 (Fastify + TypeScript)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts       # MySQL 连接池
│   │   ├── middleware/
│   │   │   ├── auth.ts           # 四端 JWT 认证 (admin/classroom/teacher/student)
│   │   │   ├── domain-access.ts  # 域名访问控制
│   │   │   └── ip-blacklist.ts   # IP 黑名单 + getClientIp
│   │   ├── migrations/
│   │   │   └── init.sql          # 18 张表完整定义
│   │   ├── routes/               # 23 个路由模块
│   │   │   ├── ai.ts             # AI 助手 (27 个 Function Calling)
│   │   │   ├── auth.ts           # 管理员认证
│   │   │   ├── classroom.ts      # 教室端
│   │   │   ├── exams.ts          # 考试管理
│   │   │   ├── setup.ts          # 安装向导
│   │   │   └── ...               # 其他 18 个路由
│   │   ├── utils/
│   │   │   ├── ai-tools.ts       # AI 工具定义
│   │   │   ├── acme.ts           # SSL 证书管理
│   │   │   ├── audit-log.ts      # 审计日志
│   │   │   └── xss.ts            # XSS 过滤
│   │   └── server.ts             # 入口文件
│   └── package.json
├── src/                          # 前端 (React 18 + TypeScript)
│   ├── components/               # UI 组件
│   │   ├── Layout/               # 四端布局 (Admin/Teacher/Student/User)
│   │   ├── ui/                   # 基础组件 (Button/Card/Modal...)
│   │   └── ...
│   ├── pages/                    # 31 条路由
│   │   ├── admin/                # 管理员后台 (20 个页面)
│   │   ├── classroom/            # 教室端 (Home/Invigilation/Login)
│   │   ├── teacher/              # 教师端
│   │   ├── student/              # 学生端
│   │   └── ...
│   ├── store/                    # Zustand 状态管理
│   ├── types/                    # TypeScript 类型定义
│   └── App.tsx                   # 路由入口
├── install.sh                    # 一键部署脚本 v4.0 (1280 行)
├── CHANGELOG.md
└── 参赛帖-KeKe-ExamHub.md`;
  
  await screenshotHtml(codeToHtml('项目结构 — 四端协同全栈架构', projectStructure), 'trae-project-structure.png');
  
  // 7. 竞品分析表
  const competitorHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1e1e1e; font-family: 'Segoe UI', sans-serif; padding: 30px; color: #d4d4d4; }
  h2 { color: #4fc1ff; margin-bottom: 20px; font-size: 20px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th { background: #2d2d2d; color: #4fc1ff; padding: 12px; text-align: left; border: 1px solid #3e3e3e; }
  td { padding: 10px 12px; border: 1px solid #3e3e3e; }
  tr:nth-child(even) { background: #252526; }
  .highlight { color: #4ec9b0; font-weight: bold; }
</style></head><body>
<h2>竞品分析 — 市面产品 vs KeKe ExamHub</h2>
<table>
  <tr><th>产品</th><th>特点</th><th>价格</th><th>开源</th></tr>
  <tr><td>WHBestSoft 智慧班牌</td><td>考试信息展示、多场景切换</td><td>商业付费</td><td>❌</td></tr>
  <tr><td>赣教校园信息发布</td><td>考试倒计时、公告展示</td><td>商业付费</td><td>❌</td></tr>
  <tr><td>美冠智媒平台</td><td>电子班牌考试模式</td><td>捆绑销售</td><td>❌</td></tr>
  <tr><td>智慧云班牌</td><td>标准考场、人脸考勤</td><td>商业系统</td><td>❌</td></tr>
  <tr><td>classroom.cloud</td><td>考试浏览器锁定</td><td>商业付费</td><td>❌</td></tr>
  <tr><td>SmartSchool ERP</td><td>排考、试卷管理</td><td>商业付费</td><td>❌</td></tr>
  <tr style="background:#1a3a1a;"><td class="highlight">KeKe ExamHub</td><td class="highlight">考试信息展示 + 大屏倒计时</td><td class="highlight">免费开源 (MIT)</td><td class="highlight">✅</td></tr>
</table>
</body></html>`;
  await screenshotHtml(competitorHtml, 'trae-competitor-analysis.png');
  
  console.log('\n开发过程截图全部完成！');
}

main().catch(console.error);

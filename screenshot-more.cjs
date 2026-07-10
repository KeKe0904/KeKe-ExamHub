const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'assets', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page, url, inputs) {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  const els = await page.$$('input');
  for (let i = 0; i < els.length && i < inputs.length; i++) {
    const type = await page.evaluate(el => el.type, els[i]);
    if (type !== 'hidden' && type !== 'button') {
      await els[i].click({ clickCount: 3 });
      await els[i].type(inputs[i]);
    }
  }
  // select 处理
  const selects = await page.$$('select');
  if (selects.length > 0 && inputs[0]) {
    await selects[0].select(inputs[0]);
  }
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(3000);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  // ========== 管理员登录 ==========
  const admin = await browser.newPage();
  await admin.setViewport({ width: 1920, height: 1080 });
  await login(admin, '/admin/login', ['admin', 'admin123456']);

  const adminPages = [
    { url: '/admin/dashboard', file: 'admin-dashboard.png', name: '仪表盘' },
    { url: '/admin/exams', file: 'admin-exams.png', name: '考试管理' },
    { url: '/admin/exams/create', file: 'admin-exam-create.png', name: '创建考试' },
    { url: '/admin/announcements', file: 'admin-announcements.png', name: '公告管理' },
    { url: '/admin/announcements/create', file: 'admin-announcement-create.png', name: '发布公告' },
    { url: '/admin/classrooms', file: 'admin-classrooms.png', name: '教室管理' },
    { url: '/admin/teachers', file: 'admin-teachers.png', name: '教师管理' },
    { url: '/admin/students', file: 'admin-students.png', name: '学生管理' },
    { url: '/admin/buildings', file: 'admin-buildings.png', name: '教学楼管理' },
    { url: '/admin/registration-codes', file: 'admin-registration-codes.png', name: '注册码管理' },
    { url: '/admin/ip-blacklist', file: 'admin-ip-blacklist.png', name: 'IP黑名单' },
    { url: '/admin/domains', file: 'admin-domains.png', name: '域名管理' },
    { url: '/admin/ai-chat', file: 'ai-assistant.png', name: 'AI助手' },
    { url: '/admin/settings', file: 'admin-settings.png', name: '系统设置' },
    { url: '/admin/logs', file: 'admin-logs.png', name: '操作日志' },
  ];

  for (const p of adminPages) {
    console.log(`截取 ${p.name}...`);
    await admin.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await delay(2500);
    await admin.screenshot({ path: path.join(SCREENSHOT_DIR, p.file) });
    console.log(`  ✓ ${p.file}`);
  }

  // ========== 公众首页 ==========
  const pub = await browser.newPage();
  await pub.setViewport({ width: 1920, height: 1080 });
  console.log('截取公众首页...');
  await pub.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(3000);
  await pub.screenshot({ path: path.join(SCREENSHOT_DIR, 'public-home.png') });
  console.log('  ✓ public-home.png');

  // 公告详情页
  console.log('截取公告详情...');
  await pub.goto(`${BASE_URL}/announcements`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await delay(2000);
  await pub.screenshot({ path: path.join(SCREENSHOT_DIR, 'public-announcements.png') });
  console.log('  ✓ public-announcements.png');

  // ========== 教室端 ==========
  const classroom = await browser.newPage();
  await classroom.setViewport({ width: 1920, height: 1080 });
  console.log('截取教室端...');
  await classroom.goto(`${BASE_URL}/classroom/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await classroom.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-login.png') });
  console.log('  ✓ classroom-login.png');

  // 教室端登录
  const cInputs = await classroom.$$('input');
  const cSelects = await classroom.$$('select');
  if (cSelects.length > 0) await cSelects[0].select('1');
  for (let i = 0; i < cInputs.length; i++) {
    const type = await classroom.evaluate(el => el.type, cInputs[i]);
    await cInputs[i].click({ clickCount: 3 });
    if (type === 'password') await cInputs[i].type('room301');
    else await cInputs[i].type('301');
  }
  const cBtns = await classroom.$$('button');
  for (const btn of cBtns) {
    const text = await classroom.evaluate(el => el.textContent, btn);
    if (text && text.includes('登录')) { await btn.click(); break; }
  }
  await delay(3000);
  await classroom.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-home.png') });
  console.log('  ✓ classroom-home.png');

  // 监考模式
  console.log('截取监考大屏...');
  await classroom.goto(`${BASE_URL}/classroom/invigilation`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await delay(3000);
  await classroom.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-invigilation.png') });
  console.log('  ✓ classroom-invigilation.png');

  // ========== 教师端 ==========
  const teacher = await browser.newPage();
  await teacher.setViewport({ width: 1920, height: 1080 });
  console.log('截取教师端...');
  await teacher.goto(`${BASE_URL}/teacher/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  await teacher.screenshot({ path: path.join(SCREENSHOT_DIR, 'teacher-login.png') });
  console.log('  ✓ teacher-login.png');

  const tInputs = await teacher.$$('input');
  for (let i = 0; i < tInputs.length; i++) {
    const type = await teacher.evaluate(el => el.type, tInputs[i]);
    await tInputs[i].click({ clickCount: 3 });
    if (i === 0) await tInputs[i].type('T001');
    else if (type === 'password') await tInputs[i].type('123456');
  }
  const tBtns = await teacher.$$('button');
  for (const btn of tBtns) {
    const text = await teacher.evaluate(el => el.textContent, btn);
    if (text && text.includes('登录')) { await btn.click(); break; }
  }
  await delay(2500);
  await teacher.screenshot({ path: path.join(SCREENSHOT_DIR, 'teacher-home.png') });
  console.log('  ✓ teacher-home.png');

  // ========== 学生端 ==========
  const student = await browser.newPage();
  await student.setViewport({ width: 1920, height: 1080 });
  console.log('截取学生端...');
  await student.goto(`${BASE_URL}/student/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  await student.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-login.png') });
  console.log('  ✓ student-login.png');

  const sInputs = await student.$$('input');
  for (let i = 0; i < sInputs.length; i++) {
    const type = await student.evaluate(el => el.type, sInputs[i]);
    await sInputs[i].click({ clickCount: 3 });
    if (i === 0) await sInputs[i].type('S20250001');
    else if (type === 'password') await sInputs[i].type('123456');
  }
  const sBtns = await student.$$('button');
  for (const btn of sBtns) {
    const text = await student.evaluate(el => el.textContent, btn);
    if (text && text.includes('登录')) { await btn.click(); break; }
  }
  await delay(2500);
  await student.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-home.png') });
  console.log('  ✓ student-home.png');

  // ========== 安装向导 ==========
  const setup = await browser.newPage();
  await setup.setViewport({ width: 1920, height: 1080 });
  console.log('截取安装向导...');
  await setup.goto(`${BASE_URL}/setup`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await setup.screenshot({ path: path.join(SCREENSHOT_DIR, 'setup-wizard.png') });
  console.log('  ✓ setup-wizard.png');

  // ========== 管理员登录页 ==========
  const loginPage = await browser.newPage();
  await loginPage.setViewport({ width: 1920, height: 1080 });
  console.log('截取管理员登录页...');
  await loginPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await loginPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-login.png') });
  console.log('  ✓ admin-login.png');

  await browser.close();
  console.log('\n全部截图完成！');
}

main().catch(console.error);

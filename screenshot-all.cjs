const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'assets', 'screenshots');
const BASE_URL = 'http://localhost:5173';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  // ========== Page 1: 公众首页 ==========
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1920, height: 1080 });
  console.log('截取公众首页...');
  await page1.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(3000);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'public-home.png'), fullPage: false });
  console.log('✓ public-home.png');

  // ========== Page 2: 管理员登录并截图 ==========
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1920, height: 1080 });
  console.log('登录管理员...');
  await page2.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  
  // 截取登录页
  await page2.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-login.png') });
  console.log('✓ admin-login.png');

  // 填写登录表单
  const inputs = await page2.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('admin');
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('admin123456');
  }
  
  // 点击登录按钮
  const buttons = await page2.$$('button');
  for (const btn of buttons) {
    const text = await page2.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(3000);

  // 管理员后台各页面
  const adminPages = [
    { url: '/admin/dashboard', file: 'admin-dashboard.png', name: '管理员仪表盘' },
    { url: '/admin/exams', file: 'admin-exams.png', name: '考试管理' },
    { url: '/admin/announcements', file: 'admin-announcements.png', name: '公告管理' },
    { url: '/admin/classrooms', file: 'admin-classrooms.png', name: '教室管理' },
    { url: '/admin/teachers', file: 'admin-teachers.png', name: '教师管理' },
    { url: '/admin/students', file: 'admin-students.png', name: '学生管理' },
    { url: '/admin/buildings', file: 'admin-buildings.png', name: '教学楼管理' },
    { url: '/admin/registration-codes', file: 'admin-registration-codes.png', name: '注册码管理' },
    { url: '/admin/ai-chat', file: 'ai-assistant.png', name: 'AI 助手' },
    { url: '/admin/settings', file: 'admin-settings.png', name: '系统设置' },
  ];

  for (const p of adminPages) {
    console.log(`截取${p.name}...`);
    await page2.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2500);
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, p.file) });
    console.log(`✓ ${p.file}`);
  }

  // ========== Page 3: 教室端登录和监考大屏 ==========
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1920, height: 1080 });
  console.log('截取教室端...');
  
  // 教室端登录页
  await page3.goto(`${BASE_URL}/classroom/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page3.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-login.png') });
  console.log('✓ classroom-login.png');

  // 填写教室端登录表单
  const cInputs = await page3.$$('input');
  // 教室端登录需要：教学楼选择 + 教室号 + 密码
  // 先尝试 select
  const selects = await page3.$$('select');
  if (selects.length > 0) {
    await selects[0].select('1');
  }
  
  for (let i = 0; i < cInputs.length; i++) {
    const type = await page3.evaluate(el => el.type, cInputs[i]);
    const placeholder = await page3.evaluate(el => el.placeholder, cInputs[i]);
    if (type === 'text' || !type) {
      await cInputs[i].click({ clickCount: 3 });
      await cInputs[i].type('301');
    } else if (type === 'password') {
      await cInputs[i].click({ clickCount: 3 });
      await cInputs[i].type('room301');
    }
  }
  
  // 点击登录
  const cButtons = await page3.$$('button');
  for (const btn of cButtons) {
    const text = await page3.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(3000);

  // 教室端首页
  console.log('截取教室端首页...');
  await page3.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-home.png') });
  console.log('✓ classroom-home.png');

  // 尝试进入监考模式
  console.log('截取教室端监考模式...');
  await page3.goto(`${BASE_URL}/classroom/invigilation`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(3000);
  await page3.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-invigilation.png') });
  console.log('✓ classroom-invigilation.png');

  // ========== Page 4: 教师端 ==========
  const page4 = await browser.newPage();
  await page4.setViewport({ width: 1920, height: 1080 });
  console.log('截取教师端...');
  await page4.goto(`${BASE_URL}/teacher/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  
  const tInputs = await page4.$$('input');
  for (let i = 0; i < tInputs.length; i++) {
    const type = await page4.evaluate(el => el.type, tInputs[i]);
    await tInputs[i].click({ clickCount: 3 });
    if (i === 0) await tInputs[i].type('T001');
    else if (type === 'password') await tInputs[i].type('123456');
  }
  const tButtons = await page4.$$('button');
  for (const btn of tButtons) {
    const text = await page4.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(2500);
  await page4.screenshot({ path: path.join(SCREENSHOT_DIR, 'teacher-home.png') });
  console.log('✓ teacher-home.png');

  // ========== Page 5: 学生端 ==========
  const page5 = await browser.newPage();
  await page5.setViewport({ width: 1920, height: 1080 });
  console.log('截取学生端...');
  await page5.goto(`${BASE_URL}/student/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  
  const sInputs = await page5.$$('input');
  for (let i = 0; i < sInputs.length; i++) {
    const type = await page5.evaluate(el => el.type, sInputs[i]);
    await sInputs[i].click({ clickCount: 3 });
    if (i === 0) await sInputs[i].type('S20250001');
    else if (type === 'password') await sInputs[i].type('123456');
  }
  const sButtons = await page5.$$('button');
  for (const btn of sButtons) {
    const text = await page5.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(2500);
  await page5.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-home.png') });
  console.log('✓ student-home.png');

  // ========== Page 6: 安装向导 ==========
  const page6 = await browser.newPage();
  await page6.setViewport({ width: 1920, height: 1080 });
  console.log('截取安装向导...');
  await page6.goto(`${BASE_URL}/setup`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page6.screenshot({ path: path.join(SCREENSHOT_DIR, 'setup-wizard.png') });
  console.log('✓ setup-wizard.png');

  await browser.close();
  console.log('\n所有页面截图完成！');
}

main().catch(console.error);

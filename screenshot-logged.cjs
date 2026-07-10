const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'assets', 'screenshots');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // ========== 1. 公众首页（等待渲染完成）==========
  console.log('截取公众首页...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'public-home.png') });
  console.log('✓ public-home.png');

  // ========== 2. 管理员登录 ==========
  console.log('登录管理员...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  
  // 填写登录表单
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('admin');
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('admin123456');
  }
  
  // 点击登录按钮
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }
  await delay(3000);
  
  // ========== 3. 管理员后台仪表盘 ==========
  console.log('截取管理员后台...');
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-dashboard.png') });
  console.log('✓ admin-dashboard.png');

  // ========== 4. 管理员考试列表 ==========
  await page.goto(`${BASE_URL}/admin/exams`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-exams.png') });
  console.log('✓ admin-exams.png');

  // ========== 5. AI 助手 ==========
  await page.goto(`${BASE_URL}/admin/ai-chat`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ai-assistant.png') });
  console.log('✓ ai-assistant.png');

  // ========== 6. 教室端登录 ==========
  // 先创建一个教室端账号
  const cookies = await page.cookies();
  
  console.log('截取教室端...');
  // 直接访问教室端首页（会跳转到登录）
  await page.goto(`${BASE_URL}/classroom/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'classroom-login.png') });
  console.log('✓ classroom-login.png');

  // ========== 7. 安装向导 ==========
  await page.goto(`${BASE_URL}/setup`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'setup-wizard.png') });
  console.log('✓ setup-wizard.png');

  await browser.close();
  console.log('\n所有截图完成！');
}

main().catch(console.error);

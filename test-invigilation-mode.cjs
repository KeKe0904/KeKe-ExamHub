/**
 * 测试：监考大屏深色模式效果
 */
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    defaultViewport: { width: 1536, height: 960 },
  });

  const page = await browser.newPage();
  
  // 注入 cookie consent 和深色主题
  await page.evaluateOnNewDocument(() => {
    try {
      const consentData = {
        preferences: { essential: true, functional: true, analytics: true, preferences: true },
        consentedAt: new Date().toISOString(),
        version: "1.0",
      };
      document.cookie = `examhub-cookie-consent=${encodeURIComponent(JSON.stringify(consentData))}; path=/; SameSite=Lax`;
    } catch (e) {}
  });

  // 登录
  await page.goto('http://localhost:5173/classroom/login', { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('select', { visible: true, timeout: 8000 });
  await page.waitForFunction(
    () => { const s = document.querySelector('select'); return s && s.options.length > 1; },
    { timeout: 8000 }
  );
  await page.select('select', '1号楼');
  await page.type('input[placeholder="例如:301"]', '101', { delay: 30 });
  await page.type('input[placeholder="请输入密码"]', 'classroom123', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  // 深色模式监考大屏
  await page.goto('http://localhost:5173/classroom/invigilation', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));
  
  // 切深色
  await page.evaluate(() => {
    localStorage.setItem('examhub-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ path: '/tmp/invigilation-dark.png', fullPage: false });
  console.log('深色模式监考大屏已保存');

  // 浅色模式
  await page.evaluate(() => {
    localStorage.setItem('examhub-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ path: '/tmp/invigilation-light.png', fullPage: false });
  console.log('浅色模式监考大屏已保存');

  await browser.close();
})();

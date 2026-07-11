const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const OUT = '/workspace/assets/screenshots';
const VIEWPORT = { width: 1536, height: 960, deviceScaleFactor: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitNetworkIdle(page, timeout = 10000) {
  try {
    await page.waitForNetworkIdle({ idleTime: 800, timeout });
  } catch (e) {}
}

async function shot(page, name, opts = {}) {
  await sleep(opts.delay || 2000);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({
    path: file,
    fullPage: opts.fullPage !== false,
  });
  const size = fs.statSync(file).size;
  console.log(`  ✓ ${name}.png (${(size / 1024).toFixed(1)} KB)`);
}

async function injectCookieConsent(page) {
  await page.evaluateOnNewDocument(() => {
    try {
      const consentData = {
        preferences: { essential: true, functional: true, analytics: true, preferences: true },
        consentedAt: new Date().toISOString(),
        version: "1.0",
      };
      const cookieStr = `examhub-cookie-consent=${encodeURIComponent(JSON.stringify(consentData))}; path=/; SameSite=Lax`;
      document.cookie = cookieStr;
      localStorage.setItem('examhub-cookie-consent', JSON.stringify(consentData));
    } catch (e) {}
  });
}

async function main() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--force-color-profile=srgb',
    ],
    defaultViewport: VIEWPORT,
  });

  try {
    console.log('\n截取学校信息页...');
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await injectCookieConsent(page);
    await page.goto(`${BASE}/school-info`, { waitUntil: 'networkidle0', timeout: 20000 });
    await waitNetworkIdle(page);
    await sleep(2000);
    await shot(page, 'public-announcements');
    await page.close();

    console.log('\n✅ 学校信息页截图完成');
  } catch (err) {
    console.error('\n❌ 截图失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

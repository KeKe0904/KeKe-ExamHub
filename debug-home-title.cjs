/**
 * 调试脚本：检查首页标题是否正常渲染
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
  
  // 注入 cookie consent
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

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));

  console.log('=== 检查 Hero 区域 ===');
  
  // 检查 h1 元素
  const h1Info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { found: false };
    const style = window.getComputedStyle(h1);
    return {
      found: true,
      text: h1.innerText,
      color: style.color,
      backgroundColor: style.backgroundColor,
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      height: h1.offsetHeight,
      rect: h1.getBoundingClientRect(),
    };
  });
  console.log('H1 元素:', JSON.stringify(h1Info, null, 2));

  // 检查 Hero section
  const heroInfo = await page.evaluate(() => {
    const hero = document.querySelector('section');
    if (!hero) return { found: false };
    const style = window.getComputedStyle(hero);
    return {
      found: true,
      tag: hero.tagName,
      bgColor: style.backgroundColor,
      height: hero.offsetHeight,
      classList: [...hero.classList].slice(0, 5).join(', '),
    };
  });
  console.log('Hero section:', JSON.stringify(heroInfo, null, 2));

  // 检查当前主题
  const themeInfo = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      htmlClass: html.className,
      hasDarkClass: html.classList.contains('dark'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    };
  });
  console.log('主题信息:', JSON.stringify(themeInfo, null, 2));

  // 截取 Hero 部分（上半部分）
  await page.screenshot({
    path: '/tmp/hero-debug.png',
    clip: { x: 0, y: 0, width: 1536, height: 500 },
  });
  console.log('已保存 Hero 区域截图到 /tmp/hero-debug.png');

  await browser.close();
})();

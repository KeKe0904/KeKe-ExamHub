const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1536, height: 960, deviceScaleFactor: 2 };
const FRAME_DIR = '/workspace/assets/video-frames';

if (fs.existsSync(FRAME_DIR)) {
  fs.rmSync(FRAME_DIR, { recursive: true });
}
fs.mkdirSync(FRAME_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function injectCookieConsent(page) {
  await page.evaluateOnNewDocument(() => {
    try {
      const consentData = {
        preferences: { essential: true, functional: true, analytics: true, preferences: true },
        consentedAt: new Date().toISOString(),
        version: "1.0",
      };
      document.cookie = `examhub-cookie-consent=${encodeURIComponent(JSON.stringify(consentData))}; path=/; SameSite=Lax`;
      localStorage.setItem('examhub-cookie-consent', JSON.stringify(consentData));
    } catch (e) {}
  });
}

async function main() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--force-color-profile=srgb',
      '--window-size=1536,960',
      '--start-maximized',
    ],
    defaultViewport: VIEWPORT,
  });

  let frameNum = 0;
  const fps = 15;

  async function capture(page, duration) {
    const frames = Math.floor(duration / (1000 / fps));
    for (let i = 0; i < frames; i++) {
      const filePath = path.join(FRAME_DIR, `frame-${String(frameNum).padStart(5, '0')}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      frameNum++;
      await sleep(1000 / fps);
    }
  }

  try {
    console.log('1. 录制公众首页...');
    const homePage = await browser.newPage();
    await homePage.setViewport(VIEWPORT);
    await injectCookieConsent(homePage);
    await homePage.goto(BASE, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
    await capture(homePage, 3000);
    
    await homePage.click('input[placeholder*="搜索"]');
    await sleep(300);
    await homePage.type('input[placeholder*="搜索"]', '数学');
    await sleep(500);
    await capture(homePage, 2000);
    await homePage.keyboard.press('Escape');
    await sleep(300);
    await homePage.close();

    console.log('2. 录制管理员登录...');
    const adminPage = await browser.newPage();
    await adminPage.setViewport(VIEWPORT);
    await adminPage.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(500);
    await adminPage.type('input[type="text"]', 'admin');
    await sleep(300);
    await adminPage.type('input[type="password"]', 'KeKe@ExamHub2025');
    await sleep(300);
    await adminPage.click('button[type="submit"]');
    await sleep(2000);
    await capture(adminPage, 4000);

    console.log('3. 录制仪表盘...');
    await adminPage.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
    await capture(adminPage, 4000);

    console.log('4. 录制考试管理...');
    await adminPage.goto(`${BASE}/admin/exams`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
    await capture(adminPage, 3000);

    console.log('5. 录制AI助手...');
    await adminPage.goto(`${BASE}/admin/ai`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
    await adminPage.type('textarea', '帮我查一下考试安排');
    await sleep(500);
    await adminPage.click('button[type="submit"]');
    await sleep(5000);
    await capture(adminPage, 4000);
    await adminPage.close();

    console.log('6. 录制教室端监考大屏...');
    const classroomPage = await browser.newPage();
    await classroomPage.setViewport(VIEWPORT);
    await injectCookieConsent(classroomPage);
    await classroomPage.goto(`${BASE}/classroom/login`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(500);
    await classroomPage.type('input[placeholder*="教学楼"]', '1号楼');
    await sleep(300);
    await classroomPage.type('input[placeholder*="教室号"]', '101');
    await sleep(300);
    await classroomPage.type('input[type="password"]', 'classroom123');
    await sleep(300);
    await classroomPage.click('button[type="submit"]');
    await sleep(2000);
    await capture(classroomPage, 3000);
    await classroomPage.click('button:has-text("监考模式")');
    await sleep(1500);
    await capture(classroomPage, 6000);
    await classroomPage.close();

    console.log('7. 录制学生端...');
    const studentPage = await browser.newPage();
    await studentPage.setViewport(VIEWPORT);
    await injectCookieConsent(studentPage);
    await studentPage.goto(`${BASE}/student/login`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(500);
    await studentPage.type('input[type="text"]', 'S20250001');
    await sleep(300);
    await studentPage.type('input[type="password"]', 'student123');
    await sleep(300);
    await studentPage.click('button[type="submit"]');
    await sleep(2000);
    await capture(studentPage, 4000);
    await studentPage.close();

    console.log('\n✅ 录制完成，共', frameNum, '帧');

  } catch (err) {
    console.error('\n❌ 录制失败:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('\n用 FFmpeg 合成视频...');
  const outputVideo = '/workspace/assets/examhub-promo.mp4';
  const { execSync } = require('child_process');
  execSync(`ffmpeg -y -r ${fps} -f image2 -s 1536x960 -i "${FRAME_DIR}/frame-%05d.png" -vcodec libx264 -crf 23 -pix_fmt yuv420p "${outputVideo}" 2>&1`, { stdio: 'inherit' });
  
  const size = fs.statSync(outputVideo).size;
  console.log(`\n✅ 视频生成完成: ${outputVideo} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  
  execSync(`rm -rf ${FRAME_DIR}`, { stdio: 'ignore' });
  console.log('✅ 清理完成');
}

main();

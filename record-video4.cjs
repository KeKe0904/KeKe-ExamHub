const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, 'video-frames');
const VIDEO_FILE = path.join(__dirname, 'assets', 'examhub-promo.mp4');
const SLIDE_COUNT = 10;
const SLIDE_SEC = 5;
const FPS = 30;
const TRANSITION_FRAMES = Math.round(0.8 * FPS); // 0.8s 过渡
const HOLD_FRAMES = SLIDE_SEC * FPS - TRANSITION_FRAMES; // 静止帧
const TOTAL_FRAMES = SLIDE_COUNT * SLIDE_SEC * FPS;

async function main() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(VIDEO_FILE), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('加载页面...');
  await page.goto(`file://${path.join(__dirname, 'ppt-video.html')}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  console.log(`总帧数: ${TOTAL_FRAMES} (${SLIDE_SEC}s x ${SLIDE_COUNT} 页 @ ${FPS}fps)`);

  let frameNum = 0;

  for (let slide = 0; slide < SLIDE_COUNT; slide++) {
    // 先截 HOLD_FRAMES 帧静止画面
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, j) => {
        s.style.transition = 'none';
        if (j === idx) { s.classList.add('active'); s.style.opacity = '1'; }
        else { s.classList.remove('active'); s.style.opacity = '0'; }
      });
    }, slide);
    await new Promise(r => setTimeout(r, 200));

    for (let f = 0; f < HOLD_FRAMES; f++) {
      await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(6, '0')}.png`) });
      frameNum++;
    }

    // 过渡帧：当前页淡出 + 下一页淡入
    if (slide < SLIDE_COUNT - 1) {
      for (let f = 0; f < TRANSITION_FRAMES; f++) {
        const progress = (f + 1) / TRANSITION_FRAMES;
        await page.evaluate((idx, nextIdx, p) => {
          const slides = document.querySelectorAll('.slide');
          if (slides[idx]) { slides[idx].style.transition = 'none'; slides[idx].style.opacity = String(1 - p); }
          if (slides[nextIdx]) { slides[nextIdx].style.transition = 'none'; slides[nextIdx].style.opacity = String(p); slides[nextIdx].classList.add('active'); }
        }, slide, slide + 1, progress);
        await new Promise(r => setTimeout(r, 5));
        await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(6, '0')}.png`) });
        frameNum++;
      }
    } else {
      // 最后一页，补满帧
      for (let f = 0; f < TRANSITION_FRAMES; f++) {
        await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(6, '0')}.png`) });
        frameNum++;
      }
    }

    console.log(`  第 ${slide + 1}/${SLIDE_COUNT} 页完成 (${frameNum}/${TOTAL_FRAMES})`);
  }

  await browser.close();
  console.log('截图完成，ffmpeg 合成...');

  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${FRAMES_DIR}/frame_%06d.png ` +
    `-c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 ` +
    `-vf "scale=1920:1080" -r ${FPS} ${VIDEO_FILE}`,
    { stdio: 'pipe' }
  );

  fs.rmSync(FRAMES_DIR, { recursive: true });

  const size = fs.statSync(VIDEO_FILE).size;
  console.log(`\n视频已生成: ${VIDEO_FILE}`);
  console.log(`文件大小: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`时长: ${TOTAL_FRAMES / FPS} 秒 | 帧率: ${FPS} fps`);
}

main().catch(err => { console.error('错误:', err); process.exit(1); });

const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, 'video-frames');
const VIDEO_FILE = path.join(__dirname, 'assets', 'examhub-promo.mp4');
const SLIDE_COUNT = 10;
const SLIDE_SEC = 5;
const FPS = 2; // 每秒 2 帧，足够幻灯片
const FRAMES_PER_SLIDE = SLIDE_SEC * FPS;
const TOTAL_FRAMES = SLIDE_COUNT * FRAMES_PER_SLIDE;

async function main() {
  // 清理
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

  console.log(`截图: ${SLIDE_COUNT} 页 x ${FRAMES_PER_SLIDE} 帧 = ${TOTAL_FRAMES} 帧`);

  let frameNum = 0;
  for (let slide = 0; slide < SLIDE_COUNT; slide++) {
    // 显示当前 slide
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, j) => {
        s.style.transition = 'none';
        if (j === idx) {
          s.classList.add('active');
          s.style.opacity = '1';
        } else {
          s.classList.remove('active');
          s.style.opacity = '0';
        }
      });
    }, slide);
    await new Promise(r => setTimeout(r, 500));

    // 截 FRAMES_PER_SLIDE 帧
    for (let f = 0; f < FRAMES_PER_SLIDE; f++) {
      await page.screenshot({
        path: path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(6, '0')}.png`),
        type: 'png'
      });
      frameNum++;
    }
    console.log(`  第 ${slide + 1}/${SLIDE_COUNT} 页完成 (${frameNum}/${TOTAL_FRAMES})`);
  }

  await browser.close();
  console.log('截图完成，ffmpeg 合成中...');

  // ffmpeg 合成，用 fade 过渡
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${FRAMES_DIR}/frame_%06d.png ` +
    `-vf "scale=1920:1080,fade=t=in:st=0:d=0.5,fade=t=out:st=${TOTAL_FRAMES/FPS - 1}:d=1" ` +
    `-c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 ` +
    `-r 30 ${VIDEO_FILE}`,
    { stdio: 'inherit' }
  );

  // 清理
  fs.rmSync(FRAMES_DIR, { recursive: true });

  const size = fs.statSync(VIDEO_FILE).size;
  console.log(`\n视频已生成: ${VIDEO_FILE}`);
  console.log(`文件大小: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`时长: ${TOTAL_FRAMES / FPS} 秒`);
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIDEO_FILE = path.join(__dirname, 'assets', 'examhub-promo.mp4');
const SLIDE_COUNT = 10;
const SLIDE_MS = 5000;
const TRANSITION_MS = 800;

async function main() {
  fs.mkdirSync(path.dirname(VIDEO_FILE), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--autoplay-policy=no-user-gesture-required',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('加载页面...');
  await page.goto(`file://${path.join(__dirname, 'ppt-video.html')}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  // 启动 ffmpeg 录制
  const { spawn } = require('child_process');
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'x11grab',
    '-framerate', '30',
    '-video_size', '1920x1080',
    '-i', ':99',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '18',
    VIDEO_FILE
  ]);

  // 用虚拟显示
  console.log('开始播放幻灯片...');
  
  for (let i = 0; i < SLIDE_COUNT; i++) {
    console.log(`  播放第 ${i + 1}/${SLIDE_COUNT} 页`);
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, j) => {
        s.style.transition = `opacity ${800}ms ease-in-out`;
        if (j === idx) {
          s.classList.add('active');
          s.style.opacity = '1';
        } else {
          s.classList.remove('active');
          s.style.opacity = '0';
        }
      });
      const bar = document.getElementById('progressBar');
      if (bar) bar.style.width = ((idx + 1) / slides.length * 100) + '%';
    }, i);
    await new Promise(r => setTimeout(r, SLIDE_MS));
  }

  console.log('播放完毕，停止录制...');
  ffmpeg.kill('SIGINT');
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
  
  const size = fs.statSync(VIDEO_FILE).size;
  console.log(`\n视频已生成: ${VIDEO_FILE}`);
  console.log(`文件大小: ${(size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

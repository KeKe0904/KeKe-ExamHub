const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'video-frames');
const VIDEO_FILE = path.join(__dirname, 'assets', 'examhub-promo.mp4');
const FPS = 30;
const SLIDE_DURATION = 5; // 秒
const TOTAL_SLIDES = 10;
const TRANSITION = 1; // 过渡 1 秒
const TOTAL_DURATION = TOTAL_SLIDES * SLIDE_DURATION;
const TOTAL_FRAMES = TOTAL_DURATION * FPS;

async function main() {
  // 清理帧目录
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // 确保输出目录存在
  fs.mkdirSync(path.dirname(VIDEO_FILE), { recursive: true });

  console.log(`总时长: ${TOTAL_DURATION}s, 总帧数: ${TOTAL_FRAMES}`);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('加载 HTML...');
  await page.goto(`file://${path.join(__dirname, 'ppt-video.html')}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000)); // 等图片加载

  console.log('开始逐帧截图...');
  
  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const currentTime = frame / FPS;
    const slideIndex = Math.min(Math.floor(currentTime / SLIDE_DURATION), TOTAL_SLIDES - 1);
    
    // 计算过渡透明度
    const timeInSlide = currentTime % SLIDE_DURATION;
    let opacity = 1;
    if (timeInSlide < TRANSITION) {
      opacity = timeInSlide / TRANSITION;
    } else if (timeInSlide > SLIDE_DURATION - TRANSITION && slideIndex < TOTAL_SLIDES - 1) {
      opacity = (SLIDE_DURATION - timeInSlide) / TRANSITION;
    }
    
    // 直接控制 slide 显示
    await page.evaluate((idx, op) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, i) => {
        if (i === idx) {
          s.style.opacity = Math.max(0.3, op); // 最小 0.3 避免全黑
          s.style.transition = 'none';
          s.classList.add('active');
        } else {
          s.style.opacity = '0';
          s.classList.remove('active');
        }
      });
    }, slideIndex, opacity);
    
    await new Promise(r => setTimeout(r, 10)); // 等渲染
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, `frame_${String(frame).padStart(6, '0')}.png`),
      type: 'png'
    });
    
    if (frame % 30 === 0) {
      console.log(`  帧 ${frame}/${TOTAL_FRAMES} (${Math.round(frame/TOTAL_FRAMES*100)}%) - Slide ${slideIndex + 1}`);
    }
  }

  await browser.close();
  console.log('截图完成，开始合成视频...');

  // 用 ffmpeg 合成
  const cmd = `ffmpeg -y -framerate ${FPS} -i ${OUTPUT_DIR}/frame_%06d.png -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -vf "scale=1920:1080" ${VIDEO_FILE}`;
  console.log('ffmpeg 命令:', cmd);
  execSync(cmd, { stdio: 'inherit' });

  console.log(`\n视频已生成: ${VIDEO_FILE}`);
  
  // 清理帧
  fs.rmSync(OUTPUT_DIR, { recursive: true });
  console.log('临时帧已清理');
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = '/workspace/assets';
const FRAME_DIR = path.join(BASE_DIR, 'video-frames');
const OUTPUT_VIDEO = path.join(BASE_DIR, 'examhub-promo.mp4');

if (fs.existsSync(FRAME_DIR)) {
  execSync(`rm -rf ${FRAME_DIR}`);
}
fs.mkdirSync(FRAME_DIR, { recursive: true });

const SCREENSHOTS = [
  { file: 'public-home.png', duration: 3 },
  { file: 'admin-dashboard.png', duration: 3 },
  { file: 'admin-exams.png', duration: 2.5 },
  { file: 'ai-assistant.png', duration: 3 },
  { file: 'classroom-invigilation.png', duration: 4 },
  { file: 'student-home.png', duration: 2.5 },
  { file: 'teacher-home.png', duration: 2.5 },
  { file: 'setup-wizard.png', duration: 3 },
];

const FPS = 30;
const WIDTH = 1536;
const HEIGHT = 960;
const FADE_FRAMES = Math.floor(FPS * 0.4);

console.log('生成视频帧...');
let frameNum = 0;

SCREENSHOTS.forEach((item) => {
  const filePath = path.join(BASE_DIR, 'screenshots', item.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ 跳过: ${item.file}`);
    return;
  }
  
  const frames = Math.floor(item.duration * FPS);
  
  for (let i = 0; i < frames; i++) {
    const outputPath = path.join(FRAME_DIR, `frame-${String(frameNum).padStart(5, '0')}.png`);
    
    let opacity = 1;
    if (i < FADE_FRAMES) {
      opacity = Math.pow(i / FADE_FRAMES, 0.5);
    } else if (i >= frames - FADE_FRAMES) {
      opacity = Math.pow((frames - i) / FADE_FRAMES, 0.5);
    }
    
    execSync(`ffmpeg -y -i "${filePath}" -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,format=rgba,colorchannelmixer=aa=${opacity}" "${outputPath}" 2>/dev/null`);
    frameNum++;
  }
  
  console.log(`  ✓ ${item.file} (${frames}帧)`);
});

console.log('\n合成视频...');
execSync(`ffmpeg -y -r ${FPS} -f image2 -s ${WIDTH}x${HEIGHT} -i "${FRAME_DIR}/frame-%05d.png" -c:v libx264 -crf 20 -pix_fmt yuv420p "${OUTPUT_VIDEO}" 2>&1`, { stdio: 'inherit' });

const size = fs.statSync(OUTPUT_VIDEO).size;
console.log(`\n✅ 视频生成完成: ${OUTPUT_VIDEO}`);
console.log(`   文件大小: ${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   时长: ${(frameNum / FPS).toFixed(1)} 秒`);

execSync(`rm -rf ${FRAME_DIR}`);
console.log('\n✅ 清理完成');

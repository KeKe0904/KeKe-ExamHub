const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'assets', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';
const CHROME = 'google-chrome-stable';

function takeScreenshot(url, filename, width = 1920, height = 1080) {
  const filepath = path.join(SCREENSHOT_DIR, filename);
  const cmd = `${CHROME} --headless --no-sandbox --disable-gpu --screenshot="${filepath}" --window-size=${width},${height} "${url}"`;
  try {
    execSync(cmd, { timeout: 15000 });
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${filename}`);
      return true;
    }
  } catch (e) {
    console.error(`✗ ${filename}: ${e.message}`);
  }
  return false;
}

// 1. 公众首页
takeScreenshot(`${BASE_URL}/`, 'public-home.png');

// 2. 管理员登录页
takeScreenshot(`${BASE_URL}/admin/login`, 'admin-login.png');

// 3. 安装向导
takeScreenshot(`${BASE_URL}/setup`, 'setup-wizard.png');

// 4. 教室端登录
takeScreenshot(`${BASE_URL}/classroom/login`, 'classroom-login.png');

// 5. 教师端登录
takeScreenshot(`${BASE_URL}/teacher/login`, 'teacher-login.png');

// 6. 学生端登录
takeScreenshot(`${BASE_URL}/student/login`, 'student-login.png');

console.log('\n基础截图完成！');

#!/bin/bash
# ============================================================================
# ExamHub 一键部署脚本(生产级)
# ----------------------------------------------------------------------------
# 本脚本只负责: 环境安装 + 代码构建 + 服务编排(Nginx + PM2)
# 不做数据库初始化、不建管理员账号 —— 这些由用户手动建库 + /setup 安装向导页面完成
#
# 用法:
#   chmod +x install.sh && ./install.sh
#
# 可重复执行(幂等), 已安装的组件会自动跳过
# ============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# ---------- 颜色 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step()  { echo -e "\n${BLUE}==== $1 ====${NC}"; }

# ---------- 路径 ----------
# 项目根目录 = install.sh 所在目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 后端目录(cwd 必须明确, 决定 .env 与 .setup-complete 的位置)
API_DIR="$PROJECT_DIR/api"

# 应用名(供 PM2 / Nginx 使用)
APP_NAME="examhub-api"

echo ""
echo "============================================="
echo "   KeKe ExamHub 一键部署脚本"
echo "   项目目录: $PROJECT_DIR"
echo "============================================="

# ---------- 0. root 权限检查 ----------
if [ "$(id -u)" -ne 0 ]; then
  warn "未以 root 运行, 跳过环境安装(仅构建 + 服务配置)"
  SKIP_INSTALL=1
else
  SKIP_INSTALL=0
fi

# ---------- 1. 环境检测 + 自动安装 ----------
step "1/6 环境检测与安装"

# 1.1 apt 基础包(git / curl / nginx / mariadb)
install_system_packages() {
  info "更新 apt 索引..."
  apt-get update -y
  info "安装基础包: ca-certificates curl gnupg git nginx mariadb-server rsync"
  apt-get install -y ca-certificates curl gnupg git nginx mariadb-server rsync
}

# 1.2 Node.js 22 LTS(通过 NodeSource)
install_node() {
  info "安装 Node.js 22 LTS (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
}

# 1.3 PM2 全局
install_pm2() {
  info "安装 PM2..."
  npm install -g pm2
}

# 检测命令是否存在
has() { command -v "$1" >/dev/null 2>&1; }

if [ "$SKIP_INSTALL" -eq 0 ]; then
  # apt 基础包
  if ! has git || ! has nginx || ! has mysql || ! has systemctl; then
    install_system_packages
  else
    info "基础包(git/nginx/mariadb)已安装"
  fi

  # Node.js >= 18
  NODE_OK=0
  if has node; then
    NODE_MAJOR=$(node -v | cut -dv -f2 | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
      NODE_OK=1
    fi
  fi
  if [ "$NODE_OK" -eq 0 ]; then
    install_node
  else
    info "Node.js 已安装: $(node -v)"
  fi

  # 启动并设置开机自启
  systemctl enable --now mariadb 2>/dev/null || true
  systemctl enable --now nginx   2>/dev/null || true

  # PM2
  if ! has pm2; then
    install_pm2
  else
    info "PM2 已安装: $(pm2 --version 2>/dev/null || echo '?')"
  fi
else
  # 非 root: 只检测, 不安装
  for cmd in node npm mysql nginx pm2; do
    if has $cmd; then
      info "已检测到 $cmd"
    else
      warn "未检测到 $cmd (非 root 模式, 不自动安装)"
    fi
  done
fi

# 最终校验: node 必须 >= 18
if ! has node; then
  error "Node.js 未安装, 无法继续。请以 root 运行本脚本, 或手动安装 Node.js 18+"
  exit 1
fi
NODE_MAJOR=$(node -v | cut -dv -f2 | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node.js 版本需 >= 18, 当前 $(node -v)"
  exit 1
fi

info "环境就绪: Node $(node -v) / npm $(npm -v)"
[ "$SKIP_INSTALL" -eq 0 ] && info "服务状态: mariadb=$(systemctl is-active mariadb) nginx=$(systemctl is-active nginx)"

# ---------- 2. 构建后端(先) ----------
# 必须先构建后端: 根 tsconfig 已限制只 include src, 但 npm install 顺序仍应后端先,
# 确保 api/node_modules 就位, 避免任何潜在的交叉引用问题
step "2/6 构建后端 (api)"

cd "$API_DIR"
info "后端 npm install..."
npm install --no-audit --no-fund

info "后端 npm run build..."
npm run build

if [ ! -f "$API_DIR/dist/server.js" ]; then
  error "后端构建失败: dist/server.js 不存在"
  exit 1
fi
info "后端构建产物: $(ls -1 "$API_DIR/dist" | head -5 | tr '\n' ' ')"

# ---------- 3. 构建前端(后) ----------
step "3/6 构建前端"

cd "$PROJECT_DIR"
info "前端 npm install..."
npm install --no-audit --no-fund

info "前端 npm run build..."
VITE_API_BASE_URL=/api npm run build

if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  error "前端构建失败: dist/index.html 不存在"
  exit 1
fi
info "前端构建产物: dist/index.html ($(du -h "$PROJECT_DIR/dist/index.html" | cut -f1))"

# ---------- 4. PM2 配置 + 启动 ----------
# 关键: ecosystem.config.cjs 必须指定 cwd=$API_DIR
# 这样 process.cwd() = $API_DIR, .env 与 .setup-complete 都在 $API_DIR/ 下
step "4/6 配置 PM2"

# 创建日志目录
mkdir -p "$API_DIR/logs"

# 生成 ecosystem.config.cjs(覆盖写, 保证配置始终最新)
cat > "$PROJECT_DIR/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'dist/server.js',
    cwd: '${API_DIR}',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '300M',
    exp_backoff_restart_delay: 100,
    out_file: '${API_DIR}/logs/out.log',
    error_file: '${API_DIR}/logs/error.log',
    merge_logs: true,
    time: true
  }]
};
EOF
info "已生成 ecosystem.config.cjs (cwd=${API_DIR})"

# 启动或重启
cd "$PROJECT_DIR"
if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
  warn "${APP_NAME} 已在运行, 重启并刷新环境变量..."
  pm2 restart "${APP_NAME}" --update-env
else
  info "启动 ${APP_NAME}..."
  pm2 start ecosystem.config.cjs
fi
pm2 save

# 开机自启(可能需要 root)
if [ "$SKIP_INSTALL" -eq 0 ]; then
  env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>/dev/null || true
  pm2 save
  info "PM2 开机自启已配置"
fi

# ---------- 5. Nginx 反向代理 ----------
step "5/6 配置 Nginx"

NGINX_CONF="/etc/nginx/sites-available/examhub"
NGINX_ENABLED="/etc/nginx/sites-enabled/examhub"

if [ "$SKIP_INSTALL" -eq 0 ] && [ -d /etc/nginx/sites-available ]; then
  # Debian/Ubuntu 风格 sites-available
  cat > "$NGINX_CONF" <<'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root PROJECT_DIR_PLACEHOLDER/dist;
    index index.html;

    # gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript text/javascript application/xml+rss image/svg+xml;

    # 静态资源缓存(Vite 构建产物带 hash, 可长期缓存)
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA 路由支持(前端 React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端 Fastify
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX_EOF

  # 替换路径占位符
  sed -i "s|PROJECT_DIR_PLACEHOLDER|${PROJECT_DIR}|g" "$NGINX_CONF"

  ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t; then
    systemctl reload nginx
    info "Nginx 配置完成并已 reload"
  else
    error "Nginx 配置语法检查失败, 请检查 $NGINX_CONF"
    exit 1
  fi
else
  warn "非 root 或非 Debian/Ubuntu Nginx 布局, 跳过 Nginx 配置"
  warn "请手动配置 Nginx: root=$PROJECT_DIR/dist, 反向代理 /api/ → 127.0.0.1:3000"
fi

# ---------- 6. 完成与引导 ----------
step "6/6 部署完成"

# 获取服务器 IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "服务器IP")
[ -z "$SERVER_IP" ] && SERVER_IP="服务器IP"

# 健康检查
sleep 2
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ 2>/dev/null || echo "000")

echo ""
echo "============================================="
echo -e "${GREEN}   部署完成!${NC}"
echo "============================================="
echo ""
echo "服务状态:"
[ "$API_HEALTH" = "200" ] && echo -e "  后端 API:   ${GREEN}✓${NC} (HTTP $API_HEALTH)" || echo -e "  后端 API:   ${YELLOW}?${NC} (HTTP $API_HEALTH, 可能还在启动中)"
[ "$FE_STATUS" = "200" ]  && echo -e "  前端页面:   ${GREEN}✓${NC} (HTTP $FE_STATUS)" || echo -e "  前端页面:   ${YELLOW}?${NC} (HTTP $FE_STATUS)"
echo ""
echo "---------------------------------------------"
echo "重要: 还未完成! 请按以下两步完成安装"
echo "---------------------------------------------"
echo ""
echo -e "${YELLOW}第 1 步: 手动创建专用数据库用户(必须)${NC}"
echo "  出于安全考虑, 请勿使用 root 账号。在服务器上执行:"
echo ""
echo -e "  ${BLUE}mysql${NC}"
echo -e "  ${BLUE}CREATE DATABASE IF NOT EXISTS examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;${NC}"
echo -e "  ${BLUE}CREATE USER 'examhub'@'localhost' IDENTIFIED BY '你的强密码';${NC}"
echo -e "  ${BLUE}GRANT ALL PRIVILEGES ON examhub.* TO 'examhub'@'localhost';${NC}"
echo -e "  ${BLUE}FLUSH PRIVILEGES;${NC}"
echo -e "  ${BLUE}EXIT;${NC}"
echo ""
echo -e "${YELLOW}第 2 步: 打开浏览器访问安装向导${NC}"
echo -e "  地址:  ${GREEN}http://${SERVER_IP}/setup${NC}"
echo ""
echo "  在向导页面中填写:"
echo "    1. 环境检测 — 自动检测运行环境"
echo "    2. 数据库配置 — 填入刚才创建的专用用户凭据"
echo "       主机: localhost / 端口: 3306"
echo "       用户名: examhub / 密码: 你设置的密码 / 库名: examhub"
echo "    3. 管理员账号 — 设置后台登录用户名和密码"
echo "    4. 点击安装 — 系统自动建表、生成 .env 并重启后端"
echo ""
echo "  安装向导完成后, 后端会自动重启加载新配置, 无需手动操作"
echo ""
echo "---------------------------------------------"
echo "常用运维命令:"
echo "---------------------------------------------"
echo -e "  ${BLUE}pm2 status${NC}                    # 查看后端状态"
echo -e "  ${BLUE}pm2 restart ${APP_NAME}${NC}       # 重启后端"
echo -e "  ${BLUE}pm2 logs ${APP_NAME} --lines 50${NC}  # 查看后端日志"
echo -e "  ${BLUE}systemctl reload nginx${NC}        # 重载 Nginx"
echo ""
echo "访问地址(安装向导完成后生效):"
echo -e "  首页:     http://${SERVER_IP}/"
echo -e "  后台登录: http://${SERVER_IP}/admin/login"
echo ""

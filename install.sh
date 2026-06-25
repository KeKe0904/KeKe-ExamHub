#!/bin/bash
# ExamHub 一键初始化脚本
# 使用方法: chmod +x install.sh && ./install.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "========================================="
echo "   ExamHub 一键初始化脚本"
echo "========================================="
echo ""

# === 1. 检查环境 ===
info "正在检查服务器环境..."

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $2: $($3 2>&1 | head -1)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $2: 未安装"
        return 1
    fi
}

check_command node "Node.js" "node --version"
check_command npm "npm" "npm --version"
check_command mysql "MySQL/MariaDB" "mysql --version"
check_command nginx "Nginx" "nginx -v"
check_command pm2 "PM2" "pm2 --version"

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 版本需要 18 或更高"
    exit 1
fi

echo ""

# === 2. 安装前端依赖并构建 ===
info "安装前端依赖..."
npm install

info "构建前端..."
npm run build

echo ""

# === 3. 安装后端依赖并构建 ===
info "安装后端依赖..."
cd api
npm install

info "构建后端..."
npm run build
cd ..

echo ""

# === 4. 启动后端服务 ===
info "检查 PM2 进程..."
if pm2 list | grep -q "examhub-api"; then
    warn "examhub-api 已在运行，正在重启..."
    pm2 restart examhub-api
else
    info "启动 examhub-api..."
    pm2 start api/dist/server.js --name examhub-api
fi

info "保存 PM2 配置..."
pm2 save

echo ""

# === 5. 配置 Nginx ===
NGINX_CONF="/etc/nginx/sites-available/examhub"
NGINX_ENABLED="/etc/nginx/sites-enabled/examhub"

if [ ! -f "$NGINX_CONF" ]; then
    info "配置 Nginx..."
    cat > "$NGINX_CONF" << NGINX_EOF
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root ${PROJECT_DIR}/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF

    # 启用站点
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    rm -f /etc/nginx/sites-enabled/default

    # 测试并重载
    nginx -t && systemctl reload nginx
    info "Nginx 配置完成"
else
    info "Nginx 配置已存在，跳过"
fi

echo ""

# === 6. 完成 ===
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "========================================="
echo -e "${GREEN}   初始化完成！${NC}"
echo "========================================="
echo ""
echo "下一步操作："
echo ""
echo "  1. 打开浏览器访问安装向导："
echo -e "     ${GREEN}http://${SERVER_IP}/setup${NC}"
echo ""
echo "  2. 按照向导完成配置："
echo "     - 环境检测"
echo "     - 数据库连接"
echo "     - 管理员账号创建"
echo ""
echo "  3. 安装完成后重启后端服务："
echo "     pm2 restart examhub-api"
echo ""
echo "  4. 访问系统："
echo "     首页: http://${SERVER_IP}/"
echo "     后台: http://${SERVER_IP}/admin/login"
echo ""

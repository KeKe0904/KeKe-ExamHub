#!/bin/bash
# ============================================================================
# KeKe-ExamHub 一键部署脚本（生产级）
# GitHub: https://github.com/KeKe0904/KeKe-ExamHub
# ----------------------------------------------------------------------------
# 本脚本负责: 环境安装 + 版本检查 + 代码构建 + 服务编排 (Nginx + PM2)
# 不做数据库初始化、不建管理员账号 —— 这些由用户手动建库 + /setup 安装向导页面完成
#
# 用法:
#   chmod +x install.sh && sudo ./install.sh
#
# 可重复执行(幂等), 已安装的组件会自动跳过
# ============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ==================== 路径变量 ====================
# 项目根目录 = install.sh 所在目录（可在任意位置执行）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 后端目录
API_DIR="$PROJECT_DIR/api"

# 应用名（供 PM2 / Nginx 使用）
APP_NAME="examhub-api"

# GitHub 仓库（版本检查用）
GITHUB_REPO="https://github.com/KeKe0904/KeKe-ExamHub.git"
GITHUB_BRANCH="main"
REQUIRED_NODE_MAJOR="18"

# ==================== 日志函数 ====================
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[ OK ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}>>> $1${NC}"; }

# ==================== 工具函数 ====================
has() { command -v "$1" >/dev/null 2>&1; }

get_version_major() {
    echo "$1" | grep -oP '^\d+' || echo "0"
}

# ==================== 爱心 Banner ====================
# 用 ♥ 拼出 "KeKe ExamHub" 像素艺术字，逐行动画渲染
print_banner() {
    local HR="${RED}♥${NC}"
    local SP=" "
    local GAP="   "

    local lines=(
        "${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR}${HR}${SP}${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR}${HR}${GAP}${HR}${HR}${HR}${HR}${HR}${SP}${HR}   ${HR} ${SP}  ${HR}  ${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR} "
        "${HR}  ${HR}  ${SP}${HR}    ${SP}${HR}  ${HR}  ${SP}${HR}    ${GAP}${HR}    ${SP} ${HR} ${HR} ${SP} ${HR} ${HR} ${SP}${HR}${HR} ${HR}${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR}"
        "${HR} ${HR}   ${SP}${HR}    ${SP}${HR} ${HR}   ${SP}${HR}    ${GAP}${HR}    ${SP}  ${HR}  ${SP}${HR}   ${HR}${SP}${HR} ${HR} ${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR}"
        "${HR}${HR}    ${SP}${HR}${HR}${HR}${HR} ${SP}${HR}${HR}    ${SP}${HR}${HR}${HR}${HR} ${GAP}${HR}${HR}${HR}${HR} ${SP} ${HR} ${HR} ${SP}${HR}   ${HR}${SP}${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR}${HR}${SP}${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR} "
        "${HR} ${HR}   ${SP}${HR}    ${SP}${HR} ${HR}   ${SP}${HR}    ${GAP}${HR}    ${SP}  ${HR}  ${SP}${HR}   ${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR}"
        "${HR}  ${HR}  ${SP}${HR}    ${SP}${HR}  ${HR}  ${SP}${HR}    ${GAP}${HR}    ${SP} ${HR} ${HR} ${SP}${HR}   ${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP}${HR}   ${HR}"
        "${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR}${HR}${SP}${HR}   ${HR} ${SP}${HR}${HR}${HR}${HR}${HR}${GAP}${HR}${HR}${HR}${HR}${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR}${SP}${HR}   ${HR} ${SP}${HR}   ${HR} ${SP} ${HR}${HR}${HR} ${SP}${HR}${HR}${HR}${HR}"
    )

    echo ""
    for line in "${lines[@]}"; do
        echo -e "          $line"
        sleep 0.06
    done
    echo ""
    echo -e "          ${CYAN}${BOLD}一键部署脚本${NC}  |  ${CYAN}https://github.com/KeKe0904/KeKe-ExamHub${NC}"
    echo ""
}

# ==================== 步骤0: 权限检查 ====================
check_privilege() {
    if [ "$(id -u)" -ne 0 ]; then
        log_warn "未以 root 运行，跳过环境安装（仅构建 + 服务配置）"
        SKIP_INSTALL=1
    else
        SKIP_INSTALL=0
    fi
}

# ==================== 步骤1: 环境检测与安装 ====================
install_system_packages() {
    log_info "更新 apt 索引..."
    # 防止 apt lock 冲突
    while fuser /var/lib/dpkg/lock-frontend &>/dev/null; do
        log_warn "等待 apt 锁释放..."
        sleep 3
    done
    apt-get update -qq
    log_info "安装基础包: ca-certificates curl gnupg git nginx mariadb-server rsync"
    apt-get install -y -qq ca-certificates curl gnupg git nginx mariadb-server rsync
}

install_node() {
    log_info "安装 Node.js 22 LTS (NodeSource)..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
}

install_pm2() {
    log_info "安装 PM2..."
    npm install -g pm2
}

check_and_install_environment() {
    log_step "步骤1/6: 检测运行环境"

    if [ "$SKIP_INSTALL" -eq 0 ]; then
        # --- apt 基础包 ---
        if ! has git || ! has nginx || ! has mysql || ! has systemctl; then
            install_system_packages
        else
            log_info "基础包 (git/nginx/mariadb) 已安装"
        fi

        # --- Node.js >= 18 ---
        local NODE_OK=0
        if has node; then
            local NODE_MAJOR
            NODE_MAJOR=$(node -v | cut -dv -f2 | cut -d. -f1)
            if [ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
                NODE_OK=1
            fi
        fi
        if [ "$NODE_OK" -eq 0 ]; then
            install_node
        else
            log_info "Node.js 已安装: $(node -v)"
        fi

        # --- 启动并设置开机自启 ---
        systemctl enable --now mariadb 2>/dev/null || true
        systemctl enable --now nginx   2>/dev/null || true

        # --- PM2 ---
        if ! has pm2; then
            install_pm2
        else
            log_info "PM2 已安装: $(pm2 --version 2>/dev/null || echo '?')"
        fi
    else
        # --- 非 root: 仅检测，不安装 ---
        for cmd in node npm mysql nginx pm2; do
            if has "$cmd"; then
                log_info "已检测到 $cmd"
            else
                log_warn "未检测到 $cmd（非 root 模式，不自动安装）"
            fi
        done
    fi

    # --- 最终校验: node 必须 >= 18 ---
    if ! has node; then
        log_error "Node.js 未安装，无法继续。请以 root 运行本脚本或手动安装 Node.js 18+"
        exit 1
    fi
    local NODE_MAJOR
    NODE_MAJOR=$(node -v | cut -dv -f2 | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
        log_error "Node.js 版本需 >= ${REQUIRED_NODE_MAJOR}，当前 $(node -v)"
        exit 1
    fi

    log_success "环境就绪: Node $(node -v) / npm $(npm -v)"
    if [ "$SKIP_INSTALL" -eq 0 ]; then
        log_info "服务状态: mariadb=$(systemctl is-active mariadb 2>/dev/null || echo '?') nginx=$(systemctl is-active nginx 2>/dev/null || echo '?')"
    fi
}

# ==================== 步骤2: 版本检查 & 代码同步 ====================
sync_code() {
    log_step "步骤2/6: 代码同步（版本检查 + 自动更新）"

    local need_build=false

    if [ -d "${PROJECT_DIR}/.git" ]; then
        # --- 已有仓库：检查是否为最新版本 ---
        log_info "检测到已有仓库，正在检查更新..."

        local local_hash
        local_hash=$(git rev-parse HEAD 2>/dev/null || echo "")

        # 拉取远程引用（不合并）
        git fetch origin "${GITHUB_BRANCH}" --quiet 2>/dev/null || {
            log_warn "无法连接到 GitHub，跳过版本检查"
            # 检查是否已构建过
            if [ ! -d "${PROJECT_DIR}/dist" ] || [ ! -d "${API_DIR}/dist" ]; then
                need_build=true
            fi
            [ "$need_build" = true ] && return 0 || return 1
        }

        local remote_hash
        remote_hash=$(git rev-parse "origin/${GITHUB_BRANCH}" 2>/dev/null || echo "")

        if [ -z "$remote_hash" ]; then
            log_warn "无法获取远程版本信息，跳过更新"
            if [ ! -d "${PROJECT_DIR}/dist" ] || [ ! -d "${API_DIR}/dist" ]; then
                need_build=true
            fi
            [ "$need_build" = true ] && return 0 || return 1
        fi

        if [ "$local_hash" = "$remote_hash" ]; then
            log_success "代码已是最新版本 (${local_hash:0:8})"
            if [ ! -d "${PROJECT_DIR}/dist" ] || [ ! -d "${API_DIR}/dist" ]; then
                log_warn "检测到构建产物缺失，将重新构建"
                need_build=true
            fi
        else
            log_warn "发现新版本！"
            log_info "  本地: ${local_hash:0:8}"
            log_info "  远程: ${remote_hash:0:8}"

            # 显示变更日志
            echo ""
            git log --oneline "${local_hash}..origin/${GITHUB_BRANCH}" 2>/dev/null || true
            echo ""

            # 拉取并合并
            log_info "正在更新到最新版本..."
            if git pull origin "${GITHUB_BRANCH}" --ff-only; then
                local new_hash
                new_hash=$(git rev-parse HEAD)
                log_success "更新成功: ${new_hash:0:8}"
                need_build=true
            else
                log_error "自动合并失败，尝试强制同步..."
                git reset --hard "origin/${GITHUB_BRANCH}"
                local new_hash
                new_hash=$(git rev-parse HEAD)
                log_success "强制同步成功: ${new_hash:0:8}"
                need_build=true
            fi
        fi
    else
        # --- 非 Git 仓库：提示用户 ---
        log_warn "当前目录不是 Git 仓库，无法自动检查版本"
        log_info "如需自动更新功能，请通过 git clone 部署："
        log_info "  git clone ${GITHUB_REPO} ${PROJECT_DIR}"
        log_info "继续使用当前代码构建..."
        need_build=true
    fi

    if [ "$need_build" = true ]; then
        return 0
    else
        return 1
    fi
}

# ==================== 步骤3: 构建后端（优先，确保 tsconfig 链路正确） ====================
build_backend() {
    log_step "步骤3/6: 构建后端 (api)"

    cd "$API_DIR"
    log_info "后端 npm install..."
    npm install --no-audit --no-fund
    log_success "后端依赖安装完成"

    log_info "后端 npm run build..."
    npm run build

    if [ ! -f "$API_DIR/dist/server.js" ]; then
        log_error "后端构建失败: dist/server.js 不存在"
        exit 1
    fi
    log_success "后端构建产物: $(ls -1 "$API_DIR/dist" | head -5 | tr '\n' ' ')"
}

# ==================== 步骤4: 构建前端 ====================
build_frontend() {
    log_step "步骤4/6: 构建前端"

    cd "$PROJECT_DIR"
    log_info "前端 npm install..."
    npm install --no-audit --no-fund
    log_success "前端依赖安装完成"

    log_info "前端 npm run build..."
    npm run build

    if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
        log_error "前端构建失败: dist/index.html 不存在"
        exit 1
    fi
    log_success "前端构建产物: dist/index.html ($(du -h "$PROJECT_DIR/dist/index.html" | cut -f1))"
}

# ==================== 步骤5: PM2 配置 + 启动 ====================
setup_pm2() {
    log_step "步骤5/6: 配置 PM2"

    # 创建日志目录
    mkdir -p "$API_DIR/logs"

    # 生成 ecosystem.config.cjs（覆盖写入，保证配置始终最新）
    cat > "$PROJECT_DIR/ecosystem.config.cjs" << 'PM2_EOF'
module.exports = {
  apps: [{
    name: '__APP_NAME__',
    script: 'dist/server.js',
    cwd: '__API_DIR__',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '300M',
    exp_backoff_restart_delay: 100,
    out_file: '__API_DIR__/logs/out.log',
    error_file: '__API_DIR__/logs/error.log',
    merge_logs: true,
    time: true
  }]
};
PM2_EOF

    # 替换占位符
    sed -i "s|__APP_NAME__|${APP_NAME}|g" "$PROJECT_DIR/ecosystem.config.cjs"
    sed -i "s|__API_DIR__|${API_DIR}|g"  "$PROJECT_DIR/ecosystem.config.cjs"
    log_info "已生成 ecosystem.config.cjs (cwd=${API_DIR})"

    # 启动或重启
    cd "$PROJECT_DIR"
    if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
        log_warn "${APP_NAME} 已在运行，重启并刷新环境变量..."
        pm2 restart "${APP_NAME}" --update-env
    else
        log_info "启动 ${APP_NAME}..."
        pm2 start ecosystem.config.cjs
    fi
    pm2 save
    log_success "PM2 配置完成"

    # 开机自启（需要 root）
    if [ "$SKIP_INSTALL" -eq 0 ]; then
        env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root 2>/dev/null || true
        pm2 save
        log_success "PM2 开机自启已配置"
    fi
}

# ==================== 步骤6: Nginx 反向代理 ====================
setup_nginx() {
    log_step "步骤6/6: 配置 Nginx"

    local NGINX_CONF="/etc/nginx/sites-available/examhub"
    local NGINX_ENABLED="/etc/nginx/sites-enabled/examhub"

    if [ "$SKIP_INSTALL" -eq 0 ] && [ -d /etc/nginx/sites-available ]; then
        # Debian/Ubuntu 风格 sites-available
        cat > "$NGINX_CONF" << NGINX_EOF
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

    # 静态资源缓存 (Vite 构建产物带 hash，可长期缓存)
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # SPA 路由支持 (前端 React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API 反向代理到后端 Fastify
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
            log_success "Nginx 配置完成并已 reload"
        else
            log_error "Nginx 配置语法检查失败，请检查 $NGINX_CONF"
            exit 1
        fi
    else
        log_warn "非 root 或非 Debian/Ubuntu Nginx 布局，跳过 Nginx 配置"
        log_warn "请手动配置 Nginx: root=$PROJECT_DIR/dist, 反向代理 /api/ → 127.0.0.1:3000"
    fi
}

# ==================== 部署总结 ====================
print_summary() {
    # 获取服务器 IP
    local SERVER_IP
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "服务器IP")
    [ -z "$SERVER_IP" ] && SERVER_IP="服务器IP"

    # 健康检查
    sleep 2
    local API_HEALTH
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
    local FE_STATUS
    FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ 2>/dev/null || echo "000")

    echo ""
    echo "============================================="
    echo -e "${GREEN}${BOLD}   部署完成！${NC}"
    echo "============================================="
    echo ""
    echo "服务状态:"
    if [ "$API_HEALTH" = "200" ]; then
        echo -e "  后端 API:   ${GREEN}✓${NC} (HTTP $API_HEALTH)"
    else
        echo -e "  后端 API:   ${YELLOW}?${NC} (HTTP $API_HEALTH, 可能还在启动中)"
    fi
    if [ "$FE_STATUS" = "200" ]; then
        echo -e "  前端页面:   ${GREEN}✓${NC} (HTTP $FE_STATUS)"
    else
        echo -e "  前端页面:   ${YELLOW}?${NC} (HTTP $FE_STATUS)"
    fi
    echo ""
    echo "---------------------------------------------"
    echo -e "${YELLOW}${BOLD}重要: 还未完成！请按以下两步完成安装${NC}"
    echo "---------------------------------------------"
    echo ""
    echo -e "${YELLOW}第1步: 手动创建专用数据库用户(必须)${NC}"
    echo "  出于安全考虑，请勿使用 root 账号。在服务器上执行:"
    echo ""
    echo -e "  ${BLUE}sudo mysql${NC}"
    echo -e "  ${BLUE}CREATE DATABASE IF NOT EXISTS examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;${NC}"
    echo -e "  ${BLUE}CREATE USER 'examhub'@'localhost' IDENTIFIED BY '你的强密码';${NC}"
    echo -e "  ${BLUE}GRANT ALL PRIVILEGES ON examhub.* TO 'examhub'@'localhost';${NC}"
    echo -e "  ${BLUE}FLUSH PRIVILEGES;${NC}"
    echo -e "  ${BLUE}EXIT;${NC}"
    echo ""
    echo -e "${YELLOW}第2步: 打开浏览器访问安装向导${NC}"
    echo -e "  地址:  ${GREEN}http://${SERVER_IP}/setup${NC}"
    echo ""
    echo "  在向导页面中填写:"
    echo "    1. 环境检测 —— 自动检测运行环境"
    echo "    2. 数据库配置 —— 填入刚才创建的专用用户凭据"
    echo "       主机: localhost / 端口: 3306"
    echo "       用户名: examhub / 密码: 你设置的密码 / 库名: examhub"
    echo "    3. 管理员账号 —— 设置后台登录用户名和密码"
    echo "    4. 点击安装 —— 系统自动建表、生成 .env 并重启后端"
    echo ""
    echo "  安装向导完成后，后端会自动重启加载新配置，无需手动操作"
    echo ""
    echo "---------------------------------------------"
    echo "常用运维命令:"
    echo "---------------------------------------------"
    echo -e "  ${BLUE}pm2 status${NC}                      # 查看后端状态"
    echo -e "  ${BLUE}pm2 restart ${APP_NAME}${NC}         # 重启后端"
    echo -e "  ${BLUE}pm2 logs ${APP_NAME} --lines 50${NC} # 查看后端日志"
    echo -e "  ${BLUE}systemctl reload nginx${NC}          # 重载 Nginx"
    echo -e "  ${BLUE}sudo ./install.sh${NC}               # 再次运行本脚本（更新 + 重建）"
    echo ""
    echo "访问地址(安装向导完成后生效):"
    echo -e "  首页:       ${GREEN}http://${SERVER_IP}/${NC}"
    echo -e "  后台登录:   ${GREEN}http://${SERVER_IP}/admin/login${NC}"
    echo -e "  安装向导:   ${GREEN}http://${SERVER_IP}/setup${NC}"
    echo ""
}

# ==================== 主流程 ====================
main() {
    print_banner

    check_privilege
    check_and_install_environment

    # sync_code 返回 0 = 需要构建, 1 = 无需构建
    local need_build=true
    if sync_code; then
        need_build=true
    else
        need_build=false
    fi

    if [ "$need_build" = true ]; then
        build_backend
        build_frontend
        setup_pm2
        setup_nginx
    else
        log_step "构建 & 部署"
        log_success "代码未变更，跳过构建"

        # 确保 PM2 在运行
        cd "$PROJECT_DIR"
        if ! pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
            log_info "PM2 进程不存在，正在启动..."
            pm2 start ecosystem.config.cjs 2>/dev/null || \
                pm2 start "$API_DIR/dist/server.js" --name "${APP_NAME}"
            pm2 save
            log_success "PM2 已启动 ${APP_NAME}"
        else
            log_success "PM2 进程运行中"
        fi

        # 确保 Nginx 配置存在
        if [ "$SKIP_INSTALL" -eq 0 ] && [ ! -f /etc/nginx/sites-enabled/examhub ]; then
            setup_nginx
        else
            log_success "Nginx 配置已存在，跳过"
        fi
    fi

    print_summary
}

main "$@"

#!/bin/bash
# ============================================================
# KeKe-ExamHub 一键部署脚本
# GitHub: https://github.com/KeKe0904/KeKe-ExamHub
#
# 功能:
#   1. 检测运行环境 (Node.js / npm / PM2 / Nginx / MariaDB / Git)
#   2. 检查代码是否为 GitHub 最新版本，非最新则自动拉取
#   3. 安装依赖、构建前后端、初始化数据库
#   4. 配置 Nginx 反向代理 + PM2 进程守护
#
# 用法:
#   chmod +x install.sh && sudo ./install.sh
# ============================================================

set -euo pipefail

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ==================== 配置变量 ====================
PROJECT_DIR="${PROJECT_DIR:-/opt/examhub}"
GITHUB_REPO="https://github.com/KeKe0904/KeKe-ExamHub.git"
GITHUB_BRANCH="main"
REQUIRED_NODE_MAJOR="18"
API_PORT="${API_PORT:-3000}"
DOMAIN="${DOMAIN:-_}"           # _ 表示匹配所有域名
NGINX_CONF="/etc/nginx/sites-available/examhub"
NGINX_ENABLED="/etc/nginx/sites-enabled/examhub"
ENV_FILE="${PROJECT_DIR}/api/.env"
FRONTEND_ENV_FILE="${PROJECT_DIR}/.env"

# ==================== 日志函数 ====================
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[ OK ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}>>> $1${NC}"; }

# ==================== 工具函数 ====================
check_root() {
    if [[ "$(id -u)" -ne 0 ]]; then
        log_error "请使用 root 权限运行此脚本: sudo ./install.sh"
        exit 1
    fi
}

get_version_major() {
    echo "$1" | grep -oP '^\d+' || echo "0"
}

version_gte() {
    # 返回 0 表示 $1 >= $2
    printf '%s\n%s\n' "$2" "$1" | sort -V -C 2>/dev/null
}

# ==================== 步骤1: 基础环境检测 ====================
check_environment() {
    log_step "步骤1/6: 检测运行环境"
    local all_ok=true

    # --- Node.js ---
    if command -v node &>/dev/null; then
        local node_ver
        node_ver=$(node -v | sed 's/^v//')
        local node_major
        node_major=$(get_version_major "$node_ver")
        if [[ "$node_major" -ge "$REQUIRED_NODE_MAJOR" ]]; then
            log_success "Node.js v${node_ver} (>= v${REQUIRED_NODE_MAJOR}.x)"
        else
            log_error "Node.js v${node_ver} 版本过低，需要 >= v${REQUIRED_NODE_MAJOR}.x"
            all_ok=false
        fi
    else
        log_error "Node.js 未安装"
        all_ok=false
    fi

    # --- npm ---
    if command -v npm &>/dev/null; then
        local npm_ver
        npm_ver=$(npm -v)
        log_success "npm v${npm_ver}"
    else
        log_error "npm 未安装"
        all_ok=false
    fi

    # --- PM2 ---
    if command -v pm2 &>/dev/null; then
        local pm2_ver
        pm2_ver=$(pm2 -v)
        log_success "PM2 v${pm2_ver}"
    else
        log_warn "PM2 未安装（将自动安装）"
    fi

    # --- Nginx ---
    if command -v nginx &>/dev/null; then
        local nginx_ver
        nginx_ver=$(nginx -v 2>&1 | grep -oP 'nginx/\K[\d.]+')
        log_success "Nginx v${nginx_ver}"
    else
        log_warn "Nginx 未安装（将自动安装）"
    fi

    # --- MariaDB / MySQL ---
    if command -v mariadb &>/dev/null || command -v mysql &>/dev/null; then
        local db_cmd="mariadb"
        command -v mariadb &>/dev/null || db_cmd="mysql"
        local db_ver
        db_ver=$($db_cmd --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "MariaDB/MySQL v${db_ver}"
    else
        log_warn "MariaDB/MySQL 未安装（将自动安装）"
    fi

    # --- Git ---
    if command -v git &>/dev/null; then
        local git_ver
        git_ver=$(git --version | grep -oP '\d+\.\d+\.\d+')
        log_success "Git v${git_ver}"
    else
        log_error "Git 未安装"
        all_ok=false
    fi

    # --- curl ---
    if ! command -v curl &>/dev/null; then
        log_warn "curl 未安装（将自动安装）"
    fi

    if [[ "$all_ok" = false ]]; then
        log_error "关键依赖缺失，请先安装后再运行脚本"
        exit 1
    fi
}

# ==================== 步骤2: 安装缺失依赖 ====================
install_dependencies() {
    log_step "步骤2/6: 安装缺失依赖"

    # 检测包管理器
    local pkg_manager=""
    if command -v apt-get &>/dev/null; then
        pkg_manager="apt"
    elif command -v yum &>/dev/null; then
        pkg_manager="yum"
    elif command -v dnf &>/dev/null; then
        pkg_manager="dnf"
    fi

    if [[ -z "$pkg_manager" ]]; then
        log_warn "未检测到已知的包管理器，跳过系统依赖安装"
        return
    fi

    log_info "检测到包管理器: ${pkg_manager}"

    local install_cmd=""
    case "$pkg_manager" in
        apt)
            # 防止 apt lock 冲突
            while fuser /var/lib/dpkg/lock-frontend &>/dev/null; do
                log_warn "等待 apt 锁释放..."
                sleep 3
            done
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq
            install_cmd="apt-get install -y -qq"
            ;;
        yum) install_cmd="yum install -y -q" ;;
        dnf) install_cmd="dnf install -y -q" ;;
    esac

    # 安装缺失的包
    local missing_packages=()

    command -v curl &>/dev/null  || missing_packages+=("curl")
    command -v nginx &>/dev/null || missing_packages+=("nginx")

    if ! command -v mariadb &>/dev/null && ! command -v mysql &>/dev/null; then
        case "$pkg_manager" in
            apt) missing_packages+=("mariadb-server" "mariadb-client") ;;
            yum|dnf) missing_packages+=("mariadb-server") ;;
        esac
    fi

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        log_info "正在安装: ${missing_packages[*]}"
        $install_cmd "${missing_packages[@]}"
        log_success "系统依赖安装完成"
    else
        log_success "所有系统依赖已就绪"
    fi

    # --- 安装 PM2 ---
    if ! command -v pm2 &>/dev/null; then
        log_info "正在安装 PM2..."
        npm install -g pm2
        log_success "PM2 安装完成"
    fi

    # --- 启动服务 ---
    if command -v systemctl &>/dev/null; then
        # MariaDB
        if systemctl is-enabled mariadb &>/dev/null 2>&1 || systemctl is-enabled mysql &>/dev/null 2>&1; then
            systemctl start mariadb 2>/dev/null || systemctl start mysql 2>/dev/null || true
            log_success "MariaDB 已启动"
        fi
        # Nginx
        systemctl enable nginx 2>/dev/null || true
        systemctl start nginx 2>/dev/null || true
    fi
}

# ==================== 步骤3: 代码拉取 & 版本检查 ====================
sync_code() {
    log_step "步骤3/6: 代码同步（版本检查 + 自动更新）"

    local need_build=false

    if [[ -d "${PROJECT_DIR}/.git" ]]; then
        # --- 已有仓库：检查是否为最新版本 ---
        log_info "检测到已有仓库，正在检查更新..."
        cd "${PROJECT_DIR}"

        # 保存当前版本 hash
        local local_hash
        local_hash=$(git rev-parse HEAD 2>/dev/null || echo "")

        # 拉取远程引用（不合并）
        git fetch origin "${GITHUB_BRANCH}" --quiet 2>/dev/null || {
            log_warn "无法连接到 GitHub，跳过版本检查"
            return
        }

        # 获取远程最新 hash
        local remote_hash
        remote_hash=$(git rev-parse "origin/${GITHUB_BRANCH}" 2>/dev/null || echo "")

        if [[ -z "$remote_hash" ]]; then
            log_warn "无法获取远程版本信息，跳过更新"
            return
        fi

        if [[ "$local_hash" == "$remote_hash" ]]; then
            log_success "代码已是最新版本 (${local_hash:0:8})"
            # 检查是否已构建过
            if [[ ! -d "${PROJECT_DIR}/dist" ]] || [[ ! -d "${PROJECT_DIR}/api/dist" ]]; then
                log_warn "检测到构建产物缺失，将重新构建"
                need_build=true
            fi
        else
            log_warn "发现新版本！"
            log_info "  本地: ${local_hash:0:8}"
            log_info "  远程: ${remote_hash:0:8}"

            # 显示 commit log
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
        # --- 首次部署：克隆仓库 ---
        log_info "首次部署，正在克隆仓库..."
        local parent_dir
        parent_dir=$(dirname "${PROJECT_DIR}")
        mkdir -p "${parent_dir}"

        if [[ -d "${PROJECT_DIR}" ]]; then
            log_warn "${PROJECT_DIR} 已存在但非 Git 仓库，将备份后重新克隆"
            mv "${PROJECT_DIR}" "${PROJECT_DIR}.bak.$(date +%Y%m%d%H%M%S)"
        fi

        git clone --branch "${GITHUB_BRANCH}" "${GITHUB_REPO}" "${PROJECT_DIR}"
        cd "${PROJECT_DIR}"
        local hash
        hash=$(git rev-parse HEAD)
        log_success "代码克隆成功: ${hash:0:8}"
        need_build=true
    fi

    # 返回是否需要构建
    if [[ "$need_build" = true ]]; then
        return 0
    else
        return 1
    fi
}

# ==================== 步骤4: 环境变量配置 ====================
setup_env() {
    log_step "步骤4/6: 环境变量配置"

    # 后端 .env
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_info "创建后端 .env 配置文件..."
        cat > "${ENV_FILE}" << 'EOF'
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# MySQL 数据库配置（请根据实际情况修改）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=examhub

# JWT 配置（生产环境务必修改为随机字符串）
JWT_SECRET=examhub_jwt_secret_change_me
JWT_EXPIRES_IN=7d
EOF
        log_warn "请编辑 ${ENV_FILE} 修改数据库密码和 JWT 密钥！"
    else
        log_success "后端 .env 已存在，跳过创建"
    fi

    # 前端 .env
    if [[ ! -f "${FRONTEND_ENV_FILE}" ]]; then
        log_info "创建前端 .env 配置文件..."
        cat > "${FRONTEND_ENV_FILE}" << 'EOF'
VITE_API_BASE_URL=/api
EOF
        log_success "前端 .env 创建成功"
    else
        log_success "前端 .env 已存在，跳过创建"
    fi
}

# ==================== 步骤5: 构建 & 部署 ====================
build_and_deploy() {
    log_step "步骤5/6: 构建前后端"

    cd "${PROJECT_DIR}"

    # --- 前端 ---
    log_info "安装前端依赖..."
    npm ci --production=false 2>/dev/null || npm install
    log_success "前端依赖安装完成"

    log_info "构建前端..."
    npm run build
    log_success "前端构建完成 -> dist/"

    # --- 后端 ---
    log_info "安装后端依赖..."
    cd "${PROJECT_DIR}/api"
    npm ci --production=false 2>/dev/null || npm install
    log_success "后端依赖安装完成"

    log_info "构建后端..."
    npm run build
    log_success "后端构建完成 -> api/dist/"

    # --- 数据库初始化 ---
    log_info "初始化数据库表结构..."
    cd "${PROJECT_DIR}"
    local db_user="${DB_USER:-root}"
    local db_pass="${DB_PASSWORD:-}"

    if [[ -n "$db_pass" ]]; then
        mysql -u"${db_user}" -p"${db_pass}" < api/src/migrations/init.sql 2>/dev/null && \
            log_success "数据库表结构已初始化" || log_warn "数据库初始化失败（可能已存在或连接信息有误）"
    else
        # 尝试 root 免密 / socket 方式
        mysql -u"${db_user}" < api/src/migrations/init.sql 2>/dev/null && \
            log_success "数据库表结构已初始化" || log_warn "数据库初始化失败（可能已存在或连接信息有误）"
    fi

    # --- PM2 ---
    log_info "配置 PM2 进程守护..."
    local pm2_app="examhub-api"
    cd "${PROJECT_DIR}/api"

    if pm2 list 2>/dev/null | grep -q "${pm2_app}"; then
        pm2 restart "${pm2_app}"
        log_success "PM2 已重启 ${pm2_app}"
    else
        pm2 start dist/server.js --name "${pm2_app}" --interpreter node
        log_success "PM2 已启动 ${pm2_app}"
    fi

    pm2 save
    # 设置开机自启（仅首次）
    pm2 startup systemd 2>/dev/null || true
}

# ==================== 步骤6: Nginx 配置 ====================
setup_nginx() {
    log_step "步骤6/6: 配置 Nginx 反向代理"

    # 生成 Nginx 配置
    cat > "${NGINX_CONF}" << NGINX_EOF
# ExamHub Nginx 配置
# 生成时间: $(date)

server {
    listen 80;
    server_name ${DOMAIN};

    # 前端静态文件
    root ${PROJECT_DIR}/dist;
    index index.html;

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }

    # SPA 路由回退
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

    # 创建软链接
    ln -sf "${NGINX_CONF}" "${NGINX_ENABLED}"

    # 移除默认配置（如果有）
    rm -f /etc/nginx/sites-enabled/default

    # 测试配置并重载
    if nginx -t 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || nginx -s reload
        log_success "Nginx 配置已生效"
    else
        log_error "Nginx 配置测试失败，请检查 ${NGINX_CONF}"
        return 1
    fi
}

# ==================== 部署总结 ====================
print_summary() {
    local server_ip
    server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_SERVER_IP")

    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║          KeKe-ExamHub 部署完成！                      ║${NC}"
    echo -e "${GREEN}${BOLD}╠════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}${BOLD}║${NC}                                                       "
    echo -e "${GREEN}${BOLD}║${NC}  📍 前端地址:    http://${server_ip}"
    echo -e "${GREEN}${BOLD}║${NC}  🔌 API 地址:    http://${server_ip}/api/health"
    echo -e "${GREEN}${BOLD}║${NC}  🔧 安装向导:    http://${server_ip}/setup"
    echo -e "${GREEN}${BOLD}║${NC}  📂 项目目录:    ${PROJECT_DIR}"
    echo -e "${GREEN}${BOLD}║${NC}  ⚡ 进程管理:    pm2 status"
    echo -e "${GREEN}${BOLD}║${NC}                                                       "
    echo -e "${GREEN}${BOLD}║${NC}  ${YELLOW}⚠ 首次使用请访问 /setup 完成初始化配置${NC}         "
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ==================== 主流程 ====================
main() {
    echo ""
    echo -e "${BLUE}${BOLD}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}${BOLD}║   KeKe-ExamHub 一键部署脚本 v1.0.5    ║${NC}"
    echo -e "${BLUE}${BOLD}║   https://github.com/KeKe0904/KeKe-ExamHub  ║${NC}"
    echo -e "${BLUE}${BOLD}╚════════════════════════════════════════╝${NC}"
    echo ""

    check_root
    check_environment
    install_dependencies

    # sync_code 返回 0 表示需要构建，1 表示无需构建
    local need_build=true
    if sync_code; then
        need_build=true
    else
        need_build=false
    fi

    setup_env

    if [[ "$need_build" = true ]]; then
        build_and_deploy
        setup_nginx
    else
        log_step "构建 & 部署"
        log_success "代码未变更，跳过构建"

        # 确保 PM2 在运行
        cd "${PROJECT_DIR}/api"
        if ! pm2 list 2>/dev/null | grep -q "examhub-api"; then
            log_info "PM2 进程不存在，正在启动..."
            pm2 start dist/server.js --name "examhub-api" --interpreter node
            pm2 save
            log_success "PM2 已启动 examhub-api"
        else
            log_success "PM2 进程运行中"
        fi

        # 确保 Nginx 配置存在
        if [[ ! -f "${NGINX_CONF}" ]]; then
            setup_nginx
        else
            log_success "Nginx 配置已存在，跳过"
        fi
    fi

    print_summary
}

main "$@"

#!/bin/bash
# ============================================================================
#  █████   █   █   █████   █   █   █    █   █   █
#  █        █ █     █   █   █ █    █    █   █   █    K e K e   E x a m H u b
#  █  ███    █      █   █    █     █    █   █   █    考试信息管理系统
#  █   █    █ █     █   █   █ █    █    █   █   █
#  █████   █   █   █████   █   █   █████   █████
#
#  一键部署脚本 v4.0（重构版）
#  作者: 落梦陳 (KeKe0904) | GitHub: https://github.com/KeKe0904/KeKe-ExamHub
#  License: MIT
#
#  核心改进（相比 v3.x）：
#    1. 错误处理：set -Eeuo pipefail + trap，错误时输出诊断信息而非静默退出
#    2. 日志落盘：所有输出同时写入 /var/log/examhub-install.log
#    3. 幂等性：每步检查"是否已完成"，重复执行安全
#    4. 断点续传：--step <name> 从指定步骤开始
#    5. DNS 修复：用 [0-9] 替代 \d，显式查公共 DNS，CDN/NAT 场景提供强制选项
#    6. Nginx 修复：路径直接写入，不用占位符；配置失败时回滚
#
#  用法:
#    sudo ./install.sh                    标准部署（推荐）
#    sudo ./install.sh --force-build      强制重新构建
#    sudo ./install.sh --skip-update      跳过 git pull
#    sudo ./install.sh --skip-db-init     跳过数据库初始化
#    sudo ./install.sh --step nginx       从 Nginx 配置步骤开始
#    sudo ./install.sh --help             显示帮助
# ============================================================================

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

# ============================================================================
# 全局变量与常量
# ============================================================================
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$PROJECT_DIR/api"
APP_NAME="examhub-api"
GITHUB_REPO="https://github.com/KeKe0904/KeKe-ExamHub.git"
GITHUB_BRANCH="main"
REQUIRED_NODE_MAJOR="18"
TARGET_NODE_MAJOR="20"
LOG_FILE="/var/log/examhub-install.log"
DOMAIN_CONFIG_FILE="/tmp/examhub_domain_config.conf"

# 命令行参数
FORCE_BUILD=false
SKIP_UPDATE=false
SKIP_DB_INIT=false
START_STEP=""

# 运行时状态（非 const，会被各步骤读写）
SKIP_INSTALL=0
SERVER_IP=""
DOMAIN=""
SSL_MODE="none"
SSL_CERT_PATH=""
SSL_KEY_PATH=""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# 日志函数（同时输出到终端和日志文件）
# ============================================================================
_init_log() {
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    touch "$LOG_FILE" 2>/dev/null || true
    echo "===== ExamHub 部署开始 $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG_FILE"
}

log_info()    { echo -e "${BLUE}[信息]${NC}  $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[成功]${NC} $1" | tee -a "$LOG_FILE"; }
log_warn()    { echo -e "${YELLOW}[警告]${NC} $1" | tee -a "$LOG_FILE"; }
log_error()   { echo -e "${RED}[错误]${NC} $1" | tee -a "$LOG_FILE" >&2; }
log_step()    {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${CYAN}${BOLD}════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}${BOLD}  $1${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}${BOLD}════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}
log_detail()  { echo -e "    ${BLUE}├─${NC} $1" | tee -a "$LOG_FILE"; }
log_raw()     { tee -a "$LOG_FILE"; }  # 原样输出（用于命令的 stdout）

# ============================================================================
# 错误处理 trap
# ============================================================================
_on_error() {
    local exit_code=$?
    local line=$1
    echo "" | tee -a "$LOG_FILE"
    log_error "部署在行 $line 处失败（退出码 $exit_code）"
    log_error "完整日志: $LOG_FILE"
    log_error "可使用 --step <步骤名> 从指定步骤继续："
    log_error "  sudo ./install.sh --step env       # 从环境检测开始"
    log_error "  sudo ./install.sh --step database  # 从数据库配置开始"
    log_error "  sudo ./install.sh --step domain    # 从域名配置开始"
    log_error "  sudo ./install.sh --step build     # 从构建开始"
    log_error "  sudo ./install.sh --step pm2       # 从 PM2 配置开始"
    log_error "  sudo ./install.sh --step nginx     # 从 Nginx 配置开始"
    exit "$exit_code"
}
trap '_on_error $LINENO' ERR

# ============================================================================
# 工具函数
# ============================================================================
has() { command -v "$1" >/dev/null 2>&1; }

# 确认是否为 root
is_root() { [ "$(id -u)" -eq 0 ]; }

# ============================================================================
# 参数解析
# ============================================================================
parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --force-build)  FORCE_BUILD=true; shift ;;
            --skip-update)  SKIP_UPDATE=true; shift ;;
            --skip-db-init) SKIP_DB_INIT=true; shift ;;
            --step)
                START_STEP="$2"
                shift 2
                ;;
            --help|-h)
                cat << 'HELP_EOF'
KeKe ExamHub 一键部署脚本 v4.0

用法:
  sudo ./install.sh [选项]

选项:
  --force-build     强制重新构建
  --skip-update     跳过 git pull
  --skip-db-init    跳过数据库初始化
  --step <name>     从指定步骤开始（env/database/domain/build/pm2/nginx/firewall）
  --help, -h        显示帮助

示例:
  sudo ./install.sh                       # 标准部署
  sudo ./install.sh --step nginx          # 只重新配置 Nginx
  sudo ./install.sh --step build          # 只重新构建
HELP_EOF
                exit 0
                ;;
            *)
                log_warn "未知参数: $1（忽略）"
                shift
                ;;
        esac
    done

    # 校验 --step 参数
    if [ -n "$START_STEP" ]; then
        case "$START_STEP" in
            env|database|domain|build|pm2|nginx|firewall|summary) ;;
            *)
                log_error "无效的步骤名: $START_STEP"
                log_error "可选: env / database / domain / build / pm2 / nginx / firewall / summary"
                exit 1
                ;;
        esac
    fi
}

# ============================================================================
# Banner
# ============================================================================
print_banner() {
    echo ""
    echo -e "    ${CYAN}████   █   █   █████   █   █   █    █   █   █${NC}"
    echo -e "    ${CYAN}█       █ █     █   █   █ █    █    █   █   █${NC}  ${BOLD}K e K e   E x a m H u b${NC}"
    echo -e "    ${CYAN}█  ███   █      █   █    █     █    █   █   █${NC}  ${BOLD}考试信息管理系统${NC}"
    echo -e "    ${CYAN}█   █   █ █     █   █   █ █    █    █   █   █${NC}"
    echo -e "    ${CYAN}█████   █   █   █████   █   █   █████   █████${NC}"
    echo ""
    echo -e "    ${BLUE}一键部署脚本 v4.0（重构版）${NC}"
    echo -e "    ${BLUE}项目目录: ${PROJECT_DIR}${NC}"
    echo -e "    ${BLUE}日志文件: ${LOG_FILE}${NC}"
    echo ""
}

# ============================================================================
# 步骤 1: 环境检测与安装
# ============================================================================
check_privilege() {
    if is_root; then
        log_success "以 root 权限运行，将执行完整部署流程"
        SKIP_INSTALL=0
    else
        log_warn "当前非 root 用户，将跳过系统包安装和 Nginx 配置"
        SKIP_INSTALL=1
    fi
}

install_system_packages() {
    log_info "更新 apt 软件源索引..."
    # 等待 apt 锁
    local max_wait=30
    while [ $max_wait -gt 0 ]; do
        if fuser /var/lib/dpkg/lock-frontend &>/dev/null; then
            log_warn "等待 apt 锁释放...（剩余 $max_wait 秒）"
            sleep 3
            max_wait=$((max_wait - 3))
        else
            break
        fi
    done
    apt-get update -qq
    log_info "安装系统依赖: ca-certificates curl gnupg git nginx mariadb-server rsync ufw"
    apt-get install -y -qq ca-certificates curl gnupg git nginx mariadb-server rsync ufw 2>&1 | tail -3
    log_success "系统依赖包安装完成"
}

install_node() {
    log_info "安装 Node.js ${TARGET_NODE_MAJOR}.x LTS..."
    curl -fsSL "https://deb.nodesource.com/setup_${TARGET_NODE_MAJOR}.x" | bash -
    apt-get install -y -qq nodejs
    log_success "Node.js 安装完成: $(node -v)"
}

install_pm2() {
    log_info "安装 PM2 进程管理器..."
    npm install -g pm2@latest
    log_success "PM2 安装完成: v$(pm2 --version 2>/dev/null || echo '?')"
}

step_env() {
    log_step "步骤 1/8: 检测与安装运行环境"
    log_info "开始检测系统环境..."

    if [ "$SKIP_INSTALL" -eq 0 ]; then
        # 1.1 基础包
        log_info "检测系统基础包..."
        if ! has git || ! has nginx || ! has mysql || ! has systemctl; then
            log_detail "检测到缺少基础包，开始安装..."
            install_system_packages
        else
            log_success "基础包已安装: git / nginx / mariadb"
        fi

        # 1.2 Node.js
        log_info "检测 Node.js..."
        local node_needs_update=false
        if has node; then
            local node_major
            node_major=$(node -v | cut -dv -f2 | cut -d. -f1)
            if [ "$node_major" -ge "$TARGET_NODE_MAJOR" ]; then
                log_success "Node.js 已安装: $(node -v)"
            elif [ "$node_major" -ge "$REQUIRED_NODE_MAJOR" ]; then
                log_warn "Node.js $(node -v) 版本偏旧，升级中..."
                node_needs_update=true
            else
                log_warn "Node.js $(node -v) 版本过低（需 >= ${REQUIRED_NODE_MAJOR}），升级中..."
                node_needs_update=true
            fi
        else
            log_detail "Node.js 未安装"
            node_needs_update=true
        fi
        [ "$node_needs_update" = true ] && install_node

        # 1.3 npm
        log_info "升级 npm..."
        npm install -g npm@latest 2>/dev/null && log_success "npm: v$(npm -v)" || log_warn "npm 升级失败，继续使用 v$(npm -v 2>/dev/null || echo '?')"

        # 1.4 启动服务
        log_info "启动 MariaDB 和 Nginx..."
        systemctl enable --now mariadb 2>/dev/null || true
        systemctl enable --now nginx   2>/dev/null || true
        log_detail "MariaDB: $(systemctl is-active mariadb 2>/dev/null || echo '?')"
        log_detail "Nginx:   $(systemctl is-active nginx 2>/dev/null || echo '?')"

        # 1.5 PM2
        log_info "检测 PM2..."
        has pm2 || install_pm2
        has pm2 && log_success "PM2: v$(pm2 --version 2>/dev/null || echo '?')"

        # 1.6 MariaDB 安全提示
        log_info "检查 MariaDB root 密码..."
        local mysql_test
        mysql_test=$(mysql -u root -e "SELECT 1;" 2>&1 | head -1)
        if echo "$mysql_test" | grep -qi "error\|access denied"; then
            log_success "MariaDB root 已设置密码"
        else
            log_warn "MariaDB root 似乎无密码，建议执行: sudo mysql_secure_installation"
        fi
    else
        log_info "非 root 模式，仅检测..."
        for cmd in node npm mysql nginx pm2; do
            has "$cmd" && log_detail "已检测到: $cmd" || log_warn "未检测到: $cmd"
        done
    fi

    # 1.7 最终校验
    log_info "最终环境校验..."
    if ! has node; then
        log_error "Node.js 未安装，无法继续"
        exit 1
    fi
    local nm
    nm=$(node -v | cut -dv -f2 | cut -d. -f1)
    if [ "$nm" -lt "$REQUIRED_NODE_MAJOR" ]; then
        log_error "Node.js 版本需 >= ${REQUIRED_NODE_MAJOR}，当前 $(node -v)"
        exit 1
    fi
    log_success "环境就绪: Node $(node -v) / npm v$(npm -v)"
}

# ============================================================================
# 步骤 2: 交互式创建数据库
# ============================================================================
step_database() {
    log_step "步骤 2/8: 交互式创建数据库"

    if [ "$SKIP_DB_INIT" = true ]; then
        log_warn "已指定 --skip-db-init，跳过数据库创建"
        log_info "请确保数据库已手动创建完成"
        return 0
    fi

    if [ "$SKIP_INSTALL" -ne 0 ]; then
        log_warn "非 root 模式，跳过数据库创建"
        return 0
    fi

    log_info "MariaDB 已就绪，现在创建项目数据库和用户"
    log_info "所有字段都有默认值，直接回车使用默认（密码除外，必须填写）"

    # 收集数据库配置
    local db_name db_user db_pass
    read -p "数据库名 (默认 examhub): " db_name
    db_name="${db_name:-examhub}"
    read -p "数据库用户 (默认 examhub): " db_user
    db_user="${db_user:-examhub}"
    read -s -p "数据库密码 (必填): " db_pass
    echo ""
    while [ -z "$db_pass" ]; do
        log_error "密码不能为空"
        read -s -p "数据库密码 (必填): " db_pass
        echo ""
    done

    # 写入 .env 供后端使用（setup 向导会读取，避免重复输入）
    log_info "写入 api/.env 数据库配置..."
    cat > "$API_DIR/.env" << EOF
# 数据库配置（由 install.sh 生成）
DB_HOST=localhost
DB_PORT=3306
DB_USER=${db_user}
DB_PASSWORD=${db_pass}
DB_NAME=${db_name}

# JWT 配置（安装向导完成后会自动生成）
JWT_SECRET=

# 站点 URL（安装向导完成后会自动写入）
SITE_URL=

# 管理员账号（安装向导创建，此处不预设）
ADMIN_USERNAME=
ADMIN_PASSWORD=
EOF
    chmod 600 "$API_DIR/.env"
    log_detail "已写入 $API_DIR/.env"

    # 创建数据库和用户
    log_info "创建数据库和用户..."
    mysql -u root << SQL_EOF 2>&1 | log_raw
CREATE DATABASE IF NOT EXISTS \`${db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 如果用户已存在，先删除再创建（确保密码正确）
DROP USER IF EXISTS '${db_user}'@'localhost';
DROP USER IF EXISTS '${db_user}'@'127.0.0.1';
CREATE USER '${db_user}'@'localhost' IDENTIFIED BY '${db_pass}';
CREATE USER '${db_user}'@'127.0.0.1' IDENTIFIED BY '${db_pass}';
GRANT ALL PRIVILEGES ON \`${db_name}\`.* TO '${db_user}'@'localhost';
GRANT ALL PRIVILEGES ON \`${db_name}\`.* TO '${db_user}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL_EOF

    log_success "数据库 ${db_name} 和用户 ${db_user} 创建成功"
    log_warn "数据库配置已保存到 $API_DIR/.env（权限 600）"
}

# ============================================================================
# 步骤 3: 域名与 SSL 配置
# ============================================================================
# 辅助：写入"跳过域名"配置
_write_domain_skip() {
    cat > "$DOMAIN_CONFIG_FILE" << EOF
DOMAIN=
SSL_MODE=none
SSL_CERT_PATH=
SSL_KEY_PATH=
EOF
    chmod 600 "$DOMAIN_CONFIG_FILE"
}

# 获取服务器公网 IP（尝试多个服务，含国内可访问的）
_get_server_ip() {
    local ip=""
    for service in "https://ip.cip.cc" "https://myip.ipip.net" "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
        ip=$(curl -s --connect-timeout 5 --max-time 10 "$service" 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
        [ -n "$ip" ] && { echo "$ip"; return; }
    done
}

# 查询域名解析的所有 IPv4（先系统 DNS，再公共 DNS）
# 关键修复：用 [0-9] 替代 \d（GNU grep ERE 不支持 \d）
_resolve_domain() {
    local domain="$1"
    local ips=""

    # 系统默认 DNS
    if has dig; then
        ips=$(dig +short "$domain" A 2>/dev/null | grep -oE '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u | tr '\n' ' ')
    fi
    if [ -z "$ips" ] && has host; then
        ips=$(host "$domain" 2>/dev/null | grep 'has address' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort -u | tr '\n' ' ')
    fi

    # 系统 DNS 未命中，显式查公共 DNS（绕过本地缓存）
    if [ -z "$ips" ]; then
        for dns in 8.8.8.8 1.1.1.1 114.114.114.114 223.5.5.5; do
            if has dig; then
                ips=$(dig @"$dns" +short "$domain" A 2>/dev/null | grep -oE '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u | tr '\n' ' ')
                [ -n "$ips" ] && break
            fi
        done
    fi

    # 兜底
    if [ -z "$ips" ] && has getent; then
        ips=$(getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | grep -oE '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u | tr '\n' ' ')
    fi
    if [ -z "$ips" ] && has nslookup; then
        ips=$(nslookup "$domain" 2>/dev/null | grep -oE 'Address: ([0-9]{1,3}\.){3}[0-9]{1,3}' | awk '{print $2}' | grep -oE '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u | tr '\n' ' ')
    fi

    echo "$ips" | xargs
}

step_domain() {
    log_step "步骤 3/8: 域名与 SSL 配置"

    local has_domain
    read -p "是否配置访问域名？(y/N): " has_domain
    if [ "$has_domain" != "y" ] && [ "$has_domain" != "Y" ]; then
        log_warn "未配置域名，将使用 IP 访问"
        _write_domain_skip
        return 0
    fi

    while true; do
        echo ""
        local input_domain
        read -p "请输入域名（如 exam.example.com）: " input_domain
        if [ -z "$input_domain" ]; then
            log_error "域名不能为空"
            read -p "重新输入？(y/N): " retry
            [ "$retry" = "y" ] || [ "$retry" = "Y" ] || { _write_domain_skip; return 0; }
            continue
        fi

        log_info "正在检测域名解析: $input_domain"
        echo ""

        # 1. 获取服务器公网 IP
        log_detail "步骤 1/3: 获取服务器公网 IP..."
        SERVER_IP=$(_get_server_ip)
        if [ -n "$SERVER_IP" ]; then
            log_detail "  服务器公网 IP: ${GREEN}${SERVER_IP}${NC}"
        else
            log_warn "  外网 IP 检测服务均不可用"
        fi
        local lan_ips
        lan_ips=$(hostname -I 2>/dev/null | tr -s ' ' | sed 's/^ //;s/ $//')
        [ -n "$lan_ips" ] && log_detail "  服务器网卡 IP: $lan_ips"

        if [ -z "$SERVER_IP" ]; then
            echo ""
            log_warn "无法自动获取服务器公网 IP"
            log_info "请手动输入服务器公网 IP（直接回车将跳过 IP 比对，仅校验域名可解析）"
            read -p "服务器 IP: " SERVER_IP
        fi

        # 2. 查询域名解析
        log_detail "步骤 2/3: 查询域名 DNS 解析..."
        local resolved_ips
        resolved_ips=$(_resolve_domain "$input_domain")

        if [ -z "$resolved_ips" ]; then
            echo ""
            log_error "无法解析域名: $input_domain"
            log_error "  系统 DNS 和公共 DNS (8.8.8.8 / 1.1.1.1 / 114.114.114.114 / 223.5.5.5) 均未解析到记录"
            log_error "  可能原因：域名未配置 A 记录 / DNS 传播未完成 / 域名拼写错误"
            echo ""
            log_info "选项：[r] 重新输入  [f] 强制使用  [s] 跳过域名"
            local choice
            read -p "请选择 (r/f/s，默认 s): " choice
            case "${choice:-s}" in
                f|F)
                    log_warn "强制使用域名: $input_domain（跳过 DNS 校验）"
                    DOMAIN="$input_domain"
                    break
                    ;;
                r|R) continue ;;
                *)   _write_domain_skip; return 0 ;;
            esac
        fi

        log_detail "  域名解析到 IP: ${GREEN}${resolved_ips}${NC}"

        # 3. 比对
        local matched=false
        if [ -n "$SERVER_IP" ]; then
            for rip in $resolved_ips; do
                [ "$rip" = "$SERVER_IP" ] && { matched=true; break; }
            done
        else
            matched=true  # 没有服务器 IP 时，能解析就通过
        fi

        if [ "$matched" != "true" ]; then
            echo ""
            log_warn "域名解析 IP 与服务器 IP 不一致："
            log_warn "  域名解析到: ${YELLOW}${resolved_ips}${NC}"
            log_warn "  服务器 IP:  ${YELLOW}${SERVER_IP}${NC}"
            [ -n "$lan_ips" ] && log_warn "  网卡 IP:    ${YELLOW}${lan_ips}${NC}"
            log_warn "  可能原因："
            log_warn "    1. DNS 传播延迟（刚设置的 A 记录需几分钟到 48 小时）"
            log_warn "    2. 使用了 CDN（如 Cloudflare，域名解析到 CDN 节点）"
            log_warn "    3. 服务器在 NAT 后"
            log_warn "    4. A 记录指向了错误的 IP"
            echo ""
            log_info "选项：[r] 重新输入  [f] 强制使用  [s] 跳过域名"
            local choice
            read -p "请选择 (r/f/s，默认 s): " choice
            case "${choice:-s}" in
                f|F)
                    log_warn "强制使用域名: $input_domain（跳过 IP 比对）"
                    DOMAIN="$input_domain"
                    break
                    ;;
                r|R) continue ;;
                *)   _write_domain_skip; return 0 ;;
            esac
        fi

        log_success "域名 $input_domain 已正确解析到当前服务器"
        DOMAIN="$input_domain"
        break
    done

    # SSL 配置（只有配置了域名才询问）
    if [ -n "$DOMAIN" ]; then
        echo ""
        log_info "SSL 证书配置"
        log_info "  [1] 自动申请（Let's Encrypt，需要 80 端口可用）"
        log_info "  [2] 手动指定证书路径"
        log_info "  [3] 不配置 SSL（仅 HTTP）"
        local ssl_choice
        read -p "请选择 (1/2/3，默认 3): " ssl_choice
        case "${ssl_choice:-3}" in
            1)
                SSL_MODE="auto"
                log_detail "SSL 模式: 自动申请（Let's Encrypt）"
                ;;
            2)
                SSL_MODE="manual"
                read -p "证书文件路径 (fullchain.pem): " SSL_CERT_PATH
                read -p "私钥文件路径 (privkey.pem): " SSL_KEY_PATH
                if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
                    log_error "证书或私钥文件不存在，回退到无 SSL 模式"
                    SSL_MODE="none"
                else
                    log_detail "SSL 模式: 手动证书"
                fi
                ;;
            *)
                SSL_MODE="none"
                log_detail "SSL 模式: 不配置"
                ;;
        esac
    fi

    # 写入配置文件
    cat > "$DOMAIN_CONFIG_FILE" << EOF
DOMAIN=${DOMAIN}
SSL_MODE=${SSL_MODE}
SSL_CERT_PATH=${SSL_CERT_PATH}
SSL_KEY_PATH=${SSL_KEY_PATH}
EOF
    chmod 600 "$DOMAIN_CONFIG_FILE"
    log_success "域名配置已保存"
}

# ============================================================================
# 步骤 4: 代码同步
# ============================================================================
step_sync_code() {
    log_step "步骤 4/8: 代码同步"

    if [ "$SKIP_UPDATE" = true ]; then
        log_warn "已指定 --skip-update，跳过代码同步"
        return 0
    fi

    if [ ! -d "${PROJECT_DIR}/.git" ]; then
        log_warn "当前目录不是 Git 仓库，跳过版本检查"
        return 0
    fi

    log_success "检测到 Git 仓库"
    log_info "检查 GitHub 远程仓库更新..."

    local local_hash remote_hash
    local_hash=$(git rev-parse HEAD 2>/dev/null || echo "")

    log_detail "从 GitHub 拉取远程信息..."
    if ! git fetch origin "${GITHUB_BRANCH}" --quiet 2>/dev/null; then
        log_warn "无法连接 GitHub（网络问题），跳过更新"
        return 0
    fi

    remote_hash=$(git rev-parse "origin/${GITHUB_BRANCH}" 2>/dev/null || echo "")
    if [ -z "$remote_hash" ]; then
        log_warn "无法获取远程版本信息"
        return 0
    fi

    if [ "$local_hash" = "$remote_hash" ]; then
        log_success "代码已是最新版本（commit: ${local_hash:0:8}）"
    else
        log_warn "发现新版本！"
        log_info "本地: ${local_hash:0:8}"
        log_info "远程: ${remote_hash:0:8}"
        echo ""
        log_info "新增提交："
        git log --oneline "${local_hash}..origin/${GITHUB_BRANCH}" 2>/dev/null | log_raw || true
        echo ""

        # 自动暂存本地修改
        if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
            log_warn "检测到本地未提交修改，自动暂存..."
            git stash push -m "install.sh auto-stash $(date +%s)" 2>/dev/null || true
        fi

        log_info "更新到最新版本..."
        if git pull origin "${GITHUB_BRANCH}" --ff-only 2>/dev/null; then
            log_success "更新成功: $(git rev-parse --short HEAD)"
        else
            log_warn "快进合并失败，强制同步..."
            git reset --hard "origin/${GITHUB_BRANCH}"
            log_success "强制同步成功: $(git rev-parse --short HEAD)"
        fi
    fi
}

# ============================================================================
# 步骤 5: 构建前后端
# ============================================================================
step_build() {
    log_step "步骤 5/8: 构建前后端"

    # 判断是否需要构建
    local need_build=false
    if [ "$FORCE_BUILD" = true ]; then
        need_build=true
        log_warn "强制构建模式（--force-build）"
    elif [ ! -d "${PROJECT_DIR}/dist" ] || [ ! -d "${API_DIR}/dist" ]; then
        need_build=true
        log_info "检测到构建产物缺失，需要构建"
    else
        log_success "构建产物已存在"
        log_detail "如需强制重建，使用: sudo ./install.sh --force-build"
    fi

    if [ "$need_build" != "true" ]; then
        return 0
    fi

    # 构建后端
    log_info "构建后端 (TypeScript → JavaScript)..."
    cd "$API_DIR"
    log_detail "清理旧产物..."
    rm -rf dist

    log_info "安装后端依赖..."
    if ! npm install --no-audit --no-fund 2>&1 | tail -5 | log_raw; then
        log_error "后端依赖安装失败"
        return 1
    fi
    log_success "后端依赖安装完成"

    log_info "编译 TypeScript..."
    if ! npm run build 2>&1 | tail -10 | log_raw; then
        log_error "后端构建失败"
        return 1
    fi
    if [ ! -f "$API_DIR/dist/server.js" ]; then
        log_error "后端构建失败: dist/server.js 不存在"
        return 1
    fi
    log_success "后端构建完成"

    # 构建前端
    log_info "构建前端 (React → 静态文件)..."
    cd "$PROJECT_DIR"
    log_detail "清理旧产物..."
    rm -rf dist

    log_info "安装前端依赖..."
    if ! npm install --no-audit --no-fund 2>&1 | tail -5 | log_raw; then
        log_error "前端依赖安装失败"
        return 1
    fi
    log_success "前端依赖安装完成"

    log_info "构建前端生产版本..."
    if ! NODE_OPTIONS="--max-old-space-size=2048" npm run build 2>&1 | tail -15 | log_raw; then
        log_error "前端构建失败"
        return 1
    fi
    if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
        log_error "前端构建失败: dist/index.html 不存在"
        return 1
    fi
    log_detail "产物: dist/index.html ($(du -h "$PROJECT_DIR/dist/index.html" | cut -f1))"
    log_success "前端构建完成"

    cd "$PROJECT_DIR"
}

# ============================================================================
# 步骤 6: 配置 PM2
# ============================================================================
step_pm2() {
    log_step "步骤 6/8: 配置 PM2 进程守护"

    mkdir -p "$API_DIR/logs"

    # 生成 ecosystem.config.cjs
    log_info "生成 PM2 配置..."
    cat > "$PROJECT_DIR/ecosystem.config.cjs" << PM2_EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'dist/server.js',
    cwd: '${API_DIR}',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=512'
    },
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
    out_file: '${API_DIR}/logs/out.log',
    error_file: '${API_DIR}/logs/error.log',
    merge_logs: true,
    time: true,
    kill_timeout: 3000
  }]
};
PM2_EOF
    log_detail "PM2 配置: cwd=${API_DIR}, name=${APP_NAME}"

    # 启动或重启
    log_info "启动后端进程..."
    cd "$PROJECT_DIR"
    if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
        log_warn "${APP_NAME} 已在运行，重启..."
        pm2 restart "${APP_NAME}" --update-env
    else
        pm2 start ecosystem.config.cjs
    fi
    pm2 save
    log_success "PM2 进程已启动: ${APP_NAME}"

    # 日志轮转
    log_info "配置日志轮转..."
    pm2 install pm2-logrotate 2>/dev/null || true
    pm2 set pm2-logrotate:max_size 10M 2>/dev/null || true
    pm2 set pm2-logrotate:retain 7 2>/dev/null || true
    pm2 set pm2-logrotate:compress true 2>/dev/null || true

    # 开机自启
    if [ "$SKIP_INSTALL" -eq 0 ]; then
        log_info "配置 PM2 开机自启..."
        env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root 2>/dev/null || true
        pm2 save
        log_success "PM2 开机自启已配置"
    fi
    log_success "PM2 配置完成"

    cd "$PROJECT_DIR"
}

# ============================================================================
# 步骤 7: 配置 Nginx
# ============================================================================
# 生成 Nginx 配置的核心函数
# 参数：$1=配置文件路径 $2=root 目录 $3=域名(可空) $4=SSL模式 $5=证书路径 $6=私钥路径
_generate_nginx_conf() {
    local conf_file="$1"
    local root_dir="$2"
    local domain="$3"
    local ssl_mode="$4"
    local cert_path="$5"
    local key_path="$6"

    if [ -n "$domain" ] && [ "$ssl_mode" != "none" ]; then
        # ========== 情况 A: 有域名 + SSL ==========
        cat > "$conf_file" << NGINX_EOF
# 默认 server：捕获 IP 访问，返回 444
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    return 301 https://\$host\$request_uri;
}

# HTTPS 主服务
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${domain};

    ssl_certificate ${cert_path};
    ssl_certificate_key ${key_path};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root ${root_dir}/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript text/javascript application/xml+rss image/svg+xml;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_EOF
    elif [ -n "$domain" ]; then
        # ========== 情况 B: 有域名 + 无 SSL ==========
        cat > "$conf_file" << NGINX_EOF
# 默认 server：捕获 IP 访问，返回 444
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

# 主服务：仅 HTTP
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root ${root_dir}/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript text/javascript application/xml+rss image/svg+xml;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_EOF
    else
        # ========== 情况 C: 无域名（IP 访问）==========
        cat > "$conf_file" << NGINX_EOF
# 主服务：IP 访问，80 端口 catch-all
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root ${root_dir}/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript text/javascript application/xml+rss image/svg+xml;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_EOF
    fi
}

step_nginx() {
    log_step "步骤 7/8: 配置 Nginx 反向代理"

    if [ "$SKIP_INSTALL" -ne 0 ]; then
        log_warn "非 root 模式，跳过 Nginx 配置"
        log_warn "请手动配置 Nginx：前端根目录 $PROJECT_DIR/dist，API 代理 /api/ → 127.0.0.1:3000"
        return 0
    fi

    if [ ! -d /etc/nginx/sites-available ]; then
        log_error "Nginx 未安装或不是 Debian/Ubuntu 布局"
        return 1
    fi

    local nginx_conf="/etc/nginx/sites-available/examhub"
    local nginx_enabled="/etc/nginx/sites-enabled/examhub"

    # 读取域名配置
    local domain="" ssl_mode="none" cert_path="" key_path=""
    if [ -f "$DOMAIN_CONFIG_FILE" ]; then
        while IFS='=' read -r k v; do
            case "$k" in
                DOMAIN)        domain="$v" ;;
                SSL_MODE)      ssl_mode="$v" ;;
                SSL_CERT_PATH) cert_path="$v" ;;
                SSL_KEY_PATH)  key_path="$v" ;;
            esac
        done < "$DOMAIN_CONFIG_FILE"
    fi
    log_info "域名: ${domain:-（无）}, SSL: $ssl_mode"

    # auto 模式：生成占位证书
    if [ -n "$domain" ] && [ "$ssl_mode" = "auto" ]; then
        cert_path="$PROJECT_DIR/api/certs/$domain/fullchain.pem"
        key_path="$PROJECT_DIR/api/certs/$domain/privkey.pem"
        if [ ! -f "$cert_path" ] || [ ! -f "$key_path" ]; then
            log_info "生成占位自签名证书（稍后由 acme.sh 替换）..."
            mkdir -p "$PROJECT_DIR/api/certs/$domain"
            openssl req -x509 -newkey rsa:2048 -nodes \
                -keyout "$key_path" -out "$cert_path" \
                -days 1 -subj "/CN=$domain" 2>/dev/null || log_warn "openssl 生成占位证书失败"
        fi
    fi

    # 备份旧配置
    if [ -f "$nginx_conf" ]; then
        cp "$nginx_conf" "${nginx_conf}.bak.$(date +%s)"
        log_detail "已备份旧配置"
    fi

    # 生成配置
    log_info "生成 Nginx 配置: $nginx_conf"
    _generate_nginx_conf "$nginx_conf" "$PROJECT_DIR" "$domain" "$ssl_mode" "$cert_path" "$key_path"
    log_detail "Nginx root: ${PROJECT_DIR}/dist"

    # 启用站点
    ln -sf "$nginx_conf" "$nginx_enabled"
    rm -f /etc/nginx/sites-enabled/default

    # 语法检查
    log_info "Nginx 语法检查..."
    if ! nginx -t 2>&1 | log_raw; then
        log_error "Nginx 语法检查失败"
        log_error "配置文件: $nginx_conf"
        log_warn "正在回滚到备份..."
        [ -f "${nginx_conf}.bak.$(date +%s)" ] && mv "${nginx_conf}.bak.$(date +%s)" "$nginx_conf"
        return 1
    fi
    log_success "Nginx 语法检查通过"

    # 重载
    log_info "重载 Nginx..."
    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null
    log_success "Nginx 配置完成并已重载"

    # 自动申请 SSL 证书
    if [ "$ssl_mode" = "auto" ] && [ -n "$domain" ]; then
        log_info "通过 acme.sh 自动申请 SSL 证书..."
        local acme_sh="/root/.acme.sh/acme.sh"
        local final_cert="$PROJECT_DIR/api/certs/$domain/fullchain.pem"
        local final_key="$PROJECT_DIR/api/certs/$domain/privkey.pem"

        # 安装 acme.sh
        if [ ! -f "$acme_sh" ]; then
            log_info "安装 acme.sh..."
            curl -s https://get.acme.sh | sh -s email=admin@${domain} 2>&1 | tail -3 | log_raw
        fi

        # 临时停止 Nginx 释放 80 端口
        log_warn "临时停止 Nginx 以释放 80 端口..."
        systemctl stop nginx 2>/dev/null

        if "$acme_sh" --issue -d "$domain" --standalone 2>&1 | tail -10 | log_raw; then
            log_success "证书申请成功，安装..."
            "$acme_sh" --install-cert -d "$domain" \
                --key-file "$final_key" \
                --fullchain-file "$final_cert" \
                --reloadcmd "echo 'cert installed'" 2>&1 | tail -3 | log_raw
            chmod 644 "$final_cert"
            chmod 600 "$final_key"
            log_success "SSL 证书已安装"
        else
            log_error "acme.sh 申请证书失败"
            log_warn "保留占位自签名证书，浏览器会标记为不安全"
            log_info "稍后可通过后台「域名管理」上传真实证书"
        fi

        log_info "重新启动 Nginx..."
        systemctl start nginx 2>/dev/null
        systemctl reload nginx 2>/dev/null
    fi
}

# ============================================================================
# 步骤 8: 防火墙
# ============================================================================
step_firewall() {
    log_step "步骤 8/8: 防火墙配置"

    if [ "$SKIP_INSTALL" -ne 0 ]; then
        log_warn "非 root 模式，跳过防火墙配置"
        return 0
    fi

    if ! has ufw; then
        log_warn "ufw 未安装，跳过防火墙配置"
        return 0
    fi

    log_info "配置防火墙规则..."
    ufw allow 22/tcp   2>/dev/null || true  # SSH
    ufw allow 80/tcp   2>/dev/null || true  # HTTP
    ufw allow 443/tcp  2>/dev/null || true  # HTTPS

    # 启用 ufw（如果未启用）
    if ! ufw status | grep -q "Status: active"; then
        log_info "启用 ufw 防火墙..."
        echo "y" | ufw enable 2>/dev/null
    fi

    log_success "防火墙规则已配置（22/80/443）"
    log_detail "当前规则："
    ufw status 2>/dev/null | grep -E '^(22|80|443)' | while read -r line; do
        log_detail "  $line"
    done
}

# ============================================================================
# 部署总结
# ============================================================================
step_summary() {
    log_step "部署完成"

    # 获取最终配置
    local domain="" ssl_mode="none"
    if [ -f "$DOMAIN_CONFIG_FILE" ]; then
        while IFS='=' read -r k v; do
            case "$k" in
                DOMAIN)   domain="$v" ;;
                SSL_MODE) ssl_mode="$v" ;;
            esac
        done < "$DOMAIN_CONFIG_FILE"
    fi

    # 确定访问地址
    local access_host access_proto
    if [ -n "$domain" ]; then
        access_host="$domain"
        if [ "$ssl_mode" != "none" ]; then
            access_proto="https"
        else
            access_proto="http"
        fi
    else
        access_host="${SERVER_IP:-<服务器IP>}"
        access_proto="http"
    fi

    echo ""
    echo -e "    ${GREEN}${BOLD}════════════════════════════════════════${NC}"
    echo -e "    ${GREEN}${BOLD}  部署成功！${NC}"
    echo -e "    ${GREEN}${BOLD}════════════════════════════════════════${NC}"
    echo ""
    echo -e "    ${BLUE}访问地址:${NC}"
    echo -e "      ${BOLD}${access_proto}://${access_host}${NC}"
    if [ -n "$domain" ]; then
        echo -e "      ${YELLOW}（已配置域名，必须使用域名访问，IP 直连将被 Nginx 拒绝）${NC}"
    fi
    echo ""
    echo -e "    ${BLUE}安装向导:${NC}"
    echo -e "      ${BOLD}${access_proto}://${access_host}/setup${NC}"
    if [ -n "$domain" ]; then
        echo -e "      ${YELLOW}（已配置域名，必须使用域名访问 /setup）${NC}"
    fi
    echo ""
    echo -e "    ${BLUE}管理后台:${NC}"
    echo -e "      ${access_proto}://${access_host}/admin/login"
    echo ""
    echo -e "    ${BLUE}常用命令:${NC}"
    echo -e "      pm2 status                      查看进程状态"
    echo -e "      pm2 logs ${APP_NAME}            查看后端日志"
    echo -e "      pm2 restart ${APP_NAME}         重启后端"
    echo -e "      systemctl reload nginx          重载 Nginx"
    echo -e "      cat ${LOG_FILE}                 查看部署日志"
    echo ""
    echo -e "    ${BLUE}下一步:${NC}"
    echo -e "      1. 访问安装向导完成初始化: ${access_proto}://${access_host}/setup"
    echo -e "      2. 登录管理后台发布考试信息: ${access_proto}://${access_host}/admin/login"
    echo ""
}

# ============================================================================
# 主流程
# ============================================================================
main() {
    parse_args "$@"
    _init_log
    print_banner

    # 权限检查（不强制 root，但会设置 SKIP_INSTALL）
    check_privilege

    # 步骤列表（用于 --step 跳转）
    local steps=(
        "env:step_env"
        "database:step_database"
        "domain:step_domain"
        "sync:step_sync_code"
        "build:step_build"
        "pm2:step_pm2"
        "nginx:step_nginx"
        "firewall:step_firewall"
        "summary:step_summary"
    )

    # 如果指定了 --step，从该步骤开始
    if [ -n "$START_STEP" ]; then
        log_warn "断点续传模式：从步骤 '${START_STEP}' 开始"
        local found=false
        for entry in "${steps[@]}"; do
            local name="${entry%%:*}"
            local func="${entry##*:}"
            if [ "$name" = "$START_STEP" ]; then
                found=true
            fi
            if [ "$found" = "true" ]; then
                "$func"
            fi
        done
        if [ "$found" != "true" ]; then
            log_error "未找到步骤: $START_STEP"
            exit 1
        fi
        return
    fi

    # 标准流程：依次执行所有步骤
    for entry in "${steps[@]}"; do
        local func="${entry##*:}"
        "$func"
    done
}

main "$@"

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

const execAsync = promisify(exec);

// ES 模块兼容：手动定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录（api 目录的上一级）
const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const API_ROOT = path.resolve(__dirname, "../../");

// 命令执行超时时间（毫秒）
const CMD_TIMEOUT = 30000;
// 长任务超时时间（重装等）
const LONG_TIMEOUT = 300000;

// 预解析关键命令的绝对路径
let NPM_BIN = "npm";
let NODE_BIN = "node";
let PM2_BIN = "pm2";
let GIT_BIN = "git";
let NGINX_BIN = "nginx";

// 在模块加载时解析命令路径
(async () => {
  try {
    const which = promisify(execFile);
    const resolvePath = async (name: string, fallback: string): Promise<string> => {
      try {
        const { stdout } = await which("which", [name], { timeout: 5000 });
        const p = stdout.trim();
        return p || fallback;
      } catch {
        return fallback;
      }
    };
    NPM_BIN = await resolvePath("npm", "/usr/bin/npm");
    NODE_BIN = await resolvePath("node", "/usr/bin/node");
    PM2_BIN = await resolvePath("pm2", "/usr/bin/pm2");
    GIT_BIN = await resolvePath("git", "/usr/bin/git");
    NGINX_BIN = await resolvePath("nginx", "/usr/sbin/nginx");
  } catch { /* 使用默认值 */ }
})();

// 安全执行命令（带超时）
async function safeExec(
  command: string,
  timeout: number = CMD_TIMEOUT,
  throwOnError: boolean = false
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        PATH: `${path.join(PROJECT_ROOT, "node_modules", ".bin")}:${path.join(API_ROOT, "node_modules", ".bin")}:${process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}`,
        NODE_ENV: "", // 覆盖 production，确保 npm install 安装 devDependencies
      },
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    // 超时
    if (error.killed || error.signal === "SIGTERM") {
      throw new Error("命令执行超时");
    }
    // throwOnError 模式下，将非零退出码视为错误
    if (throwOnError) {
      const errMsg = error.stderr?.trim() || error.stdout?.trim() || error.message;
      throw new Error(`命令执行失败 (退出码 ${error.code}): ${errMsg}`);
    }
    // 默认模式：返回错误输出
    return {
      stdout: error.stdout?.trim() || "",
      stderr: error.stderr?.trim() || error.message,
    };
  }
}

// 安全读取 JSON 文件
function readJsonFile(filePath: string): any | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 获取 Node.js 版本
async function getNodeVersion(): Promise<{ version: string; path: string }> {
  try {
    const { stdout } = await safeExec("node --version");
    const { stdout: nodePath } = await safeExec("which node");
    return { version: stdout || "未知", path: nodePath || "未知" };
  } catch {
    return { version: "未安装", path: "" };
  }
}

// 获取 npm 版本
async function getNpmVersion(): Promise<{ version: string; path: string }> {
  try {
    const { stdout } = await safeExec("npm --version");
    const { stdout: npmPath } = await safeExec("which npm");
    return { version: stdout || "未知", path: npmPath || "未知" };
  } catch {
    return { version: "未安装", path: "" };
  }
}

// 获取 PM2 版本及进程信息
async function getPm2Info(): Promise<{
  version: string;
  path: string;
  processes: Array<{ name: string; status: string; uptime: string; memory: string }>;
}> {
  try {
    const { stdout } = await safeExec("pm2 --version");
    const { stdout: pm2Path } = await safeExec("which pm2");

    // 获取 PM2 进程列表
    let processes: Array<{ name: string; status: string; uptime: string; memory: string }> = [];
    try {
      const { stdout: listOutput } = await safeExec("pm2 jlist");
      const list = JSON.parse(listOutput);
      processes = list.map((p: any) => ({
        name: p.name || "未知",
        status: p.pm2_env?.status || "未知",
        uptime: formatPm2Uptime(p.pm2_env?.pm_uptime),
        memory: formatBytes(p.monit?.memory || 0),
      }));
    } catch {
      // ignore
    }

    return { version: stdout || "未安装", path: pm2Path || "未知", processes };
  } catch {
    return { version: "未安装", path: "", processes: [] };
  }
}

// 获取 Nginx 版本及状态
async function getNginxInfo(): Promise<{
  version: string;
  path: string;
  status: string;
  configFile: string;
}> {
  try {
    const { stdout } = await safeExec("nginx -v 2>&1");
    const { stdout: nginxPath } = await safeExec("which nginx");
    const { stdout: status } = await safeExec("systemctl is-active nginx 2>/dev/null || echo 'unknown'");

    let configFile = "";
    try {
      const { stdout: confPath } = await safeExec("nginx -t 2>&1 | grep -oP 'configuration file \\K[^ ]+' | head -1");
      configFile = confPath;
    } catch {
      // ignore
    }

    return {
      version: stdout.replace("nginx version: ", "") || "未安装",
      path: nginxPath || "未知",
      status: status.trim() === "active" ? "运行中" : status.trim() === "inactive" ? "已停止" : status.trim() || "未知",
      configFile,
    };
  } catch {
    return { version: "未安装", path: "", status: "未知", configFile: "" };
  }
}

// 获取 MySQL/MariaDB 版本
async function getMysqlInfo(): Promise<{
  version: string;
  type: string;
  status: string;
}> {
  try {
    // 尝试 MariaDB
    const { stdout: mariadbVer } = await safeExec("mariadb --version 2>/dev/null");
    if (mariadbVer) {
      const { stdout: status } = await safeExec("systemctl is-active mariadb 2>/dev/null || systemctl is-active mysql 2>/dev/null || echo 'unknown'");
      return {
        version: mariadbVer,
        type: "MariaDB",
        status: status.trim() === "active" ? "运行中" : status.trim() || "未知",
      };
    }

    // 尝试 MySQL
    const { stdout: mysqlVer } = await safeExec("mysql --version 2>/dev/null");
    if (mysqlVer) {
      const { stdout: status } = await safeExec("systemctl is-active mysql 2>/dev/null || echo 'unknown'");
      return {
        version: mysqlVer,
        type: "MySQL",
        status: status.trim() === "active" ? "运行中" : status.trim() || "未知",
      };
    }

    return { version: "未安装", type: "未知", status: "未知" };
  } catch {
    return { version: "未安装", type: "未知", status: "未知" };
  }
}

// 获取 Git 信息
async function getGitInfo(): Promise<{
  version: string;
  branch: string;
  commit: string;
  remoteUrl: string;
}> {
  try {
    const { stdout: version } = await safeExec("git --version");
    const { stdout: branch } = await safeExec("git rev-parse --abbrev-ref HEAD 2>/dev/null");
    const { stdout: commit } = await safeExec("git rev-parse --short HEAD 2>/dev/null");
    const { stdout: remoteUrl } = await safeExec("git config --get remote.origin.url 2>/dev/null");

    return {
      version: version || "未安装",
      branch: branch || "未知",
      commit: commit || "未知",
      remoteUrl: remoteUrl || "未配置",
    };
  } catch {
    return { version: "未安装", branch: "", commit: "", remoteUrl: "" };
  }
}

// 获取系统包管理器信息
async function getSystemInfo(): Promise<{
  hostname: string;
  platform: string;
  distro: string;
  release: string;
  kernel: string;
  arch: string;
  uptime: string;
}> {
  let distro = "未知";
  let release = "未知";

  try {
    if (fs.existsSync("/etc/os-release")) {
      const osRelease = fs.readFileSync("/etc/os-release", "utf-8");
      const match = osRelease.match(/^PRETTY_NAME="(.+)"/m);
      if (match) distro = match[1];
      const releaseMatch = osRelease.match(/^VERSION_ID="(.+)"/m);
      if (releaseMatch) release = releaseMatch[1];
    }
  } catch {
    // ignore
  }

  const uptimeSeconds = os.uptime();
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    distro,
    release,
    kernel: os.release(),
    arch: os.arch(),
    uptime: formatUptime(uptimeSeconds),
  };
}

// 获取项目信息（优先读取 project.config.json，回退到 package.json）
function getProjectInfo(): {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  repository: string;
  nodeVersion: string;
  dependencies: number;
  devDependencies: number;
  apiVersion: string;
  apiDependencies: number;
  apiDevDependencies: number;
  frontendFramework: string;
  backendFramework: string;
  techStack: { frontend: string[]; backend: string[]; deploy: string[] };
} {
  // 优先读取 project.config.json（项目元信息文件）
  const projectConfig = readJsonFile(path.join(PROJECT_ROOT, "project.config.json"));
  const pkg = readJsonFile(path.join(PROJECT_ROOT, "package.json"));
  const apiPkg = readJsonFile(path.join(API_ROOT, "package.json"));

  // 从 project.config.json 获取展示信息，从 package.json 获取依赖统计
  const config = projectConfig || {};
  const frontendConfig = config.frontend || {};
  const backendConfig = config.backend || {};

  return {
    name: config.name || pkg?.name || "examhub",
    displayName: config.displayName || config.name || pkg?.name || "ExamHub",
    version: config.version || pkg?.version || "未知",
    description: config.description || pkg?.description || "",
    author: typeof config.author === "object" ? config.author?.name : config.author || pkg?.author || "未知",
    license: config.license || pkg?.license || "未指定",
    homepage: config.homepage || config.repository?.url || "",
    repository: config.repository?.url || pkg?.repository?.url || "未配置",
    nodeVersion: frontendConfig.nodeVersion || pkg?.engines?.node || "未指定",
    dependencies: Object.keys(pkg?.dependencies || {}).length,
    devDependencies: Object.keys(pkg?.devDependencies || {}).length,
    apiVersion: backendConfig.version || apiPkg?.version || "未知",
    apiDependencies: Object.keys(apiPkg?.dependencies || {}).length,
    apiDevDependencies: Object.keys(apiPkg?.devDependencies || {}).length,
    frontendFramework: frontendConfig.framework || "React + TypeScript + Vite",
    backendFramework: backendConfig.framework || "Fastify + TypeScript",
    techStack: config.techStack || { frontend: [], backend: [], deploy: [] },
  };
}

// 获取磁盘空间
async function getDiskSpace(): Promise<{
  total: string;
  used: string;
  available: string;
  usage: number;
}> {
  try {
    const { stdout } = await safeExec("df -h / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    return {
      total: parts[1] || "未知",
      used: parts[2] || "未知",
      available: parts[3] || "未知",
      usage: parseInt(parts[4]?.replace("%", "")) || 0,
    };
  } catch {
    return { total: "未知", used: "未知", available: "未知", usage: 0 };
  }
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  return parts.join(" ") || "刚启动";
}

// 格式化 PM2 运行时间
function formatPm2Uptime(timestamp: number | undefined): string {
  if (!timestamp) return "未知";
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) return "未知";
  return formatUptime(Math.floor(diff / 1000));
}

// 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;
  if (gb >= 1) return `${(gb).toFixed(2)} GB`;
  if (mb >= 1) return `${(mb).toFixed(2)} MB`;
  return `${(kb).toFixed(2)} KB`;
}

// 检查文件/目录是否存在
function checkPath(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

// 从版本字符串中提取纯版本号（去除 v 前缀和后缀信息）
function extractVersion(raw: string): string {
  if (!raw) return "";
  // 匹配版本号模式：v1.2.3 / 1.2.3 / version 1.2.3 等
  const match = raw.match(/v?(\d+\.\d+\.\d+)/);
  return match ? match[1] : raw.replace(/^v/, "").trim();
}

// 比较两个语义化版本号
// 返回: 1 表示 v1 > v2, -1 表示 v1 < v2, 0 表示相等
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map((n) => parseInt(n) || 0);
  const parts2 = v2.split(".").map((n) => parseInt(n) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

// 获取 npm 包的最新版本（通过 npm view）
async function getNpmLatestVersion(pkgName: string): Promise<string> {
  try {
    const { stdout } = await safeExec(`npm view ${pkgName} version 2>/dev/null`, CMD_TIMEOUT);
    return extractVersion(stdout) || "未知";
  } catch {
    return "未知";
  }
}

// 获取 Node.js LTS 最新版本（通过 nodejs.org 官方 API）
async function getNodeLatestLTS(): Promise<string> {
  try {
    // 优先尝试 nodejs.org/dist/index.json 获取 LTS 版本
    const { stdout } = await safeExec(
      'curl -s "https://nodejs.org/dist/index.json" --max-time 10 2>/dev/null',
      CMD_TIMEOUT
    );
    const list = JSON.parse(stdout);
    if (Array.isArray(list)) {
      // index.json 中 LTS 版本的 lts 字段是代号字符串（如 "Krypton"），非 LTS 是 false
      // 用 typeof 严格检查，避免 null/undefined 被误判
      const lts = list.find((item: any) => typeof item.lts === "string" && item.lts);
      if (lts) {
        const version = extractVersion(lts.version);
        // 白名单校验：仅允许已知的 Node.js LTS 主版本号
        // 防止上游被劫持时返回异常版本号导致 curl|bash 执行恶意代码
        const major = parseInt(version.split(".")[0]);
        const KNOWN_LTS_MAJORS = [18, 20, 22, 24]; // Iron, Hydrogen, Jod, Krypton
        if (!KNOWN_LTS_MAJORS.includes(major)) {
          console.error(`[security] 检测到未知 LTS 主版本: ${major}，拒绝升级`);
          return "未知";
        }
        return version;
      }
    }
    return "未知";
  } catch {
    // 回退：尝试 apt-cache policy（系统包版本，可能不是最新）
    try {
      const { stdout } = await safeExec("apt-cache policy nodejs 2>/dev/null | grep Candidate | awk '{print $2}'", CMD_TIMEOUT);
      return extractVersion(stdout) || "未知";
    } catch {
      return "未知";
    }
  }
}

// 获取系统包的最新候选版本（通过 apt-cache policy）
async function getAptLatestVersion(pkgName: string): Promise<string> {
  try {
    const { stdout } = await safeExec(
      `apt-cache policy ${pkgName} 2>/dev/null | grep Candidate | awk '{print $2}'`,
      CMD_TIMEOUT
    );
    return extractVersion(stdout) || "未知";
  } catch {
    return "未知";
  }
}

// 环境管理路由
export default async function environmentRoutes(app: FastifyInstance) {
  // 所有路由都需要认证
  app.addHook("onRequest", authMiddleware);

  // ========== 获取服务器环境信息 ==========
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [node, npm, pm2, nginx, mysql, git, system, disk] = await Promise.all([
        getNodeVersion(),
        getNpmVersion(),
        getPm2Info(),
        getNginxInfo(),
        getMysqlInfo(),
        getGitInfo(),
        getSystemInfo(),
        getDiskSpace(),
      ]);

      const project = getProjectInfo();

      // 检查关键目录是否存在
      const paths = {
        projectRoot: PROJECT_ROOT,
        frontendDist: checkPath(path.join(PROJECT_ROOT, "dist")),
        backendDist: checkPath(path.join(API_ROOT, "dist")),
        envFile: checkPath(path.join(API_ROOT, ".env")),
        nodeModules: checkPath(path.join(PROJECT_ROOT, "node_modules")),
        apiNodeModules: checkPath(path.join(API_ROOT, "node_modules")),
      };

      return reply.send(
        successResponse({
          system,
          node,
          npm,
          pm2,
          nginx,
          mysql,
          git,
          project,
          disk,
          paths,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send(errorResponse(`获取环境信息失败: ${error.message}`));
    }
  });

  // ========== 更新环境组件 ==========
  app.post(
    "/update",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { component } = request.body as { component: string };

        if (!component) {
          return reply.status(400).send(errorResponse("请指定要更新的组件", "MISSING_COMPONENT"));
        }

        let command = "";
        let message = "";
        let log = "";

        switch (component) {
          case "npm-packages":
            // 更新项目 npm 依赖
            message = "更新项目依赖";
            command = `${NPM_BIN} update`;
            {
              const { stdout, stderr } = await safeExec(command, LONG_TIMEOUT);
              log = stdout + (stderr ? `\n${stderr}` : "");
            }
            // 同时更新后端依赖
            {
              const { stdout: apiOut, stderr: apiErr } = await safeExec(`cd api && ${NPM_BIN} update`, LONG_TIMEOUT);
              log += `\n--- 后端依赖 ---\n${apiOut}${apiErr ? `\n${apiErr}` : ""}`;
            }
            break;

          case "node": {
            // 升级 Node.js 到最新 LTS（通过 NodeSource 源切换）
            message = "升级 Node.js";
            // 1. 获取当前 Node.js 主版本号
            const { stdout: currentVer } = await safeExec("node --version", CMD_TIMEOUT);
            const currentMajor = parseInt(currentVer.replace("v", "").split(".")[0]) || 0;

            // 2. 获取最新 LTS 版本号
            const latestLts = await getNodeLatestLTS();
            const targetMajor = parseInt(latestLts.split(".")[0]) || 0;

            if (targetMajor <= currentMajor) {
              log = `当前 Node.js ${currentVer} 已是最新 LTS 或更新，无需升级。`;
              break;
            }

            log = `当前: ${currentVer.trim()} → 目标: v${latestLts} (LTS)\n`;

            // 3. 切换 NodeSource 源到目标主版本
            log += `--- 切换 NodeSource 源到 node_${targetMajor}.x ---\n`;
            {
              const { stdout: srcOut, stderr: srcErr } = await safeExec(
                `curl -fsSL https://deb.nodesource.com/setup_${targetMajor}.x | bash - 2>&1`,
                LONG_TIMEOUT
              );
              log += srcOut + (srcErr ? `\n${srcErr}` : "");
            }

            // 4. apt 安装新版 Node.js
            log += `\n--- apt 安装 nodejs ---\n`;
            {
              const { stdout: instOut, stderr: instErr } = await safeExec(
                "apt-get install -y nodejs 2>&1",
                LONG_TIMEOUT
              );
              log += instOut + (instErr ? `\n${instErr}` : "");
            }

            // 5. 验证版本
            const { stdout: newVer } = await safeExec("node --version", CMD_TIMEOUT);
            log += `\n--- 验证 ---\n新版本: ${newVer.trim()}\n`;

            // 6. 延迟重启 PM2（Node.js 升级后必须重启进程）
            spawn("sh", ["-c", "sleep 2 && cd /opt/examhub && pm2 restart examhub-api 2>&1"], {
              detached: true,
              stdio: "ignore",
              cwd: PROJECT_ROOT,
            }).unref();
            log += `\n--- PM2 将在 2 秒后重启（应用新 Node.js）---`;
            break;
          }

          case "npm-runtime": {
            // 升级 npm 到最新版（全局）
            message = "升级 npm";
            {
              const { stdout, stderr } = await safeExec(`${NPM_BIN} install -g npm@latest`, LONG_TIMEOUT);
              log = stdout + (stderr ? `\n${stderr}` : "");
            }
            const { stdout: newNpm } = await safeExec("npm --version", CMD_TIMEOUT);
            log += `\n--- 验证 ---\n新版本: ${newNpm.trim()}`;
            break;
          }

          case "pm2":
            // 更新 PM2
            message = "更新 PM2";
            {
              const { stdout, stderr } = await safeExec(`${NPM_BIN} install -g pm2@latest`, LONG_TIMEOUT);
              log = stdout + (stderr ? `\n${stderr}` : "");
            }
            // 重启 PM2
            {
              const { stdout: reloadOut } = await safeExec("pm2 save && pm2 reload all", CMD_TIMEOUT);
              log += `\n--- PM2 重载 ---\n${reloadOut}`;
            }
            break;

          case "system-packages":
            // 更新系统包
            message = "更新系统软件包";
            {
              const { stdout, stderr } = await safeExec("apt-get update -y && apt-get upgrade -y", LONG_TIMEOUT);
              log = stdout + (stderr ? `\n${stderr}` : "");
            }
            break;

          case "nginx":
            // 重载 Nginx 配置
            message = "重载 Nginx 配置";
            {
              const { stdout, stderr } = await safeExec("nginx -t && systemctl reload nginx", CMD_TIMEOUT);
              log = stdout + (stderr ? `\n${stderr}` : "");
            }
            break;

          case "git-pull":
            // 拉取最新代码（先 stash 避免 SFTP 上传导致的冲突，后自动重建）
            message = "拉取最新代码并重建";
            {
              // 0. 检测并修复分支不匹配问题（master -> main 迁移）
              const { stdout: currentBranch } = await safeExec("git rev-parse --abbrev-ref HEAD", CMD_TIMEOUT);
              const branch = currentBranch.trim();
              if (branch === "master") {
                // 检查远程是否存在 main 分支
                const { stdout: remoteBranches } = await safeExec("git branch -r", CMD_TIMEOUT);
                if (remoteBranches.includes("origin/main")) {
                  // 切换到 main 分支，跟踪 origin/main
                  const { stdout: checkoutOut, stderr: checkoutErr } = await safeExec(
                    "git checkout -B main origin/main 2>&1",
                    CMD_TIMEOUT
                  );
                  log = `--- 分支迁移 ---\n从 master 切换到 main 分支\n${checkoutOut}${checkoutErr ? `\n${checkoutErr}` : ""}\n`;
                  // 删除旧的 master 分支避免混淆
                  await safeExec("git branch -D master 2>&1 || true", CMD_TIMEOUT);
                }
              }

              // 1. 先 stash 本地所有变更，防止 SFTP 上传导致的冲突
              await safeExec("git stash push -m 'auto-stash-before-pull' 2>&1 || true", CMD_TIMEOUT);
              // 2. 恢复误 stash 的 lock 文件（保持依赖树稳定）
              await safeExec("git checkout -- api/package-lock.json package-lock.json 2>&1 || true", CMD_TIMEOUT);
              // 3. fetch 最新代码
              await safeExec("git fetch origin main --quiet 2>&1 || true", CMD_TIMEOUT);
              // 4. git pull（显式指定 origin main，避免无上游跟踪分支的错误）
              const { stdout: pullOut, stderr: pullErr } = await safeExec("git pull origin main 2>&1", CMD_TIMEOUT);
              log += `--- Git Pull ---\n${pullOut}${pullErr ? `\n${pullErr}` : ""}\n`;
              // 检查 pull 是否成功（如果 pull 失败则不继续构建）
              if (pullErr.toLowerCase().includes("error") || pullErr.toLowerCase().includes("fatal")) {
                throw new Error(`git pull 失败: ${pullErr}`);
              }
              // 5. 后端：安装依赖 + 编译 TypeScript
              {
                const { stdout: apiOut, stderr: apiErr } = await safeExec(
                  "cd api && NODE_ENV='' npm install --include=dev && NODE_ENV='' ./node_modules/.bin/tsc",
                  LONG_TIMEOUT
                );
                log += `\n--- 后端编译 ---\n${apiOut}${apiErr ? `\n${apiErr}` : ""}`;
              }
              // 6. 前端：构建
              {
                const { stdout: feOut, stderr: feErr } = await safeExec(
                  "NODE_ENV='' npm install --include=dev && NODE_ENV='' ./node_modules/.bin/vite build",
                  LONG_TIMEOUT
                );
                log += `\n--- 前端构建 ---\n${feOut}${feErr ? `\n${feErr}` : ""}`;
              }
              // 7. 清理 npm install 产生的 lock 文件变更，保持仓库干净
              await safeExec("git checkout -- api/package-lock.json package-lock.json 2>&1 || true", CMD_TIMEOUT);
              log += `\n--- 已清理 lock 文件变更 ---`;
              // 8. 重载 Nginx + 延迟重启 PM2（避免杀死当前请求进程导致 502）
              {
                const { stdout: nginxOut } = await safeExec("nginx -s reload 2>&1", CMD_TIMEOUT);
                log += `\n--- Nginx 重载 ---\n${nginxOut}`;
              }
              // spawn 延迟重启，确保 HTTP 响应在进程被 kill 前已发送
              spawn("sh", ["-c", "sleep 2 && cd /opt/examhub && pm2 restart examhub-api 2>&1"], {
                detached: true,
                stdio: "ignore",
                cwd: PROJECT_ROOT,
              }).unref();
              log += `\n--- PM2 将在 2 秒后重启 ---`;
            }
            break;

          default:
            return reply.status(400).send(errorResponse(`不支持的组件: ${component}`, "UNSUPPORTED_COMPONENT"));
        }

        return reply.send(
          successResponse(
            { component, log },
            `${message}成功`
          )
        );
      } catch (error: any) {
        app.log.error(error);
        return reply.status(500).send(errorResponse(`更新失败: ${error.message}`));
      }
    }
  );

  // ========== 一键更新所有可安全更新的组件（异步执行）==========
  // 更新任务状态存储
  const updateTasks = new Map<string, {
    status: "running" | "done" | "error";
    log: string;
    updatedCount: number;
    updatedComponents: string[];
    startTime: string;
    endTime?: string;
  }>();

  // 组件对应的脚本步骤生成器
  // 注意：不使用 set -e，因为我们需要记录每个命令的退出码并继续执行
  // 改为每步用 `|| echo "EXIT_X=failed"` 模式捕获错误，最后统一判断
  const COMPONENT_STEPS: Record<string, { label: string; script: string }> = {
    "npm-packages": {
      label: "更新项目 npm 依赖 + 升级 npm 自身",
      script: `{
  cd ${PROJECT_ROOT} && npm update 2>&1 || echo "WARN: 前端 npm update 失败"
  cd ${PROJECT_ROOT}/api && npm update 2>&1 || echo "WARN: 后端 npm update 失败"
  # 升级 npm 到最新稳定版
  npm install -g npm@latest 2>&1 || echo "WARN: npm 自身升级失败"
} >> "\$LOG" 2>&1`,
    },
    node: {
      label: "升级 Node.js 到最新 LTS",
      script: `{
  CURRENT_MAJOR=\$(node -p "process.versions.node.split('.')[0]")
  # 获取最新 LTS 版本号
  LATEST=\$(curl -s "https://nodejs.org/dist/index.json" --max-time 10 2>/dev/null | node -p "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);const l=j.find(x=>typeof x.lts==='string');l?l.version.replace('v',''):''" 2>/dev/null)
  LATEST_MAJOR=\$(echo "\$LATEST" | cut -d. -f1)
  if [ -z "\$LATEST_MAJOR" ] || [ "\$LATEST_MAJOR" -le "\$CURRENT_MAJOR" ]; then
    echo "Node.js 已是最新 LTS，跳过升级（当前主版本: \$CURRENT_MAJOR）"
  else
    echo "升级 Node.js: \$CURRENT_MAJOR.x → \$LATEST_MAJOR.x (\$LATEST)"
    curl -fsSL "https://deb.nodesource.com/setup_\${LATEST_MAJOR}.x" | bash - 2>&1 || echo "WARN: NodeSource setup 失败"
    apt-get install -y nodejs 2>&1 || echo "WARN: apt install nodejs 失败"
    echo "新版本: \$(node --version)"
  fi
} >> "\$LOG" 2>&1`,
    },
    pm2: {
      label: "更新 PM2",
      script: `{
  npm install -g pm2@latest 2>&1 || echo "WARN: PM2 升级失败"
  pm2 save 2>&1 || true
  pm2 reload all 2>&1 || echo "WARN: PM2 reload 失败"
} >> "\$LOG" 2>&1`,
    },
    nginx: {
      label: "重载 Nginx",
      script: `{
  nginx -t 2>&1 && systemctl reload nginx 2>&1 || echo "WARN: Nginx 重载失败"
} >> "\$LOG" 2>&1`,
    },
  };

  // 推荐的一键更新组件列表（依次执行，Node.js 必须在 npm-packages 前，PM2 最后）
  const RECOMMENDED_COMPONENTS = ["node", "npm-packages", "pm2", "nginx"] as const;

  app.post(
    "/update-all",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as Record<string, unknown> | undefined;
        const rawComponents = (body?.components as string[]) || [];
        // 只接受已知组件，过滤无效值
        const requestedComponents = rawComponents.filter((c): c is string =>
          Object.keys(COMPONENT_STEPS).includes(c)
        );

        // 未指定时默认更新所有推荐组件；指定了则按推荐顺序排列（PM2 放最后）
        const components =
          requestedComponents.length === 0
            ? [...RECOMMENDED_COMPONENTS]
            : RECOMMENDED_COMPONENTS.filter((c) => requestedComponents.includes(c));

        const totalSteps = components.length;
        const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const logFile = `/tmp/examhub-update-${taskId}.log`;
        const scriptFile = `/tmp/examhub-update-${taskId}.sh`;

        // 动态构建更新脚本：只为请求的组件生成步骤
        let stepIndex = 0;
        const stepBlocks = components.map((name) => {
          stepIndex++;
          const step = COMPONENT_STEPS[name];
          return `echo "[$(date -Iseconds)] --- 步骤 ${stepIndex}/${totalSteps}: ${step.label} ---" >> "\$LOG"
${step.script}
echo "[$(date -Iseconds)] 步骤${stepIndex}完成" >> "\$LOG"`;
        });

        const componentListStr = components.join(",");

        const script = `#!/bin/bash
# 不使用 set -e，允许单个步骤失败后继续执行后续步骤
# 错误通过日志中的 WARN 标记识别
LOG="${logFile}"
echo "COMPONENTS=${componentListStr}" >> "\$LOG"
echo "[$(date -Iseconds)] === 一键更新开始（${components.length} 个组件）===" >> "\$LOG"

${stepBlocks.join("\n\n")}

echo "[$(date -Iseconds)] === 一键更新完成 ===" >> "\$LOG"
echo "DONE" >> "\$LOG"
`;

        // 写入脚本并执行
        await safeExec(`cat > ${scriptFile} << 'SCRIPT_EOF'\n${script}\nSCRIPT_EOF\n`, CMD_TIMEOUT);
        await safeExec(`chmod +x ${scriptFile}`, CMD_TIMEOUT);

        // 后台执行（nohup 确保不随请求结束而终止）
        const { exec } = await import("child_process");
        exec(`nohup bash ${scriptFile} > /dev/null 2>&1 &`, {
          cwd: PROJECT_ROOT,
        });

        // 存储任务状态（记录实际要更新的组件列表）
        updateTasks.set(taskId, {
          status: "running",
          log: "",
          updatedCount: 0,
          updatedComponents: components,
          startTime: new Date().toISOString(),
        });

        return reply.send(
          successResponse(
            { taskId, components },
            components.length < RECOMMENDED_COMPONENTS.length
              ? `一键更新已启动（${components.length} 个组件），正在后台执行`
              : "一键更新已启动，正在后台执行"
          )
        );
      } catch (error: any) {
        app.log.error(error);
        return reply.status(500).send(errorResponse(`一键更新启动失败: ${error.message}`));
      }
    }
  );

  // 查询一键更新任务状态
  app.get(
    "/update-all/status/:taskId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { taskId } = request.params as { taskId: string };
        const logFile = `/tmp/examhub-update-${taskId}.log`;
        const task = updateTasks.get(taskId);

        // 读取日志文件（即使 task 在内存中丢失，也能从磁盘恢复）
        let log = "";
        let logFileExists = false;
        try {
          const { stdout } = await safeExec(`[ -f ${logFile} ] && cat ${logFile} || echo ""`, CMD_TIMEOUT);
          log = stdout;
          if (stdout) logFileExists = true;
        } catch {}

        // PM2 reload 会重启 API 进程，导致内存中的 task 丢失
        // 此时从磁盘日志文件恢复任务状态
        if (!task && logFileExists) {
          const isDone = log.includes("DONE");

          // 从日志头部解析组件列表（COMPONENTS=npm-packages,pm2,nginx）
          const compMatch = log.match(/^COMPONENTS=(.+)$/m);
          const parsedComponents = compMatch ? compMatch[1].split(",").filter(Boolean) : [];

          // 通过统计 "步骤X完成" 行数来确定完成数
          const completedSteps = isDone ? (log.match(/步骤\d+完成/g) || []).length : 0;

          const reconstructedTask = {
            status: isDone ? "done" as const : "running" as const,
            log: log,
            updatedCount: completedSteps,
            updatedComponents: parsedComponents,
            startTime: "",
            endTime: isDone ? new Date().toISOString() : undefined as string | undefined,
          };
          if (isDone) {
            // 清理临时文件
            safeExec(`rm -f ${logFile} /tmp/examhub-update-${taskId}.sh`, CMD_TIMEOUT).catch(() => {});
          }
          updateTasks.set(taskId, reconstructedTask);
          return reply.send(
            successResponse({
              taskId,
              status: reconstructedTask.status,
              log: isDone ? reconstructedTask.log : log,
              updatedCount: reconstructedTask.updatedCount,
              updatedComponents: reconstructedTask.updatedComponents,
              startTime: reconstructedTask.startTime,
              endTime: reconstructedTask.endTime,
            })
          );
        }

        // 任务既不在内存，日志文件也不存在：可能已完成并被清理，或从未存在
        if (!task && !logFileExists) {
          return reply.send(
            successResponse({
              taskId,
              status: "done",
              log: "更新已完成（服务已重启，日志已清理）",
              updatedCount: 0,
              updatedComponents: [],
            })
          );
        }

        // task 必须在内存中（前面已处理 !task 的情况）
        if (!task) {
          return reply.status(500).send(errorResponse("内部错误：任务状态丢失"));
        }

        // 检查是否完成
        const isDone = log.includes("DONE");
        if (isDone && task.status === "running") {
          task.status = "done";
          task.endTime = new Date().toISOString();
          task.log = log;
          // 动态统计完成步骤数（与重建逻辑保持一致）
          const completedSteps = (log.match(/步骤\d+完成/g) || []).length;
          task.updatedCount = completedSteps;
          // 从任务创建时保存的组件列表获取名称，避免硬编码
          task.updatedComponents = task.updatedComponents.length > 0
            ? task.updatedComponents
            : (
                (log.match(/^COMPONENTS=(.+)$/m)?.[1] || "").split(",").filter(Boolean)
              );
          // 清理临时文件
          safeExec(`rm -f ${logFile} /tmp/examhub-update-${taskId}.sh`, CMD_TIMEOUT).catch(() => {});
        }

        return reply.send(
          successResponse({
            taskId,
            status: task.status,
            log: isDone ? task.log : log,
            updatedCount: task.updatedCount,
            updatedComponents: task.updatedComponents,
            startTime: task.startTime,
            endTime: task.endTime,
          })
        );
      } catch (error: any) {
        app.log.error(error);
        return reply.status(500).send(errorResponse(`查询状态失败: ${error.message}`));
      }
    }
  );

  // ========== 重装环境（保留数据）==========
  // 防并发重装锁：同一时间只允许一个重装任务
  let reinstalling = false;

  app.post(
    "/reinstall",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (reinstalling) {
          return reply.status(409).send(errorResponse("重装任务正在执行中，请稍后再试", "REINSTALL_IN_PROGRESS"));
        }

        const { type } = request.body as { type: string };

        if (!type) {
          return reply.status(400).send(errorResponse("请指定重装类型", "MISSING_TYPE"));
        }

        reinstalling = true;

        const logs: string[] = [];
        const addLog = (msg: string) => {
          logs.push(`[${new Date().toISOString()}] ${msg}`);
        };

        switch (type) {
          case "frontend": {
            // 重装前端依赖并重新构建
            addLog("开始重装前端环境...");

            addLog("步骤 1/4: 备份配置文件");
            addLog("前端无需备份，继续");

            addLog("步骤 2/4: 删除 node_modules");
            const { stderr: rmErr } = await safeExec("rm -rf node_modules", CMD_TIMEOUT);
            if (rmErr) addLog(`警告: ${rmErr}`);

            addLog("步骤 3/4: 重新安装依赖");
            const { stdout: installOut, stderr: installErr } = await safeExec(`${NPM_BIN} install`, LONG_TIMEOUT, true);
            addLog(installOut);
            if (installErr) addLog(`警告: ${installErr}`);

            addLog("步骤 4/4: 重新构建前端");
            const { stdout: buildOut } = await safeExec(`./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build`, LONG_TIMEOUT, true);
            addLog(buildOut);

            addLog("前端环境重装完成");
            break;
          }

          case "backend": {
            // 重装后端依赖并重新编译
            addLog("开始重装后端环境...");

            addLog("步骤 1/4: 备份 .env 配置文件");
            let envBackup = "";
            try {
              envBackup = fs.readFileSync(path.join(API_ROOT, ".env"), "utf-8");
              addLog(".env 备份成功");
            } catch {
              addLog("警告: .env 文件不存在，跳过备份");
            }

            addLog("步骤 2/4: 删除 node_modules 和 dist");
            await safeExec("cd api && rm -rf node_modules dist", CMD_TIMEOUT);
            addLog("已清理");

            addLog("步骤 3/4: 重新安装依赖");
            const { stdout: installOut, stderr: installErr } = await safeExec(`cd api && ${NPM_BIN} install`, LONG_TIMEOUT, true);
            addLog(installOut);
            if (installErr) addLog(`警告: ${installErr}`);

            addLog("步骤 4/4: 恢复配置并重新编译");
            if (envBackup) {
              fs.writeFileSync(path.join(API_ROOT, ".env"), envBackup);
              addLog(".env 已恢复");
            }
            const { stdout: buildOut } = await safeExec("cd api && ./node_modules/.bin/tsc", LONG_TIMEOUT, true);
            addLog(buildOut);

            // 延迟重启：当前进程先返回响应，再由独立子进程触发重启
            addLog("后端环境重装完成，服务将在2秒后重启...");
            spawn("sh", ["-c", "sleep 2 && cd /opt/examhub && (pm2 restart examhub-api || pm2 start api/dist/server.js --name examhub-api)"], {
              detached: true,
              stdio: "ignore",
              cwd: PROJECT_ROOT,
            }).unref();

            break;
          }

          case "all": {
            // 完整重装（保留数据库和 .env）
            addLog("开始完整重装环境（保留数据）...");

            // 1. 备份配置
            addLog("步骤 1/6: 备份配置文件");
            let apiEnvBackup = "";
            try {
              apiEnvBackup = fs.readFileSync(path.join(API_ROOT, ".env"), "utf-8");
              addLog("✓ api/.env 已备份");
            } catch {
              addLog("⚠ api/.env 不存在");
            }

            // 2. 清理前端
            addLog("步骤 2/6: 清理前端依赖");
            await safeExec("rm -rf node_modules dist", CMD_TIMEOUT);
            addLog("✓ 前端已清理");

            // 3. 清理后端
            addLog("步骤 3/6: 清理后端依赖");
            await safeExec("cd api && rm -rf node_modules dist", CMD_TIMEOUT);
            addLog("✓ 后端已清理");

            // 4. 重新安装依赖
            addLog("步骤 4/6: 重新安装依赖");
            addLog("--- 前端依赖 ---");
            const { stdout: feInstallOut, stderr: feInstallErr } = await safeExec(`${NPM_BIN} install`, LONG_TIMEOUT, true);
            addLog(feInstallOut);
            if (feInstallErr) addLog(`警告: ${feInstallErr}`);

            addLog("--- 后端依赖 ---");
            const { stdout: beInstallOut, stderr: beInstallErr } = await safeExec(`cd api && ${NPM_BIN} install`, LONG_TIMEOUT, true);
            addLog(beInstallOut);
            if (beInstallErr) addLog(`警告: ${beInstallErr}`);

            // 5. 恢复配置并编译
            addLog("步骤 5/6: 恢复配置并编译");
            if (apiEnvBackup) {
              fs.writeFileSync(path.join(API_ROOT, ".env"), apiEnvBackup);
              addLog("✓ api/.env 已恢复");
            }

            addLog("--- 编译后端 ---");
            const { stdout: beBuildOut } = await safeExec("cd api && ./node_modules/.bin/tsc", LONG_TIMEOUT, true);
            addLog(beBuildOut);

            addLog("--- 构建前端 ---");
            const { stdout: feBuildOut } = await safeExec(`./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build`, LONG_TIMEOUT, true);
            addLog(feBuildOut);

            // 6. 验证编译产物
            const serverJsPath = path.join(API_ROOT, "dist", "server.js");
            if (!checkPath(serverJsPath)) {
              throw new Error(`后端编译失败：找不到 ${serverJsPath}，请检查 TypeScript 编译错误`);
            }

            // 延迟重启：当前进程先返回响应，再由独立子进程触发重启
            addLog("完整重装完成，服务将在2秒后重启...");
            spawn("sh", ["-c", "sleep 2 && cd /opt/examhub && (pm2 restart examhub-api || pm2 start api/dist/server.js --name examhub-api)"], {
              detached: true,
              stdio: "ignore",
              cwd: PROJECT_ROOT,
            }).unref();

            break;
          }

          default:
            reinstalling = false;
            return reply.status(400).send(errorResponse(`不支持的重装类型: ${type}`, "UNSUPPORTED_TYPE"));
        }

        reinstalling = false;
        return reply.send(
          successResponse(
            { type, log: logs.join("\n") },
            "环境重装成功"
          )
        );
      } catch (error: any) {
        reinstalling = false;
        app.log.error(error);
        return reply.status(500).send(errorResponse(`重装失败: ${error.message}`));
      }
    }
  );

  // ========== 检查仓库更新状态（Git 远程 vs 本地）==========
  app.get("/repo-check", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 检查是否有本地未提交的变更（SFTP 上传等原因导致）
      const { stdout: statusOut } = await safeExec("git status --porcelain", CMD_TIMEOUT);
      const localChanges = statusOut.trim().length > 0;
      const changedFiles = localChanges
        ? statusOut.trim().split("\n").slice(0, 10).map(line => line.trim().replace(/^[?MADRCU!\s]+/, ""))
        : [];

      // 获取当前分支
      const { stdout: currentBranch } = await safeExec("git rev-parse --abbrev-ref HEAD", CMD_TIMEOUT);
      const branch = currentBranch.trim();

      // 获取远程默认分支
      const { stdout: remoteHeadRef } = await safeExec("git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo 'refs/remotes/origin/main'", CMD_TIMEOUT);
      const remoteDefaultBranch = remoteHeadRef.trim().replace("refs/remotes/origin/", "") || "main";

      // 检测分支不匹配（本地 master 但远程默认是 main）
      const branchMismatch = branch !== remoteDefaultBranch;

      // fetch 远程默认分支
      await safeExec(`git fetch origin ${remoteDefaultBranch} --quiet 2>&1 || true`, CMD_TIMEOUT);

      // 获取本地 HEAD 信息
      const { stdout: localHead } = await safeExec("git rev-parse HEAD", CMD_TIMEOUT);
      const { stdout: localShort } = await safeExec("git rev-parse --short HEAD", CMD_TIMEOUT);
      const { stdout: localMsg } = await safeExec("git log -1 --format=%s", CMD_TIMEOUT);

      // 获取远程 HEAD 信息
      const { stdout: remoteHead } = await safeExec(`git rev-parse origin/${remoteDefaultBranch}`, CMD_TIMEOUT);
      const { stdout: remoteShort } = await safeExec(`git rev-parse --short origin/${remoteDefaultBranch}`, CMD_TIMEOUT);
      const { stdout: remoteMsg } = await safeExec(`git log -1 --format=%s origin/${remoteDefaultBranch}`, CMD_TIMEOUT);

      // 计算落后多少提交
      const { stdout: behindCount } = await safeExec(
        `git rev-list HEAD..origin/${remoteDefaultBranch} --count`,
        CMD_TIMEOUT
      );

      const hasUpdate = localHead.trim() !== remoteHead.trim();

      // 获取更新日志（落后提交的列表）
      let changelog: string[] = [];
      if (hasUpdate) {
        const { stdout: changes } = await safeExec(
          `git log --oneline HEAD..origin/${remoteDefaultBranch} --max-count=10`,
          CMD_TIMEOUT
        );
        changelog = changes.trim().split("\n").filter(Boolean);
      }

      // 获取远端 URL
      const { stdout: remoteUrl } = await safeExec("git config --get remote.origin.url", CMD_TIMEOUT);

      return reply.send(
        successResponse({
          ok: !localChanges || !hasUpdate,
          localChanges,
          changedFiles,
          localCommit: localShort.trim(),
          localMessage: localMsg.trim(),
          remoteCommit: remoteShort.trim(),
          remoteMessage: remoteMsg.trim(),
          branch,
          remoteDefaultBranch,
          branchMismatch,
          remoteUrl: remoteUrl.trim(),
          hasUpdate,
          commitsBehind: parseInt(behindCount.trim()) || 0,
          changelog,
          lastCheck: new Date().toISOString(),
        })
      );
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send(errorResponse(`检查仓库状态失败: ${error.message}`));
    }
  });

  // ========== 检查可用更新（自动检查最新稳定版本）==========
  app.get("/check-updates", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      interface UpdateItem {
        name: string;
        displayName: string;
        current: string;
        latest: string;
        updateAvailable: boolean;
        type: "npm" | "system" | "runtime";
        description: string;
      }
      const results: UpdateItem[] = [];

      // 并行获取所有组件的当前版本和最新版本
      const [
        nodeCurrent, nodeLatest,
        npmCurrent, npmLatest,
        pm2Current, pm2Latest,
        nginxCurrent, nginxLatest,
        mariadbCurrent, mariadbLatest,
      ] = await Promise.all([
        getNodeVersion(),
        getNodeLatestLTS(),
        getNpmVersion(),
        getNpmLatestVersion("npm"),
        getPm2Info(),
        getNpmLatestVersion("pm2"),
        getNginxInfo(),
        getAptLatestVersion("nginx"),
        getMysqlInfo(),
        getAptLatestVersion("mariadb-server"),
      ]);

      // Node.js
      {
        const current = extractVersion(nodeCurrent.version);
        const latest = nodeLatest;
        const hasUpdate = current !== "未知" && latest !== "未知" && compareVersions(current, latest) < 0;
        results.push({
          name: "node",
          displayName: "Node.js",
          current: current || "未知",
          latest,
          updateAvailable: hasUpdate,
          type: "runtime",
          description: "JavaScript 运行时（LTS 长期支持版）",
        });
      }

      // npm
      {
        const current = extractVersion(npmCurrent.version);
        const latest = npmLatest;
        const hasUpdate = current !== "未知" && latest !== "未知" && compareVersions(current, latest) < 0;
        results.push({
          name: "npm",
          displayName: "npm",
          current: current || "未知",
          latest,
          updateAvailable: hasUpdate,
          type: "runtime",
          description: "Node.js 包管理器",
        });
      }

      // PM2
      {
        const current = extractVersion(pm2Current.version);
        const latest = pm2Latest;
        const hasUpdate = current !== "未知" && latest !== "未知" && compareVersions(current, latest) < 0;
        results.push({
          name: "pm2",
          displayName: "PM2",
          current: current || "未知",
          latest,
          updateAvailable: hasUpdate,
          type: "npm",
          description: "Node.js 进程管理器",
        });
      }

      // Nginx
      {
        const current = extractVersion(nginxCurrent.version);
        const latest = nginxLatest;
        const hasUpdate = current !== "未知" && latest !== "未知" && compareVersions(current, latest) < 0;
        results.push({
          name: "nginx",
          displayName: "Nginx",
          current: current || "未知",
          latest,
          updateAvailable: hasUpdate,
          type: "system",
          description: "Web 服务器 / 反向代理",
        });
      }

      // MariaDB
      {
        const current = extractVersion(mariadbCurrent.version);
        const latest = mariadbLatest;
        const hasUpdate = current !== "未知" && latest !== "未知" && compareVersions(current, latest) < 0;
        results.push({
          name: "mariadb",
          displayName: mariadbCurrent.type || "MariaDB",
          current: current || "未知",
          latest,
          updateAvailable: hasUpdate,
          type: "system",
          description: "数据库服务",
        });
      }

      // 统计可更新的数量
      const updateCount = results.filter((r) => r.updateAvailable).length;

      return reply.send(
        successResponse({
          updates: results,
          updateCount,
          lastCheck: new Date().toISOString(),
        }, updateCount > 0 ? `发现 ${updateCount} 个可更新组件` : "所有组件均为最新版本")
      );
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send(errorResponse(`检查更新失败: ${error.message}`));
    }
  });
}

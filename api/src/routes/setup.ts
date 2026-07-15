/**
 * KeKe ExamHub - 考试信息管理系统
 * 安装向导路由（/api/setup/*）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 路由列表:
 *   GET  /api/setup/status         检查安装状态（是否存在 .setup-complete 锁文件）
 *   GET  /api/setup/env            环境检测（Node/MySQL/Nginx/PM2 版本）
 *   POST /api/setup/database/test  测试数据库连接
 *   POST /api/setup/install        执行安装（建表 + 创建管理员 + 生成 .env + 自动重启）
 *
 * 安全机制:
 *   - .setup-complete 锁文件: 安装完成后创建，所有写操作接口都会先检查此文件
 *     已安装后 /env 和 /database/test 接口直接返回 403，避免被用于探测服务器信息
 *   - /install 接口额外检查 admins 表是否已有记录，双重保险防止覆盖已有管理员
 *   - /database/test 错误信息本地化: 不直接透传 mysql2 原始错误（可能含用户名/主机），
 *     仅返回分类后的中文提示
 *   - JWT 密钥使用 crypto.randomBytes(32) 生成，256-bit 熵，足够安全
 *
 * 注意:
 *   安装向导接口仅在系统未安装时可用，安装完成后请通过 nginx 配置反向代理屏蔽 /api/setup/* 路径，
 *   作为深度防御。
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const execAsync = promisify(exec);

/**
 * 常见的 MySQL/MariaDB Unix Socket 路径
 * 用于在 TCP 连接失败时自动尝试 socket 方式（生产环境常见配置）
 */
const SOCKET_PATHS = [
  "/run/mysqld/mysqld.sock",
  "/var/run/mysqld/mysqld.sock",
  "/var/lib/mysql/mysql.sock",
  "/tmp/mysql.sock",
];

/**
 * 检测可用的 MySQL socket 路径
 * @returns 第一个存在的 socket 路径，全部不存在则返回 null
 */
async function detectSocketPath(): Promise<string | null> {
  for (const p of SOCKET_PATHS) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // 继续检测下一个
    }
  }
  return null;
}

/**
 * 创建数据库连接（先尝试 TCP，失败后尝试 socket）
 *
 * 双模式连接策略:
 *   1. 优先 TCP（用户在表单中输入的 host/port）— 适用于跨主机部署
 *   2. TCP 失败时自动尝试 Unix Socket — 适用于本机部署（性能更优，且无需开放 3306 端口）
 *
 * @param config 数据库连接配置（host/port/user/password/database）
 * @returns 连接对象 + 实际使用的连接方式（用于后续生成 .env 时记录）
 */
async function createDbConnection(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}) {
  // 先尝试 TCP 连接（5 秒超时，避免长时间挂起）
  try {
    const connection = await mysql.createConnection({
      host: config.host || "localhost",
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000,
    });
    return { connection, usingSocket: false, socketPath: null };
  } catch (tcpError) {
    // TCP 失败，尝试 socket 连接（适用于本机部署、3306 未开放的环境）
    const socketPath = await detectSocketPath();
    if (socketPath) {
      const connection = await mysql.createConnection({
        socketPath,
        user: config.user,
        password: config.password,
        database: config.database,
      } as any);
      return { connection, usingSocket: true, socketPath };
    }
    // socket 也不可用，抛出原始 TCP 错误供调用方处理
    throw tcpError;
  }
}

/**
 * 检查系统是否已安装（通过 .setup-complete 锁文件判断）
 *
 * 锁文件机制:
 *   安装完成时创建 .setup-complete，包含 installedAt 和 version 字段。
 *   所有写操作接口（/env, /database/test, /install）都会先检查此文件，
 *   已安装则直接返回 403，避免被重复执行或被用于探测服务器信息。
 *
 * @returns true 已安装 / false 未安装
 */
async function isInstalled(): Promise<boolean> {
  const lockFile = path.join(process.cwd(), ".setup-complete");
  try {
    await fs.access(lockFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成随机 JWT 密钥
 * 使用 crypto.randomBytes(32) 生成 256-bit 熵的随机字符串，足够安全。
 * @returns 64 位十六进制字符串
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export default async function setupRoutes(fastify: FastifyInstance) {
  /**
   * 检查安装状态
   * 前端在访问 /setup 页面时首先调用此接口，决定显示安装向导还是提示已安装。
   */
  fastify.get("/status", async () => {
    const installed = await isInstalled();
    return { installed };
  });

  /**
   * 环境检测
   *
   * 安全修复: 仅在系统未安装时返回环境信息。
   *   已部署实例调用此接口会返回 403，避免泄露服务器版本号（可用于攻击者识别可利用漏洞）。
   *
   * 检测项: Node.js / MySQL / Nginx / PM2 的版本与可用性
   */
  fastify.get("/env", async (request, reply) => {
    if (await isInstalled()) {
      return reply.status(403).send({
        success: false,
        message: "系统已安装，环境检测接口已禁用",
      });
    }

    // Node.js 版本（要求 >= 18，因为使用了原生 fetch 和 ESM）
    const nodeVersion = process.version;
    const nodeVersionNum = parseInt(nodeVersion.slice(1).split(".")[0]);

    // MySQL 检测（通过 mysql --version 命令）
    let mysqlAvailable = false;
    let mysqlVersion = "";
    try {
      const { stdout } = await execAsync("mysql --version");
      mysqlAvailable = true;
      mysqlVersion = stdout.trim();
    } catch {
      mysqlAvailable = false;
    }

    // Nginx 检测（注意: nginx -v 输出到 stderr 而非 stdout，需合并捕获）
    let nginxAvailable = false;
    let nginxVersion = "";
    try {
      const { stdout, stderr } = await execAsync("nginx -v 2>&1");
      const output = (stdout + stderr).trim();
      nginxAvailable = true;
      nginxVersion = output;
    } catch {
      nginxAvailable = false;
    }

    // PM2 检测
    let pm2Available = false;
    let pm2Version = "";
    try {
      const { stdout } = await execAsync("pm2 --version");
      pm2Available = true;
      pm2Version = stdout.trim();
    } catch {
      pm2Available = false;
    }

    return {
      node: {
        version: nodeVersion,
        ok: nodeVersionNum >= 18,
        label: `Node.js ${nodeVersion}`,
      },
      mysql: {
        available: mysqlAvailable,
        version: mysqlVersion,
        ok: mysqlAvailable,
        label: mysqlAvailable ? mysqlVersion : "未安装",
      },
      nginx: {
        available: nginxAvailable,
        version: nginxVersion,
        ok: nginxAvailable,
        label: nginxAvailable ? nginxVersion : "未安装",
      },
      pm2: {
        available: pm2Available,
        version: pm2Version,
        ok: pm2Available,
        label: pm2Available ? `PM2 ${pm2Version}` : "未安装",
      },
    };
  });

  /**
   * 测试数据库连接（验证用户凭据 + 库是否存在）
   *
   * 安全修复:
   *   1. 仅在系统未安装时允许测试，避免被攻击者用于探测数据库
   *   2. 错误信息本地化，不直接透传 mysql2 原始错误（可能含数据库用户名、主机等信息）
   *
   * 返回值含 usingSocket 标记，前端据此提示用户当前使用的连接方式。
   */
  fastify.post(
    "/database/test",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (await isInstalled()) {
        return reply.status(403).send({
          success: false,
          message: "系统已安装，数据库测试接口已禁用",
        });
      }

      const { host, port, user, password, database } = request.body as {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
      };

      try {
        // 连接时指定 database，若库不存在会直接报错（提示用户手动建库）
        const { connection, usingSocket, socketPath } = await createDbConnection({
          host: host || "localhost",
          port: port || 3306,
          user,
          password,
          database,
        });

        // 执行 SELECT VERSION() 验证连接活性并获取数据库版本
        const [rows] = await connection.query("SELECT VERSION() as version");
        const version = (rows as any[])[0].version;
        await connection.end();

        return {
          success: true,
          message: usingSocket
            ? `数据库连接成功（通过 socket: ${socketPath}，库: ${database}）`
            : `数据库连接成功（库: ${database}）`,
          version,
        };
      } catch (error: any) {
        // 安全修复：不直接返回原始错误消息，防止泄露数据库用户名、主机等敏感信息
        const msg = error?.code === "ER_ACCESS_DENIED_ERROR"
          ? "数据库认证失败：用户名或密码错误"
          : error?.code === "ECONNREFUSED"
          ? "数据库连接被拒绝：请检查数据库服务是否启动、主机和端口是否正确"
          : error?.code === "ENOTFOUND"
          ? "数据库主机无法解析：请检查主机名是否正确"
          : "数据库连接失败，请检查配置";
        return { success: false, message: msg };
      }
    }
  );

  /**
   * 执行安装
   *
   * 安装流程:
   *   1. 检查 .setup-complete 锁文件，已安装则拒绝
   *   2. 连接用户手动创建的数据库（不自动建库）
   *   3. 加载 migrations/init.sql 建表脚本（19 张表）
   *   4. 二次检查 admins 表是否已有记录（防覆盖）
   *   5. 创建管理员账号（bcrypt 加密密码）
   *   6. 生成 .env 文件（含 JWT 密钥、数据库配置）
   *   7. 创建 .setup-complete 锁文件
   *   8. 延迟 1.5 秒后通过 PM2 自动重启后端以加载新 .env
   *
   * 安全机制:
   *   - 双重安装检查（锁文件 + admins 表）
   *   - JWT 密钥使用 crypto.randomBytes(32) 生成
   *   - 管理员密码使用 bcrypt 哈希存储（cost=10）
   */
  fastify.post("/install", async (request: FastifyRequest, reply: FastifyReply) => {
    // 第一道防线：检查锁文件
    if (await isInstalled()) {
      return {
        success: false,
        message: "系统已安装，如需重新安装请删除 .setup-complete 文件",
      };
    }

    const { dbConfig, admin } = request.body as {
      dbConfig: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
      };
      admin: {
        username: string;
        password: string;
      };
    };

    try {
      // 1. 连接到用户手动创建的数据库（不自动建库，要求用户提前手动创建）
      //    若库不存在会直接报错，提示用户手动创建
      const { connection, usingSocket, socketPath } = await createDbConnection({
        host: dbConfig.host || "localhost",
        port: dbConfig.port || 3306,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
      });
      await connection.end();

      // 2. 创建连接池用于建表（根据连接方式选择 TCP 或 socket 配置）
      const poolConfig: any = usingSocket
        ? {
            socketPath,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
          }
        : {
            host: dbConfig.host || "localhost",
            port: dbConfig.port || 3306,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
          };
      const pool = mysql.createPool(poolConfig);

      // 3. 加载完整的 init.sql 建表脚本（包含所有 19 张表）
      //    历史修复: 之前只手动创建了 9 张表，缺少 teachers/students/classes 等关键业务表
      //    ESM 注意: __dirname 在 ESM 模式下不可用，用 new URL(import.meta.url).pathname 推导
      const initSqlPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "migrations",
        "init.sql"
      );
      try {
        const initSql = await fs.readFile(initSqlPath, "utf8");
        // SQL 解析: 先移除注释行（-- 开头），再按分号 + 换行分割成独立语句
        // 历史修复: 之前直接过滤以 -- 开头的整个块，导致所有语句都被丢弃（0 条）
        const cleanedSql = initSql
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n");
        const statements = cleanedSql
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await pool.query(stmt);
        }
        console.log(`✓ 已执行 ${statements.length} 条建表语句（init.sql）`);
      } catch (sqlError) {
        // 回退: init.sql 加载失败时，至少创建 admins 表保证系统可登录
        console.error("加载 init.sql 失败，回退到手动建表:", sqlError);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            avatar LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      }

      // 第二道防线: 检查 admins 表是否已有记录（防覆盖已有密码）
      // 即使锁文件被误删，已有管理员账号时也拒绝重新安装
      const [adminCountRows] = await pool.query(
        "SELECT COUNT(*) as count FROM admins"
      );
      const adminCount = (adminCountRows as any[])[0].count;
      if (adminCount > 0) {
        await pool.end();
        return reply.status(403).send({
          success: false,
          message: "系统已安装，请联系管理员重置密码",
        });
      }

      // 4. 创建管理员账号（bcrypt cost=10，符合当前安全标准）
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await pool.query(
        "INSERT INTO admins (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)",
        [admin.username, hashedPassword]
      );

      await pool.end();

      // 5. 生成 .env 文件（根据实际连接方式写入对应配置）
      const jwtSecret = generateSecret();
      const dbConfigSection = usingSocket
        ? `# 数据库配置（使用 socket 连接）
DB_SOCKET=${socketPath}
DB_USER=${dbConfig.user}
DB_PASSWORD=${dbConfig.password}
DB_NAME=${dbConfig.database}`
        : `# 数据库配置
DB_HOST=${dbConfig.host || "localhost"}
DB_PORT=${dbConfig.port || 3306}
DB_USER=${dbConfig.user}
DB_PASSWORD=${dbConfig.password}
DB_NAME=${dbConfig.database}`;

      const envContent = `# ExamHub 生产环境配置
# 由安装向导生成于 ${new Date().toISOString()}

${dbConfigSection}

# JWT 密钥
JWT_SECRET=${jwtSecret}

# 管理员账号（密码已加密存入数据库，此处仅记录用户名）
ADMIN_USERNAME=${admin.username}

# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
`;

      const envPath = path.join(process.cwd(), ".env");
      await fs.writeFile(envPath, envContent, "utf8");

      // 6. 创建锁文件（含安装时间与版本，便于后续排查）
      const lockPath = path.join(process.cwd(), ".setup-complete");
      await fs.writeFile(
        lockPath,
        JSON.stringify(
          {
            installedAt: new Date().toISOString(),
            version: "1.0.0",
          },
          null,
          2
        ),
        "utf8"
      );

      // 7. 自动重启后端以加载新 .env 配置
      // 使用 detached spawn 确保子进程独立于父进程（父进程被杀后子进程仍能执行）
      // PM2 守护进程（独立进程）会接收重启命令，杀死当前进程并启动新实例
      // 延迟 1.5 秒确保 HTTP 响应已发送到客户端，避免前端收到连接中断错误
      const appName = process.env.name || "examhub-api";
      setTimeout(() => {
        try {
          const child = spawn("pm2", ["restart", appName], {
            detached: true,
            stdio: "ignore",
          });
          // 监听 error 事件，防止 pm2 不存在时进程崩溃（spawn 会同步抛出 ENOENT）
          child.on("error", (err) => {
            console.error("自动重启失败（pm2 可能未安装）,请手动执行: pm2 restart", appName);
            console.error("错误:", err.message);
          });
          child.unref(); // 允许父进程退出而不等待子进程
        } catch (restartError) {
          console.error("自动重启失败,请手动执行: pm2 restart", appName, restartError);
        }
      }, 1500);

      return {
        success: true,
        message: "安装成功！后端服务将在 1.5 秒后自动重启以加载新配置。",
      };
    } catch (error: any) {
      return { success: false, message: `安装失败: ${error.message}` };
    }
  });
}

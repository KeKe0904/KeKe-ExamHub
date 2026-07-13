/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
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

// 常见的 MySQL/MariaDB socket 路径
const SOCKET_PATHS = [
  "/run/mysqld/mysqld.sock",
  "/var/run/mysqld/mysqld.sock",
  "/var/lib/mysql/mysql.sock",
  "/tmp/mysql.sock",
];

// 检测可用的 socket 路径
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

// 创建数据库连接（先尝试 TCP，失败后尝试 socket）
async function createDbConnection(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}) {
  // 先尝试 TCP 连接
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
    // TCP 失败，尝试 socket 连接
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
    throw tcpError;
  }
}

// 检查是否已安装
async function isInstalled(): Promise<boolean> {
  const lockFile = path.join(process.cwd(), ".setup-complete");
  try {
    await fs.access(lockFile);
    return true;
  } catch {
    return false;
  }
}

// 生成随机 JWT 密钥
function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export default async function setupRoutes(fastify: FastifyInstance) {
  // 检查安装状态
  fastify.get("/status", async () => {
    const installed = await isInstalled();
    return { installed };
  });

  // 环境检测
  // 安全修复：仅在系统未安装时返回环境信息，避免已部署实例泄露服务器版本
  fastify.get("/env", async (request, reply) => {
    if (await isInstalled()) {
      return reply.status(403).send({
        success: false,
        message: "系统已安装，环境检测接口已禁用",
      });
    }

    // Node.js 版本
    const nodeVersion = process.version;
    const nodeVersionNum = parseInt(nodeVersion.slice(1).split(".")[0]);

    // MySQL 检测
    let mysqlAvailable = false;
    let mysqlVersion = "";
    try {
      const { stdout } = await execAsync("mysql --version");
      mysqlAvailable = true;
      mysqlVersion = stdout.trim();
    } catch {
      mysqlAvailable = false;
    }

    // Nginx 检测
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

  // 测试数据库连接（验证用户凭据 + 库是否存在）
  // 安全修复：仅在系统未安装时允许测试，避免被用于探测数据库
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
        // 连接时指定 database，若库不存在会直接报错
        const { connection, usingSocket, socketPath } = await createDbConnection({
          host: host || "localhost",
          port: port || 3306,
          user,
          password,
          database,
        });

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
        // 安全修复：不直接返回原始错误消息，防止泄露数据库用户名、主机等信息
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

  // 执行安装
  fastify.post("/install", async (request: FastifyRequest, reply: FastifyReply) => {
    // 检查是否已安装
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

      // 2. 创建连接池用于建表（根据连接方式选择 TCP 或 socket）
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
      //    修复：之前只手动创建了 9 张表，缺少 teachers/students/classes 等关键业务表
      //    注意：ESM 模式下 __dirname 不可用，用 import.meta.url 推导
      const initSqlPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "migrations",
        "init.sql"
      );
      try {
        const initSql = await fs.readFile(initSqlPath, "utf8");
        // 先移除注释行（-- 开头的行），再按分号分割成独立语句
        // 修复：之前直接过滤以 -- 开头的整个块，导致所有语句都被丢弃（0 条）
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
        console.error("加载 init.sql 失败，回退到手动建表:", sqlError);
        // 回退：至少创建最基础的表
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

      // 已安装检查：若已存在管理员账号则拒绝重新安装（防止覆盖已有密码）
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

      // 4. 创建管理员账号
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      await pool.query(
        "INSERT INTO admins (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)",
        [admin.username, hashedPassword]
      );

      await pool.end();

      // 5. 生成 .env 文件
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

      // 6. 创建锁文件
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
      // 使用 detached spawn 确保子进程独立于父进程
      // PM2 守护进程(独立进程)会接收重启命令,杀死当前进程并启动新实例
      // 延迟 1.5 秒确保 HTTP 响应已发送到客户端
      const appName = process.env.name || "examhub-api";
      setTimeout(() => {
        try {
          const child = spawn("pm2", ["restart", appName], {
            detached: true,
            stdio: "ignore",
          });
          // 监听 error 事件，防止 pm2 不存在时进程崩溃
          child.on("error", (err) => {
            console.error("自动重启失败（pm2 可能未安装）,请手动执行: pm2 restart", appName);
            console.error("错误:", err.message);
          });
          child.unref();
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

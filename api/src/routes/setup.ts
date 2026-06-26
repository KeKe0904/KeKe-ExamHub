/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
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
  fastify.get("/env", async () => {
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
  fastify.post(
    "/database/test",
    async (request: FastifyRequest, reply: FastifyReply) => {
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
        return { success: false, message: error.message };
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

      // 创建 admins 表
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

      // 已有表则添加 avatar 字段
      try {
        await pool.query("ALTER TABLE admins ADD COLUMN avatar LONGTEXT NULL");
      } catch {
        // 字段已存在则忽略
      }

      // 创建 exams 表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subject VARCHAR(100) NOT NULL,
          exam_date DATETIME NOT NULL,
          duration INT NOT NULL COMMENT '考试时长(分钟)',
          location VARCHAR(100) NOT NULL,
          invigilator VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_exam_date (exam_date),
          INDEX idx_subject (subject)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 创建 announcements 表（公告）
      await pool.query(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          is_pinned BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 创建 settings 表（系统设置，键值对存储）
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // ==================== 教室端功能相关表 ====================

      // 教学楼表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS buildings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 注册码表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS registration_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(32) NOT NULL UNIQUE,
          is_used BOOLEAN DEFAULT FALSE,
          used_by_classroom_id INT NULL COMMENT '使用该注册码的教室ID(应用层维护,不设外键避免循环依赖)',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP NULL,
          INDEX idx_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 教室端账号表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS classrooms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          building_id INT NOT NULL,
          room_number VARCHAR(50) NOT NULL,
          password VARCHAR(255) NOT NULL COMMENT 'bcrypt加密',
          registration_code_id INT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
          reject_reason VARCHAR(255) NULL COMMENT '驳回原因',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_building_room (building_id, room_number),
          FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
          FOREIGN KEY (registration_code_id) REFERENCES registration_codes(id) ON DELETE RESTRICT,
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 考试-教室关联表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exam_classrooms (
          exam_id INT NOT NULL,
          classroom_id INT NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (exam_id, classroom_id),
          FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
          FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

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

# 管理员账号
ADMIN_USERNAME=${admin.username}
ADMIN_PASSWORD=${admin.password}

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

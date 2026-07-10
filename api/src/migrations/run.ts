/**
 * KeKe ExamHub - 考试信息管理系统
 * 本项目使用 Trae IDE 开发
 * @author 落梦陳 (KeKe0904)
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { pool } from "../config/database.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// 兼容 ESM 下的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库初始化
export async function runMigration() {
  try {
    console.log("开始数据库初始化...");

    // 创建admins表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // 兼容已有表:补充 avatar 字段
    try {
      await pool.execute(`ALTER TABLE admins ADD COLUMN avatar LONGTEXT NULL`);
    } catch {
      // 字段已存在则忽略
    }
    console.log("✓ admins 表创建成功");

    // 创建exams表
    await pool.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ exams 表创建成功");

    // 创建announcements表(公告)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        publish_at DATETIME NULL COMMENT '定时发布时间',
        expire_at DATETIME NULL COMMENT '自动下架时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_publish_at (publish_at),
        INDEX idx_expire_at (expire_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // 兼容已有表:补充 publish_at 和 expire_at 字段
    try {
      await pool.execute(`ALTER TABLE announcements ADD COLUMN publish_at DATETIME NULL COMMENT '定时发布时间'`);
    } catch {
      // 字段已存在则忽略
    }
    try {
      await pool.execute(`ALTER TABLE announcements ADD COLUMN expire_at DATETIME NULL COMMENT '自动下架时间'`);
    } catch {
      // 字段已存在则忽略
    }
    try {
      await pool.execute(`ALTER TABLE announcements ADD INDEX idx_publish_at (publish_at)`);
    } catch {
      // 索引已存在则忽略
    }
    try {
      await pool.execute(`ALTER TABLE announcements ADD INDEX idx_expire_at (expire_at)`);
    } catch {
      // 索引已存在则忽略
    }
    console.log("✓ announcements 表创建成功");

    // 创建settings表(系统设置,键值对存储)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ settings 表创建成功");

    // 创建buildings表(教学楼)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS buildings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ buildings 表创建成功");

    // 创建registration_codes表(注册码)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS registration_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        is_used BOOLEAN DEFAULT FALSE,
        used_by_classroom_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL,
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ registration_codes 表创建成功");

    // 创建classrooms表(教室端账号)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        building_id INT NOT NULL,
        room_number VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        registration_code_id INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reject_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_building_room (building_id, room_number),
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ classrooms 表创建成功");

    // 创建exam_classrooms表(考试-教室关联)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS exam_classrooms (
        exam_id INT NOT NULL,
        classroom_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (exam_id, classroom_id),
        INDEX idx_classroom_id (classroom_id),
        INDEX idx_exam_classroom (exam_id, classroom_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ exam_classrooms 表创建成功");

    // 创建admin_logs表(操作日志)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        admin_username VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSON NULL,
        ip_address VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ admin_logs 表创建成功");

    // 插入默认管理员：仅在 admins 表为空且环境变量显式提供凭据时插入
    // 安全修复：移除 || "admin123" 默认回退，避免弱密码被攻击者利用
    // 推荐通过 /setup 向导创建管理员，而非 migrate 命令
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const [adminCountRows] = await pool.execute(
      "SELECT COUNT(*) as count FROM admins"
    );
    const adminCount = (adminCountRows as any[])[0].count;

    if (adminCount === 0) {
      if (adminUsername && adminPassword) {
        if (adminPassword.length < 6) {
          throw new Error(
            "ADMIN_PASSWORD 长度不足 6 位，拒绝创建默认管理员。请在 .env 中设置强密码，或通过 /setup 向导创建。"
          );
        }
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await pool.execute(
          `INSERT INTO admins (username, password) VALUES (?, ?)`,
          [adminUsername, hashedPassword]
        );
        console.log("✓ 默认管理员账号创建成功");
        console.log("  ⚠ 请立即登录后台修改密码，并在 .env 中清除 ADMIN_PASSWORD");
      } else {
        console.log("ℹ admins 表为空且未配置 ADMIN_USERNAME/ADMIN_PASSWORD");
        console.log("  请访问 /setup 向导完成初始化并创建管理员账号");
      }
    } else {
      console.log(`admins 表已有 ${adminCount} 条数据,跳过默认管理员插入`);
    }

    // 纯净系统：不插入任何示例数据
    // 用户应通过 /setup 向导或后台管理界面自行添加考试、教学楼、教室等数据
    console.log("✓ 纯净系统初始化完成（无示例数据）");

    // 创建domains表(域名管理)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domain_name VARCHAR(255) NOT NULL UNIQUE COMMENT '域名',
        is_primary BOOLEAN DEFAULT FALSE COMMENT '是否为主域名',
        cert_status VARCHAR(20) DEFAULT 'pending' COMMENT '证书状态: pending/issued/expired/failed',
        cert_issued_at TIMESTAMP NULL COMMENT '证书颁发时间',
        cert_expires_at TIMESTAMP NULL COMMENT '证书过期时间',
        cert_path VARCHAR(500) NULL COMMENT '证书文件路径',
        cert_key_path VARCHAR(500) NULL COMMENT '证书私钥路径',
        last_checked_at TIMESTAMP NULL COMMENT '上次检查时间',
        error_message TEXT NULL COMMENT '错误信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain_name (domain_name),
        INDEX idx_cert_status (cert_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ domains 表创建成功");

    // ==================== 执行 init.sql 补充缺失的表结构 ====================
    // run.ts 仅创建核心表，其余表(teacher_roles, teachers, classes, students,
    // exam_students, exam_invigilators, ip_blacklist, classroom_login_logs,
    // classroom_trusted_ips, classroom_countdowns 等)统一从 init.sql 读取并执行。
    try {
      // 优先查找同目录下的 init.sql;若运行编译后的 JS(dist/migrations/run.js)
      // 则回退到源码目录(src/migrations/init.sql)查找
      const candidatePaths = [
        path.join(__dirname, "init.sql"),
        path.join(__dirname, "..", "..", "src", "migrations", "init.sql"),
      ];
      const initSqlPath = candidatePaths.find((p) => fs.existsSync(p));
      if (initSqlPath) {
        const initSql = fs.readFileSync(initSqlPath, "utf-8");
        // 移除注释行,避免干扰分割
        const cleanedSql = initSql
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n");
        // 按分号分割并执行每条语句
        const statements = cleanedSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          // 跳过会导致问题的语句:
          // - CREATE DATABASE / USE: 连接池已指定数据库,避免切换到错误的库
          // - "INSERT INTO exams" 非 IGNORE 语句: run.ts 已插入示例考试数据,
          //   重复执行会因 exams 表无唯一键而插入重复数据
          const upperStmt = stmt.toUpperCase().replace(/\s+/g, " ");
          if (
            upperStmt.startsWith("CREATE DATABASE") ||
            upperStmt.startsWith("USE ") ||
            /^INSERT\s+INTO\s+EXAMS\s/.test(upperStmt)
          ) {
            continue;
          }

          try {
            await pool.execute(stmt);
          } catch (err: any) {
            // 忽略"已存在"类错误,避免破坏已有数据
            if (
              err.code !== "ER_TABLE_EXISTS_ERROR" &&
              err.code !== "ER_DUP_ENTRY" &&
              err.code !== "ER_MULTIPLE_PRI_KEY" &&
              err.code !== "ER_DUP_FIELDNAME" &&
              err.code !== "ER_DUP_KEYNAME"
            ) {
              console.log(
                "init.sql 语句执行跳过:",
                stmt.substring(0, 60).replace(/\s+/g, " "),
                "→",
                err.message?.substring(0, 80)
              );
            }
          }
        }
        console.log("✓ init.sql 执行完成");
      } else {
        console.log("ℹ 未找到 init.sql,跳过补充表结构");
      }
    } catch (err) {
      console.error("执行 init.sql 时出错:", err);
    }

    console.log("数据库初始化完成!");
    process.exit(0);
  } catch (error) {
    console.error("数据库初始化失败:", error);
    process.exit(1);
  }
}

runMigration();

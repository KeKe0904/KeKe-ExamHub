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

dotenv.config();

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
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

    // 插入默认管理员(已存在则更新密码)
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await pool.execute(
      `INSERT INTO admins (username, password) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [adminUsername, hashedPassword]
    );
    console.log("✓ 默认管理员账号创建成功");

    // 插入示例考试数据(如果exams表为空)
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM exams");
    const count = (rows as any[])[0].count;

    if (count === 0) {
      const sampleExams = [
        {
          subject: "高等数学(下)",
          examDate: "2026-07-05 09:00:00",
          duration: 120,
          location: "教学楼A-301",
          invigilator: "王教授",
          notes: "请携带学生证、2B铅笔、黑色签字笔,允许使用计算器(非编程型)",
        },
        {
          subject: "大学英语(四)",
          examDate: "2026-07-08 14:30:00",
          duration: 150,
          location: "教学楼B-105",
          invigilator: "李老师",
          notes: "请携带2B铅笔、橡皮、黑色签字笔,听力部分需自带调频耳机(频率FM 75.0)",
        },
        {
          subject: "数据结构与算法",
          examDate: "2026-07-12 10:00:00",
          duration: 180,
          location: "计算机楼C-201",
          invigilator: "张教授",
          notes: "开卷考试,可携带教材与笔记,禁止使用电子设备。请提前15分钟入场。",
        },
        {
          subject: "中国近现代史纲要",
          examDate: "2026-07-15 14:00:00",
          duration: 120,
          location: "文科楼D-401",
          invigilator: "陈教授",
          notes: "闭卷考试,请携带学生证与黑色签字笔,禁止携带任何资料",
        },
        {
          subject: "线性代数",
          examDate: "2026-06-28 09:00:00",
          duration: 120,
          location: "教学楼A-205",
          invigilator: "刘教授",
          notes: "闭卷考试,允许使用计算器(非编程型),请携带学生证",
        },
      ];

      for (const exam of sampleExams) {
        await pool.execute(
          `INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            exam.subject,
            exam.examDate,
            exam.duration,
            exam.location,
            exam.invigilator,
            exam.notes,
          ]
        );
      }
      console.log("✓ 示例考试数据插入成功");
    } else {
      console.log(`exams 表已有 ${count} 条数据,跳过示例数据插入`);
    }

    console.log("数据库初始化完成!");
    process.exit(0);
  } catch (error) {
    console.error("数据库初始化失败:", error);
    process.exit(1);
  }
}

runMigration();

-- ExamHub 数据库初始化脚本(表结构 + 示例数据)
--
-- 说明:
--   本脚本仅创建表结构与示例考试数据,不创建管理员账号。
--   管理员账号请通过以下任一方式创建:
--     1. 访问 /setup 安装向导(推荐,同时生成 .env)
--     2. 运行 npm run migrate(读取 .env 中的 ADMIN_USERNAME/ADMIN_PASSWORD)
--
-- 用法:
--   mysql -u root -p < api/src/migrations/init.sql

-- 创建数据库
CREATE DATABASE IF NOT EXISTS examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE examhub;

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 兼容已有表:补充 avatar 字段
-- ALTER TABLE admins ADD COLUMN avatar LONGTEXT NULL;

-- 考试信息表
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

-- 公告表
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

-- 系统设置表(键值对存储)
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例考试数据(已存在则跳过)
INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes) VALUES
('高等数学(下)', '2026-07-05 09:00:00', 120, '教学楼A-301', '王教授', '请携带学生证、2B铅笔、黑色签字笔,允许使用计算器(非编程型)'),
('大学英语(四)', '2026-07-08 14:30:00', 150, '教学楼B-105', '李老师', '请携带2B铅笔、橡皮、黑色签字笔,听力部分需自带调频耳机(频率FM 75.0)'),
('数据结构与算法', '2026-07-12 10:00:00', 180, '计算机楼C-201', '张教授', '开卷考试,可携带教材与笔记,禁止使用电子设备。请提前15分钟入场。'),
('中国近现代史纲要', '2026-07-15 14:00:00', 120, '文科楼D-401', '陈教授', '闭卷考试,请携带学生证与黑色签字笔,禁止携带任何资料'),
('线性代数', '2026-06-28 09:00:00', 120, '教学楼A-205', '刘教授', '闭卷考试,允许使用计算器(非编程型),请携带学生证')
ON DUPLICATE KEY UPDATE subject=subject;

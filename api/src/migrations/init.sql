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
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exam_date (exam_date),
  INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 兼容已有表:补充 is_active 字段
-- ALTER TABLE exams ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  publish_at DATETIME NULL COMMENT '定时发布时间(NULL表示立即发布)',
  expire_at DATETIME NULL COMMENT '自动下架时间(NULL表示永不过期)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_publish_at (publish_at),
  INDEX idx_expire_at (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 兼容已有表:补充 publish_at 和 expire_at 字段
-- ALTER TABLE announcements ADD COLUMN publish_at DATETIME NULL COMMENT '定时发布时间(NULL表示立即发布)';
-- ALTER TABLE announcements ADD COLUMN expire_at DATETIME NULL COMMENT '自动下架时间(NULL表示永不过期)';
-- ALTER TABLE announcements ADD INDEX idx_publish_at (publish_at);
-- ALTER TABLE announcements ADD INDEX idx_expire_at (expire_at);

-- 系统设置表(键值对存储)
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 教室端功能相关表 ====================

-- 教学楼表
CREATE TABLE IF NOT EXISTS buildings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 注册码表(后台管理员创建,教室端注册时使用)
CREATE TABLE IF NOT EXISTS registration_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_classroom_id INT NULL COMMENT '使用该注册码的教室ID(应用层维护,不设外键避免循环依赖)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 教室端账号表(注册需审核)
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

-- 考试-教室关联表(一个考试可分配多个教室,一个教室可被多个考试分配)
CREATE TABLE IF NOT EXISTS exam_classrooms (
  exam_id INT NOT NULL,
  classroom_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_id, classroom_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  INDEX idx_classroom_id (classroom_id),
  INDEX idx_exam_classroom (exam_id, classroom_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例考试数据(已存在则跳过)
INSERT INTO exams (subject, exam_date, duration, location, invigilator, notes, is_active) VALUES
('高等数学(下)', '2026-07-05 09:00:00', 120, '教学楼A-301', '王教授', '请携带学生证、2B铅笔、黑色签字笔,允许使用计算器(非编程型)', TRUE),
('大学英语(四)', '2026-07-08 14:30:00', 150, '教学楼B-105', '李老师', '请携带2B铅笔、橡皮、黑色签字笔,听力部分需自带调频耳机(频率FM 75.0)', TRUE),
('数据结构与算法', '2026-07-12 10:00:00', 180, '计算机楼C-201', '张教授', '开卷考试,可携带教材与笔记,禁止使用电子设备。请提前15分钟入场。', TRUE),
('中国近现代史纲要', '2026-07-15 14:00:00', 120, '文科楼D-401', '陈教授', '闭卷考试,请携带学生证与黑色签字笔,禁止携带任何资料', TRUE),
('线性代数', '2026-06-28 09:00:00', 120, '教学楼A-205', '刘教授', '闭卷考试,允许使用计算器(非编程型),请携带学生证', TRUE)
ON DUPLICATE KEY UPDATE subject=subject;

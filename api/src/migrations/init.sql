-- ExamHub 数据库初始化脚本(表结构)
--
-- 说明:
--   本脚本仅创建表结构,不创建管理员账号,不插入示例数据。
--   管理员账号请通过以下任一方式创建:
--     1. 访问 /setup 安装向导(推荐,同时生成 .env)
--     2. 运行 npm run migrate(读取 .env 中的 ADMIN_USERNAME/ADMIN_PASSWORD)
--
-- 用法:
--   mysql -u root -p examhub < api/src/migrations/init.sql
--   (数据库需提前创建,脚本不在内部 CREATE DATABASE / USE)

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

-- ==================== 教师身份表 ====================
CREATE TABLE IF NOT EXISTS teacher_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '身份名称，如：语文老师、数学老师、监考老师',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认教师身份
INSERT IGNORE INTO teacher_roles (name, sort_order) VALUES
('语文老师', 1),
('数学老师', 2),
('英语老师', 3),
('物理老师', 4),
('化学老师', 5),
('生物老师', 6),
('历史老师', 7),
('地理老师', 8),
('政治老师', 9),
('监考老师', 99);

-- ==================== 教师表 ====================
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_no VARCHAR(30) NULL COMMENT '教师工号',
  password VARCHAR(255) NULL COMMENT '登录密码',
  name VARCHAR(50) NOT NULL COMMENT '教师姓名',
  role_id INT NULL COMMENT '教师身份ID',
  phone VARCHAR(20) NULL COMMENT '联系电话',
  email VARCHAR(100) NULL COMMENT '邮箱',
  notes VARCHAR(255) NULL COMMENT '备注',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  is_first_login BOOLEAN DEFAULT TRUE COMMENT '是否首次登录',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_role_id (role_id),
  UNIQUE INDEX idx_teacher_no (teacher_no),
  FOREIGN KEY (role_id) REFERENCES teacher_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例教师
INSERT IGNORE INTO teachers (name, role_id, notes) VALUES
('王教授', 2, '数学系主任'),
('李老师', 3, '英语组组长'),
('张教授', 7, '计算机教师'),
('陈教授', 9, '历史教师'),
('刘教授', 2, '线性代数教师');

-- ==================== 考试-监考老师关联表 ====================
CREATE TABLE IF NOT EXISTS exam_invigilators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  teacher_id INT NOT NULL,
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_exam_teacher (exam_id, teacher_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  INDEX idx_exam_id (exam_id),
  INDEX idx_teacher_id (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 教室端倒计时表 ====================
CREATE TABLE IF NOT EXISTS classroom_countdowns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT NOT NULL COMMENT '教室端账号ID',
  title VARCHAR(100) NOT NULL COMMENT '倒计时标题，如：高考倒计时',
  target_date DATETIME NOT NULL COMMENT '目标日期',
  description VARCHAR(255) NULL COMMENT '描述',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_classroom_id (classroom_id),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== IP 黑名单表 ====================
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE COMMENT 'IPv4 或 IPv6 地址',
  reason VARCHAR(255) NULL COMMENT '封禁原因',
  banned_by VARCHAR(50) NULL COMMENT '封禁管理员',
  expires_at DATETIME NULL COMMENT '过期时间(NULL表示永久封禁)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ip_address (ip_address),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 教室端登录日志表 ====================
CREATE TABLE IF NOT EXISTS classroom_login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT NOT NULL COMMENT '教室端账号ID',
  ip_address VARCHAR(45) NOT NULL COMMENT '登录IP',
  user_agent TEXT NULL COMMENT '浏览器UA',
  device_info TEXT NULL COMMENT '设备信息(JSON)',
  location VARCHAR(255) NULL COMMENT 'IP归属地(预留)',
  status ENUM('success', 'failed', 'pending_review', 'blocked') DEFAULT 'success',
  is_abnormal BOOLEAN DEFAULT FALSE COMMENT '是否异常登录',
  abnormal_reason VARCHAR(255) NULL COMMENT '异常原因',
  review_status ENUM('pending', 'approved', 'rejected') NULL COMMENT '审核状态(异常登录时)',
  reviewed_by INT NULL COMMENT '审核管理员ID',
  reviewed_at DATETIME NULL COMMENT '审核时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_classroom_id (classroom_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  INDEX idx_review_status (review_status),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 教室端常用IP表 ====================
CREATE TABLE IF NOT EXISTS classroom_trusted_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL COMMENT '可信IP地址',
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '首次出现时间',
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后出现时间',
  login_count INT DEFAULT 1 COMMENT '该IP登录次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_classroom_ip (classroom_id, ip_address),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 纯净系统：不插入示例数据，用户应通过后台管理界面自行添加

-- ==================== 班级表 ====================
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '班级名称，如：高三1班',
  grade VARCHAR(20) NULL COMMENT '年级，如：高一、高二、高三',
  head_teacher_id INT NULL COMMENT '班主任ID',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_grade (grade),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (head_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 学生表 ====================
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_no VARCHAR(30) NOT NULL UNIQUE COMMENT '学号',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  password VARCHAR(255) NOT NULL COMMENT 'bcrypt加密，默认密码为学号后6位',
  class_id INT NULL COMMENT '班级ID',
  gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
  phone VARCHAR(20) NULL COMMENT '联系电话',
  id_card VARCHAR(18) NULL COMMENT '身份证号',
  is_first_login BOOLEAN DEFAULT TRUE COMMENT '首次登录标记',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  status ENUM('active', 'suspended', 'graduated') DEFAULT 'active' COMMENT '状态',
  notes VARCHAR(255) NULL COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_no (student_no),
  INDEX idx_name (name),
  INDEX idx_class_id (class_id),
  INDEX idx_status (status),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 考试-学生-教室关联表 ====================
CREATE TABLE IF NOT EXISTS exam_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  classroom_id INT NOT NULL COMMENT '考试在哪间教室',
  student_id INT NOT NULL,
  seat_number VARCHAR(20) NULL COMMENT '座位号',
  score DECIMAL(5,1) NULL COMMENT '分数（预留成绩字段）',
  status ENUM('normal', 'absent', 'cheating') DEFAULT 'normal' COMMENT '考试状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_exam_student (exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_exam_id (exam_id),
  INDEX idx_student_id (student_id),
  INDEX idx_classroom_id (classroom_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 管理员操作日志表 ====================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 域名管理表 ====================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== 教师表扩展字段（教师端登录功能） ====================
-- 以下语句用于已部署系统的表结构升级，新安装会自动包含在 CREATE TABLE 中
-- ALTER TABLE teachers ADD COLUMN teacher_no VARCHAR(30) NULL COMMENT '教师工号' AFTER id;
-- ALTER TABLE teachers ADD COLUMN password VARCHAR(255) NULL COMMENT '登录密码' AFTER teacher_no;
-- ALTER TABLE teachers ADD COLUMN is_first_login BOOLEAN DEFAULT TRUE COMMENT '是否首次登录' AFTER password;
-- ALTER TABLE teachers ADD UNIQUE INDEX idx_teacher_no (teacher_no);

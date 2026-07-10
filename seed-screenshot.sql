-- KeKe ExamHub 截图专用测试数据
-- 与参赛帖中"预置测试数据一览"保持一致

SET FOREIGN_KEY_CHECKS = 0;

-- 更新管理员密码（确保与参赛帖一致）
UPDATE admins SET password = '$2a$10$604tTmUpdhJas1RwiNhbXOwBYt1adz2BEP0q1rAliX3jipKPDdoUa' WHERE username = 'admin';

-- 清空并重置相关表
TRUNCATE TABLE admin_logs;
TRUNCATE TABLE classroom_login_logs;
TRUNCATE TABLE classroom_trusted_ips;
TRUNCATE TABLE exam_students;
TRUNCATE TABLE exam_invigilators;
TRUNCATE TABLE exam_classrooms;
TRUNCATE TABLE classroom_countdowns;
TRUNCATE TABLE classrooms;
TRUNCATE TABLE registration_codes;
TRUNCATE TABLE buildings;
TRUNCATE TABLE students;
TRUNCATE TABLE classes;
TRUNCATE TABLE teachers;
TRUNCATE TABLE exams;
TRUNCATE TABLE announcements;

SET FOREIGN_KEY_CHECKS = 1;

-- 教学楼
INSERT INTO buildings (id, name) VALUES
(1, '1号楼'),
(2, '2号楼'),
(3, '3号楼');

-- 注册码
INSERT INTO registration_codes (id, code, is_used, used_by_classroom_id, used_at) VALUES
(1, 'REG-101', TRUE, 1, NOW()),
(2, 'REG-201', TRUE, 2, NOW()),
(3, 'REG-202', TRUE, 3, NOW()),
(4, 'REG-301', TRUE, 4, NOW());

-- 教室端账号（全部已审核）
INSERT INTO classrooms (id, building_id, room_number, password, registration_code_id, status, created_at) VALUES
(1, 1, '101', '$2a$10$604tTmUpdhJas1RwiNhbXOWzw0UNPxbhngNmyqzx8818h/s5ALwiG', 1, 'approved', NOW()),
(2, 2, '201', '$2a$10$604tTmUpdhJas1RwiNhbXOWzw0UNPxbhngNmyqzx8818h/s5ALwiG', 2, 'approved', NOW()),
(3, 2, '202', '$2a$10$604tTmUpdhJas1RwiNhbXOWzw0UNPxbhngNmyqzx8818h/s5ALwiG', 3, 'approved', NOW()),
(4, 3, '301', '$2a$10$604tTmUpdhJas1RwiNhbXOWzw0UNPxbhngNmyqzx8818h/s5ALwiG', 4, 'approved', NOW());

-- 教师
INSERT INTO teachers (id, teacher_no, password, name, role_id, phone, email, notes, is_active, is_first_login) VALUES
(1, 'T001', '$2a$10$dDjlcBElIGG/UorR1vkD0O3MvjzqAD/2zey3043RZG8ToRfQKemmy', '张老师', 1, '13800138001', 'zhang@example.com', '语文教师', TRUE, FALSE),
(2, 'T002', '$2a$10$dDjlcBElIGG/UorR1vkD0O3MvjzqAD/2zey3043RZG8ToRfQKemmy', '李老师', 2, '13800138002', 'li@example.com', '数学教师', TRUE, FALSE),
(3, 'T003', '$2a$10$dDjlcBElIGG/UorR1vkD0O3MvjzqAD/2zey3043RZG8ToRfQKemmy', '王老师', 3, '13800138003', 'wang@example.com', '英语教师', TRUE, FALSE),
(4, 'T004', '$2a$10$dDjlcBElIGG/UorR1vkD0O3MvjzqAD/2zey3043RZG8ToRfQKemmy', '赵老师', 4, '13800138004', 'zhao@example.com', '物理教师', TRUE, FALSE);

-- 班级
INSERT INTO classes (id, name, grade, head_teacher_id, sort_order) VALUES
(1, '高三(1)班', '高三', 1, 1),
(2, '高三(2)班', '高三', 2, 2),
(3, '高二(1)班', '高二', 3, 3);

-- 学生
INSERT INTO students (id, student_no, name, password, class_id, gender, phone, status, notes, is_first_login) VALUES
(1, 'S20250001', '李同学', '$2a$10$UB201wFN/wk4LktGuUib7OuIfDcLkCiPqgqUseMZ7OtdmOvBp5ra6', 1, 'male', '13900139001', 'active', '高三1班', FALSE),
(2, 'S20250002', '王同学', '$2a$10$UB201wFN/wk4LktGuUib7OuIfDcLkCiPqgqUseMZ7OtdmOvBp5ra6', 1, 'female', '13900139002', 'active', '高三1班', FALSE),
(3, 'S20250003', '刘同学', '$2a$10$UB201wFN/wk4LktGuUib7OuIfDcLkCiPqgqUseMZ7OtdmOvBp5ra6', 2, 'male', '13900139003', 'active', '高三2班', FALSE),
(4, 'S20250004', '陈同学', '$2a$10$UB201wFN/wk4LktGuUib7OuIfDcLkCiPqgqUseMZ7OtdmOvBp5ra6', 3, 'female', '13900139004', 'active', '高二1班', FALSE),
(5, 'S20250005', '杨同学', '$2a$10$UB201wFN/wk4LktGuUib7OuIfDcLkCiPqgqUseMZ7OtdmOvBp5ra6', 3, 'male', '13900139005', 'active', '高二1班', FALSE);

-- 期末考试（8场，7.15-7.18）
INSERT INTO exams (id, subject, exam_date, duration, location, invigilator, notes, is_active) VALUES
(1, '数学', '2026-07-15 09:00:00', 120, '1号楼101', '张老师', '请带好2B铅笔、橡皮和计算器', TRUE),
(2, '语文', '2026-07-15 14:00:00', 120, '1号楼101', '李老师', '请带好黑色签字笔和2B铅笔', TRUE),
(3, '英语', '2026-07-16 09:00:00', 120, '2号楼201', '王老师', '请带好收音机和耳机', TRUE),
(4, '物理', '2026-07-16 14:00:00', 90, '2号楼201', '赵老师', '请带好直尺、圆规和计算器', TRUE),
(5, '化学', '2026-07-17 09:00:00', 90, '2号楼202', '张老师', '请带好元素周期表和计算器', TRUE),
(6, '生物', '2026-07-17 14:00:00', 90, '2号楼202', '李老师', '请带好彩色铅笔', TRUE),
(7, '历史', '2026-07-18 09:00:00', 90, '3号楼301', '王老师', '请带好历史时间轴资料', TRUE),
(8, '地理', '2026-07-18 14:00:00', 90, '3号楼301', '赵老师', '请带好地图册', TRUE);

-- 公告
INSERT INTO announcements (id, title, content, is_pinned, is_active, publish_at) VALUES
(1, '期末考试安排', '本学期期末考试将于7月15日至7月18日进行，请各位同学认真复习，按时参加考试。', TRUE, TRUE, NOW()),
(2, '考试纪律', '考试期间严禁携带手机、智能手表等电子设备，严格遵守考场纪律，诚信应考。', FALSE, TRUE, NOW()),
(3, '欢迎体验 KeKe ExamHub', 'KeKe ExamHub 是学校考试信息数字化管理平台，祝大家使用愉快！', FALSE, TRUE, NOW());

-- 考试-教室关联
INSERT INTO exam_classrooms (exam_id, classroom_id) VALUES
(1, 1), (2, 1),
(3, 2), (4, 2),
(5, 3), (6, 3),
(7, 4), (8, 4);

-- 考试-监考老师关联
INSERT INTO exam_invigilators (exam_id, teacher_id) VALUES
(1, 1), (2, 2),
(3, 3), (4, 4),
(5, 1), (6, 2),
(7, 3), (8, 4);

-- 考试-学生-教室关联（座位号）
INSERT INTO exam_students (exam_id, classroom_id, student_id, seat_number, status) VALUES
(1, 1, 1, '01', 'normal'), (1, 1, 2, '02', 'normal'),
(2, 1, 1, '01', 'normal'), (2, 1, 2, '02', 'normal'),
(3, 2, 3, '01', 'normal'), (3, 2, 1, '02', 'normal'),
(4, 2, 3, '01', 'normal'), (4, 2, 1, '02', 'normal'),
(5, 3, 4, '01', 'normal'), (5, 3, 5, '02', 'normal'),
(6, 3, 4, '01', 'normal'), (6, 3, 5, '02', 'normal'),
(7, 4, 2, '01', 'normal'), (7, 4, 3, '02', 'normal'),
(8, 4, 2, '01', 'normal'), (8, 4, 3, '02', 'normal');

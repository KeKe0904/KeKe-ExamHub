// 考试状态类型
export type ExamStatus = "upcoming" | "ongoing" | "ended";

// 考试信息类型
export interface Exam {
  id: string;
  subject: string;
  examDate: string; // ISO 8601 格式
  duration: number; // 分钟
  location: string;
  invigilator: string;
  notes: string;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
}

// 管理员类型
export interface Admin {
  username: string;
  password: string;
}

// 考试表单输入类型
export interface ExamInput {
  subject: string;
  examDate: string;
  duration: number;
  location: string;
  invigilator: string;
  notes: string;
}

// 倒计时数据
export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFinished: boolean;
}

// 统计数据
export interface ExamStats {
  total: number;
  upcoming: number;
  ongoing: number;
  ended: number;
}

// 进行中的考试
export interface OngoingExam {
  id: string;
  subject: string;
  examDate: string;
  duration: number;
  location: string;
  progress: number;
  startTime: string;
  endTime: string;
}

// 即将开始的考试
export interface UpcomingExam {
  id: string;
  subject: string;
  examDate: string;
  duration: number;
  location: string;
}

// 最近结束的考试
export interface RecentEndedExam {
  id: string;
  subject: string;
  examDate: string;
  duration: number;
  location: string;
  endedAt: string;
}

// 教学楼统计
export interface BuildingStat {
  name: string;
  examCount: number;
  classroomCount: number;
}

// 数据大屏数据
export interface DashboardStats {
  totalExams: number;
  upcomingExams: number;
  ongoingExams: number;
  endedExams: number;
  todayExams: number;
  totalClassrooms: number;
  totalBuildings: number;
  activeClassrooms: number;
  classroomUtilization: number;
  ongoingExamList: OngoingExam[];
  upcomingExamList: UpcomingExam[];
  recentEndedList: RecentEndedExam[];
  buildingStats: BuildingStat[];
}

// ==================== 教室端相关类型 ====================

// 教学楼
export interface Building {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// 注册码
export interface RegistrationCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedByClassroomId: string | null;
  createdAt: string;
  usedAt: string | null;
}

// 教室审核状态
export type ClassroomStatus = "pending" | "approved" | "rejected";

// 教室端账号
export interface Classroom {
  id: string;
  buildingId: string;
  buildingName: string;
  roomNumber: string;
  registrationCodeId: string;
  status: ClassroomStatus;
  rejectReason: string;
  createdAt: string;
  updatedAt: string;
}

// 教室端登录响应
export interface ClassroomLoginResult {
  token?: string;
  classroomId?: string;
  buildingName?: string;
  roomNumber?: string;
  status: "pending" | "approved" | "rejected" | "pending_review";
  reason?: string;
  message?: string;
  ip?: string;
  logId?: string;
}

// 教师
export interface Teacher {
  id: string;
  name: string;
  roleId: string | null;
  roleName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 教室端信息(存入 Cookie)
export interface ClassroomInfo {
  classroomId: string;
  buildingName: string;
  roomNumber: string;
}

// 考试冲突信息
export interface ExamConflict {
  examId: string;
  subject: string;
  examDate: string;
  duration: number;
  classroomId: string;
  classroomName: string;
  buildingName: string;
}

// ==================== 公告相关类型 ====================

// 公告状态
export type AnnouncementStatus = 'scheduled' | 'active' | 'expired';

// 公告信息
export interface Announcement {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  publishAt: string | null;
  expireAt: string | null;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
}

// ==================== 域名管理相关类型 ====================

export type CertStatus = "pending" | "issued" | "expired" | "failed";

export interface Domain {
  id: string;
  domainName: string;
  isPrimary: boolean;
  certStatus: CertStatus;
  certIssuedAt: string | null;
  certExpiresAt: string | null;
  certPath: string | null;
  certKeyPath: string | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainAccessCheck {
  allowed: boolean;
  isIp: boolean;
  primaryDomain: string | null;
  redirectTo?: string;
  message?: string;
}

// ==================== 学生端相关类型 ====================

// 班级
export interface Class {
  id: string;
  name: string;
  grade: string | null;
  headTeacherId: string | null;
  headTeacherName?: string;
  sortOrder: number;
  isActive: boolean;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 学生
export interface Student {
  id: string;
  studentNo: string;
  name: string;
  classId: string | null;
  className?: string;
  grade?: string;
  gender: 'male' | 'female' | 'unknown';
  phone: string | null;
  idCard: string | null;
  isFirstLogin: boolean;
  lastLoginAt: string | null;
  status: 'active' | 'suspended' | 'graduated';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// 学生考试信息
export interface StudentExam {
  id: string;
  examId: string;
  subject: string;
  examDate: string;
  duration: number;
  classroomId: string;
  classroomName: string;
  buildingName: string;
  seatNumber: string | null;
  score: number | null;
  status: 'normal' | 'absent' | 'cheating';
  examStatus: 'upcoming' | 'ongoing' | 'ended';
}

// 考试学生分配信息
export interface ExamStudent {
  id: string;
  examId: string;
  classroomId: string | null;
  classroomName: string;
  buildingName: string;
  studentId: string;
  studentNo: string;
  name: string;
  classId: string | null;
  className: string;
  grade: string;
  gender: string;
  seatNumber: string;
  score: number | null;
  status: 'normal' | 'absent' | 'cheating';
}

// 学生登录结果
export interface StudentLoginResult {
  token: string;
  student: Student;
  isFirstLogin: boolean;
}

// ==================== 教师端相关类型 ====================

// 教师（教师端）
export interface TeacherInfo {
  id: string;
  teacherNo: string;
  name: string;
  roleId: string | null;
  roleName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  isFirstLogin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 教师端班级
export interface TeacherClass {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

// 教师端学生
export interface TeacherStudent {
  id: string;
  studentNo: string;
  name: string;
  classId: string | null;
  className: string;
  gender: string;
  phone: string;
  status: string;
  notes: string;
  createdAt: string;
}

// 教师端考试
export interface TeacherExam {
  id: string;
  subject: string;
  examDate: string;
  duration: number;
  location: string;
  notes: string;
  status: 'upcoming' | 'ongoing' | 'ended';
}

// 教师登录结果
export interface TeacherLoginResult {
  token: string;
  teacher: TeacherInfo;
}

// ==================== Cookie 相关类型 ====================

export type CookieSameSite = "strict" | "lax" | "none";

export interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: CookieSameSite;
}

export type CookieCategory = "essential" | "functional" | "analytics" | "preferences";

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  preferences: boolean;
}

export interface CookieConsentData {
  preferences: CookiePreferences;
  consentedAt: string;
  version: string;
}

export type Theme = "light" | "dark";

export type Language = "zh-CN" | "en-US";

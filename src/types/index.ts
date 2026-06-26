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
  status: "pending" | "approved" | "rejected";
  reason?: string;
}

// 教室端信息(存入 Cookie)
export interface ClassroomInfo {
  classroomId: string;
  buildingName: string;
  roomNumber: string;
}

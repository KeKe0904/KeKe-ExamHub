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

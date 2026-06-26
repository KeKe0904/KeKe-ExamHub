/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
// 统一响应格式
export function successResponse<T>(data: T, message: string = "操作成功") {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code: string = "ERROR") {
  return {
    success: false,
    message,
    code,
  };
}

// 考试数据类型
export interface ExamRow {
  id: number;
  subject: string;
  exam_date: Date;
  duration: number;
  location: string;
  invigilator: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// 转换数据库行为前端格式
export function formatExam(row: ExamRow) {
  return {
    id: String(row.id),
    subject: row.subject,
    examDate: row.exam_date.toISOString(),
    duration: row.duration,
    location: row.location,
    invigilator: row.invigilator,
    notes: row.notes || "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ==================== 教室端相关类型和格式化函数 ====================

// 教学楼行类型
export interface BuildingRow {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export function formatBuilding(row: BuildingRow) {
  return {
    id: String(row.id),
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// 注册码行类型
export interface RegistrationCodeRow {
  id: number;
  code: string;
  is_used: number;
  used_by_classroom_id: number | null;
  created_at: Date;
  used_at: Date | null;
}

export function formatRegistrationCode(row: RegistrationCodeRow) {
  return {
    id: String(row.id),
    code: row.code,
    isUsed: Boolean(row.is_used),
    usedByClassroomId: row.used_by_classroom_id ? String(row.used_by_classroom_id) : null,
    createdAt: row.created_at.toISOString(),
    usedAt: row.used_at ? row.used_at.toISOString() : null,
  };
}

// 教室端账号行类型
export interface ClassroomRow {
  id: number;
  building_id: number;
  room_number: string;
  password: string;
  registration_code_id: number;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export function formatClassroom(row: ClassroomRow & { building_name?: string }) {
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    buildingName: row.building_name || "",
    roomNumber: row.room_number,
    registrationCodeId: String(row.registration_code_id),
    status: row.status,
    rejectReason: row.reject_reason || "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

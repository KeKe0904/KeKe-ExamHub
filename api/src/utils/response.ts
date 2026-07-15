/**
 * KeKe ExamHub - 考试信息管理系统
 * 统一响应格式与数据库行格式化工具
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 设计说明:
 *   全系统所有 HTTP 接口统一返回 {@link ApiResponse} 结构（success/message/data 或 code），
 *   便于前端用同一套拦截器/类型进行处理；避免每个路由自行拼装响应体。
 *
 *   数据库行（snake_case 列名 + Date 对象）需经对应的 formatXxx 函数转换为
 *   前端友好格式（camelCase 字段名 + ISO 字符串），屏蔽底层 MySQL 列命名与
 *   Date 序列化差异，便于二次开发与跨端复用。
 */

/**
 * 成功响应封装
 * @param data 业务数据（任意类型）
 * @param message 提示信息，默认 "操作成功"
 * @returns 形如 `{ success: true, message, data }` 的响应体
 */
export function successResponse<T>(data: T, message: string = "操作成功") {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * 错误响应封装
 * @param message 错误提示信息（应为已本地化的中文，避免直接透传上游英文错误）
 * @param code 错误代码，默认 "ERROR"，可由调用方传入细分错误码以便前端识别
 * @returns 形如 `{ success: false, message, code }` 的响应体
 */
export function errorResponse(message: string, code: string = "ERROR") {
  return {
    success: false,
    message,
    code,
  };
}

// ==================== 考试相关 ====================

/**
 * exams 表行类型（mysql2 返回的 Date 对象已自动从 DATETIME 解析）
 */
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

/**
 * 将 exams 表行转换为前端使用的考试对象
 * - id 转字符串，避免前端 Number 精度丢失（大整数 ID）
 * - Date 统一序列化为 ISO 字符串
 * - notes 为 null 时降级为空字符串，避免前端判空逻辑分散
 */
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

// ==================== 教室端相关 ====================

/**
 * buildings 表行类型（教学楼）
 */
export interface BuildingRow {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 将 buildings 表行转换为前端教学楼对象
 */
export function formatBuilding(row: BuildingRow) {
  return {
    id: String(row.id),
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * registration_codes 表行类型（教室端注册码）
 * 注意: is_used 在数据库中为 TINYINT(1)，mysql2 默认返回 number，需经 Boolean() 转换
 */
export interface RegistrationCodeRow {
  id: number;
  code: string;
  is_used: number;
  used_by_classroom_id: number | null;
  created_at: Date;
  used_at: Date | null;
}

/**
 * 将 registration_codes 表行转换为前端注册码对象
 */
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

/**
 * classrooms 表行类型（教室端账号）
 * - status: pending(待审核) / approved(已通过) / rejected(已驳回)
 * - password 字段仅用于后端比对，formatClassroom 不会输出该字段，避免密码泄露
 */
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

/**
 * 将 classrooms 表行转换为前端教室端对象
 * @param row 数据库行，可选 building_name（来自 JOIN 查询）
 */
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
    // 注意: 不返回 password 字段，避免密码哈希泄露到前端
  };
}

// ==================== 域名管理相关 ====================

/**
 * domains 表行类型（域名与 SSL 证书状态）
 */
export interface DomainRow {
  id: number;
  domain_name: string;
  is_primary: number;
  cert_status: string;
  cert_issued_at: Date | null;
  cert_expires_at: Date | null;
  cert_path: string | null;
  cert_key_path: string | null;
  last_checked_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 将 domains 表行转换为前端域名对象
 * - cert_status 转换为受控联合类型，便于前端类型安全判断
 * - cert_path / cert_key_path 仅管理员可见，调用方需自行控制权限
 */
export function formatDomain(row: DomainRow) {
  return {
    id: String(row.id),
    domainName: row.domain_name,
    isPrimary: Boolean(row.is_primary),
    certStatus: row.cert_status as "pending" | "issued" | "expired" | "failed",
    certIssuedAt: row.cert_issued_at ? row.cert_issued_at.toISOString() : null,
    certExpiresAt: row.cert_expires_at ? row.cert_expires_at.toISOString() : null,
    certPath: row.cert_path,
    certKeyPath: row.cert_key_path,
    lastCheckedAt: row.last_checked_at ? row.last_checked_at.toISOString() : null,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

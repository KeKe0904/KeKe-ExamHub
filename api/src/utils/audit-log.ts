/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest } from "fastify";
import { pool } from "../config/database.js";

/**
 * 安全获取客户端真实 IP
 * 安全修复：使用 request.ip（依赖 Fastify trustProxy 配置），
 * 不再直接信任 X-Forwarded-For 头（可被客户端伪造）
 */
function getClientIpSafe(request: FastifyRequest): string {
  // trustProxy=true 时，Fastify 会正确解析 X-Forwarded-For 并取最右侧可信代理之前的 IP
  // 这比手动取 X-Forwarded-For[0] 更安全，因为后者可被客户端伪造
  return request.ip || "";
}

export type LogAction =
  | "admin_login"
  | "exam_create"
  | "exam_update"
  | "exam_delete"
  | "exam_batch_delete"
  | "exam_batch_update"
  | "exam_assign_classrooms"
  | "exam_unassign_classroom"
  | "announcement_create"
  | "announcement_update"
  | "announcement_delete"
  | "building_create"
  | "building_update"
  | "building_delete"
  | "registration_code_create"
  | "registration_code_delete"
  | "classroom_approve"
  | "classroom_reject"
  | "classroom_delete"
  | "settings_update"
  | "password_change"
  | "avatar_change"
  | "school_info_update"
  | "environment_reinstall"
  | "environment_update"
  | "domain_create"
  | "domain_update"
  | "domain_delete"
  | "domain_cert_issue"
  | "domain_cert_upload"
  | "domain_cert_detect"
  | "ip_blacklist_add"
  | "ip_blacklist_update"
  | "ip_blacklist_delete"
  | "abnormal_login_review"
  | "classroom_abnormal_login"
  | "teacher_create"
  | "teacher_update"
  | "teacher_delete"
  | "teacher_reset_password"
  | "teacher_role_create"
  | "teacher_role_update"
  | "teacher_role_delete"
  | "classroom_countdown_create"
  | "classroom_countdown_update"
  | "classroom_countdown_delete"
  | "class_create"
  | "class_update"
  | "class_delete"
  | "student_create"
  | "student_update"
  | "student_delete"
  | "student_batch_create"
  | "student_reset_password"
  | "exam_assign_students"
  | "exam_update_student"
  | "exam_remove_student"
  | "exam_assign_students_by_class"
  // === AI 助手相关 ===
  | "ai_config_update"
  | "ai_chat"
  | "ai_tool_execute"
  | "ai_connection_test"
  | "ai_models_fetch"
  | "ai_error";

export async function logAdminAction(
  adminId: number,
  adminUsername: string,
  action: LogAction,
  details?: Record<string, any>,
  request?: FastifyRequest
) {
  try {
    // 安全修复：使用 request.ip 获取真实 IP，不再直接信任 X-Forwarded-For
    const ip = request ? getClientIpSafe(request) : "";
    await pool.execute(
      `INSERT INTO admin_logs (admin_id, admin_username, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername,
        action,
        details ? JSON.stringify(details) : null,
        ip,
      ]
    );
  } catch (error) {
    console.error("记录操作日志失败:", error);
  }
}

export async function logAdminActionWithIp(
  adminId: number,
  adminUsername: string,
  action: LogAction,
  ipAddress: string,
  details?: Record<string, any>
) {
  try {
    await pool.execute(
      `INSERT INTO admin_logs (admin_id, admin_username, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername,
        action,
        details ? JSON.stringify(details) : null,
        ipAddress || "",
      ]
    );
  } catch (error) {
    console.error("记录操作日志失败:", error);
  }
}

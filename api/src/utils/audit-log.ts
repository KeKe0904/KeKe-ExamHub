/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { pool } from "../config/database.js";

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
  | "environment_update";

export async function logAdminAction(
  adminId: number,
  adminUsername: string,
  action: LogAction,
  details?: Record<string, any>
) {
  try {
    const ip = "";
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

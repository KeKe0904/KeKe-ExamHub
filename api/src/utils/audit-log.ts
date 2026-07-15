/**
 * KeKe ExamHub - 考试信息管理系统
 * 管理员操作审计日志工具
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 设计说明:
 *   所有管理员（含 AI 助手代为执行）的敏感操作都应通过本工具写入 admin_logs 表，
 *   形成完整审计链路，便于事后追溯、合规检查与异常行为检测。
 *   日志写入失败不应中断业务流程，故全部 catch 后仅 console.error，不抛出异常。
 *
 * 安全修复（v1.1.6.1）:
 *   旧实现直接读取 request.headers["x-forwarded-for"]，可被客户端伪造 IP，
 *   攻击者可借此伪造审计日志，规避异常登录检测与封禁策略。
 *   现统一改为 request.ip（依赖 Fastify trustProxy 配置，仅在配置的可信代理后生效），
 *   保证日志中记录的 IP 为经过可信代理链验证后的真实客户端 IP。
 */
import type { FastifyRequest } from "fastify";
import { pool } from "../config/database.js";

/**
 * 安全获取客户端真实 IP
 *
 * 使用 request.ip 而非手动解析 X-Forwarded-For：
 *   - request.ip 受 Fastify trustProxy 配置控制，仅在配置的可信代理（如 Nginx）之后才解析 XFF
 *   - 手动取 X-Forwarded-For[0] 可被客户端伪造（攻击者随意设置该头）
 *
 * @param request Fastify 请求对象
 * @returns 客户端真实 IP 字符串，无法获取时返回空串
 */
function getClientIpSafe(request: FastifyRequest): string {
  // trustProxy=true 时，Fastify 会按 X-Forwarded-For 从右向左跳过可信代理，取首个不可信 IP
  // 详见 server.ts 中 fastify.register(@fastify/jwt) 附近的 trustProxy 配置说明
  return request.ip || "";
}

/**
 * 管理员操作日志动作枚举（写入 admin_logs.action 字段）
 *
 * 命名约定: <资源>_<动作>，新增动作时务必同步更新前端审计日志页面的中英文映射表。
 *   - *_create / *_update / *_delete: 资源的增改删
 *   - *_batch_*: 批量操作
 *   - classroom_abnormal_login: 系统自动记录的非常用 IP 登录事件（admin_id=0, admin_username="system"）
 *   - abnormal_login_review: 管理员对异常登录的审核结果
 *   - ai_*: AI 助手相关动作
 */
export type LogAction =
  | "admin_login"
  // === 考试管理 ===
  | "exam_create"
  | "exam_update"
  | "exam_delete"
  | "exam_batch_delete"
  | "exam_batch_update"
  | "exam_assign_classrooms"
  | "exam_unassign_classroom"
  | "exam_assign_students"
  | "exam_update_student"
  | "exam_remove_student"
  | "exam_assign_students_by_class"
  // === 公告管理 ===
  | "announcement_create"
  | "announcement_update"
  | "announcement_delete"
  // === 教学楼与教室端 ===
  | "building_create"
  | "building_update"
  | "building_delete"
  | "registration_code_create"
  | "registration_code_delete"
  | "classroom_approve"
  | "classroom_reject"
  | "classroom_delete"
  | "classroom_countdown_create"
  | "classroom_countdown_update"
  | "classroom_countdown_delete"
  // === 系统设置与个人资料 ===
  | "settings_update"
  | "password_change"
  | "avatar_change"
  | "school_info_update"
  | "environment_reinstall"
  | "environment_update"
  // === 域名与证书 ===
  | "domain_create"
  | "domain_update"
  | "domain_delete"
  | "domain_cert_issue"
  | "domain_cert_upload"
  | "domain_cert_detect"
  // === 安全中心 ===
  | "ip_blacklist_add"
  | "ip_blacklist_update"
  | "ip_blacklist_delete"
  | "abnormal_login_review"
  | "classroom_abnormal_login" // 系统自动写入，非管理员主动操作
  // === 教师 / 班级 / 学生 ===
  | "teacher_create"
  | "teacher_update"
  | "teacher_delete"
  | "teacher_reset_password"
  | "teacher_role_create"
  | "teacher_role_update"
  | "teacher_role_delete"
  | "class_create"
  | "class_update"
  | "class_delete"
  | "student_create"
  | "student_update"
  | "student_delete"
  | "student_batch_create"
  | "student_reset_password"
  // === AI 助手相关 ===
  | "ai_config_update"
  | "ai_chat"
  | "ai_tool_execute" // AI 工具调用（dangerous 级别会单独二次记录确认结果）
  | "ai_connection_test"
  | "ai_models_fetch"
  | "ai_error";

/**
 * 记录管理员操作日志（自动从 request 提取客户端 IP）
 *
 * 适用场景: 路由处理函数内部调用，可拿到 request 对象的场景。
 *
 * @param adminId 管理员 ID（系统自动事件为 0）
 * @param adminUsername 管理员账号（系统自动事件为 "system"）
 * @param action 操作类型，取自 {@link LogAction}
 * @param details 详细信息对象，将被 JSON.stringify 后存入 details 列
 * @param request Fastify 请求对象，用于安全提取客户端 IP；不传则 IP 记录为空串
 */
export async function logAdminAction(
  adminId: number,
  adminUsername: string,
  action: LogAction,
  details?: Record<string, any>,
  request?: FastifyRequest
) {
  try {
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
    // 日志失败不应影响业务流程，仅打印错误日志便于排查
    console.error("记录操作日志失败:", error);
  }
}

/**
 * 记录管理员操作日志（显式传入 IP 地址）
 *
 * 适用场景: 调用方已通过其他途径获取 IP（如定时任务、SSE 长连接、ws 连接），
 * 无 Fastify request 对象可传入时使用。
 *
 * @param ipAddress 显式指定的客户端 IP
 * @see logAdminAction 从 request 自动提取 IP 的版本
 */
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

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

interface LogRow {
  id: number;
  admin_id: number;
  admin_username: string;
  action: string;
  details: string | null;
  ip_address: string;
  created_at: string;
}

function formatLog(row: LogRow) {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminUsername: row.admin_username,
    action: row.action,
    details: row.details ? JSON.parse(row.details) : null,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

const ACTION_LABELS: Record<string, string> = {
  admin_login: "管理员登录",
  exam_create: "创建考试",
  exam_update: "更新考试",
  exam_delete: "删除考试",
  exam_assign_classrooms: "分配教室",
  exam_unassign_classroom: "取消教室分配",
  announcement_create: "发布公告",
  announcement_update: "更新公告",
  announcement_delete: "删除公告",
  building_create: "创建教学楼",
  building_update: "更新教学楼",
  building_delete: "删除教学楼",
  registration_code_create: "生成注册码",
  registration_code_delete: "删除注册码",
  classroom_approve: "审核通过教室",
  classroom_reject: "驳回教室申请",
  classroom_delete: "删除教室端",
  settings_update: "更新系统设置",
  password_change: "修改密码",
  avatar_change: "更换头像",
  school_info_update: "更新学校信息",
  environment_reinstall: "重装环境",
  environment_update: "更新组件",
};

export default async function auditLogRoutes(fastify: FastifyInstance) {
  // 获取操作日志列表（需管理员认证）
  fastify.get("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { page = "1", pageSize = "20", action, adminId, startDate, endDate } =
        request.query as {
          page?: string;
          pageSize?: string;
          action?: string;
          adminId?: string;
          startDate?: string;
          endDate?: string;
        };

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const conditions: string[] = [];
      const params: any[] = [];

      if (action) {
        conditions.push("action = ?");
        params.push(action);
      }

      if (adminId) {
        conditions.push("admin_id = ?");
        params.push(adminId);
      }

      if (startDate) {
        conditions.push("created_at >= ?");
        params.push(startDate);
      }

      if (endDate) {
        conditions.push("created_at <= ?");
        params.push(endDate);
      }

      let whereClause = "";
      if (conditions.length > 0) {
        whereClause = " WHERE " + conditions.join(" AND ");
      }

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM admin_logs${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.execute(
        `SELECT * FROM admin_logs${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const logs = (rows as LogRow[]).map(formatLog);

      return reply.send(
        successResponse({
          list: logs,
          total,
          page: pageNum,
          pageSize: size,
          totalPages: Math.ceil(total / size),
          actionLabels: ACTION_LABELS,
        })
      );
    } catch (error) {
      console.error("获取操作日志失败:", error);
      return reply.status(500).send(errorResponse("获取操作日志失败"));
    }
  });
}

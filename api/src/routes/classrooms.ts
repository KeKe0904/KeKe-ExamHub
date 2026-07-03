/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import {
  successResponse,
  errorResponse,
  formatClassroom,
  type ClassroomRow,
} from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

// 带教学楼名称的教室行类型
type ClassroomWithBuilding = ClassroomRow & { building_name: string };

export default async function classroomAdminRoutes(
  fastify: FastifyInstance
) {
  // 所有接口都需要管理员认证

  // 获取教室列表(支持按状态筛选)
  fastify.get(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { status, buildingId } = request.query as {
          status?: string;
          buildingId?: string;
        };

        let query =
          "SELECT c.*, b.name AS building_name FROM classrooms c " +
          "JOIN buildings b ON c.building_id = b.id";
        const params: any[] = [];
        const conditions: string[] = [];

        if (status && status !== "all") {
          conditions.push("c.status = ?");
          params.push(status);
        }
        if (buildingId) {
          conditions.push("c.building_id = ?");
          params.push(buildingId);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY c.created_at DESC";

        const [rows] = await pool.execute(query, params);
        const classrooms = (rows as ClassroomWithBuilding[]).map(
          formatClassroom
        );
        return reply.send(successResponse(classrooms));
      } catch (error) {
        console.error("获取教室列表失败:", error);
        return reply.status(500).send(errorResponse("获取教室列表失败"));
      }
    }
  );

  // 审核通过
  fastify.put(
    "/:id/approve",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        const [rows] = await pool.execute(
          "SELECT * FROM classrooms WHERE id = ?",
          [id]
        );
        if ((rows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("教室不存在"));
        }

        const classroom = (rows as ClassroomRow[])[0];
        if (classroom.status === "approved") {
          return reply
            .status(400)
            .send(errorResponse("该教室已通过审核"));
        }

        await pool.execute(
          "UPDATE classrooms SET status = 'approved', reject_reason = NULL WHERE id = ?",
          [id]
        );

        const [updated] = await pool.execute(
          "SELECT c.*, b.name AS building_name FROM classrooms c JOIN buildings b ON c.building_id = b.id WHERE c.id = ?",
          [id]
        );

        const updatedClassroom = (updated as ClassroomWithBuilding[])[0];

        logAdminAction(user.id, user.username, "classroom_approve", {
          classroomId: id,
          buildingName: updatedClassroom.building_name,
          roomNumber: updatedClassroom.room_number,
        });

        return reply.send(
          successResponse(
            formatClassroom(updatedClassroom),
            "审核通过"
          )
        );
      } catch (error) {
        console.error("审核教室失败:", error);
        return reply.status(500).send(errorResponse("审核操作失败"));
      }
    }
  );

  // 审核驳回
  fastify.put(
    "/:id/reject",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };

        const [rows] = await pool.execute(
          "SELECT * FROM classrooms WHERE id = ?",
          [id]
        );
        if ((rows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("教室不存在"));
        }

        await pool.execute(
          "UPDATE classrooms SET status = 'rejected', reject_reason = ? WHERE id = ?",
          [reason || "", id]
        );

        const [updated] = await pool.execute(
          "SELECT c.*, b.name AS building_name FROM classrooms c JOIN buildings b ON c.building_id = b.id WHERE c.id = ?",
          [id]
        );

        const updatedClassroom = (updated as ClassroomWithBuilding[])[0];

        logAdminAction(user.id, user.username, "classroom_reject", {
          classroomId: id,
          buildingName: updatedClassroom.building_name,
          roomNumber: updatedClassroom.room_number,
          reason: reason || "",
        });

        return reply.send(
          successResponse(
            formatClassroom(updatedClassroom),
            "已驳回"
          )
        );
      } catch (error) {
        console.error("驳回教室失败:", error);
        return reply.status(500).send(errorResponse("驳回操作失败"));
      }
    }
  );

  // 删除教室账号
  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        // 获取教室信息
        const [classroomRows] = await pool.execute(
          "SELECT c.*, b.name AS building_name FROM classrooms c JOIN buildings b ON c.building_id = b.id WHERE c.id = ?",
          [id]
        );
        const classroom = (classroomRows as any[])[0];

        // 获取注册码ID,删除教室后释放注册码
        const [rows] = await pool.execute(
          "SELECT registration_code_id FROM classrooms WHERE id = ?",
          [id]
        );
        if ((rows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("教室不存在"));
        }

        const regCodeId = (rows as any[])[0].registration_code_id;

        // 删除教室(关联的 exam_classrooms 会因外键 CASCADE 自动删除)
        await pool.execute("DELETE FROM classrooms WHERE id = ?", [id]);

        // 释放注册码
        if (regCodeId) {
          await pool.execute(
            "UPDATE registration_codes SET is_used = FALSE, used_by_classroom_id = NULL, used_at = NULL WHERE id = ?",
            [regCodeId]
          );
        }

        logAdminAction(user.id, user.username, "classroom_delete", {
          classroomId: id,
          buildingName: classroom?.building_name || "",
          roomNumber: classroom?.room_number || "",
        });

        return reply.send(successResponse(null, "教室删除成功"));
      } catch (error) {
        console.error("删除教室失败:", error);
        return reply.status(500).send(errorResponse("删除教室失败"));
      }
    }
  );

  // 获取待审核教室数量(用于后台角标提示)
  fastify.get(
    "/pending/count",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const [rows] = await pool.execute(
          "SELECT COUNT(*) AS count FROM classrooms WHERE status = 'pending'"
        );
        const count = (rows as any[])[0].count;
        return reply.send(successResponse({ count }));
      } catch (error) {
        console.error("获取待审核数量失败:", error);
        return reply
          .status(500)
          .send(errorResponse("获取待审核数量失败"));
      }
    }
  );
}

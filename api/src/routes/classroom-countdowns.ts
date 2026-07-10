/**
 * KeKe ExamHub - 考试信息管理系统
 * 教室端倒计时管理路由
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware, classroomAuthMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

interface CountdownRow {
  id: number;
  classroom_id: number;
  title: string;
  target_date: Date;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function formatCountdown(row: CountdownRow) {
  return {
    id: String(row.id),
    classroomId: String(row.classroom_id),
    title: row.title,
    targetDate: row.target_date.toISOString(),
    description: row.description || "",
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export default async function classroomCountdownRoutes(fastify: FastifyInstance) {
  // ========== 教室端公开接口（无需登录，根据 classroomId 获取）==========

  // 获取某个教室的启用的倒计时
  fastify.get("/public/:classroomId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { classroomId } = request.params as { classroomId: string };

      const [rows] = await pool.execute(
        `SELECT * FROM classroom_countdowns 
         WHERE classroom_id = ? AND is_active = TRUE
         ORDER BY sort_order ASC, id ASC`,
        [classroomId]
      );

      const list = (rows as CountdownRow[]).map(formatCountdown);
      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取教室倒计时失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // ========== 管理员接口 ==========
  // 管理员管理某教室的倒计时
  fastify.register(async (fastify) => {
    fastify.addHook("onRequest", authMiddleware);

    // 获取教室的所有倒计时
    fastify.get("/classroom/:classroomId", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { classroomId } = request.params as { classroomId: string };

        const [rows] = await pool.execute(
          `SELECT * FROM classroom_countdowns 
           WHERE classroom_id = ?
           ORDER BY sort_order ASC, id ASC`,
          [classroomId]
        );

        const list = (rows as CountdownRow[]).map(formatCountdown);
        return reply.send(successResponse(list));
      } catch (error) {
        console.error("获取教室倒计时失败:", error);
        return reply.status(500).send(errorResponse("获取失败"));
      }
    });

    // 添加倒计时
    fastify.post("/classroom/:classroomId", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { classroomId } = request.params as { classroomId: string };
        const { title, targetDate, description, sortOrder, isActive } = request.body as {
          title: string;
          targetDate: string;
          description?: string;
          sortOrder?: number;
          isActive?: boolean;
        };

        if (!title || !title.trim()) {
          return reply.status(400).send(errorResponse("请输入倒计时标题"));
        }
        if (!targetDate) {
          return reply.status(400).send(errorResponse("请选择目标日期"));
        }

        const [result] = await pool.execute(
          `INSERT INTO classroom_countdowns 
           (classroom_id, title, target_date, description, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            classroomId,
            title.trim(),
            targetDate,
            description || null,
            sortOrder || 0,
            isActive !== undefined ? isActive : true,
          ]
        );
        const id = (result as any).insertId;

        logAdminAction(user.id, user.username, "classroom_countdown_create", {
          countdownId: id,
          classroomId,
          title: title.trim(),
        });

        return reply.status(201).send(
          successResponse(
            { id: String(id) },
            "添加成功"
          )
        );
      } catch (error) {
        console.error("添加倒计时失败:", error);
        return reply.status(500).send(errorResponse("添加失败"));
      }
    });

    // 更新倒计时
    fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };
        const { title, targetDate, description, sortOrder, isActive } = request.body as {
          title?: string;
          targetDate?: string;
          description?: string;
          sortOrder?: number;
          isActive?: boolean;
        };

        const [rows] = await pool.execute(
          "SELECT * FROM classroom_countdowns WHERE id = ?",
          [id]
        );
        const countdownRows = rows as any[];
        if (countdownRows.length === 0) {
          return reply.status(404).send(errorResponse("倒计时不存在"));
        }

        await pool.execute(
          `UPDATE classroom_countdowns 
           SET title = COALESCE(?, title),
               target_date = COALESCE(?, target_date),
               description = ?,
               sort_order = COALESCE(?, sort_order),
               is_active = COALESCE(?, is_active)
           WHERE id = ?`,
          [
            title?.trim() || null,
            targetDate || null,
            description === undefined ? countdownRows[0].description : description,
            sortOrder === undefined ? null : sortOrder,
            isActive === undefined ? null : isActive,
            id,
          ]
        );

        logAdminAction(user.id, user.username, "classroom_countdown_update", {
          countdownId: id,
        });

        return reply.send(successResponse(null, "更新成功"));
      } catch (error) {
        console.error("更新倒计时失败:", error);
        return reply.status(500).send(errorResponse("更新失败"));
      }
    });

    // 删除倒计时
    fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        const [rows] = await pool.execute(
          "SELECT title, classroom_id FROM classroom_countdowns WHERE id = ?",
          [id]
        );
        const countdownRows = rows as any[];
        if (countdownRows.length === 0) {
          return reply.status(404).send(errorResponse("倒计时不存在"));
        }

        await pool.execute("DELETE FROM classroom_countdowns WHERE id = ?", [id]);

        logAdminAction(user.id, user.username, "classroom_countdown_delete", {
          countdownId: id,
          title: countdownRows[0].title,
          classroomId: countdownRows[0].classroom_id,
        });

        return reply.send(successResponse(null, "删除成功"));
      } catch (error) {
        console.error("删除倒计时失败:", error);
        return reply.status(500).send(errorResponse("删除失败"));
      }
    });
  });

  // ========== 教室端自己的接口（教室端登录后使用）==========
  fastify.register(async (fastify) => {
    fastify.addHook("onRequest", classroomAuthMiddleware);

    // 获取当前教室的倒计时
    fastify.get("/mine", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const classroomId = user.classroomId || user.id;

        const [rows] = await pool.execute(
          `SELECT * FROM classroom_countdowns 
           WHERE classroom_id = ? AND is_active = TRUE
           ORDER BY sort_order ASC, id ASC`,
          [classroomId]
        );

        const list = (rows as CountdownRow[]).map(formatCountdown);
        return reply.send(successResponse(list));
      } catch (error) {
        console.error("获取教室倒计时失败:", error);
        return reply.status(500).send(errorResponse("获取失败"));
      }
    });
  });
}

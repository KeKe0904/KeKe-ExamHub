/**
 * KeKe ExamHub - 考试信息管理系统
 * 班级管理路由
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

interface ClassRow {
  id: number;
  name: string;
  grade: string | null;
  head_teacher_id: number | null;
  head_teacher_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function formatClass(row: ClassRow) {
  return {
    id: String(row.id),
    name: row.name,
    grade: row.grade || "",
    headTeacherId: row.head_teacher_id ? String(row.head_teacher_id) : null,
    headTeacherName: row.head_teacher_name || "",
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export default async function classRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authMiddleware);

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        pageSize = "20",
        search,
        grade,
        all,
      } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        grade?: string;
        all?: string;
      };

      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push("c.name LIKE ?");
        params.push(`%${search}%`);
      }

      if (grade) {
        conditions.push("c.grade = ?");
        params.push(grade);
      }

      if (all !== "true") {
        conditions.push("c.is_active = TRUE");
      }

      let whereClause = "";
      if (conditions.length > 0) {
        whereClause = " WHERE " + conditions.join(" AND ");
      }

      if (all === "true") {
        const [rows] = await pool.execute(
          `SELECT c.*, t.name as head_teacher_name 
           FROM classes c 
           LEFT JOIN teachers t ON c.head_teacher_id = t.id
           ${whereClause}
           ORDER BY c.sort_order ASC, c.id ASC`,
          params
        );
        const list = (rows as ClassRow[]).map(formatClass);
        return reply.send(successResponse(list));
      }

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM classes c${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.query(
        `SELECT c.*, t.name as head_teacher_name
         FROM classes c
         LEFT JOIN teachers t ON c.head_teacher_id = t.id
         ${whereClause}
         ORDER BY c.sort_order ASC, c.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const list = (rows as ClassRow[]).map(formatClass);

      return reply.send(
        successResponse({
          list,
          total,
          page: pageNum,
          pageSize: size,
          totalPages: Math.ceil(total / size),
        })
      );
    } catch (error) {
      console.error("获取班级列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        `SELECT c.*, t.name as head_teacher_name 
         FROM classes c 
         LEFT JOIN teachers t ON c.head_teacher_id = t.id
         WHERE c.id = ?`,
        [id]
      );

      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("班级不存在"));
      }

      return reply.send(successResponse(formatClass((rows as ClassRow[])[0])));
    } catch (error) {
      console.error("获取班级详情失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { name, grade, headTeacherId, sortOrder } = request.body as {
        name: string;
        grade?: string;
        headTeacherId?: string;
        sortOrder?: number;
      };

      if (!name || !name.trim()) {
        return reply.status(400).send(errorResponse("请输入班级名称"));
      }

      const [result] = await pool.execute(
        `INSERT INTO classes (name, grade, head_teacher_id, sort_order)
         VALUES (?, ?, ?, ?)`,
        [name.trim(), grade || null, headTeacherId || null, sortOrder || 0]
      );
      const id = (result as any).insertId;

      logAdminAction(user.id, user.username, "class_create", {
        classId: id,
        name: name.trim(),
      });

      return reply.status(201).send(
        successResponse(
          { id: String(id) },
          "添加成功"
        )
      );
    } catch (error) {
      console.error("添加班级失败:", error);
      return reply.status(500).send(errorResponse("添加失败"));
    }
  });

  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { name, grade, headTeacherId, sortOrder, isActive } = request.body as {
        name?: string;
        grade?: string | null;
        headTeacherId?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      };

      const [rows] = await pool.execute(
        "SELECT * FROM classes WHERE id = ?",
        [id]
      );
      const classRows = rows as any[];
      if (classRows.length === 0) {
        return reply.status(404).send(errorResponse("班级不存在"));
      }

      await pool.execute(
        `UPDATE classes 
         SET name = COALESCE(?, name),
             grade = ?,
             head_teacher_id = ?,
             sort_order = COALESCE(?, sort_order),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          name?.trim() || null,
          grade === undefined ? classRows[0].grade : grade,
          headTeacherId === undefined ? classRows[0].head_teacher_id : headTeacherId,
          sortOrder ?? null,
          isActive === undefined ? null : isActive,
          id,
        ]
      );

      logAdminAction(user.id, user.username, "class_update", {
        classId: id,
      });

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新班级失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT name FROM classes WHERE id = ?",
        [id]
      );
      const classRows = rows as any[];
      if (classRows.length === 0) {
        return reply.status(404).send(errorResponse("班级不存在"));
      }

      const [studentCount] = await pool.execute(
        "SELECT COUNT(*) as count FROM students WHERE class_id = ?",
        [id]
      );
      if ((studentCount as any[])[0].count > 0) {
        return reply
          .status(400)
          .send(errorResponse("该班级下还有学生，无法删除"));
      }

      await pool.execute("DELETE FROM classes WHERE id = ?", [id]);

      logAdminAction(user.id, user.username, "class_delete", {
        classId: id,
        name: classRows[0].name,
      });

      return reply.send(successResponse(null, "删除成功"));
    } catch (error) {
      console.error("删除班级失败:", error);
      return reply.status(500).send(errorResponse("删除失败"));
    }
  });
}

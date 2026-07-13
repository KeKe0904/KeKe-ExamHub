/**
 * KeKe ExamHub - 考试信息管理系统
 * 学生管理路由
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { likePattern } from "../utils/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

interface StudentRow {
  id: number;
  student_no: string;
  name: string;
  class_id: number | null;
  class_name: string | null;
  gender: string;
  phone: string | null;
  id_card: string | null;
  is_first_login: boolean;
  last_login_at: Date | null;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function formatStudent(row: StudentRow) {
  return {
    id: String(row.id),
    studentNo: row.student_no,
    name: row.name,
    classId: row.class_id ? String(row.class_id) : null,
    className: row.class_name || "",
    gender: row.gender,
    phone: row.phone || "",
    idCard: row.id_card || "",
    isFirstLogin: Boolean(row.is_first_login),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function getDefaultPassword(studentNo: string): string {
  return studentNo.slice(-6);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export default async function studentRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authMiddleware);

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        pageSize = "20",
        search,
        classId,
        status,
      } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        classId?: string;
        status?: string;
      };

      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push("(s.name LIKE ? OR s.student_no LIKE ?)");
        const p = likePattern(search);
        params.push(p, p);
      }

      if (classId) {
        conditions.push("s.class_id = ?");
        params.push(classId);
      }

      if (status) {
        conditions.push("s.status = ?");
        params.push(status);
      }

      let whereClause = "";
      if (conditions.length > 0) {
        whereClause = " WHERE " + conditions.join(" AND ");
      }

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM students s${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.query(
        `SELECT s.*, c.name as class_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const list = (rows as StudentRow[]).map(formatStudent);

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
      console.error("获取学生列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.id = ?`,
        [id]
      );

      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      return reply.send(successResponse(formatStudent((rows as StudentRow[])[0])));
    } catch (error) {
      console.error("获取学生详情失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const {
        studentNo,
        name,
        classId,
        gender,
        phone,
        idCard,
        notes,
      } = request.body as {
        studentNo: string;
        name: string;
        classId?: string;
        gender?: string;
        phone?: string;
        idCard?: string;
        notes?: string;
      };

      if (!studentNo || !studentNo.trim()) {
        return reply.status(400).send(errorResponse("请输入学号"));
      }
      if (!name || !name.trim()) {
        return reply.status(400).send(errorResponse("请输入姓名"));
      }

      const [existing] = await pool.execute(
        "SELECT id FROM students WHERE student_no = ?",
        [studentNo.trim()]
      );
      if ((existing as any[]).length > 0) {
        return reply.status(400).send(errorResponse("该学号已存在"));
      }

      const defaultPassword = getDefaultPassword(studentNo.trim());
      const hashedPassword = await hashPassword(defaultPassword);

      const [result] = await pool.execute(
        `INSERT INTO students (student_no, name, password, class_id, gender, phone, id_card, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentNo.trim(),
          name.trim(),
          hashedPassword,
          classId || null,
          gender || "unknown",
          phone || null,
          idCard || null,
          notes || null,
        ]
      );
      const id = (result as any).insertId;

      logAdminAction(user.id, user.username, "student_create", {
        studentId: id,
        studentNo: studentNo.trim(),
        name: name.trim(),
      });

      return reply.status(201).send(
        successResponse(
          { id: String(id) },
          "添加成功"
        )
      );
    } catch (error) {
      console.error("添加学生失败:", error);
      return reply.status(500).send(errorResponse("添加失败"));
    }
  });

  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const {
        studentNo,
        name,
        classId,
        gender,
        phone,
        idCard,
        status,
        notes,
      } = request.body as {
        studentNo?: string;
        name?: string;
        classId?: string | null;
        gender?: string;
        phone?: string;
        idCard?: string;
        status?: string;
        notes?: string;
      };

      const [rows] = await pool.execute(
        "SELECT * FROM students WHERE id = ?",
        [id]
      );
      const studentRows = rows as any[];
      if (studentRows.length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      if (studentNo && studentNo.trim() !== studentRows[0].student_no) {
        const [existing] = await pool.execute(
          "SELECT id FROM students WHERE student_no = ? AND id != ?",
          [studentNo.trim(), id]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(400).send(errorResponse("该学号已存在"));
        }
      }

      await pool.execute(
        `UPDATE students 
         SET student_no = COALESCE(?, student_no),
             name = COALESCE(?, name),
             class_id = ?,
             gender = COALESCE(?, gender),
             phone = ?,
             id_card = ?,
             status = COALESCE(?, status),
             notes = ?
         WHERE id = ?`,
        [
          studentNo?.trim() || null,
          name?.trim() || null,
          classId === undefined ? studentRows[0].class_id : classId,
          gender || null,
          phone === undefined ? studentRows[0].phone : phone,
          idCard === undefined ? studentRows[0].id_card : idCard,
          status || null,
          notes === undefined ? studentRows[0].notes : notes,
          id,
        ]
      );

      logAdminAction(user.id, user.username, "student_update", {
        studentId: id,
      });

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新学生失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT name, student_no FROM students WHERE id = ?",
        [id]
      );
      const studentRows = rows as any[];
      if (studentRows.length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      await pool.execute("DELETE FROM students WHERE id = ?", [id]);

      logAdminAction(user.id, user.username, "student_delete", {
        studentId: id,
        name: studentRows[0].name,
        studentNo: studentRows[0].student_no,
      });

      return reply.send(successResponse(null, "删除成功"));
    } catch (error) {
      console.error("删除学生失败:", error);
      return reply.status(500).send(errorResponse("删除失败"));
    }
  });

  fastify.post("/batch", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { students } = request.body as {
        students: Array<{
          studentNo: string;
          name: string;
          classId?: string;
          gender?: string;
          phone?: string;
          idCard?: string;
          notes?: string;
        }>;
      };

      if (!students || !Array.isArray(students) || students.length === 0) {
        return reply.status(400).send(errorResponse("请提供学生数据"));
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const results: { id: string; studentNo: string; name: string }[] = [];
        const errors: string[] = [];

        for (const stu of students) {
          if (!stu.studentNo || !stu.studentNo.trim()) {
            errors.push(`学号不能为空`);
            continue;
          }
          if (!stu.name || !stu.name.trim()) {
            errors.push(`${stu.studentNo}: 姓名不能为空`);
            continue;
          }

          const [existing] = await conn.execute(
            "SELECT id FROM students WHERE student_no = ?",
            [stu.studentNo.trim()]
          );
          if ((existing as any[]).length > 0) {
            errors.push(`${stu.studentNo}: 学号已存在`);
            continue;
          }

          const defaultPassword = getDefaultPassword(stu.studentNo.trim());
          const hashedPassword = await hashPassword(defaultPassword);

          const [result] = await conn.execute(
            `INSERT INTO students (student_no, name, password, class_id, gender, phone, id_card, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              stu.studentNo.trim(),
              stu.name.trim(),
              hashedPassword,
              stu.classId || null,
              stu.gender || "unknown",
              stu.phone || null,
              stu.idCard || null,
              stu.notes || null,
            ]
          );
          const id = (result as any).insertId;
          results.push({
            id: String(id),
            studentNo: stu.studentNo.trim(),
            name: stu.name.trim(),
          });
        }

        await conn.commit();

        logAdminAction(user.id, user.username, "student_batch_create", {
          count: results.length,
          errorCount: errors.length,
        });

        return reply.send(
          successResponse(
            {
              success: results.length,
              failed: errors.length,
              results,
              errors,
            },
            `批量添加完成，成功 ${results.length} 条，失败 ${errors.length} 条`
          )
        );
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("批量添加学生失败:", error);
      return reply.status(500).send(errorResponse("批量添加失败"));
    }
  });

  fastify.put("/:id/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT student_no, name FROM students WHERE id = ?",
        [id]
      );
      const studentRows = rows as any[];
      if (studentRows.length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      const defaultPassword = getDefaultPassword(studentRows[0].student_no);
      const hashedPassword = await hashPassword(defaultPassword);

      await pool.execute(
        "UPDATE students SET password = ?, is_first_login = TRUE WHERE id = ?",
        [hashedPassword, id]
      );

      logAdminAction(user.id, user.username, "student_reset_password", {
        studentId: id,
        name: studentRows[0].name,
      });

      return reply.send(successResponse(null, "密码重置成功"));
    } catch (error) {
      console.error("重置密码失败:", error);
      return reply.status(500).send(errorResponse("重置密码失败"));
    }
  });
}

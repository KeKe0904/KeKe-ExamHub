/**
 * KeKe ExamHub - 考试信息管理系统
 * 教师管理路由
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

interface TeacherRow {
  id: number;
  teacher_no: string | null;
  name: string;
  role_id: number | null;
  role_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  is_first_login: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface TeacherRoleRow {
  id: number;
  name: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function formatTeacher(row: TeacherRow) {
  return {
    id: String(row.id),
    teacherNo: row.teacher_no || "",
    name: row.name,
    roleId: row.role_id ? String(row.role_id) : null,
    roleName: row.role_name || "",
    phone: row.phone || "",
    email: row.email || "",
    notes: row.notes || "",
    isActive: Boolean(row.is_active),
    isFirstLogin: Boolean(row.is_first_login),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function formatTeacherRole(row: TeacherRoleRow) {
  return {
    id: String(row.id),
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export default async function teacherRoutes(fastify: FastifyInstance) {
  // 所有路由都需要管理员认证
  fastify.addHook("onRequest", authMiddleware);

  // ========== 教师身份管理 ==========

  // 获取所有教师身份
  fastify.get("/roles", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM teacher_roles ORDER BY sort_order ASC, id ASC"
      );
      const list = (rows as TeacherRoleRow[]).map(formatTeacherRole);
      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取教师身份列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // 添加教师身份
  fastify.post("/roles", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { name, sortOrder } = request.body as {
        name: string;
        sortOrder?: number;
      };

      if (!name || !name.trim()) {
        return reply.status(400).send(errorResponse("请输入身份名称"));
      }

      // 检查是否已存在
      const [existing] = await pool.execute(
        "SELECT id FROM teacher_roles WHERE name = ?",
        [name.trim()]
      );
      if ((existing as any[]).length > 0) {
        return reply.status(400).send(errorResponse("该身份已存在"));
      }

      const [result] = await pool.execute(
        "INSERT INTO teacher_roles (name, sort_order) VALUES (?, ?)",
        [name.trim(), sortOrder || 0]
      );
      const id = (result as any).insertId;

      logAdminAction(user.id, user.username, "teacher_role_create", {
        roleId: id,
        name: name.trim(),
      });

      return reply.status(201).send(
        successResponse(
          { id: String(id) },
          "添加成功"
        )
      );
    } catch (error) {
      console.error("添加教师身份失败:", error);
      return reply.status(500).send(errorResponse("添加失败"));
    }
  });

  // 更新教师身份
  fastify.put("/roles/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { name, sortOrder } = request.body as {
        name?: string;
        sortOrder?: number;
      };

      const [rows] = await pool.execute(
        "SELECT * FROM teacher_roles WHERE id = ?",
        [id]
      );
      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("身份不存在"));
      }

      if (name) {
        // 检查重名
        const [existing] = await pool.execute(
          "SELECT id FROM teacher_roles WHERE name = ? AND id != ?",
          [name.trim(), id]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(400).send(errorResponse("该身份名称已存在"));
        }
      }

      await pool.execute(
        `UPDATE teacher_roles 
         SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order)
         WHERE id = ?`,
        [name?.trim() || null, sortOrder ?? null, id]
      );

      logAdminAction(user.id, user.username, "teacher_role_update", {
        roleId: id,
      });

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新教师身份失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  // 删除教师身份
  fastify.delete("/roles/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      // 检查是否有教师使用该身份
      const [teachers] = await pool.execute(
        "SELECT COUNT(*) as count FROM teachers WHERE role_id = ?",
        [id]
      );
      if ((teachers as any[])[0].count > 0) {
        return reply
          .status(400)
          .send(errorResponse("该身份下还有教师，无法删除"));
      }

      await pool.execute("DELETE FROM teacher_roles WHERE id = ?", [id]);

      logAdminAction(user.id, user.username, "teacher_role_delete", {
        roleId: id,
      });

      return reply.send(successResponse(null, "删除成功"));
    } catch (error) {
      console.error("删除教师身份失败:", error);
      return reply.status(500).send(errorResponse("删除失败"));
    }
  });

  // ========== 教师管理 ==========

  // 获取教师列表（支持搜索、分页、按身份筛选）
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        pageSize = "20",
        search,
        roleId,
        all,
      } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        roleId?: string;
        all?: string; // 传 all=true 返回所有启用的教师（不分页，用于下拉选择）
      };

      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push("(t.name LIKE ? OR t.phone LIKE ? OR t.teacher_no LIKE ?)");
        const p = likePattern(search);
        params.push(p, p, p);
      }

      if (roleId) {
        conditions.push("t.role_id = ?");
        params.push(roleId);
      }

      // 如果不是获取全部，则默认只显示启用的
      if (all !== "true") {
        conditions.push("t.is_active = TRUE");
      }

      let whereClause = "";
      if (conditions.length > 0) {
        whereClause = " WHERE " + conditions.join(" AND ");
      }

      // 如果 all=true，返回全部
      if (all === "true") {
        const [rows] = await pool.execute(
          `SELECT t.*, r.name as role_name 
           FROM teachers t 
           LEFT JOIN teacher_roles r ON t.role_id = r.id
           ${whereClause}
           ORDER BY t.name ASC`,
          params
        );
        const list = (rows as TeacherRow[]).map(formatTeacher);
        return reply.send(successResponse(list));
      }

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM teachers t${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.query(
        `SELECT t.*, r.name as role_name
         FROM teachers t
         LEFT JOIN teacher_roles r ON t.role_id = r.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const list = (rows as TeacherRow[]).map(formatTeacher);

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
      console.error("获取教师列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // 获取教师详情
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        `SELECT t.*, r.name as role_name 
         FROM teachers t 
         LEFT JOIN teacher_roles r ON t.role_id = r.id
         WHERE t.id = ?`,
        [id]
      );

      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      return reply.send(successResponse(formatTeacher((rows as TeacherRow[])[0])));
    } catch (error) {
      console.error("获取教师详情失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // 添加教师
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { name, teacherNo, roleId, phone, email, notes, password } = request.body as {
        name: string;
        teacherNo?: string;
        roleId?: string;
        phone?: string;
        email?: string;
        notes?: string;
        password?: string;
      };

      if (!name || !name.trim()) {
        return reply.status(400).send(errorResponse("请输入教师姓名"));
      }

      // 至少提供工号或密码中的一个,否则教师将无法登录
      if (!teacherNo && !password) {
        return reply.status(400).send(errorResponse("请至少提供工号或密码"));
      }

      if (teacherNo && teacherNo.trim()) {
        const [existing] = await pool.execute(
          "SELECT id FROM teachers WHERE teacher_no = ?",
          [teacherNo.trim()]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(400).send(errorResponse("该工号已存在"));
        }
      }

      let hashedPassword: string | null = null;
      let initialPassword = password;
      
      if (password && password.trim()) {
        hashedPassword = await bcrypt.hash(password.trim(), 10);
      } else if (teacherNo && teacherNo.trim()) {
        const defaultPwd = teacherNo.trim().slice(-6);
        hashedPassword = await bcrypt.hash(defaultPwd, 10);
        initialPassword = defaultPwd;
      }

      const [result] = await pool.execute(
        `INSERT INTO teachers (name, teacher_no, role_id, phone, email, notes, password)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          teacherNo?.trim() || null,
          roleId || null,
          phone || null,
          email || null,
          notes || null,
          hashedPassword,
        ]
      );
      const id = (result as any).insertId;

      logAdminAction(user.id, user.username, "teacher_create", {
        teacherId: id,
        name: name.trim(),
        teacherNo: teacherNo?.trim() || null,
      });

      return reply.status(201).send(
        successResponse(
          { id: String(id), initialPassword: initialPassword || null },
          "添加成功"
        )
      );
    } catch (error) {
      console.error("添加教师失败:", error);
      return reply.status(500).send(errorResponse("添加失败"));
    }
  });

  // 更新教师
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { name, teacherNo, roleId, phone, email, notes, isActive } = request.body as {
        name?: string;
        teacherNo?: string | null;
        roleId?: string | null;
        phone?: string;
        email?: string;
        notes?: string;
        isActive?: boolean;
      };

      const [rows] = await pool.execute(
        "SELECT * FROM teachers WHERE id = ?",
        [id]
      );
      const teacherRows = rows as any[];
      if (teacherRows.length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      if (teacherNo !== undefined && teacherNo !== null && teacherNo.trim()) {
        const [existing] = await pool.execute(
          "SELECT id FROM teachers WHERE teacher_no = ? AND id != ?",
          [teacherNo.trim(), id]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(400).send(errorResponse("该工号已存在"));
        }
      }

      await pool.execute(
        `UPDATE teachers 
         SET name = COALESCE(?, name),
             teacher_no = ?,
             role_id = ?,
             phone = ?,
             email = ?,
             notes = ?,
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          name?.trim() || null,
          teacherNo === undefined ? teacherRows[0].teacher_no : teacherNo?.trim() || null,
          roleId === undefined ? teacherRows[0].role_id : roleId,
          phone === undefined ? teacherRows[0].phone : phone,
          email === undefined ? teacherRows[0].email : email,
          notes === undefined ? teacherRows[0].notes : notes,
          isActive === undefined ? null : isActive,
          id,
        ]
      );

      logAdminAction(user.id, user.username, "teacher_update", {
        teacherId: id,
      });

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新教师失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  // 删除教师
  fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT name, teacher_no FROM teachers WHERE id = ?",
        [id]
      );
      const teacherRows = rows as any[];
      if (teacherRows.length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      await pool.execute("DELETE FROM teachers WHERE id = ?", [id]);

      logAdminAction(user.id, user.username, "teacher_delete", {
        teacherId: id,
        name: teacherRows[0].name,
      });

      return reply.send(successResponse(null, "删除成功"));
    } catch (error) {
      console.error("删除教师失败:", error);
      return reply.status(500).send(errorResponse("删除失败"));
    }
  });

  // 重置教师密码
  fastify.put("/:id/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { newPassword } = request.body as { newPassword?: string };

      const [rows] = await pool.execute(
        "SELECT name, teacher_no FROM teachers WHERE id = ?",
        [id]
      );
      const teacherRows = rows as any[];
      if (teacherRows.length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      const teacher = teacherRows[0];
      let resetPassword: string;

      if (newPassword && newPassword.trim()) {
        resetPassword = newPassword.trim();
      } else if (teacher.teacher_no) {
        resetPassword = teacher.teacher_no.slice(-6);
      } else {
        // 安全修复：无工号时随机生成 6 位数字，不再使用弱默认值 "123456"
        resetPassword = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const hashedPassword = await bcrypt.hash(resetPassword, 10);

      await pool.execute(
        "UPDATE teachers SET password = ?, is_first_login = TRUE WHERE id = ?",
        [hashedPassword, id]
      );

      logAdminAction(user.id, user.username, "teacher_reset_password", {
        teacherId: id,
        name: teacher.name,
      });

      return reply.send(
        successResponse(
          { newPassword: resetPassword },
          "密码重置成功"
        )
      );
    } catch (error) {
      console.error("重置教师密码失败:", error);
      return reply.status(500).send(errorResponse("重置失败"));
    }
  });

  // ========== 考试监考老师管理 ==========

  // 获取考试的监考老师列表
  fastify.get("/exam/:examId/invigilators", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { examId } = request.params as { examId: string };

      const [rows] = await pool.execute(
        `SELECT t.*, r.name as role_name, ei.sort_order
         FROM exam_invigilators ei
         JOIN teachers t ON ei.teacher_id = t.id
         LEFT JOIN teacher_roles r ON t.role_id = r.id
         WHERE ei.exam_id = ?
         ORDER BY ei.sort_order ASC, ei.id ASC`,
        [examId]
      );

      const list = (rows as any[]).map((row) => ({
        ...formatTeacher(row),
        sortOrder: row.sort_order,
      }));

      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取考试监考老师失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // 设置考试监考老师（全量替换）
  fastify.put("/exam/:examId/invigilators", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { examId } = request.params as { examId: string };
      const { teacherIds } = request.body as { teacherIds: string[] };

      // 检查考试是否存在
      const [exams] = await pool.execute(
        "SELECT id, subject FROM exams WHERE id = ?",
        [examId]
      );
      const examRows = exams as any[];
      if (examRows.length === 0) {
        return reply.status(404).send(errorResponse("考试不存在"));
      }

      // 开启事务
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 删除原有关联
        await conn.execute(
          "DELETE FROM exam_invigilators WHERE exam_id = ?",
          [examId]
        );

        // 批量插入新关联
        if (teacherIds && teacherIds.length > 0) {
          const values = teacherIds
            .map((tid, idx) => `(?, ?, ?)`)
            .join(", ");
          const params: any[] = [];
          teacherIds.forEach((tid, idx) => {
            params.push(examId, tid, idx);
          });
          await conn.execute(
            `INSERT INTO exam_invigilators (exam_id, teacher_id, sort_order)
             VALUES ${values}`,
            params
          );

          // 更新 exams 表的 invigilator 字段（兼容旧接口），取前 3 个老师名字
          const [teacherRows] = await conn.execute(
            `SELECT name FROM teachers WHERE id IN (${teacherIds.map(() => "?").join(",")})
             ORDER BY FIELD(id, ${teacherIds.map(() => "?").join(",")})
             LIMIT 3`,
            [...teacherIds, ...teacherIds]
          ) as any;
          const names = (teacherRows as any[]).map((t) => t.name);
          const invigilatorStr = names.join("、");
          await conn.execute(
            "UPDATE exams SET invigilator = ? WHERE id = ?",
            [invigilatorStr, examId]
          );
        } else {
          // 没有监考老师，清空字段
          await conn.execute(
            "UPDATE exams SET invigilator = ? WHERE id = ?",
            ["", examId]
          );
        }

        await conn.commit();

        logAdminAction(user.id, user.username, "exam_update", {
          examId,
          subject: examRows[0].subject,
          action: "更新监考老师",
        });

        return reply.send(successResponse(null, "监考老师更新成功"));
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("设置考试监考老师失败:", error);
      return reply.status(500).send(errorResponse("设置失败"));
    }
  });
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * 教师端认证路由
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
import { getClientIp, recordLoginFailure, clearLoginFailure } from "../middleware/ip-blacklist.js";

// 时序攻击防护用的固定 dummy hash（账号不存在时仍执行 bcrypt 比较以均衡响应时间）
const DUMMY_PASSWORD_HASH =
  "$2a$10$p6LuDyKlf9RDKuDF.ZSYOuX7oLc8sOVzfJGvuOCzhd/l5DzmCCNVe";

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

interface ClassRow {
  id: number;
  name: string;
  grade: string | null;
  student_count: number;
}

interface StudentRow {
  id: number;
  student_no: string;
  name: string;
  class_id: number | null;
  class_name: string | null;
  gender: string;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
}

interface ExamRow {
  id: number;
  subject: string;
  exam_date: Date;
  duration: number;
  location: string;
  notes: string | null;
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

function formatClass(row: ClassRow) {
  return {
    id: String(row.id),
    name: row.name,
    grade: row.grade || "",
    studentCount: row.student_count || 0,
  };
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
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at.toISOString(),
  };
}

function formatExam(row: ExamRow) {
  const now = new Date();
  const examDate = new Date(row.exam_date);
  const endTime = new Date(examDate.getTime() + row.duration * 60 * 1000);

  let examStatus: "upcoming" | "ongoing" | "ended" = "upcoming";
  if (now >= examDate && now < endTime) {
    examStatus = "ongoing";
  } else if (now >= endTime) {
    examStatus = "ended";
  }

  return {
    id: String(row.id),
    subject: row.subject,
    examDate: row.exam_date.toISOString(),
    duration: row.duration,
    location: row.location,
    notes: row.notes || "",
    status: examStatus,
  };
}

async function teacherAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        message: "未提供认证令牌",
      });
    }

    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify(token) as any;

    if (decoded.role !== "teacher") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    (request as any).user = {
      id: decoded.id,
      teacherNo: decoded.teacherNo,
      name: decoded.name,
      role: "teacher" as const,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

export default async function teacherAuthRoutes(fastify: FastifyInstance) {
  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    try {
      const { account, password } = request.body as {
        account: string;
        password: string;
      };

      if (!account || !password) {
        return reply.status(400).send(errorResponse("请输入账号和密码"));
      }

      const [rows] = await pool.execute(
        `SELECT t.*, r.name as role_name 
         FROM teachers t 
         LEFT JOIN teacher_roles r ON t.role_id = r.id
         WHERE t.teacher_no = ? OR t.phone = ?
         LIMIT 1`,
        [account, account]
      );

      const teachers = rows as any[];
      if (teachers.length === 0) {
        // 时序攻击防护：账号不存在时也执行一次 bcrypt 比较，避免响应时间差异泄露账号是否存在
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        await recordLoginFailure(getClientIp(request), account);
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      const teacher = teachers[0];

      if (!teacher.password) {
        return reply.status(401).send(errorResponse("账号未设置登录密码，请联系管理员"));
      }

      if (!teacher.is_active) {
        return reply.status(403).send(errorResponse("账号已被停用"));
      }

      const isPasswordValid = await bcrypt.compare(password, teacher.password);
      if (!isPasswordValid) {
        await recordLoginFailure(getClientIp(request), account);
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      // 登录成功，清除失败计数
      clearLoginFailure(getClientIp(request));

      const token = fastify.jwt.sign(
        {
          id: teacher.id,
          teacherNo: teacher.teacher_no,
          name: teacher.name,
          role: "teacher",
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      try {
        await pool.execute(
          "UPDATE teachers SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
          [teacher.id]
        );
      } catch {
        // 字段可能不存在，忽略错误
      }

      return reply.send(
        successResponse(
          {
            token,
            teacher: formatTeacher(teacher as TeacherRow),
          },
          "登录成功"
        )
      );
    } catch (error) {
      console.error("教师登录失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.post("/change-password", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { oldPassword, newPassword } = request.body as {
        oldPassword: string;
        newPassword: string;
      };

      if (!oldPassword || !newPassword) {
        return reply.status(400).send(errorResponse("请输入旧密码和新密码"));
      }

      if (newPassword.length < 6) {
        return reply.status(400).send(errorResponse("新密码长度不能少于6位"));
      }
      // 密码复杂度要求：至少包含字母和数字
      if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return reply.status(400).send(errorResponse("新密码必须同时包含字母和数字"));
      }

      const [rows] = await pool.execute(
        "SELECT * FROM teachers WHERE id = ?",
        [user.id]
      );

      const teachers = rows as any[];
      if (teachers.length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      const teacher = teachers[0];

      const isPasswordValid = await bcrypt.compare(oldPassword, teacher.password);
      if (!isPasswordValid) {
        return reply.status(400).send(errorResponse("旧密码错误"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.execute(
        "UPDATE teachers SET password = ?, is_first_login = FALSE WHERE id = ?",
        [hashedPassword, user.id]
      );

      return reply.send(successResponse(null, "密码修改成功"));
    } catch (error) {
      console.error("修改密码失败:", error);
      return reply.status(500).send(errorResponse("修改密码失败"));
    }
  });

  fastify.get("/me", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      const [rows] = await pool.execute(
        `SELECT t.*, r.name as role_name 
         FROM teachers t 
         LEFT JOIN teacher_roles r ON t.role_id = r.id
         WHERE t.id = ?`,
        [user.id]
      );

      const teachers = rows as any[];
      if (teachers.length === 0) {
        return reply.status(404).send(errorResponse("教师不存在"));
      }

      return reply.send(successResponse(formatTeacher(teachers[0] as TeacherRow)));
    } catch (error) {
      console.error("获取教师信息失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.get("/classes", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      const [rows] = await pool.execute(
        `SELECT c.*, COUNT(s.id) as student_count
         FROM classes c
         LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
         WHERE c.head_teacher_id = ? AND c.is_active = TRUE
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC`,
        [user.id]
      );

      const list = (rows as ClassRow[]).map(formatClass);
      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取班级列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.get("/students", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { classId, search } = request.query as {
        classId?: string;
        search?: string;
      };

      const conditions: string[] = [
        "c.head_teacher_id = ?",
        "s.status != 'graduated'",
      ];
      const params: any[] = [user.id];

      if (classId) {
        conditions.push("s.class_id = ?");
        params.push(classId);
      }

      if (search) {
        conditions.push("(s.name LIKE ? OR s.student_no LIKE ? OR s.phone LIKE ?)");
        const p = likePattern(search);
        params.push(p, p, p);
      }

      const whereClause = "WHERE " + conditions.join(" AND ");

      const [rows] = await pool.execute(
        `SELECT s.*, c.name as class_name
         FROM students s
         JOIN classes c ON s.class_id = c.id
         ${whereClause}
         ORDER BY c.sort_order ASC, s.student_no ASC`,
        params
      );

      const list = (rows as StudentRow[]).map(formatStudent);
      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取学生列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.put("/students/:id", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { phone, notes } = request.body as {
        phone?: string;
        notes?: string;
      };

      const [checkRows] = await pool.execute(
        `SELECT s.id 
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE s.id = ? AND c.head_teacher_id = ?`,
        [id, user.id]
      );

      if ((checkRows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("学生不存在或无权限修改"));
      }

      await pool.execute(
        `UPDATE students 
         SET phone = COALESCE(?, phone),
             notes = COALESCE(?, notes)
         WHERE id = ?`,
        [phone !== undefined ? phone || null : null, notes !== undefined ? notes || null : null, id]
      );

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新学生信息失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  fastify.get("/exams", {
    preHandler: teacherAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { status } = request.query as { status?: string };

      const conditions: string[] = ["ei.teacher_id = ?"];
      const params: any[] = [user.id];

      if (status && status !== "all") {
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        if (status === "upcoming") {
          conditions.push("e.exam_date > ?");
          params.push(now);
        } else if (status === "ongoing") {
          conditions.push(
            "e.exam_date <= ? AND DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) > ?"
          );
          params.push(now, now);
        } else if (status === "ended") {
          conditions.push(
            "DATE_ADD(e.exam_date, INTERVAL e.duration MINUTE) <= ?"
          );
          params.push(now);
        }
      }

      const whereClause = "WHERE " + conditions.join(" AND ");

      const [rows] = await pool.execute(
        `SELECT e.*
         FROM exam_invigilators ei
         JOIN exams e ON ei.exam_id = e.id
         ${whereClause}
         ORDER BY e.exam_date ASC`,
        params
      );

      const list = (rows as any[]).map((row) => formatExam(row as ExamRow));
      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取监考考试列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });
}

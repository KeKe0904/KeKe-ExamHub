/**
 * KeKe ExamHub - 考试信息管理系统
 * 学生端认证与业务路由（/api/student-auth/*）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 路由列表:
 *   POST /login             学生登录（限流 10 次/分钟，含时序攻击防护 + 自动封禁）
 *   POST /change-password    修改自己的密码（要求字母+数字组合，至少 6 位）
 *   GET  /me                获取当前登录学生信息
 *   GET  /exams             获取分配给自己的考试列表（含考场/座位号/成绩）
 *
 * 鉴权: 除 /login 外均经 studentAuthMiddleware（学生 JWT，role==="student"）保护
 * 安全: 学生只能查询自己的考试与个人信息，通过 JWT 中的 id 字段实现权限隔离
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { getClientIp, recordLoginFailure, clearLoginFailure } from "../middleware/ip-blacklist.js";

/**
 * 时序攻击防护用的固定 dummy hash
 * 详见 routes/auth.ts 中相同常量的注释
 */
const DUMMY_PASSWORD_HASH =
  "$2a$10$p6LuDyKlf9RDKuDF.ZSYOuX7oLc8sOVzfJGvuOCzhd/l5DzmCCNVe";

/** students 表行类型（含 LEFT JOIN classes 得到的 class_name） */
interface StudentRow {
  id: number;
  student_no: string;
  name: string;
  class_id: number | null;
  class_name: string | null;
  gender: string;
  phone: string | null;
  is_first_login: boolean;
  last_login_at: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 学生考试关联查询行类型
 * 来自 exam_students JOIN exams JOIN classrooms JOIN buildings 的联查结果
 */
interface StudentExamRow {
  id: number;
  exam_id: number;
  subject: string;
  exam_date: Date;
  duration: number;
  location: string;
  classroom_id: number;
  classroom_name: string;
  seat_number: string | null;
  score: number | null;
  status: string;
}

/** 将 students 表行转换为前端学生对象（不返回 password/id_card 等敏感字段） */
function formatStudent(row: StudentRow) {
  return {
    id: String(row.id),
    studentNo: row.student_no,
    name: row.name,
    classId: row.class_id ? String(row.class_id) : null,
    className: row.class_name || "",
    gender: row.gender,
    phone: row.phone || "",
    isFirstLogin: Boolean(row.is_first_login),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * 将学生考试关联查询行转换为前端考试对象
 * - 根据 exam_date + duration 动态计算考试状态（upcoming/ongoing/ended）
 * - status 字段为时间状态（即将开始/进行中/已结束）
 * - examStudentStatus 字段为学生在该考试中的状态（如已签到/缺考等）
 */
function formatStudentExam(row: StudentExamRow) {
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
    id: String(row.exam_id),
    subject: row.subject,
    examDate: row.exam_date.toISOString(),
    duration: row.duration,
    location: row.location,
    classroomId: String(row.classroom_id),
    classroomName: row.classroom_name,
    seatNumber: row.seat_number || "",
    score: row.score,
    status: examStatus,
    examStudentStatus: row.status,
  };
}

/**
 * 学生端鉴权中间件
 *
 * 校验流程:
 *   1. 提取 Authorization: Bearer <token> 头
 *   2. 验证 JWT 签名与有效期
 *   3. 校验 role === "student"（四端互斥认证，详见 middleware/auth.ts）
 *   4. 将解码后的用户信息挂载到 request.user 供后续路由使用
 *
 * 失败返回 401（未提供/无效令牌）或 403（角色不匹配）
 */
async function studentAuthMiddleware(
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

    // 角色校验: 拒绝其他端 token 通过学生端接口
    if (decoded.role !== "student") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    (request as any).user = {
      id: decoded.id,
      studentNo: decoded.studentNo,
      name: decoded.name,
      role: "student" as const,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

export default async function studentAuthRoutes(fastify: FastifyInstance) {
  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    try {
      const { studentNo, password } = request.body as {
        studentNo: string;
        password: string;
      };

      if (!studentNo || !password) {
        return reply.status(400).send(errorResponse("请输入学号和密码"));
      }

      const [rows] = await pool.execute(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.student_no = ?`,
        [studentNo]
      );

      const students = rows as any[];
      if (students.length === 0) {
        // 时序攻击防护：账号不存在时也执行一次 bcrypt 比较，避免响应时间差异泄露账号是否存在
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        await recordLoginFailure(getClientIp(request), studentNo);
        return reply.status(401).send(errorResponse("学号或密码错误"));
      }

      const student = students[0];

      if (student.status !== "active") {
        return reply.status(403).send(errorResponse("账号已被停用或毕业"));
      }

      const isPasswordValid = await bcrypt.compare(password, student.password);
      if (!isPasswordValid) {
        await recordLoginFailure(getClientIp(request), studentNo);
        return reply.status(401).send(errorResponse("学号或密码错误"));
      }

      // 登录成功，清除失败计数
      clearLoginFailure(getClientIp(request));

      const token = fastify.jwt.sign(
        {
          id: student.id,
          studentNo: student.student_no,
          name: student.name,
          role: "student",
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      await pool.execute(
        "UPDATE students SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
        [student.id]
      );

      return reply.send(
        successResponse(
          {
            token,
            student: formatStudent(student as StudentRow),
          },
          "登录成功"
        )
      );
    } catch (error) {
      console.error("学生登录失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.post("/change-password", {
    preHandler: studentAuthMiddleware,
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
        "SELECT * FROM students WHERE id = ?",
        [user.id]
      );

      const students = rows as any[];
      if (students.length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      const student = students[0];

      const isPasswordValid = await bcrypt.compare(oldPassword, student.password);
      if (!isPasswordValid) {
        return reply.status(400).send(errorResponse("旧密码错误"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.execute(
        "UPDATE students SET password = ?, is_first_login = FALSE WHERE id = ?",
        [hashedPassword, user.id]
      );

      return reply.send(successResponse(null, "密码修改成功"));
    } catch (error) {
      console.error("修改密码失败:", error);
      return reply.status(500).send(errorResponse("修改密码失败"));
    }
  });

  fastify.get("/me", {
    preHandler: studentAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      const [rows] = await pool.execute(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.id = ?`,
        [user.id]
      );

      const students = rows as any[];
      if (students.length === 0) {
        return reply.status(404).send(errorResponse("学生不存在"));
      }

      return reply.send(successResponse(formatStudent(students[0] as StudentRow)));
    } catch (error) {
      console.error("获取学生信息失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  fastify.get("/exams", {
    preHandler: studentAuthMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { status } = request.query as { status?: string };

      const conditions: string[] = ["es.student_id = ?"];
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
        `SELECT es.*, e.subject, e.exam_date, e.duration, e.location, 
                c.room_number as classroom_name, b.name as building_name
         FROM exam_students es
         JOIN exams e ON es.exam_id = e.id
         JOIN classrooms c ON es.classroom_id = c.id
         JOIN buildings b ON c.building_id = b.id
         ${whereClause}
         ORDER BY e.exam_date ASC`,
        params
      );

      const list = (rows as any[]).map((row) => ({
        ...formatStudentExam({
          ...row,
          classroom_name: `${row.building_name} ${row.classroom_name}`,
        } as StudentExamRow),
      }));

      return reply.send(successResponse(list));
    } catch (error) {
      console.error("获取学生考试列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });
}

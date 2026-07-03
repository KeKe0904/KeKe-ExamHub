/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import {
  successResponse,
  errorResponse,
  formatExam,
  type ExamRow,
} from "../utils/response.js";
import { classroomAuthMiddleware } from "../middleware/auth.js";

export default async function classroomRoutes(fastify: FastifyInstance) {
  // ==================== 教室端注册 - 严格限流（每 IP 每分钟 5 次）====================
  fastify.post("/register", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    try {
      const { registrationCode, buildingId, roomNumber, password } =
        request.body as {
          registrationCode: string;
          buildingId: string;
          roomNumber: string;
          password: string;
        };

      // 参数校验
      if (!registrationCode || !buildingId || !roomNumber || !password) {
        return reply
          .status(400)
          .send(errorResponse("请填写所有必填字段"));
      }

      if (password.length < 6) {
        return reply
          .status(400)
          .send(errorResponse("密码至少 6 位"));
      }

      // 1. 验证注册码是否有效(存在且未使用)
      const [codeRows] = await pool.execute(
        "SELECT * FROM registration_codes WHERE code = ? AND is_used = FALSE",
        [registrationCode.trim()]
      );
      if ((codeRows as any[]).length === 0) {
        return reply
          .status(400)
          .send(errorResponse("注册码无效或已被使用"));
      }
      const regCode = (codeRows as any[])[0];

      // 2. 验证教学楼是否存在
      const [buildingRows] = await pool.execute(
        "SELECT * FROM buildings WHERE id = ?",
        [buildingId]
      );
      if ((buildingRows as any[]).length === 0) {
        return reply.status(400).send(errorResponse("教学楼不存在"));
      }

      // 3. 检查同一教学楼下的教室号是否已存在
      const [existing] = await pool.execute(
        "SELECT id FROM classrooms WHERE building_id = ? AND room_number = ?",
        [buildingId, roomNumber.trim()]
      );
      if ((existing as any[]).length > 0) {
        return reply
          .status(409)
          .send(errorResponse("该教学楼的此教室号已被注册"));
      }

      // 4. 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. 创建教室端账号(状态为 pending,等待审核)
      const [result] = await pool.execute(
        `INSERT INTO classrooms (building_id, room_number, password, registration_code_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [buildingId, roomNumber.trim(), hashedPassword, regCode.id]
      );

      const classroomId = (result as any).insertId;

      // 6. 标记注册码为已使用
      await pool.execute(
        "UPDATE registration_codes SET is_used = TRUE, used_by_classroom_id = ?, used_at = NOW() WHERE id = ?",
        [classroomId, regCode.id]
      );

      return reply.status(201).send(
        successResponse(
          { classroomId: String(classroomId), status: "pending" },
          "注册成功,请等待管理员审核"
        )
      );
    } catch (error) {
      console.error("教室端注册失败:", error);
      return reply.status(500).send(errorResponse("注册失败"));
    }
  });

  // ==================== 教室端登录 - 严格限流（每 IP 每分钟 5 次）====================
  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    try {
      const { buildingId, roomNumber, password } = request.body as {
        buildingId: string;
        roomNumber: string;
        password: string;
      };

      if (!buildingId || !roomNumber || !password) {
        return reply
          .status(400)
          .send(errorResponse("请填写所有必填字段"));
      }

      // 查询教室账号(关联教学楼名称)
      const [rows] = await pool.execute(
        `SELECT c.*, b.name AS building_name FROM classrooms c
         JOIN buildings b ON c.building_id = b.id
         WHERE c.building_id = ? AND c.room_number = ?`,
        [buildingId, roomNumber.trim()]
      );

      if ((rows as any[]).length === 0) {
        return reply
          .status(401)
          .send(errorResponse("教学楼或教室号不存在"));
      }

      const classroom = (rows as any[])[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(
        password,
        classroom.password
      );
      if (!isPasswordValid) {
        return reply
          .status(401)
          .send(errorResponse("教室号或密码错误"));
      }

      // 检查审核状态
      if (classroom.status === "pending") {
        return reply.send(
          successResponse(
            { status: "pending" },
            "账号正在审核中,请等待管理员通过"
          )
        );
      }

      if (classroom.status === "rejected") {
        return reply.send(
          successResponse(
            {
              status: "rejected",
              reason: classroom.reject_reason || "注册申请未通过审核",
            },
            "注册申请已被驳回"
          )
        );
      }

      // 审核通过,生成 JWT token
      const token = fastify.jwt.sign(
        {
          id: classroom.id,
          classroomId: classroom.id,
          roomNumber: classroom.room_number,
          buildingName: classroom.building_name,
          role: "classroom",
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      return reply.send(
        successResponse(
          {
            token,
            classroomId: String(classroom.id),
            buildingName: classroom.building_name,
            roomNumber: classroom.room_number,
            status: "approved",
          },
          "登录成功"
        )
      );
    } catch (error) {
      console.error("教室端登录失败:", error);
      return reply.status(500).send(errorResponse("登录失败"));
    }
  });

  // ==================== 验证 token 是否有效 ====================
  fastify.get(
    "/verify",
    {
      preHandler: [classroomAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      return reply.send(
        successResponse(
          {
            classroomId: String(user.classroomId),
            roomNumber: user.roomNumber,
            buildingName: user.buildingName,
          },
          "令牌有效"
        )
      );
    }
  );

  // ==================== 获取该教室的考试信息(需教室端 token) ====================
  fastify.get(
    "/exams",
    {
      preHandler: [classroomAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const classroomId = user.classroomId;

        // 查询分配给该教室的考试,按考试时间升序
        const [rows] = await pool.execute(
          `SELECT e.* FROM exams e
           INNER JOIN exam_classrooms ec ON e.id = ec.exam_id
           WHERE ec.classroom_id = ?
           ORDER BY e.exam_date ASC`,
          [classroomId]
        );

        const exams = (rows as ExamRow[]).map(formatExam);
        return reply.send(successResponse(exams));
      } catch (error) {
        console.error("获取教室考试信息失败:", error);
        return reply
          .status(500)
          .send(errorResponse("获取考试信息失败"));
      }
    }
  );

  // ==================== 获取教室端自身信息 ====================
  fastify.get(
    "/profile",
    {
      preHandler: [classroomAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const [rows] = await pool.execute(
          `SELECT c.*, b.name AS building_name FROM classrooms c
           JOIN buildings b ON c.building_id = b.id
           WHERE c.id = ?`,
          [user.classroomId]
        );

        if ((rows as any[]).length === 0) {
          return reply
            .status(404)
            .send(errorResponse("教室信息不存在"));
        }

        const classroom = (rows as any[])[0];
        return reply.send(
          successResponse({
            classroomId: String(classroom.id),
            buildingName: classroom.building_name,
            roomNumber: classroom.room_number,
            status: classroom.status,
          })
        );
      } catch (error) {
        console.error("获取教室信息失败:", error);
        return reply.status(500).send(errorResponse("获取教室信息失败"));
      }
    }
  );
}

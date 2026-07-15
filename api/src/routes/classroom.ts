/**
 * KeKe ExamHub - 考试信息管理系统
 * 教室端路由（/api/classroom/*）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 路由列表:
 *   POST /register  教室端注册（限流 5 次/分钟，需注册码 + 教学楼 + 教室号）
 *   POST /login     教室端登录（限流 5 次/分钟，含 IP 信任检测 + 异常登录审核）
 *   GET  /verify    验证 token 是否有效
 *   GET  /exams     获取分配给该教室的考试列表
 *   GET  /profile   获取教室端自身信息
 *
 * 安全机制:
 *   - 注册需有效注册码（一次性使用，crypto.randomInt 生成）
 *   - 登录需通过 IP 信任检测（同一 IP 累计登录 >= 3 次视为可信）
 *   - 非可信 IP 登录进入"待审核"状态，需管理员在异常登录页面批准
 *   - 生产环境强制启用 IP 信任检测，开发环境可通过 SKIP_IP_TRUST=true 跳过
 *   - 密码错误计入 IP 黑名单计数（5 次失败 → 15 分钟封禁）
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
import { getClientIp, recordLoginFailure, clearLoginFailure } from "../middleware/ip-blacklist.js";
import { logAdminAction } from "../utils/audit-log.js";

export default async function classroomRoutes(fastify: FastifyInstance) {
  /**
   * 教室端注册
   * 限流: 每 IP 每分钟 5 次
   *
   * 注册流程:
   *   1. 校验注册码（有效且未使用）
   *   2. 校验教学楼存在
   *   3. 检查教室号在该教学楼内是否已注册
   *   4. bcrypt 加密密码
   *   5. 创建教室端账号（status="pending"，需管理员审核）
   *   6. 标记注册码为已使用（防重放）
   */
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

      // 4. 加密密码（bcrypt cost=10）
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. 创建教室端账号(状态为 pending,等待审核)
      const [result] = await pool.execute(
        `INSERT INTO classrooms (building_id, room_number, password, registration_code_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [buildingId, roomNumber.trim(), hashedPassword, regCode.id]
      );

      const classroomId = (result as any).insertId;

      // 6. 标记注册码为已使用（防重放攻击）
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

  /**
   * 检测指定 IP 是否为该教室的可信 IP
   *
   * 可信判定: 同一 IP 累计成功登录 >= 3 次（记录在 classroom_trusted_ips 表）
   * 用途: 防止教室端账号从陌生 IP 登录（如账号泄露后被外部使用）
   *
   * @param classroomId 教室端账号 ID
   * @param ip 客户端 IP
   * @returns true 可信 / false 不可信（需管理员审核）
   */
  async function isTrustedIp(classroomId: number, ip: string): Promise<boolean> {
    try {
      const [rows] = await pool.execute(
        `SELECT id, login_count FROM classroom_trusted_ips 
         WHERE classroom_id = ? AND ip_address = ?
         LIMIT 1`,
        [classroomId, ip]
      );
      const result = rows as any[];
      // 登录次数 >= 3 次视为可信 IP（避免首次更换 IP 即被信任）
      return result.length > 0 && result[0].login_count >= 3;
    } catch {
      // 查询失败时返回 false（fail-closed，触发审核流程）
      return false;
    }
  }

  /**
   * 更新可信 IP 的登录次数
   * 使用 ON DUPLICATE KEY UPDATE 实现 upsert，避免先查后写的竞态条件
   */
  async function updateTrustedIp(classroomId: number, ip: string) {
    try {
      await pool.execute(
        `INSERT INTO classroom_trusted_ips (classroom_id, ip_address, login_count)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE 
           login_count = login_count + 1,
           last_seen = NOW()`,
        [classroomId, ip]
      );
    } catch (e) {
      console.error("更新可信 IP 失败:", e);
    }
  }

  /**
   * 记录教室端登录日志到 classroom_login_logs 表
   *
   * @param status 登录状态: success/failed/pending_review/blocked
   * @param isAbnormal 是否为异常登录（非常用 IP）
   * @param abnormalReason 异常原因（如 "非常用 IP 登录"）
   * @param reviewStatus 审核状态: pending/approved/rejected（仅 pending_review 时使用）
   * @returns 日志记录 ID，失败返回 null
   */
  async function recordLoginLog(
    classroomId: number,
    ip: string,
    userAgent: string,
    status: "success" | "failed" | "pending_review" | "blocked",
    isAbnormal: boolean = false,
    abnormalReason?: string,
    reviewStatus?: "pending" | "approved" | "rejected"
  ): Promise<number | null> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO classroom_login_logs 
         (classroom_id, ip_address, user_agent, status, is_abnormal, abnormal_reason, review_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          classroomId,
          ip,
          userAgent || null,
          status,
          isAbnormal,
          abnormalReason || null,
          reviewStatus || null,
        ]
      );
      return (result as any).insertId || null;
    } catch (e) {
      console.error("记录登录日志失败:", e);
      return null;
    }
  }

  /**
   * 教室端登录
   * 限流: 每 IP 每分钟 5 次
   *
   * 登录流程:
   *   1. 查询教室账号（关联教学楼）
   *   2. 验证密码（失败计入 IP 黑名单计数）
   *   3. 检查审核状态（pending/rejected 直接返回）
   *   4. IP 信任检测（非可信 IP 进入待审核状态，需管理员批准）
   *   5. 可信 IP 正常登录，更新登录次数，签发 JWT
   *
   * 安全说明:
   *   - 生产环境强制启用 IP 信任检测，防止账号泄露后被外部使用
   *   - 开发/演示环境可通过 SKIP_IP_TRUST=true 跳过（仅非生产环境生效）
   */
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

      const clientIp = getClientIp(request);
      const userAgent = request.headers["user-agent"] || "";

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

      const classroomList = rows as any[];

      // 账号不存在（注意: 此处未做时序攻击防护，因教室端需同时匹配 buildingId+roomNumber，
      // 攻击者需枚举两个维度，难度较高；如需加强可参考 auth.ts 的 DUMMY_PASSWORD_HASH 模式）
      if (classroomList.length === 0) {
        return reply
          .status(401)
          .send(errorResponse("教学楼或教室号不存在"));
      }

      const classroom = classroomList[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(
        password,
        classroom.password
      );

      // 密码错误，记录失败日志并计入 IP 黑名单计数
      if (!isPasswordValid) {
        await recordLoginLog(
          classroom.id,
          clientIp,
          userAgent,
          "failed",
          false
        );
        await recordLoginFailure(clientIp, `${buildingId}-${roomNumber}`);
        return reply
          .status(401)
          .send(errorResponse("教室号或密码错误"));
      }

      // 登录成功前先清除失败计数（避免正常用户偶尔输错密码后被封禁）
      clearLoginFailure(clientIp);

      // 检查审核状态（注册后的初始状态为 pending，需管理员批准）
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

      // ========== 异常 IP 检测 ==========
      // 安全修复：恢复 IP 信任检测，防止教室端账号从任意 IP 登录
      // 通过环境变量 SKIP_IP_TRUST=true 可在开发/演示环境跳过检测
      // 生产环境强制启用 IP 信任检测，SKIP_IP_TRUST 仅在非生产环境生效
      const skipIpCheck = process.env.SKIP_IP_TRUST === "true" && process.env.NODE_ENV !== "production";
      const trusted = skipIpCheck || await isTrustedIp(classroom.id, clientIp);

      if (!trusted) {
        // 非常用 IP，标记为异常登录，需要管理员审核
        const logId = await recordLoginLog(
          classroom.id,
          clientIp,
          userAgent,
          "pending_review",
          true,
          "非常用 IP 登录",
          "pending"
        );

        // 记录到管理员操作日志（admin_id=0, admin_username="system" 表示系统自动事件）
        // 提示管理员在异常登录页面审核该次登录
        try {
          await pool.execute(
            `INSERT INTO admin_logs (admin_id, admin_username, action, details, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [
              0,
              "system",
              "classroom_abnormal_login",
              JSON.stringify({
                logId,
                classroomId: classroom.id,
                classroomName: `${classroom.building_name} ${classroom.room_number}`,
                ip: clientIp,
              }),
              clientIp,
            ]
          );
        } catch (e) {
          console.error("记录异常登录到管理员日志失败:", e);
        }

        return reply.send(
          successResponse(
            {
              status: "pending_review",
              logId: logId ? String(logId) : null,
              ip: clientIp,
              message:
                "检测到非常用登录地址，本次登录需要管理员审核，请联系管理员批准后再试。",
            },
            "登录待审核"
          )
        );
      }

      // 常用 IP，正常登录
      await recordLoginLog(
        classroom.id,
        clientIp,
        userAgent,
        "success",
        false
      );

      // 更新可信 IP 登录次数（达到阈值后该 IP 即被视为可信）
      await updateTrustedIp(classroom.id, clientIp);

      // 审核通过,生成 JWT token（payload 含 classroomId/roomNumber/buildingName/role）
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

  /**
   * 验证教室端 JWT token 是否有效
   * 前端在页面刷新时调用，确认本地存储的 token 仍然有效。
   */
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

  /**
   * 获取分配给该教室的考试列表
   * 通过 exam_classrooms 关联表查询，按考试时间升序排列。
   */
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

  /**
   * 获取教室端自身信息
   * 返回教室号、教学楼名称、审核状态等基本信息（不含密码）。
   */
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

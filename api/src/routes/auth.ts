/**
 * KeKe ExamHub - 考试信息管理系统
 * 管理员认证路由（/api/auth/*）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 路由列表:
 *   POST /api/auth/login    管理员登录（含时序攻击防护 + 自动封禁）
 *   GET  /api/auth/verify   验证 JWT token 是否有效（前端页面刷新时使用）
 *
 * 安全机制:
 *   - 限流: 每 IP 每分钟最多 5 次登录尝试
 *   - 时序攻击防护: 账号不存在时也执行一次 bcrypt 比较，避免响应时间差异泄露账号是否存在
 *   - 自动封禁: 连续 5 次失败 → IP 进入黑名单 15 分钟（详见 middleware/ip-blacklist.ts）
 *   - JWT 角色校验: /verify 端点显式校验 role === "admin"，防止其他端 token 误用
 */
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { logAdminActionWithIp } from "../utils/audit-log.js";
import { getClientIp, recordLoginFailure, clearLoginFailure } from "../middleware/ip-blacklist.js";

/**
 * 时序攻击防护用的固定 dummy hash
 *
 * 用途: 账号不存在时仍执行一次 bcrypt 比较，让响应时间与账号存在时一致，
 *       防止攻击者通过测量响应时间枚举有效账号。
 * 该 hash 对应一个随机字符串，任何人无法反推出原始密码，仅用于消耗 CPU 时间。
 */
const DUMMY_PASSWORD_HASH =
  "$2a$10$p6LuDyKlf9RDKuDF.ZSYOuX7oLc8sOVzfJGvuOCzhd/l5DzmCCNVe";

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * 管理员登录
   * 限流: 每 IP 每分钟最多 5 次
   * 成功返回 JWT token；失败计入 IP 黑名单计数（5 次失败 → 15 分钟封禁）
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
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      if (!username || !password) {
        return reply.status(400).send(errorResponse("请输入账号和密码"));
      }

      // 查询管理员（使用预编译参数，防 SQL 注入）
      const [rows] = await pool.execute(
        "SELECT * FROM admins WHERE username = ?",
        [username]
      );

      const admins = rows as any[];
      if (admins.length === 0) {
        // 时序攻击防护：账号不存在时也执行一次 bcrypt 比较，避免响应时间差异泄露账号是否存在
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        // 记录登录失败（用于自动封禁）
        const failIp = getClientIp(request);
        await recordLoginFailure(failIp, username);
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      const admin = admins[0];

      // 验证密码（bcrypt.compare 自带恒定时间比较，防时序攻击）
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        const failIp = getClientIp(request);
        await recordLoginFailure(failIp, username);
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      // 登录成功，清除该 IP 的失败计数（避免误封正常用户偶尔输错密码后恢复）
      const successIp = getClientIp(request);
      clearLoginFailure(successIp);

      // 生成 JWT token（payload 含 id/username/role，前端在受保护路由中携带）
      const token = fastify.jwt.sign(
        { id: admin.id, username: admin.username, role: "admin" },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      // 记录登录日志到 admin_logs 表（安全修复：使用 getClientIp 而非直接信任 X-Forwarded-For）
      const ip = getClientIp(request);
      logAdminActionWithIp(admin.id, admin.username, "admin_login", ip);

      return reply.send(
        successResponse(
          { token, username: admin.username },
          "登录成功"
        )
      );
    } catch (error) {
      console.error("登录失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  /**
   * 验证 JWT token 是否有效
   * 前端在页面刷新时调用，确认本地存储的 token 仍然有效。
   *
   * 安全修复: 显式校验 role === "admin"，防止教师/学生/教室端 token 通过管理员验证接口
   * （四端互斥认证设计，详见 middleware/auth.ts）
   */
  fastify.get("/verify", {
    preHandler: async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return reply.status(401).send(errorResponse("未提供认证令牌"));
        }
        const token = authHeader.substring(7);
        const decoded = fastify.jwt.verify(token) as {
          id: number;
          username: string;
          role?: string;
        };
        // 校验角色：此端点仅供管理员使用，拒绝其他端的 token
        if (decoded.role !== "admin") {
          return reply.status(403).send(errorResponse("无权访问此接口"));
        }
        (request as any).user = { id: decoded.id, username: decoded.username };
      } catch (error) {
        return reply.status(401).send(errorResponse("认证令牌无效或已过期"));
      }
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send(
      successResponse(
        { username: user?.username },
        "令牌有效"
      )
    );
  });
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";

export default async function authRoutes(fastify: FastifyInstance) {
  // 管理员登录
  fastify.post("/login", async (request, reply) => {
    try {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      if (!username || !password) {
        return reply.status(400).send(errorResponse("请输入账号和密码"));
      }

      // 查询管理员
      const [rows] = await pool.execute(
        "SELECT * FROM admins WHERE username = ?",
        [username]
      );

      const admins = rows as any[];
      if (admins.length === 0) {
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      const admin = admins[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return reply.status(401).send(errorResponse("账号或密码错误"));
      }

      // 生成 JWT token
      const token = fastify.jwt.sign(
        { id: admin.id, username: admin.username },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

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

  // 验证 token 是否有效
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
        };
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

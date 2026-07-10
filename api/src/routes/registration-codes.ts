/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { pool } from "../config/database.js";
import {
  successResponse,
  errorResponse,
  formatRegistrationCode,
  type RegistrationCodeRow,
} from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

// 生成随机注册码(8位大写字母+数字,易读格式 XXXX-XXXX)
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去除易混淆字符 I O 0 1
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    // 安全修复：使用 crypto.randomInt 替代 Math.random，防止注册码可预测
    part1 += chars[crypto.randomInt(0, chars.length)];
    part2 += chars[crypto.randomInt(0, chars.length)];
  }
  return `${part1}-${part2}`;
}

// 生成唯一的注册码(检查数据库确保不重复)
async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const [existing] = await pool.execute(
      "SELECT id FROM registration_codes WHERE code = ?",
      [code]
    );
    if ((existing as any[]).length === 0) {
      return code;
    }
  }
  // 极端情况:用 crypto 兜底
  return `RC-${(crypto as any).randomBytes(4).toString("hex").toUpperCase()}`;
}

export default async function registrationCodeRoutes(
  fastify: FastifyInstance
) {
  // 所有接口都需要管理员认证

  // 获取所有注册码
  fastify.get(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { used } = request.query as { used?: string };

        let query = "SELECT * FROM registration_codes";
        const params: any[] = [];

        if (used === "true") {
          query += " WHERE is_used = TRUE";
        } else if (used === "false") {
          query += " WHERE is_used = FALSE";
        }

        query += " ORDER BY created_at DESC";

        const [rows] = await pool.execute(query, params);
        const codes = (rows as RegistrationCodeRow[]).map(
          formatRegistrationCode
        );
        return reply.send(successResponse(codes));
      } catch (error) {
        console.error("获取注册码列表失败:", error);
        return reply.status(500).send(errorResponse("获取注册码列表失败"));
      }
    }
  );

  // 批量生成注册码
  fastify.post(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { count = 1 } = request.body as { count?: number };

        const generateCount = Math.min(Math.max(Number(count) || 1, 1), 50);

        const codes: string[] = [];
        for (let i = 0; i < generateCount; i++) {
          const code = await generateUniqueCode();
          await pool.execute(
            "INSERT INTO registration_codes (code) VALUES (?)",
            [code]
          );
          codes.push(code);
        }

        logAdminAction(user.id, user.username, "registration_code_create", {
          count: codes.length,
        });

        return reply.status(201).send(
          successResponse(
            { codes, count: codes.length },
            `成功生成 ${codes.length} 个注册码`
          )
        );
      } catch (error) {
        console.error("生成注册码失败:", error);
        return reply.status(500).send(errorResponse("生成注册码失败"));
      }
    }
  );

  // 删除注册码(仅未使用的可删除)
  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { id } = request.params as { id: string };

        // 检查是否已使用
        const [rows] = await pool.execute(
          "SELECT code, is_used FROM registration_codes WHERE id = ?",
          [id]
        );
        if ((rows as any[]).length === 0) {
          return reply.status(404).send(errorResponse("注册码不存在"));
        }
        const codeData = (rows as any[])[0];
        if (codeData.is_used) {
          return reply
            .status(409)
            .send(errorResponse("已使用的注册码无法删除"));
        }

        await pool.execute("DELETE FROM registration_codes WHERE id = ?", [
          id,
        ]);

        logAdminAction(user.id, user.username, "registration_code_delete", {
          registrationCodeId: id,
          code: codeData.code,
        });

        return reply.send(successResponse(null, "注册码删除成功"));
      } catch (error) {
        console.error("删除注册码失败:", error);
        return reply.status(500).send(errorResponse("删除注册码失败"));
      }
    }
  );
}

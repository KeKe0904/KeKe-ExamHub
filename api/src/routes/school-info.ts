import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

// 默认学校信息结构
const DEFAULT_SCHOOL_INFO = {
  school_type: "",
  description: "",
  address: "",
  phone: "",
  website: "",
  teaching_buildings: "",
  library: "",
  campus: "",
  features: "",
};

export default async function schoolInfoRoutes(fastify: FastifyInstance) {
  // 获取学校信息（公开接口）
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT setting_value FROM settings WHERE setting_key = ?",
        ["school_info"]
      );
      const result = rows as any[];
      if (result.length > 0 && result[0].setting_value) {
        return reply.send(successResponse(JSON.parse(result[0].setting_value)));
      }
      return reply.send(successResponse(DEFAULT_SCHOOL_INFO));
    } catch (error) {
      console.error("获取学校信息失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 更新学校信息（需要认证）
  fastify.put("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const fields = request.body as Record<string, string>;

      // 只允许已知字段
      const allowedKeys = Object.keys(DEFAULT_SCHOOL_INFO);
      const info: Record<string, string> = {};
      for (const key of allowedKeys) {
        if (fields[key] !== undefined) {
          const val = fields[key];
          if (typeof val === "string" && val.length > 10000) {
            return reply.status(400).send(errorResponse(`${key} 内容过长（最多10000字）`));
          }
          info[key] = val;
        }
      }

      await pool.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES ('school_info', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [JSON.stringify(info)]
      );

      return reply.send(successResponse(info, "学校信息更新成功"));
    } catch (error) {
      console.error("更新学校信息失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });
}

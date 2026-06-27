/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import {
  successResponse,
  errorResponse,
  formatBuilding,
  type BuildingRow,
} from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function buildingRoutes(fastify: FastifyInstance) {
  // 获取所有教学楼(公开接口,教室端注册时需要)
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM buildings ORDER BY created_at ASC"
      );
      const buildings = (rows as BuildingRow[]).map(formatBuilding);
      return reply.send(successResponse(buildings));
    } catch (error) {
      console.error("获取教学楼列表失败:", error);
      return reply.status(500).send(errorResponse("获取教学楼列表失败"));
    }
  });

  // 以下接口需要管理员认证

  // 创建教学楼
  fastify.post(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { name } = request.body as { name: string };

        if (!name || !name.trim()) {
          return reply.status(400).send(errorResponse("请输入教学楼名称"));
        }

        // 检查重名
        const [existing] = await pool.execute(
          "SELECT id FROM buildings WHERE name = ?",
          [name.trim()]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(409).send(errorResponse("教学楼名称已存在"));
        }

        const [result] = await pool.execute(
          "INSERT INTO buildings (name) VALUES (?)",
          [name.trim()]
        );

        const insertId = (result as any).insertId;
        const [rows] = await pool.execute(
          "SELECT * FROM buildings WHERE id = ?",
          [insertId]
        );

        return reply.status(201).send(
          successResponse(
            formatBuilding((rows as BuildingRow[])[0]),
            "教学楼创建成功"
          )
        );
      } catch (error) {
        console.error("创建教学楼失败:", error);
        return reply.status(500).send(errorResponse("创建教学楼失败"));
      }
    }
  );

  // 更新教学楼
  fastify.put(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { name } = request.body as { name: string };

        if (!name || !name.trim()) {
          return reply.status(400).send(errorResponse("请输入教学楼名称"));
        }

        // 检查重名(排除自身)
        const [existing] = await pool.execute(
          "SELECT id FROM buildings WHERE name = ? AND id != ?",
          [name.trim(), id]
        );
        if ((existing as any[]).length > 0) {
          return reply.status(409).send(errorResponse("教学楼名称已存在"));
        }

        const [result] = await pool.execute(
          "UPDATE buildings SET name = ? WHERE id = ?",
          [name.trim(), id]
        );

        if ((result as any).affectedRows === 0) {
          return reply.status(404).send(errorResponse("教学楼不存在"));
        }

        const [rows] = await pool.execute(
          "SELECT * FROM buildings WHERE id = ?",
          [id]
        );

        return reply.send(
          successResponse(
            formatBuilding((rows as BuildingRow[])[0]),
            "教学楼更新成功"
          )
        );
      } catch (error) {
        console.error("更新教学楼失败:", error);
        return reply.status(500).send(errorResponse("更新教学楼失败"));
      }
    }
  );

  // 删除教学楼
  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        // 检查是否有教室关联
        const [classrooms] = await pool.execute(
          "SELECT id FROM classrooms WHERE building_id = ? LIMIT 1",
          [id]
        );
        if ((classrooms as any[]).length > 0) {
          return reply.status(409).send(
            errorResponse("该教学楼下有教室,无法删除")
          );
        }

        const [result] = await pool.execute(
          "DELETE FROM buildings WHERE id = ?",
          [id]
        );

        if ((result as any).affectedRows === 0) {
          return reply.status(404).send(errorResponse("教学楼不存在"));
        }

        return reply.send(successResponse(null, "教学楼删除成功"));
      } catch (error) {
        console.error("删除教学楼失败:", error);
        return reply.status(500).send(errorResponse("删除教学楼失败"));
      }
    }
  );
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

// 公告行类型
interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  is_pinned: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// 格式化公告
function formatAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isPinned: !!row.is_pinned,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function announcementRoutes(fastify: FastifyInstance) {
  // 获取公告列表（公开接口，前端用户端使用）
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE is_active = 1 ORDER BY is_pinned DESC, created_at DESC"
      );
      const announcements = (rows as AnnouncementRow[]).map(formatAnnouncement);
      return reply.send(successResponse(announcements));
    } catch (error) {
      console.error("获取公告列表失败:", error);
      return reply.status(500).send(errorResponse("获取公告列表失败"));
    }
  });

  // 获取单个公告详情（公开接口）
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE id = ?",
        [id]
      );
      const announcements = rows as AnnouncementRow[];
      if (announcements.length === 0) {
        return reply.status(404).send(errorResponse("公告不存在"));
      }
      return reply.send(successResponse(formatAnnouncement(announcements[0])));
    } catch (error) {
      console.error("获取公告详情失败:", error);
      return reply.status(500).send(errorResponse("获取公告详情失败"));
    }
  });

  // 以下接口需要管理员认证
  // 获取所有公告（管理后台使用，包含未激活的）
  fastify.get("/admin/all", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC"
      );
      const announcements = (rows as AnnouncementRow[]).map(formatAnnouncement);
      return reply.send(successResponse(announcements));
    } catch (error) {
      console.error("获取公告列表失败:", error);
      return reply.status(500).send(errorResponse("获取公告列表失败"));
    }
  });

  // 创建公告
  fastify.post("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { title, content, isPinned, isActive } = request.body as {
        title: string;
        content: string;
        isPinned?: boolean;
        isActive?: boolean;
      };

      if (!title || !content) {
        return reply.status(400).send(errorResponse("请填写标题和内容"));
      }

      const [result] = await pool.execute(
        `INSERT INTO announcements (title, content, is_pinned, is_active)
         VALUES (?, ?, ?, ?)`,
        [title, content, isPinned ? 1 : 0, isActive === false ? 0 : 1]
      );

      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE id = ?",
        [insertId]
      );

      return reply.status(201).send(
        successResponse(formatAnnouncement((rows as AnnouncementRow[])[0]), "公告发布成功")
      );
    } catch (error) {
      console.error("创建公告失败:", error);
      return reply.status(500).send(errorResponse("创建公告失败"));
    }
  });

  // 更新公告
  fastify.put("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { title, content, isPinned, isActive } = request.body as {
        title: string;
        content: string;
        isPinned?: boolean;
        isActive?: boolean;
      };

      if (!title || !content) {
        return reply.status(400).send(errorResponse("请填写标题和内容"));
      }

      const [result] = await pool.execute(
        `UPDATE announcements
         SET title = ?, content = ?, is_pinned = ?, is_active = ?
         WHERE id = ?`,
        [title, content, isPinned ? 1 : 0, isActive ? 1 : 0, id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("公告不存在"));
      }

      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE id = ?",
        [id]
      );

      return reply.send(
        successResponse(formatAnnouncement((rows as AnnouncementRow[])[0]), "公告更新成功")
      );
    } catch (error) {
      console.error("更新公告失败:", error);
      return reply.status(500).send(errorResponse("更新公告失败"));
    }
  });

  // 删除公告
  fastify.delete("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [result] = await pool.execute(
        "DELETE FROM announcements WHERE id = ?",
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("公告不存在"));
      }

      return reply.send(successResponse(null, "公告删除成功"));
    } catch (error) {
      console.error("删除公告失败:", error);
      return reply.status(500).send(errorResponse("删除公告失败"));
    }
  });
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { sanitizeHtml, sanitizeText } from "../utils/xss.js";
import { logAdminAction } from "../utils/audit-log.js";

// 公告状态类型
type AnnouncementStatus = 'scheduled' | 'active' | 'expired';

// 公告行类型
interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  is_pinned: number;
  is_active: number;
  publish_at: string | null;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
}

// 计算公告状态
function calculateAnnouncementStatus(row: AnnouncementRow): AnnouncementStatus {
  if (!row.is_active) {
    return 'expired';
  }
  const now = new Date();
  if (row.publish_at && new Date(row.publish_at) > now) {
    return 'scheduled';
  }
  if (row.expire_at && new Date(row.expire_at) <= now) {
    return 'expired';
  }
  return 'active';
}

// 格式化公告
function formatAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isPinned: !!row.is_pinned,
    isActive: !!row.is_active,
    publishAt: row.publish_at,
    expireAt: row.expire_at,
    status: calculateAnnouncementStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function announcementRoutes(fastify: FastifyInstance) {
  // 获取公告列表（公开接口，前端用户端使用）
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM announcements 
         WHERE is_active = 1 
           AND (publish_at IS NULL OR publish_at <= NOW()) 
           AND (expire_at IS NULL OR expire_at > NOW())
         ORDER BY is_pinned DESC, created_at DESC`
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
      const user = (request as any).user;
      const { title, content, isPinned, isActive, publishAt, expireAt } = request.body as {
        title: string;
        content: string;
        isPinned?: boolean;
        isActive?: boolean;
        publishAt?: string | null;
        expireAt?: string | null;
      };

      if (!title || !content) {
        return reply.status(400).send(errorResponse("请填写标题和内容"));
      }

      const safeTitle = sanitizeText(title);
      const safeContent = sanitizeHtml(content);

      const [result] = await pool.execute(
        `INSERT INTO announcements (title, content, is_pinned, is_active, publish_at, expire_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          safeTitle, 
          safeContent, 
          isPinned ? 1 : 0, 
          isActive === false ? 0 : 1,
          publishAt || null,
          expireAt || null
        ]
      );

      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE id = ?",
        [insertId]
      );

      logAdminAction(user.id, user.username, "announcement_create", {
        announcementId: insertId,
        title: safeTitle,
      });

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
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { title, content, isPinned, isActive, publishAt, expireAt } = request.body as {
        title: string;
        content: string;
        isPinned?: boolean;
        isActive?: boolean;
        publishAt?: string | null;
        expireAt?: string | null;
      };

      if (!title || !content) {
        return reply.status(400).send(errorResponse("请填写标题和内容"));
      }

      const safeTitle = sanitizeText(title);
      const safeContent = sanitizeHtml(content);

      const [result] = await pool.execute(
        `UPDATE announcements
         SET title = ?, content = ?, is_pinned = ?, is_active = ?, publish_at = ?, expire_at = ?
         WHERE id = ?`,
        [
          safeTitle, 
          safeContent, 
          isPinned ? 1 : 0, 
          isActive ? 1 : 0,
          publishAt || null,
          expireAt || null,
          id
        ]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("公告不存在"));
      }

      const [rows] = await pool.execute(
        "SELECT * FROM announcements WHERE id = ?",
        [id]
      );

      logAdminAction(user.id, user.username, "announcement_update", {
        announcementId: id,
        title: safeTitle,
      });

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
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT title FROM announcements WHERE id = ?",
        [id]
      );
      const announcement = (rows as any[])[0];

      const [result] = await pool.execute(
        "DELETE FROM announcements WHERE id = ?",
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return reply.status(404).send(errorResponse("公告不存在"));
      }

      logAdminAction(user.id, user.username, "announcement_delete", {
        announcementId: id,
        title: announcement?.title || "",
      });

      return reply.send(successResponse(null, "公告删除成功"));
    } catch (error) {
      console.error("删除公告失败:", error);
      return reply.status(500).send(errorResponse("删除公告失败"));
    }
  });
}

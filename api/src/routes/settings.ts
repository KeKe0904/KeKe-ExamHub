/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";

export default async function settingsRoutes(fastify: FastifyInstance) {
  // 获取当前管理员信息
  fastify.get("/profile", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const [rows] = await pool.execute(
        "SELECT id, username, avatar FROM admins WHERE id = ?",
        [user.id]
      );
      const admins = rows as any[];
      if (admins.length === 0) {
        return reply.status(404).send(errorResponse("管理员不存在"));
      }
      return reply.send(successResponse(admins[0]));
    } catch (error) {
      console.error("获取管理员信息失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 修改密码
  fastify.put("/password", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
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
        return reply.status(400).send(errorResponse("新密码至少6位"));
      }

      // 查询当前密码
      const [rows] = await pool.execute(
        "SELECT password FROM admins WHERE id = ?",
        [user.id]
      );
      const admins = rows as any[];
      if (admins.length === 0) {
        return reply.status(404).send(errorResponse("管理员不存在"));
      }

      // 验证旧密码
      const isOldValid = await bcrypt.compare(oldPassword, admins[0].password);
      if (!isOldValid) {
        return reply.status(400).send(errorResponse("旧密码错误"));
      }

      // 加密新密码并更新
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.execute(
        "UPDATE admins SET password = ? WHERE id = ?",
        [hashedPassword, user.id]
      );

      logAdminAction(user.id, user.username, "password_change", {});

      return reply.send(successResponse(null, "密码修改成功"));
    } catch (error) {
      console.error("修改密码失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 修改头像（存储头像URL或base64数据）
  fastify.put("/avatar", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { avatar } = request.body as { avatar: string };

      if (!avatar) {
        return reply.status(400).send(errorResponse("请提供头像数据"));
      }

      // 限制头像大小（base64 约 2MB）
      if (avatar.length > 2 * 1024 * 1024) {
        return reply.status(400).send(errorResponse("头像文件过大，请上传小于2MB的图片"));
      }

      await pool.execute(
        "UPDATE admins SET avatar = ? WHERE id = ?",
        [avatar, user.id]
      );

      logAdminAction(user.id, user.username, "avatar_change", {});

      return reply.send(successResponse({ avatar }, "头像更新成功"));
    } catch (error) {
      console.error("修改头像失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 获取系统设置（公开接口，前端展示学校名字等）
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT setting_key, setting_value FROM settings"
      );
      const settings: Record<string, string> = {};
      (rows as any[]).forEach((row) => {
        settings[row.setting_key] = row.setting_value;
      });
      return reply.send(successResponse(settings));
    } catch (error) {
      console.error("获取设置失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 更新系统设置（学校名字、站点标题、站点图标等）
  fastify.put("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { schoolName, siteTitle, siteFavicon, cookieConsentEnabled } = request.body as {
        schoolName?: string;
        siteTitle?: string;
        siteFavicon?: string;
        cookieConsentEnabled?: boolean;
      };

      const updates: { key: string; value: string }[] = [];

      if (schoolName !== undefined) {
        if (schoolName.length > 100) {
          return reply.status(400).send(errorResponse("学校名字过长"));
        }
        updates.push({ key: "school_name", value: schoolName });
      }

      if (siteTitle !== undefined) {
        if (siteTitle.length > 200) {
          return reply.status(400).send(errorResponse("站点标题过长"));
        }
        updates.push({ key: "site_title", value: siteTitle });
      }

      if (siteFavicon !== undefined) {
        // favicon 限制为 1MB（base64）
        if (siteFavicon && siteFavicon.length > 1 * 1024 * 1024) {
          return reply.status(400).send(errorResponse("图标文件过大，请上传小于1MB的图片"));
        }
        updates.push({ key: "site_favicon", value: siteFavicon });
      }

      if (cookieConsentEnabled !== undefined) {
        updates.push({ key: "cookie_consent_enabled", value: cookieConsentEnabled ? "true" : "false" });
      }

      for (const { key, value } of updates) {
        await pool.execute(
          `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, value]
        );
      }

      const updatedKeys = updates.map((u) => u.key);
      logAdminAction(user.id, user.username, "settings_update", {
        updatedKeys,
      });

      return reply.send(successResponse(null, "设置更新成功"));
    } catch (error) {
      console.error("更新设置失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });
}

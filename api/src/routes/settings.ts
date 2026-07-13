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

/**
 * 安全修复：校验 base64 图片数据是否为合法图片（防止 SVG XSS 和恶意文件）
 * 支持 data:image/xxx;base64,... 和纯 base64 两种格式
 * 拒绝 image/svg+xml（可内嵌 <script>）
 */
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMAGE_MAGIC: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

function validateBase64Image(data: string): { ok: boolean; error?: string } {
  if (!data) return { ok: false, error: "数据为空" };
  // 解析 data URL 格式：data:image/png;base64,xxxx
  let mime = "";
  let base64 = data;
  const dataUrlMatch = data.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    base64 = dataUrlMatch[2];
  }
  // 如果带 MIME，校验白名单；如果纯 base64，尝试通过魔术字节推断
  if (mime) {
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      return { ok: false, error: `不支持的图片类型: ${mime}（仅支持 JPEG/PNG/WebP/GIF）` };
    }
  }
  // 魔术字节校验
  try {
    const buf = Buffer.from(base64, "base64");
    if (buf.length < 4) return { ok: false, error: "数据过短" };
    // 尝试匹配已知魔术字节
    let matched = false;
    for (const [expectedMime, magic] of Object.entries(IMAGE_MAGIC)) {
      if (buf.length >= magic.length && magic.every((b, i) => buf[i] === b)) {
        // 如果声明了 MIME，检查是否与魔术字节一致
        if (mime && mime !== expectedMime) {
          return { ok: false, error: "文件内容与声明的类型不匹配" };
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      return { ok: false, error: "无法识别的图片格式" };
    }
  } catch {
    return { ok: false, error: "base64 解码失败" };
  }
  return { ok: true };
}

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
      // 安全修复：管理员密码复杂度对齐学生/教师要求
      // 至少 8 位，必须同时包含字母和数字
      if (newPassword.length < 8) {
        return reply.status(400).send(errorResponse("新密码至少8位"));
      }
      if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return reply.status(400).send(errorResponse("新密码必须同时包含字母和数字"));
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

      // 安全修复：校验图片类型和魔术字节，防止 SVG XSS 等攻击
      const imgCheck = validateBase64Image(avatar);
      if (!imgCheck.ok) {
        return reply.status(400).send(errorResponse(`头像校验失败: ${imgCheck.error}`));
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
  // 安全修复：敏感字段（ai_api_key、JWT 相关）不返回给前端，避免凭证泄露
  fastify.get("/", async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT setting_key, setting_value FROM settings"
      );
      // 敏感 key 黑名单：永不通过公开接口返回
      const SENSITIVE_KEYS = new Set([
        "ai_api_key",
        "jwt_secret",
        "smtp_password",
        "db_password",
      ]);
      const settings: Record<string, string> = {};
      (rows as any[]).forEach((row) => {
        if (SENSITIVE_KEYS.has(row.setting_key)) return;
        settings[row.setting_key] = row.setting_value;
      });
      return reply.send(successResponse(settings));
    } catch (error) {
      console.error("获取设置失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // 更新系统设置（学校名字、站点标题、站点图标、首页文案、尾栏内容等）
  fastify.put("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const {
        schoolName,
        siteTitle,
        siteFavicon,
        cookieConsentEnabled,
        // 首页文案自定义
        homeBadgeText,
        homeTitle,
        homeSubtitle,
        homeStatLabels,
        // 尾栏自定义
        footerText,
        footerIcp,
        footerPublicSecurity,
        footerLinks,
        // === AI 助手配置 ===
        aiApiUrl,
        aiApiKey,
        aiModel,
        aiEnabled,
        aiSystemPrompt,
      } = request.body as {
        schoolName?: string;
        siteTitle?: string;
        siteFavicon?: string;
        cookieConsentEnabled?: boolean | string;
        homeBadgeText?: string;
        homeTitle?: string;
        homeSubtitle?: string;
        homeStatLabels?: string;
        footerText?: string;
        footerIcp?: string;
        footerPublicSecurity?: string;
        // 兼容前端传数组或 JSON 字符串两种格式
        footerLinks?: Array<{ name: string; url: string }> | string;
        // AI 配置
        aiApiUrl?: string;
        aiApiKey?: string;
        aiModel?: string;
        aiEnabled?: boolean | string;
        aiSystemPrompt?: string;
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
        // 安全修复：校验 favicon 图片类型（非空时）
        if (siteFavicon) {
          const favCheck = validateBase64Image(siteFavicon);
          if (!favCheck.ok) {
            return reply.status(400).send(errorResponse(`图标校验失败: ${favCheck.error}`));
          }
        }
        updates.push({ key: "site_favicon", value: siteFavicon });
      }

      if (cookieConsentEnabled !== undefined) {
        const val = typeof cookieConsentEnabled === "boolean"
          ? (cookieConsentEnabled ? "true" : "false")
          : cookieConsentEnabled;
        updates.push({ key: "cookie_consent_enabled", value: val });
      }

      // === 首页文案自定义 ===
      if (homeBadgeText !== undefined) {
        if (homeBadgeText.length > 100) {
          return reply.status(400).send(errorResponse("首页徽章文字过长"));
        }
        updates.push({ key: "home_badge_text", value: homeBadgeText });
      }
      if (homeTitle !== undefined) {
        if (homeTitle.length > 200) {
          return reply.status(400).send(errorResponse("首页主标题过长"));
        }
        updates.push({ key: "home_title", value: homeTitle });
      }
      if (homeSubtitle !== undefined) {
        if (homeSubtitle.length > 500) {
          return reply.status(400).send(errorResponse("首页副标题过长"));
        }
        updates.push({ key: "home_subtitle", value: homeSubtitle });
      }
      if (homeStatLabels !== undefined) {
        if (homeStatLabels.length > 500) {
          return reply.status(400).send(errorResponse("首页统计标签过长"));
        }
        updates.push({ key: "home_stat_labels", value: homeStatLabels });
      }

      // === 尾栏自定义 ===
      if (footerText !== undefined) {
        if (footerText.length > 500) {
          return reply.status(400).send(errorResponse("尾栏版权文字过长"));
        }
        updates.push({ key: "footer_text", value: footerText });
      }
      if (footerIcp !== undefined) {
        if (footerIcp.length > 100) {
          return reply.status(400).send(errorResponse("ICP 备案号过长"));
        }
        updates.push({ key: "footer_icp", value: footerIcp });
      }
      if (footerPublicSecurity !== undefined) {
        if (footerPublicSecurity.length > 100) {
          return reply.status(400).send(errorResponse("公安备案号过长"));
        }
        updates.push({ key: "footer_public_security", value: footerPublicSecurity });
      }
      if (footerLinks !== undefined) {
        // 兼容两种格式：1) 数组对象 2) JSON 字符串
        let linksValue = "";
        if (Array.isArray(footerLinks)) {
          // 校验数组每一项结构
          for (const item of footerLinks) {
            if (!item || typeof item.name !== "string" || typeof item.url !== "string") {
              return reply.status(400).send(errorResponse("友情链接格式错误，每项需包含 name 和 url 字符串"));
            }
            if (item.name.length > 100 || item.url.length > 200) {
              return reply.status(400).send(errorResponse("友情链接单项过长"));
            }
          }
          linksValue = JSON.stringify(footerLinks);
        } else if (typeof footerLinks === "string") {
          // 校验是否为合法 JSON 数组
          try {
            if (footerLinks) {
              const parsed = JSON.parse(footerLinks);
              if (!Array.isArray(parsed)) {
                throw new Error("not array");
              }
            }
          } catch {
            return reply.status(400).send(errorResponse("友情链接格式错误，应为 JSON 数组"));
          }
          linksValue = footerLinks;
        } else {
          return reply.status(400).send(errorResponse("友情链接格式错误"));
        }
        // 限制总长度
        if (linksValue.length > 5000) {
          return reply.status(400).send(errorResponse("友情链接内容过长"));
        }
        updates.push({ key: "footer_links", value: linksValue });
      }

      // === AI 助手配置 ===
      if (aiApiUrl !== undefined) {
        if (aiApiUrl.length > 500)
          return reply.status(400).send(errorResponse("AI 接口地址过长"));
        updates.push({ key: "ai_api_url", value: aiApiUrl });
      }
      if (aiApiKey !== undefined) {
        if (aiApiKey.length > 500)
          return reply.status(400).send(errorResponse("AI API Key 过长"));
        updates.push({ key: "ai_api_key", value: aiApiKey });
      }
      if (aiModel !== undefined) {
        if (aiModel.length > 200)
          return reply.status(400).send(errorResponse("AI 模型名称过长"));
        updates.push({ key: "ai_model", value: aiModel });
      }
      if (aiEnabled !== undefined) {
        const val = typeof aiEnabled === "boolean" ? (aiEnabled ? "true" : "false") : aiEnabled;
        updates.push({ key: "ai_enabled", value: val });
      }
      if (aiSystemPrompt !== undefined) {
        if (aiSystemPrompt.length > 20000)
          return reply.status(400).send(errorResponse("AI 系统提示词过长（最大 20000 字符）"));
        updates.push({ key: "ai_system_prompt", value: aiSystemPrompt });
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

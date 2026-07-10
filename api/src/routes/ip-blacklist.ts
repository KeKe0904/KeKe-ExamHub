/**
 * KeKe ExamHub - 考试信息管理系统
 * IP 黑名单管理路由
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { clearBlacklistCache } from "../middleware/ip-blacklist.js";
import { logAdminActionWithIp } from "../utils/audit-log.js";

interface IpBlacklistRow {
  id: number;
  ip_address: string;
  reason: string | null;
  banned_by: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function formatIpBlacklist(row: IpBlacklistRow) {
  return {
    id: String(row.id),
    ipAddress: row.ip_address,
    reason: row.reason || "",
    bannedBy: row.banned_by || "",
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    isPermanent: row.expires_at === null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// 验证 IP 地址格式（支持 IPv4 和 IPv6）
function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^::$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export default async function ipBlacklistRoutes(fastify: FastifyInstance) {
  // 所有路由都需要管理员认证
  fastify.addHook("onRequest", authMiddleware);

  // ========== 获取 IP 黑名单列表 ==========
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        pageSize = "20",
        search,
        status,
      } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        status?: string; // active / expired
      };

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push("ip_address LIKE ?");
        params.push(`%${search}%`);
      }

      if (status === "active") {
        conditions.push("(expires_at IS NULL OR expires_at > NOW())");
      } else if (status === "expired") {
        conditions.push("expires_at IS NOT NULL AND expires_at <= NOW()");
      }

      let whereClause = "";
      if (conditions.length > 0) {
        whereClause = " WHERE " + conditions.join(" AND ");
      }

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM ip_blacklist${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.query(
        `SELECT * FROM ip_blacklist${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const list = (rows as IpBlacklistRow[]).map(formatIpBlacklist);

      return reply.send(
        successResponse({
          list,
          total,
          page: pageNum,
          pageSize: size,
          totalPages: Math.ceil(total / size),
        })
      );
    } catch (error) {
      console.error("获取 IP 黑名单列表失败:", error);
      return reply.status(500).send(errorResponse("获取 IP 黑名单列表失败"));
    }
  });

  // ========== 添加 IP 到黑名单 ==========
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { ipAddress, reason, expiresAt } = request.body as {
        ipAddress: string;
        reason?: string;
        expiresAt?: string | null;
      };

      if (!ipAddress || !ipAddress.trim()) {
        return reply.status(400).send(errorResponse("请输入 IP 地址"));
      }

      const trimmedIp = ipAddress.trim();

      if (!isValidIp(trimmedIp)) {
        return reply.status(400).send(errorResponse("IP 地址格式不正确"));
      }

      // 检查是否已存在
      const [existing] = await pool.execute(
        "SELECT id FROM ip_blacklist WHERE ip_address = ?",
        [trimmedIp]
      );
      if ((existing as any[]).length > 0) {
        return reply.status(400).send(errorResponse("该 IP 已在黑名单中"));
      }

      const [result] = await pool.execute(
        `INSERT INTO ip_blacklist (ip_address, reason, banned_by, expires_at)
         VALUES (?, ?, ?, ?)`,
        [
          trimmedIp,
          reason || null,
          user.username,
          expiresAt || null,
        ]
      );

      const insertId = (result as any).insertId;

      // 清除缓存
      clearBlacklistCache(trimmedIp);

      // 记录审计日志
      logAdminActionWithIp(user.id, user.username, "ip_blacklist_add", request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || request.ip, {
        ipId: insertId,
        ipAddress: trimmedIp,
        reason: reason || "",
      });

      return reply.status(201).send(
        successResponse(
          { id: String(insertId) },
          "IP 已添加到黑名单"
        )
      );
    } catch (error) {
      console.error("添加 IP 黑名单失败:", error);
      return reply.status(500).send(errorResponse("添加 IP 黑名单失败"));
    }
  });

  // ========== 更新黑名单 IP ==========
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { reason, expiresAt } = request.body as {
        reason?: string;
        expiresAt?: string | null;
      };

      // 检查是否存在
      const [rows] = await pool.execute(
        "SELECT * FROM ip_blacklist WHERE id = ?",
        [id]
      );
      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("该记录不存在"));
      }

      const oldIp = (rows as IpBlacklistRow[])[0].ip_address;

      await pool.execute(
        `UPDATE ip_blacklist SET reason = ?, expires_at = ? WHERE id = ?`,
        [reason || null, expiresAt || null, id]
      );

      // 清除缓存
      clearBlacklistCache(oldIp);

      // 记录审计日志
      logAdminActionWithIp(user.id, user.username, "ip_blacklist_update", request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || request.ip, {
        ipId: id,
        ipAddress: oldIp,
        reason: reason || "",
      });

      return reply.send(successResponse(null, "更新成功"));
    } catch (error) {
      console.error("更新 IP 黑名单失败:", error);
      return reply.status(500).send(errorResponse("更新失败"));
    }
  });

  // ========== 删除黑名单 IP（解封）==========
  fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      // 检查是否存在
      const [rows] = await pool.execute(
        "SELECT * FROM ip_blacklist WHERE id = ?",
        [id]
      );
      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("该记录不存在"));
      }

      const ipAddress = (rows as IpBlacklistRow[])[0].ip_address;

      await pool.execute("DELETE FROM ip_blacklist WHERE id = ?", [id]);

      // 清除缓存
      clearBlacklistCache(ipAddress);

      // 记录审计日志
      logAdminActionWithIp(user.id, user.username, "ip_blacklist_delete", request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || request.ip, {
        ipId: id,
        ipAddress,
      });

      return reply.send(successResponse(null, "IP 已解封"));
    } catch (error) {
      console.error("删除 IP 黑名单失败:", error);
      return reply.status(500).send(errorResponse("删除失败"));
    }
  });

  // ========== 获取待审核异常登录数量 ==========
  fastify.get("/abnormal-login/count", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as total FROM classroom_login_logs 
         WHERE is_abnormal = TRUE AND review_status = 'pending'`
      );
      const total = (rows as any[])[0].total;
      return reply.send(successResponse({ count: total }));
    } catch (error) {
      console.error("获取异常登录数量失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // ========== 获取异常登录列表 ==========
  fastify.get("/abnormal-login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        pageSize = "20",
        classroomId,
        reviewStatus,
      } = request.query as {
        page?: string;
        pageSize?: string;
        classroomId?: string;
        reviewStatus?: string;
      };

      const pageNum = parseInt(page) || 1;
      const size = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * size;

      const conditions: string[] = ["is_abnormal = TRUE"];
      const params: any[] = [];

      if (classroomId) {
        conditions.push("classroom_id = ?");
        params.push(classroomId);
      }

      if (reviewStatus) {
        conditions.push("review_status = ?");
        params.push(reviewStatus);
      }

      const whereClause = " WHERE " + conditions.join(" AND ");

      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as total FROM classroom_login_logs${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      const [rows] = await pool.query(
        `SELECT l.*, c.room_number, b.name as building_name
         FROM classroom_login_logs l
         LEFT JOIN classrooms c ON l.classroom_id = c.id
         LEFT JOIN buildings b ON c.building_id = b.id
         ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, size, offset]
      );

      const list = (rows as any[]).map((row) => ({
        id: String(row.id),
        classroomId: String(row.classroom_id),
        classroomName: `${row.building_name || ""} ${row.room_number || ""}`.trim(),
        ipAddress: row.ip_address,
        userAgent: row.user_agent || "",
        location: row.location || "",
        status: row.status,
        isAbnormal: Boolean(row.is_abnormal),
        abnormalReason: row.abnormal_reason || "",
        reviewStatus: row.review_status,
        reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
        reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
      }));

      return reply.send(
        successResponse({
          list,
          total,
          page: pageNum,
          pageSize: size,
          totalPages: Math.ceil(total / size),
        })
      );
    } catch (error) {
      console.error("获取异常登录列表失败:", error);
      return reply.status(500).send(errorResponse("获取失败"));
    }
  });

  // ========== 审核异常登录（通过/拒绝）==========
  fastify.post("/abnormal-login/:id/review", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { action, banIp } = request.body as {
        action: "approve" | "reject"; // approve=允许登录, reject=拒绝并可能封禁
        banIp?: boolean;
      };

      // 检查记录是否存在
      const [rows] = await pool.execute(
        "SELECT * FROM classroom_login_logs WHERE id = ?",
        [id]
      );
      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("记录不存在"));
      }

      const log = (rows as any[])[0];

      if (log.review_status && log.review_status !== "pending") {
        return reply.status(400).send(errorResponse("该记录已审核"));
      }

      const reviewStatus = action === "approve" ? "approved" : "rejected";

      await pool.execute(
        `UPDATE classroom_login_logs 
         SET review_status = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reviewStatus, user.id, id]
      );

      // 如果是批准，且该 IP 不在可信 IP 中，则添加为可信 IP
      if (action === "approve") {
        try {
          await pool.execute(
            `INSERT INTO classroom_trusted_ips (classroom_id, ip_address, login_count)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE login_count = login_count + 1, last_seen = NOW()`,
            [log.classroom_id, log.ip_address]
          );
        } catch (e) {
          console.error("添加可信 IP 失败:", e);
        }
      }

      // 如果拒绝且选择封禁 IP
      if (action === "reject" && banIp) {
        try {
          await pool.execute(
            `INSERT IGNORE INTO ip_blacklist (ip_address, reason, banned_by)
             VALUES (?, ?, ?)`,
            [log.ip_address, "异常登录被拒绝，自动封禁", user.username]
          );
          clearBlacklistCache(log.ip_address);
        } catch (e) {
          console.error("自动封禁 IP 失败:", e);
        }
      }

      // 记录审计日志
      logAdminActionWithIp(user.id, user.username, "abnormal_login_review", request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || request.ip, {
        logId: id,
        action,
        ipAddress: log.ip_address,
        banIp: banIp || false,
      });

      return reply.send(
        successResponse(
          null,
          action === "approve" ? "已允许该登录" : "已拒绝该登录"
        )
      );
    } catch (error) {
      console.error("审核异常登录失败:", error);
      return reply.status(500).send(errorResponse("审核失败"));
    }
  });
}

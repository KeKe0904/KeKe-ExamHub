/**
 * KeKe ExamHub - 考试信息管理系统
 * IP 黑名单中间件
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";

// 内存缓存，避免每次请求都查数据库
interface BlacklistCacheEntry {
  blocked: boolean;
  reason?: string;
  expiresAt?: string;
  timestamp: number;
}

const blacklistCache = new Map<string, BlacklistCacheEntry>();
const CACHE_TTL = 60 * 1000; // 1分钟缓存

// 获取客户端真实 IP
// 安全修复：直接使用 request.ip（受 Fastify trustProxy 配置控制），
// 不再直接信任可被客户端伪造的 X-Forwarded-For / X-Real-For 头。
// 部署在反向代理（如 Nginx）后时，应在 Fastify 实例配置 trustProxy 为代理跳数，
// 这样 request.ip 会自动从 X-Forwarded-For 中取最右侧的不可信 IP。
export function getClientIp(request: FastifyRequest): string {
  return request.ip || "127.0.0.1";
}

// 检查 IP 是否在黑名单中
export async function isIpBlocked(
  ip: string
): Promise<{ blocked: boolean; reason?: string; expiresAt?: string }> {
  const now = Date.now();
  const cached = blacklistCache.get(ip);

  // 缓存命中且未过期
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return {
      blocked: cached.blocked,
      reason: cached.reason,
      expiresAt: cached.expiresAt,
    };
  }

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM ip_blacklist 
       WHERE ip_address = ? 
       AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [ip]
    );

    const result = rows as any[];
    const blocked = result.length > 0;
    const entry: BlacklistCacheEntry = {
      blocked,
      reason: blocked ? result[0].reason : undefined,
      expiresAt: blocked && result[0].expires_at ? result[0].expires_at.toISOString?.() || result[0].expires_at : undefined,
      timestamp: now,
    };

    blacklistCache.set(ip, entry);
    return {
      blocked,
      reason: entry.reason,
      expiresAt: entry.expiresAt,
    };
  } catch (error) {
    console.error("检查 IP 黑名单失败:", error);
    // 数据库异常时放行，避免误封
    return { blocked: false };
  }
}

// 清除 IP 缓存（新增/删除黑名单时调用）
export function clearBlacklistCache(ip?: string) {
  if (ip) {
    blacklistCache.delete(ip);
  } else {
    blacklistCache.clear();
  }
}

// IP 黑名单中间件 — 用于全局拦截，被封禁的 IP 返回 404
export async function ipBlacklistMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ip = getClientIp(request);
  const { blocked, reason } = await isIpBlocked(ip);

  if (blocked) {
    request.log.warn(`被封禁 IP 尝试访问: ${ip}, 原因: ${reason || "未指定"}`);
    return reply.status(404).send({
      success: false,
      message: "Not Found",
      code: "NOT_FOUND",
    });
  }
}

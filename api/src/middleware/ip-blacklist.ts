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

// ==================== 登录失败自动封禁 ====================
// 内存计数器：IP → 失败次数和首次失败时间
interface FailRecord {
  count: number;
  firstFailAt: number;
}
const loginFailRecords = new Map<string, FailRecord>();

// 封禁阈值：5 次失败后封禁 15 分钟
const FAIL_THRESHOLD = 5;
const BAN_DURATION_MS = 15 * 60 * 1000; // 15 分钟

/**
 * 记录一次登录失败。达到阈值时自动将 IP 加入黑名单（临时封禁）。
 * 调用方：登录路由（admin/teacher/student/classroom）在密码错误时调用。
 */
export async function recordLoginFailure(ip: string, username?: string): Promise<void> {
  // 本地回环不封禁（避免开发环境自锁）
  if (ip === "127.0.0.1" || ip === "::1") return;

  const now = Date.now();
  const record = loginFailRecords.get(ip);

  if (!record) {
    loginFailRecords.set(ip, { count: 1, firstFailAt: now });
    return;
  }

  record.count += 1;

  // 达到阈值，加入黑名单
  if (record.count >= FAIL_THRESHOLD) {
    try {
      const expiresAt = new Date(now + BAN_DURATION_MS);
      const reason = `登录失败自动封禁（${record.count} 次失败，用户名: ${username || "未知"}）`;

      // 使用 INSERT ... ON DUPLICATE KEY UPDATE 处理已存在记录
      await pool.execute(
        `INSERT INTO ip_blacklist (ip_address, reason, expires_at, created_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), expires_at = VALUES(expires_at), created_at = NOW()`,
        [ip, reason, expiresAt]
      );

      // 清除缓存使新封禁立即生效
      clearBlacklistCache(ip);
      console.warn(`[security] IP ${ip} 因连续 ${record.count} 次登录失败被自动封禁 15 分钟`);

      // 重置计数
      loginFailRecords.delete(ip);
    } catch (error) {
      console.error("[security] 自动封禁写入失败:", error);
    }
  }
}

/**
 * 登录成功时清除该 IP 的失败计数。
 */
export function clearLoginFailure(ip: string): void {
  loginFailRecords.delete(ip);
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

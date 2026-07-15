/**
 * KeKe ExamHub - 考试信息管理系统
 * IP 黑名单中间件 + 登录失败自动封禁
 *
 * 功能概览：
 *   1. ipBlacklistMiddleware - 全局中间件，拦截黑名单中的 IP（返回 404）
 *   2. isIpBlocked / clearBlacklistCache - 黑名单查询（带 1 分钟内存缓存）
 *   3. recordLoginFailure / clearLoginFailure - 登录失败自动封禁（5 次失败 → 15 分钟封禁）
 *   4. getClientIp - 安全获取客户端真实 IP
 *
 * 安全设计：
 *   - 使用 request.ip 而非 X-Forwarded-For 头（防伪造）
 *   - 内存缓存减少数据库压力
 *   - 本地回环（127.0.0.1 / ::1）跳过封禁，避免开发环境自锁
 *   - 黑名单命中返回 404 而非 403，避免攻击者确认自己被封
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";

// ==================== IP 黑名单缓存 ====================

// 内存缓存条目：避免每次请求都查数据库
interface BlacklistCacheEntry {
  blocked: boolean;       // 是否被封禁
  reason?: string;        // 封禁原因（仅 blocked=true 时有值）
  expiresAt?: string;    // 封禁过期时间 ISO 字符串（仅 blocked=true 时有值）
  timestamp: number;      // 缓存写入时间戳（用于判断是否过期）
}

// IP → 缓存条目 的映射
const blacklistCache = new Map<string, BlacklistCacheEntry>();
// 缓存有效期：1 分钟（在新增/删除黑名单时通过 clearBlacklistCache 立即清除）
const CACHE_TTL = 60 * 1000;

/**
 * 获取客户端真实 IP
 *
 * 安全修复（v1.1.6.1）：
 *   旧实现直接读取 request.headers["x-forwarded-for"]，该头可被客户端任意伪造，
 *   导致：1) 限流可被绕过（每次请求伪造不同 IP）；2) 审计日志记录虚假 IP。
 *
 *   现使用 request.ip，受 Fastify trustProxy 配置控制：
 *   - trustProxy 未设置：request.ip 返回 TCP 连接对端 IP（即 Nginx 的 IP，所有请求都是 127.0.0.1）
 *   - trustProxy=1：Fastify 解析 X-Forwarded-For 最右侧 1 跳之前的 IP（即客户端真实 IP）
 *
 *   server.ts 中已配置 trustProxy: 1，配合 Nginx 反代使用时能正确获取客户端 IP。
 *
 * @param request Fastify 请求对象
 * @returns 客户端真实 IP，无法获取时返回 "127.0.0.1"
 */
export function getClientIp(request: FastifyRequest): string {
  return request.ip || "127.0.0.1";
}

/**
 * 检查 IP 是否在黑名单中（带 1 分钟内存缓存）
 *
 * 查询逻辑：
 *   - ip_blacklist 表中 ip_address 匹配
 *   - expires_at 为 NULL（永久封禁）或大于 NOW()（临时封禁未过期）
 *
 * 错误处理：
 *   - 数据库查询异常时放行（return blocked: false），避免误封所有用户
 *   - 异常详情打印到 stderr 供运维排查
 *
 * @param ip 待检查的 IP 地址
 * @returns { blocked, reason?, expiresAt? }
 */
export async function isIpBlocked(
  ip: string
): Promise<{ blocked: boolean; reason?: string; expiresAt?: string }> {
  const now = Date.now();
  const cached = blacklistCache.get(ip);

  // 缓存命中且未过期：直接返回缓存结果
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return {
      blocked: cached.blocked,
      reason: cached.reason,
      expiresAt: cached.expiresAt,
    };
  }

  try {
    // 查询数据库：当前 IP 是否在黑名单中且未过期
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
      expiresAt: blocked && result[0].expires_at
        ? result[0].expires_at.toISOString?.() || result[0].expires_at
        : undefined,
      timestamp: now,
    };

    // 更新缓存
    blacklistCache.set(ip, entry);
    return {
      blocked,
      reason: entry.reason,
      expiresAt: entry.expiresAt,
    };
  } catch (error) {
    console.error("检查 IP 黑名单失败:", error);
    // 数据库异常时放行，避免误封（fail-open 策略）
    return { blocked: false };
  }
}

/**
 * 清除 IP 黑名单缓存
 * 在新增/删除/更新黑名单记录时调用，使变更立即生效
 *
 * @param ip 指定 IP 时仅清除该 IP 的缓存；不传时清空全部缓存
 */
export function clearBlacklistCache(ip?: string) {
  if (ip) {
    blacklistCache.delete(ip);
  } else {
    blacklistCache.clear();
  }
}

// ==================== 登录失败自动封禁 ====================

// 内存计数器：IP → { 失败次数, 首次失败时间 }
// 注意：进程重启后计数会丢失，但数据库中的封禁记录依然有效
interface FailRecord {
  count: number;        // 失败次数
  firstFailAt: number;  // 首次失败时间戳
}
const loginFailRecords = new Map<string, FailRecord>();

// 封禁阈值：5 次失败后封禁 15 分钟（防止暴力破解）
const FAIL_THRESHOLD = 5;
// 封禁时长：15 分钟（写入 ip_blacklist 表的 expires_at 字段）
const BAN_DURATION_MS = 15 * 60 * 1000;

/**
 * 记录一次登录失败
 *
 * 累计机制：
 *   - 同一 IP 连续登录失败次数累计
 *   - 达到阈值（5 次）时自动写入 ip_blacklist 表，封禁 15 分钟
 *   - 封禁后重置计数器，下次失败重新计数
 *
 * 调用方：登录路由（admin/teacher/student/classroom）在密码错误时调用
 *
 * 特殊处理：
 *   - 本地回环（127.0.0.1 / ::1）跳过，避免开发环境自锁
 *   - 数据库写入失败时仅打印日志，不影响登录流程
 *
 * @param ip 客户端真实 IP（通过 getClientIp 获取）
 * @param username 用户尝试登录时使用的账号（用于审计日志，可选）
 */
export async function recordLoginFailure(ip: string, username?: string): Promise<void> {
  // 本地回环不封禁（避免开发环境自锁，生产环境 Nginx 反代时 request.ip 已是真实 IP）
  if (ip === "127.0.0.1" || ip === "::1") return;

  const now = Date.now();
  const record = loginFailRecords.get(ip);

  // 首次失败：初始化计数
  if (!record) {
    loginFailRecords.set(ip, { count: 1, firstFailAt: now });
    return;
  }

  record.count += 1;

  // 达到阈值，写入数据库封禁 15 分钟
  if (record.count >= FAIL_THRESHOLD) {
    try {
      const expiresAt = new Date(now + BAN_DURATION_MS);
      const reason = `登录失败自动封禁（${record.count} 次失败，用户名: ${username || "未知"}）`;

      // 使用 INSERT ... ON DUPLICATE KEY UPDATE 处理已存在记录
      // ip_blacklist 表对 ip_address 有唯一索引
      await pool.execute(
        `INSERT INTO ip_blacklist (ip_address, reason, expires_at, created_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), expires_at = VALUES(expires_at), created_at = NOW()`,
        [ip, reason, expiresAt]
      );

      // 清除缓存使新封禁立即生效（否则要等 1 分钟缓存过期才生效）
      clearBlacklistCache(ip);
      console.warn(`[security] IP ${ip} 因连续 ${record.count} 次登录失败被自动封禁 15 分钟`);

      // 重置计数器，下次失败重新计数
      loginFailRecords.delete(ip);
    } catch (error) {
      console.error("[security] 自动封禁写入失败:", error);
    }
  }
}

/**
 * 登录成功时清除该 IP 的失败计数
 *
 * 调用方：登录路由在密码验证成功后调用，避免历史失败次数影响后续登录
 *
 * @param ip 客户端真实 IP
 */
export function clearLoginFailure(ip: string): void {
  loginFailRecords.delete(ip);
}

/**
 * IP 黑名单全局中间件
 *
 * 部署位置：server.ts 中的 onRequest hook（所有 /api/* 路由之前）
 * 跳过路径：/api/health 和 /api/setup（确保安装向导可用）
 *
 * 响应策略：
 *   - 命中黑名单返回 404 + { success: false, message: "Not Found", code: "NOT_FOUND" }
 *   - 不返回 403，避免攻击者确认自己被封（增加侦察成本）
 *   - 同时打印 warn 级别日志，便于运维审计
 *
 * @param request Fastify 请求对象
 * @param reply Fastify 响应对象
 */
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

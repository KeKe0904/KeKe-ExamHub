/**
 * KeKe ExamHub - 考试信息管理系统
 * 域名访问控制中间件
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 功能说明:
 *   当数据库中已绑定域名时，强制要求通过域名访问
 *   通过 IP 直接访问将被拒绝（返回 403）
 *   通过未绑定的域名访问也会被拒绝
 *
 *   此中间件仅在 NODE_ENV=production 下生效
 *   开发环境（localhost 访问）不受限制
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";

// 内存缓存：域名列表 + 最后查询时间
interface DomainCacheEntry {
  domains: string[];        // 所有已绑定域名列表
  primaryDomain: string | null;  // 主域名
  timestamp: number;
}

let domainCache: DomainCacheEntry | null = null;
const CACHE_TTL = 60 * 1000; // 1 分钟缓存，避免每次请求都查数据库

// 清除域名缓存（在添加/删除/更新域名时调用）
export function clearDomainCache() {
  domainCache = null;
}

// 从数据库加载域名列表（带缓存）
async function loadBoundDomains(): Promise<DomainCacheEntry> {
  const now = Date.now();
  if (domainCache && now - domainCache.timestamp < CACHE_TTL) {
    return domainCache;
  }

  try {
    const [rows] = await pool.execute(
      "SELECT domain_name, is_primary FROM domains ORDER BY is_primary DESC, created_at ASC"
    );
    const list = rows as any[];
    const domains = list.map((r) => r.domain_name);
    const primary = list.find((r) => r.is_primary);
    domainCache = {
      domains,
      primaryDomain: primary ? primary.domain_name : (domains[0] || null),
      timestamp: now,
    };
    return domainCache;
  } catch (error) {
    console.error("加载域名列表失败:", error);
    // 数据库异常时视为未绑定域名，放行所有访问
    return { domains: [], primaryDomain: null, timestamp: now };
  }
}

// 判断 host 是否为 IP
function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

// 域名访问控制中间件
// 已绑定域名时，拒绝 IP 访问，仅允许通过绑定域名访问
export async function domainAccessMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 仅在生产环境启用
  if (process.env.NODE_ENV !== "production") return;

  const host = (request.headers.host || "").split(":")[0];
  if (!host) return;

  const cache = await loadBoundDomains();

  // 未绑定任何域名：放行
  if (cache.domains.length === 0) return;

  // 通过 IP 访问：拒绝
  if (isIpAddress(host)) {
    request.log.warn(`通过 IP 访问被拒绝: ${host}, 主域名: ${cache.primaryDomain}`);
    return reply.status(403).send({
      success: false,
      message: "已绑定域名，请通过域名访问",
      code: "DOMAIN_REQUIRED",
      primaryDomain: cache.primaryDomain,
      redirectTo: cache.primaryDomain ? `https://${cache.primaryDomain}` : null,
    });
  }

  // 域名访问但不在绑定列表中：拒绝
  if (!cache.domains.includes(host)) {
    request.log.warn(`通过未绑定域名访问被拒绝: ${host}, 已绑定: ${cache.domains.join(", ")}`);
    return reply.status(403).send({
      success: false,
      message: "该域名未绑定",
      code: "DOMAIN_NOT_BOUND",
      primaryDomain: cache.primaryDomain,
      redirectTo: cache.primaryDomain ? `https://${cache.primaryDomain}` : null,
    });
  }
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * 域名访问控制中间件
 *
 * 功能说明:
 *   当数据库中已绑定域名时，强制要求通过域名访问
 *   - 通过 IP 直接访问将被拒绝（返回 403 + DOMAIN_REQUIRED）
 *   - 通过未绑定的域名访问也会被拒绝（返回 403 + DOMAIN_NOT_BOUND）
 *
 *   此中间件仅在 NODE_ENV=production 下生效
 *   开发环境（localhost 访问）不受限制
 *
 * 设计目的:
 *   1. 防止通过 IP 直连绕过 SSL（HTTP 明文传输，窃听认证 token）
 *   2. 防止通过未授权域名访问（避免被恶意反代/钓鱼站点利用）
 *   3. 配合 Nginx 层的 444 响应形成纵深防御（Nginx 拦截 + 应用层拦截）
 *
 * 缓存策略:
 *   域名列表查询结果缓存 1 分钟（CACHE_TTL）
 *   在域名 CRUD 时通过 clearDomainCache() 立即清除
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";

// ==================== 域名列表缓存 ====================

// 内存缓存：域名列表 + 最后查询时间
interface DomainCacheEntry {
  domains: string[];             // 所有已绑定域名列表
  primaryDomain: string | null; // 主域名（is_primary=1 的记录，无则为列表第一个）
  timestamp: number;             // 缓存写入时间戳
}

// 模块级单例缓存（所有请求共享）
let domainCache: DomainCacheEntry | null = null;
// 缓存有效期：1 分钟（在域名 CRUD 时通过 clearDomainCache 立即清除）
const CACHE_TTL = 60 * 1000;

/**
 * 清除域名缓存
 * 在添加/删除/更新域名记录时调用，使变更立即生效
 * 调用位置：routes/domains.ts 中的 create/update/delete 接口
 */
export function clearDomainCache() {
  domainCache = null;
}

/**
 * 从数据库加载域名列表（带 1 分钟缓存）
 *
 * 查询逻辑：
 *   - 按 is_primary DESC, created_at ASC 排序，主域名排在最前
 *   - 主域名为 is_primary=1 的记录；若无则取列表第一个
 *
 * 错误处理：
 *   - 数据库异常时返回空列表（视为未绑定域名，放行所有访问）
 *   - 避免数据库故障导致全部访问被拒
 *
 * @returns 域名缓存条目
 */
async function loadBoundDomains(): Promise<DomainCacheEntry> {
  const now = Date.now();
  // 缓存命中且未过期：直接返回
  if (domainCache && now - domainCache.timestamp < CACHE_TTL) {
    return domainCache;
  }

  try {
    const [rows] = await pool.execute(
      "SELECT domain_name, is_primary FROM domains ORDER BY is_primary DESC, created_at ASC"
    );
    const list = rows as any[];
    const domains = list.map((r) => r.domain_name);
    // 优先取 is_primary=1 的记录为主域名，否则取列表第一个
    const primary = list.find((r) => r.is_primary);
    domainCache = {
      domains,
      primaryDomain: primary ? primary.domain_name : (domains[0] || null),
      timestamp: now,
    };
    return domainCache;
  } catch (error) {
    console.error("加载域名列表失败:", error);
    // 数据库异常时视为未绑定域名，放行所有访问（fail-open 策略）
    return { domains: [], primaryDomain: null, timestamp: now };
  }
}

/**
 * 判断 host 是否为 IPv4 地址
 * 用于区分"通过 IP 访问"和"通过域名访问"
 *
 * @param host 不含端口的 host 字符串
 * @returns true 表示是 IPv4 地址
 */
function isIpAddress(host: string): boolean {
  // 简单 IPv4 格式校验（不校验范围 0-255，仅用于区分 IP / 域名）
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

/**
 * 域名访问控制中间件
 *
 * 拦截策略（按顺序）：
 *   1. 仅生产环境生效（NODE_ENV=production），开发环境直接放行
 *   2. 提取 Host 头并去掉端口号
 *   3. 加载已绑定域名列表
 *   4. 未绑定任何域名：放行（兼容首次部署）
 *   5. 通过 IP 访问：返回 403 + DOMAIN_REQUIRED
 *   6. 通过未绑定域名访问：返回 403 + DOMAIN_NOT_BOUND
 *   7. 通过已绑定域名访问：放行
 *
 * 响应中包含 primaryDomain 和 redirectTo 字段，前端可据此引导用户跳转
 *
 * @param request Fastify 请求对象
 * @param reply Fastify 响应对象
 */
export async function domainAccessMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 仅在生产环境启用，开发环境（localhost）不受限制
  if (process.env.NODE_ENV !== "production") return;

  // 提取 Host 头并去掉端口号（例如 "example.com:443" → "example.com"）
  const host = (request.headers.host || "").split(":")[0];
  if (!host) return;

  const cache = await loadBoundDomains();

  // 未绑定任何域名：放行（兼容首次部署/未配置域名的场景）
  if (cache.domains.length === 0) return;

  // 通过 IP 访问：拒绝并引导跳转到主域名
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

  // 域名访问但不在绑定列表中：拒绝（防止恶意反代/钓鱼站点）
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

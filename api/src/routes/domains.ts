/**
 * KeKe ExamHub - 考试信息管理系统
 * 域名管理路由
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse, formatDomain, type DomainRow } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";
import { clearDomainCache } from "../middleware/domain-access.js";

function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export default async function domainRoutes(fastify: FastifyInstance) {
  fastify.get("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM domains ORDER BY is_primary DESC, created_at DESC"
      );
      const domains = (rows as DomainRow[]).map(formatDomain);
      return reply.send(successResponse(domains));
    } catch (error) {
      console.error("获取域名列表失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.get("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [rows] = await pool.execute(
        "SELECT * FROM domains WHERE id = ?",
        [id]
      );
      const domains = rows as DomainRow[];
      if (domains.length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }
      return reply.send(successResponse(formatDomain(domains[0])));
    } catch (error) {
      console.error("获取域名详情失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.post("/", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { domainName, isPrimary } = request.body as {
        domainName: string;
        isPrimary?: boolean;
      };

      if (!domainName || !domainName.trim()) {
        return reply.status(400).send(errorResponse("请输入域名"));
      }

      const trimmedDomain = domainName.trim().toLowerCase();

      if (!isValidDomain(trimmedDomain)) {
        return reply.status(400).send(errorResponse("域名格式不正确"));
      }

      const [existingRows] = await pool.execute(
        "SELECT id FROM domains WHERE domain_name = ?",
        [trimmedDomain]
      );
      if ((existingRows as any[]).length > 0) {
        return reply.status(400).send(errorResponse("该域名已存在"));
      }

      if (isPrimary) {
        await pool.execute("UPDATE domains SET is_primary = FALSE WHERE is_primary = TRUE");
      }

      const [result] = await pool.execute(
        `INSERT INTO domains (domain_name, is_primary, cert_status)
         VALUES (?, ?, 'pending')`,
        [trimmedDomain, isPrimary ? true : false]
      );

      const insertId = (result as any).insertId;

      logAdminAction(user.id, user.username, "domain_create", {
        domainId: insertId,
        domainName: trimmedDomain,
      });

      clearDomainCache();

      return reply.send(successResponse(
        { id: insertId, domain_name: trimmedDomain },
        "域名添加成功"
      ));
    } catch (error) {
      console.error("添加域名失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.put("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { isPrimary } = request.body as {
        isPrimary?: boolean;
      };

      const [rows] = await pool.execute(
        "SELECT id FROM domains WHERE id = ?",
        [id]
      );
      if ((rows as any[]).length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }

      if (isPrimary !== undefined) {
        if (isPrimary) {
          await pool.execute("UPDATE domains SET is_primary = false WHERE is_primary = true");
        }
        await pool.execute(
          "UPDATE domains SET is_primary = ? WHERE id = ?",
          [isPrimary ? true : false, id]
        );
      }

      logAdminAction(user.id, user.username, "domain_update", {
        domainId: id,
        isPrimary,
      });

      clearDomainCache();

      return reply.send(successResponse(null, "域名更新成功"));
    } catch (error) {
      console.error("更新域名失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.delete("/:id", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT domain_name, is_primary FROM domains WHERE id = ?",
        [id]
      );
      const domains = rows as any[];
      if (domains.length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }

      await pool.execute("DELETE FROM domains WHERE id = ?", [id]);

      logAdminAction(user.id, user.username, "domain_delete", {
        domainId: id,
        domainName: domains[0].domain_name,
      });

      clearDomainCache();

      return reply.send(successResponse(null, "域名删除成功"));
    } catch (error) {
      console.error("删除域名失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  fastify.post("/:id/issue-cert", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const [rows] = await pool.execute(
        "SELECT * FROM domains WHERE id = ?",
        [id]
      );
      const domains = rows as any[];
      if (domains.length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }

      const domain = domains[0];

      await pool.execute(
        `UPDATE domains SET cert_status = 'pending', error_message = NULL, last_checked_at = NOW() WHERE id = ?`,
        [id]
      );

      fastify.ready(async () => {
        try {
          const acme = await import("../utils/acme.js");
          await acme.issueCertificate(domain.domain_name, id);
        } catch (certError) {
          console.error("证书颁发异步任务失败:", certError);
        }
      });

      logAdminAction(user.id, user.username, "domain_cert_issue", {
        domainId: id,
        domainName: domain.domain_name,
      });

      return reply.send(successResponse(null, "证书申请已提交，请稍后查看状态"));
    } catch (error) {
      console.error("申请证书失败:", error);
      return reply.status(500).send(errorResponse("服务器内部错误"));
    }
  });

  // ========== 上传 SSL 证书 ==========
  // 用户通过后台手动上传 SSL 证书（PEM 格式）
  // 适用于：用户已从其他渠道（如宝塔、云服务商）申请到证书
  fastify.post("/:id/upload-cert", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { cert, key } = request.body as { cert: string; key: string };

      // 参数校验
      if (!cert || !cert.trim()) {
        return reply.status(400).send(errorResponse("请提供证书内容"));
      }
      if (!key || !key.trim()) {
        return reply.status(400).send(errorResponse("请提供私钥内容"));
      }

      // 查询域名
      const [rows] = await pool.execute(
        "SELECT * FROM domains WHERE id = ?",
        [id]
      );
      const domains = rows as any[];
      if (domains.length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }
      const domain = domains[0];

      // 调用 acme 工具保存证书
      const acme = await import("../utils/acme.js");
      await acme.saveUploadedCert(
        domain.domain_name,
        cert.trim(),
        key.trim(),
        id
      );

      logAdminAction(user.id, user.username, "domain_cert_upload", {
        domainId: id,
        domainName: domain.domain_name,
      });

      return reply.send(successResponse(null, "证书上传成功，已生效"));
    } catch (error: any) {
      console.error("上传证书失败:", error);
      return reply.status(500).send(errorResponse(error.message || "服务器内部错误"));
    }
  });

  // ========== 检测服务器已有 SSL 证书 ==========
  // 自动扫描服务器常见路径下是否已有该域名的证书
  // 找到后自动导入到项目目录并更新数据库状态
  fastify.post("/:id/detect-cert", {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      // 查询域名
      const [rows] = await pool.execute(
        "SELECT * FROM domains WHERE id = ?",
        [id]
      );
      const domains = rows as any[];
      if (domains.length === 0) {
        return reply.status(404).send(errorResponse("域名不存在"));
      }
      const domain = domains[0];

      // 检测服务器内是否已有证书
      const acme = await import("../utils/acme.js");
      const detection = await acme.detectExistingCert(domain.domain_name);

      if (!detection.found) {
        logAdminAction(user.id, user.username, "domain_cert_detect", {
          domainId: id,
          domainName: domain.domain_name,
          found: false,
        });
        return reply.send(successResponse({
          found: false,
          message: detection.message,
        }, "未检测到已有证书"));
      }

      // 找到证书：读取并导入到项目目录
      const fs = await import("fs");
      const certPem = fs.readFileSync(detection.certPath!, "utf8");
      const keyPem = fs.readFileSync(detection.keyPath!, "utf8");

      await acme.saveUploadedCert(
        domain.domain_name,
        certPem,
        keyPem,
        id
      );

      logAdminAction(user.id, user.username, "domain_cert_detect", {
        domainId: id,
        domainName: domain.domain_name,
        found: true,
        source: detection.source,
      });

      return reply.send(successResponse({
        found: true,
        source: detection.source,
        message: detection.message,
        certPath: detection.certPath,
      }, "检测到已有证书并已导入"));
    } catch (error: any) {
      console.error("检测证书失败:", error);
      return reply.status(500).send(errorResponse(error.message || "服务器内部错误"));
    }
  });

  // ========== 检查访问权限 ==========
  // 当数据库中存在任何已绑定域名时，强制要求通过域名访问
  // 通过 IP 访问将返回 allowed:false 和重定向地址
  // 此接口无鉴权，可供前端在 App 启动时调用以判断是否需要重定向
  fastify.post("/check-access", async (request, reply) => {
    try {
      const host = request.headers.host || "";
      const hostname = host.split(":")[0];

      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

      // 查询所有已绑定域名（不再要求 cert_status='issued'）
      // 只要数据库中有域名记录，就视为已绑定，强制要求通过域名访问
      const [rows] = await pool.execute(
        "SELECT domain_name, is_primary FROM domains ORDER BY is_primary DESC, created_at ASC"
      );
      const domains = rows as any[];

      // 未绑定任何域名：允许所有访问
      if (domains.length === 0) {
        return reply.send(successResponse({
          allowed: true,
          isIp,
          primaryDomain: null,
          message: "未绑定域名，允许所有访问",
        }));
      }

      const primaryDomain = domains.find((d: any) => d.is_primary) || domains[0];
      const matchedDomain = domains.find((d: any) => d.domain_name === hostname);

      // 通过 IP 访问且已绑定域名：拒绝访问
      if (isIp) {
        return reply.send(successResponse({
          allowed: false,
          isIp: true,
          primaryDomain: primaryDomain.domain_name,
          redirectTo: `https://${primaryDomain.domain_name}`,
          message: "已绑定域名，请通过域名访问",
        }));
      }

      // 域名访问但非绑定域名：拒绝访问
      if (!matchedDomain) {
        return reply.send(successResponse({
          allowed: false,
          isIp: false,
          primaryDomain: primaryDomain.domain_name,
          redirectTo: `https://${primaryDomain.domain_name}`,
          message: "该域名未绑定，请通过主域名访问",
        }));
      }

      // 通过已绑定域名访问：允许
      return reply.send(successResponse({
        allowed: true,
        isIp: false,
        primaryDomain: primaryDomain.domain_name,
      }));
    } catch (error) {
      console.error("检查访问权限失败:", error);
      // 出错时默认放行，避免影响正常访问
      return reply.send(successResponse({
        allowed: true,
        isIp: false,
        primaryDomain: null,
      }));
    }
  });
}

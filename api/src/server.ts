/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { testConnection } from "./config/database.js";
import { ipBlacklistMiddleware } from "./middleware/ip-blacklist.js";
import { domainAccessMiddleware } from "./middleware/domain-access.js";
import authRoutes from "./routes/auth.js";
import examRoutes from "./routes/exams.js";
import announcementRoutes from "./routes/announcements.js";
import setupRoutes from "./routes/setup.js";
import settingsRoutes from "./routes/settings.js";
import schoolInfoRoutes from "./routes/school-info.js";
import monitorRoutes from "./routes/monitor.js";
import environmentRoutes from "./routes/environment.js";
import buildingRoutes from "./routes/buildings.js";
import registrationCodeRoutes from "./routes/registration-codes.js";
import classroomAdminRoutes from "./routes/classrooms.js";
import classroomRoutes from "./routes/classroom.js";
import auditLogRoutes from "./routes/audit-logs.js";
import domainRoutes from "./routes/domains.js";
import ipBlacklistRoutes from "./routes/ip-blacklist.js";
import teacherRoutes from "./routes/teachers.js";
import classroomCountdownRoutes from "./routes/classroom-countdowns.js";
import weatherRoutes from "./routes/weather.js";
import classRoutes from "./routes/classes.js";
import studentRoutes from "./routes/students.js";
import studentAuthRoutes from "./routes/student-auth.js";
import teacherAuthRoutes from "./routes/teacher-auth.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
  // 安全修复：配置 trustProxy，使 request.ip 正确获取客户端真实 IP
  // 部署在 Nginx 反向代理后时，未配置会导致所有请求 IP 显示为 127.0.0.1
  // 使限流和 IP 黑名单失效
  trustProxy: true,
});

// 启动服务器
async function start() {
  try {
    // 注册 CORS 插件
    // 安全修复：生产环境采用 fail-closed 策略
    // - 必须显式配置 SITE_URL 才允许跨域
    // - SITE_URL 未设置或解析失败时，拒绝所有带 origin 的跨域请求
    // - 非 origin 请求（同源、curl 等）放行
    await app.register(cors, {
      origin: process.env.NODE_ENV === "production"
        ? (origin, cb) => {
            // 同源请求（无 origin 头）放行
            if (!origin) return cb(null, true);
            // 生产环境必须配置 SITE_URL
            const siteUrl = process.env.SITE_URL;
            if (!siteUrl) {
              return cb(new Error("SITE_URL not configured"), false);
            }
            try {
              const allowedOrigin = new URL(siteUrl).origin;
              if (origin === allowedOrigin) {
                cb(null, true);
              } else {
                cb(new Error("Not allowed by CORS"), false);
              }
            } catch {
              // SITE_URL 格式非法，拒绝所有跨域
              cb(new Error("Invalid SITE_URL"), false);
            }
          }
        : true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    });

    // 注册速率限制插件
    // 安全修复：直接使用 request.ip（受 Fastify trustProxy 控制），
    // 避免直接信任可被客户端伪造的 X-Forwarded-For 头导致限流绕过。
    // 部署在反向代理后时，应在 Fastify 实例配置 trustProxy 为代理跳数。
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      hook: "preHandler",
      keyGenerator: (request) => request.ip,
    });

    // 全局错误处理器：统一错误响应格式
    app.setErrorHandler((error: any, request, reply) => {
      // 速率限制错误
      if (error.statusCode === 429) {
        return reply.status(429).send({
          success: false,
          message: "请求过于频繁，请稍后再试",
          code: "RATE_LIMITED",
        });
      }
      // 其他错误（保持非生产环境下的原始消息，生产环境隐藏内部错误细节）
      const statusCode = error.statusCode || 500;
      const message =
        statusCode >= 500 && process.env.NODE_ENV === "production"
          ? "服务器内部错误"
          : error.message || "服务器内部错误";
      request.log.error(error);
      return reply.status(statusCode).send({
        success: false,
        message,
        code: "ERROR",
      });
    });

    // 注册 IP 黑名单全局中间件（健康检查和安装向导除外）
    app.addHook("onRequest", async (request, reply) => {
      const url = request.url;
      if (url.startsWith("/api/health") || url.startsWith("/api/setup")) {
        return;
      }
      await ipBlacklistMiddleware(request, reply);
    });

    // 注册域名访问控制中间件（仅在已绑定域名时生效，健康检查/安装向导/域名检测除外）
    // 当用户绑定了域名后，强制要求通过域名访问，拒绝 IP 直连
    app.addHook("onRequest", async (request, reply) => {
      const url = request.url;
      // 健康检查、安装向导、域名访问检查接口本身不拦截，确保用户能完成初始化
      if (
        url.startsWith("/api/health") ||
        url.startsWith("/api/setup") ||
        url.startsWith("/api/domains/check-access")
      ) {
        return;
      }
      await domainAccessMiddleware(request, reply);
    });

    // 注册 JWT 插件
    // 安全要求：JWT_SECRET 必须由环境变量提供，且长度不少于 16 字符。
    // 未设置或过短时进入"仅安装模式"——只注册 setup 路由和健康检查，
    // 允许用户通过 /setup 向导完成初始化（向导会生成 .env 含 JWT_SECRET）。
    // 同时拒绝一组已知的弱密钥（来自开源示例文件，可能被攻击者利用）。
    const WEAK_JWT_SECRETS = new Set([
      "your_super_secret_key_change_in_production",
      "test_secret_key_for_testing_only",
      "examhub_default_secret",
      "change_me",
      "secret",
      "jwt_secret",
      "change_me_please",
      "replace_with_your_secret",
    ]);
    const jwtSecret = process.env.JWT_SECRET;
    const isJwtSecretValid =
      jwtSecret &&
      jwtSecret.length >= 16 &&
      !WEAK_JWT_SECRETS.has(jwtSecret);

    if (isJwtSecretValid) {
      // 安全修复：显式锁定 JWT 算法为 HS256，防止算法混淆攻击
      await app.register(jwt, {
        secret: jwtSecret as string,
        sign: { algorithm: "HS256" },
        verify: { algorithms: ["HS256"] },
      });
    } else {
      const reason = !jwtSecret
        ? "JWT_SECRET 未配置"
        : jwtSecret.length < 16
        ? `JWT_SECRET 长度不足 16 字符（当前 ${jwtSecret.length} 字符）`
        : "JWT_SECRET 使用了已知的弱密钥";
      app.log.warn(
        `⚠ ${reason}，后端进入"仅安装模式"：仅 /api/setup/* 和 /api/health 可用。`
      );
      app.log.warn(
        "请通过 http://<服务器IP>/setup 完成安装向导，系统将自动生成 JWT_SECRET 并要求重启服务。"
      );
      if (jwtSecret && WEAK_JWT_SECRETS.has(jwtSecret)) {
        // 弱密钥是明确的配置错误，给出更强的提示
        app.log.warn(
          "检测到弱密钥，请使用 `openssl rand -hex 32` 生成新密钥并写入 api/.env 后重启。"
        );
      }
    }

    // 注册安装向导路由（不需要 JWT，不需要数据库连接）
    // 在"仅安装模式"和正常模式下都注册
    await app.register(setupRoutes, { prefix: "/api/setup" });

    // 健康检查（在仅安装模式下也可用）
    // 安全修复：不公开返回 setupMode 状态，防止攻击者探测系统是否未完成安装
    app.get("/api/health", async () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    });

    // 仅当 JWT_SECRET 有效时，才注册业务路由和数据库连接
    // 仅安装模式下跳过所有业务路由，避免依赖 JWT / 数据库的接口报错
    if (!isJwtSecretValid) {
      const port = Number(process.env.PORT) || 3000;
      const host = process.env.HOST || "0.0.0.0";
      await app.listen({ port, host });
      console.log(`\n🔧 ExamHub 后端以"仅安装模式"启动`);
      console.log(`📍 地址: http://${host}:${port}`);
      console.log(`👉 请访问前端 http://<服务器IP>/setup 完成安装`);
      return;
    }

    // 测试数据库连接（失败不退出，允许安装向导工作）
    try {
      await testConnection();
      app.log.info("✓ 数据库连接成功");
    } catch (dbError) {
      app.log.warn("⚠ 数据库连接失败，请访问 /setup 进行安装配置");
      app.log.warn(dbError);
    }

    // 注册业务路由
    await app.register(authRoutes, { prefix: "/api/auth" });
    await app.register(examRoutes, { prefix: "/api/exams" });
    await app.register(settingsRoutes, { prefix: "/api/settings" });
    await app.register(schoolInfoRoutes, { prefix: "/api/school-info" });
    await app.register(announcementRoutes, { prefix: "/api/announcements" });
    await app.register(monitorRoutes, { prefix: "/api/monitor" });
    await app.register(environmentRoutes, { prefix: "/api/environment" });
    // 教室端功能路由
    await app.register(buildingRoutes, { prefix: "/api/buildings" });
    await app.register(registrationCodeRoutes, { prefix: "/api/registration-codes" });
    await app.register(classroomAdminRoutes, { prefix: "/api/classrooms" });
    await app.register(classroomRoutes, { prefix: "/api/classroom" });
    await app.register(auditLogRoutes, { prefix: "/api/audit-logs" });
    await app.register(domainRoutes, { prefix: "/api/domains" });
    await app.register(ipBlacklistRoutes, { prefix: "/api/ip-blacklist" });
    await app.register(teacherRoutes, { prefix: "/api/teachers" });
    await app.register(classroomCountdownRoutes, { prefix: "/api/classroom-countdowns" });
    await app.register(weatherRoutes, { prefix: "/api/weather" });
    await app.register(classRoutes, { prefix: "/api/classes" });
    await app.register(studentRoutes, { prefix: "/api/students" });
    await app.register(studentAuthRoutes, { prefix: "/api/student" });
    await app.register(teacherAuthRoutes, { prefix: "/api/teacher" });
    // AI 助手路由（管理员专用）
    await app.register(aiRoutes, { prefix: "/api/ai" });

    // 启动监听
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });
    console.log(`\n🚀 ExamHub API 服务已启动!`);
    console.log(`📍 地址: http://${host}:${port}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🔧 安装向导: http://${host}:${port}/api/setup/status (前端访问 /setup)`
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();

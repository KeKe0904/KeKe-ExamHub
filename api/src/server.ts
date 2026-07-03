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

dotenv.config();

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
});

// 启动服务器
async function start() {
  try {
    // 注册 CORS 插件
    await app.register(cors, {
      origin: process.env.NODE_ENV === "production"
        ? (origin, cb) => {
            if (!origin) return cb(null, true);
            try {
              const allowed = [
                new URL(process.env.SITE_URL || "").origin,
              ].filter(Boolean);
              if (allowed.length === 0 || allowed.includes(origin)) {
                cb(null, true);
              } else {
                cb(new Error("Not allowed by CORS"), false);
              }
            } catch {
              cb(null, true);
            }
          }
        : true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    });

    // 注册速率限制插件
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      hook: "preHandler",
      keyGenerator: (request) => {
        return request.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
          || request.ip;
      },
    });

    // 注册 JWT 插件
    await app.register(jwt, {
      secret: process.env.JWT_SECRET || "examhub_default_secret",
    });

    // 注册安装向导路由（不需要数据库连接）
    await app.register(setupRoutes, { prefix: "/api/setup" });

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

    // 健康检查
    app.get("/api/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

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

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest, FastifyReply } from "fastify";

// JWT payload 类型
interface AdminPayload {
  id: number;
  username: string;
  role: "admin";
}

interface ClassroomPayload {
  id: number;
  classroomId: number;
  roomNumber: string;
  buildingName: string;
  role: "classroom";
}

type TokenPayload = AdminPayload | ClassroomPayload;

// 管理员 JWT 认证中间件
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        message: "未提供认证令牌",
      });
    }

    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify(token) as TokenPayload;

    // 白名单校验：仅允许管理员 token 访问管理员接口
    // 防止学生/教师/教室端 token 越权访问
    if (decoded.role !== "admin") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    // 将用户信息存储到 request 上
    (request as any).user = {
      id: decoded.id,
      username: decoded.username,
      role: "admin" as const,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

// 教室端 JWT 认证中间件
export async function classroomAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        message: "未提供认证令牌",
      });
    }

    const token = authHeader.substring(7);
    const decoded = request.server.jwt.verify(token) as TokenPayload;

    // 仅允许教室端 token
    if (decoded.role !== "classroom") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    // 将教室信息存储到 request 上
    (request as any).user = {
      id: decoded.id,
      classroomId: decoded.classroomId,
      roomNumber: decoded.roomNumber,
      buildingName: decoded.buildingName,
      role: "classroom" as const,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

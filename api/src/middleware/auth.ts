/**
 * KeKe ExamHub - 考试信息管理系统
 * JWT 认证中间件（管理员 / 教室端）
 *
 * 设计要点：
 *   1. 四端互斥认证：admin / classroom / student / teacher 使用同一 JWT_SECRET 签发，
 *      但 payload 中的 role 字段不同。中间件通过 role 白名单校验，防止跨端越权访问。
 *      例如：学生 token 不能访问 /api/exams（管理员接口）。
 *   2. token 格式：Authorization: Bearer <token>
 *   3. 校验失败统一返回 401（未提供/无效）或 403（角色不匹配）
 *
 * 类型说明：
 *   由于 Fastify 的 request.user 默认未在类型系统中声明，此处使用 (request as any).user 注入。
 *   二次开发时如需类型安全，可在 types/fastify.d.ts 中扩展 FastifyRequest 接口：
 *     declare module "fastify" {
 *       interface FastifyRequest {
 *         user: { id: number; username: string; role: "admin" };
 *       }
 *     }
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyRequest, FastifyReply } from "fastify";

// ==================== JWT payload 类型定义 ====================

/**
 * 管理员 JWT payload
 * 由 /api/auth/login 签发，role 固定为 "admin"
 */
interface AdminPayload {
  id: number;            // admins 表主键
  username: string;     // 管理员账号
  role: "admin";         // 角色标识，用于白名单校验
}

/**
 * 教室端 JWT payload
 * 由 /api/classroom/login 签发，role 固定为 "classroom"
 */
interface ClassroomPayload {
  id: number;            // classrooms 表主键
  classroomId: number;   // 教室 ID（与 id 相同，保留字段以便扩展）
  roomNumber: string;    // 教室号
  buildingName: string;  // 所属教学楼名称
  role: "classroom";     // 角色标识
}

// 联合类型：JWT 校验后的 payload 可能是任意一种
type TokenPayload = AdminPayload | ClassroomPayload;

/**
 * 管理员 JWT 认证中间件
 *
 * 校验流程：
 *   1. 检查 Authorization 头是否存在且为 Bearer 格式
 *   2. 调用 fastify.jwt.verify 验证签名和有效期
 *   3. 校验 payload.role === "admin"，防止其他端 token 越权
 *   4. 将用户信息注入 request.user，供后续路由使用
 *
 * 错误码：
 *   - 401：未提供 token / token 无效或已过期
 *   - 403：token 有效但角色不是 admin
 *
 * @param request Fastify 请求对象
 * @param reply Fastify 响应对象
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    // 校验 Authorization 头格式：必须是 "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        message: "未提供认证令牌",
      });
    }

    // 提取 token 部分（去掉 "Bearer " 前缀）
    const token = authHeader.substring(7);
    // 验证 JWT 签名与有效期（HS256 算法，与 server.ts 中配置一致）
    const decoded = request.server.jwt.verify(token) as TokenPayload;

    // 白名单校验：仅允许管理员 token 访问管理员接口
    // 防止学生/教师/教室端 token 越权访问
    if (decoded.role !== "admin") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    // 将用户信息注入 request.user，供后续路由通过 (request as any).user 获取
    // 二次开发时可扩展 FastifyRequest 类型以获得 IDE 类型提示
    (request as any).user = {
      id: decoded.id,
      username: decoded.username,
      role: "admin" as const,
    };
  } catch (error) {
    // JWT 校验失败（签名无效、token 过期、格式错误等）
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

/**
 * 教室端 JWT 认证中间件
 *
 * 与 authMiddleware 类似，但校验 role === "classroom"。
 * 用于教室端专用接口（监考模式、教室端倒计时等）。
 *
 * @param request Fastify 请求对象
 * @param reply Fastify 响应对象
 */
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

    // 仅允许教室端 token，防止管理员/学生/教师 token 越权
    if (decoded.role !== "classroom") {
      return reply.status(403).send({
        success: false,
        message: "无权限访问此接口",
      });
    }

    // 注入教室信息，供后续路由判断教室身份
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

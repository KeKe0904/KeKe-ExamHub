import type { FastifyRequest, FastifyReply } from "fastify";

// JWT 认证中间件
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
    const decoded = request.server.jwt.verify(token) as {
      id: number;
      username: string;
    };

    // 将用户信息存储到 request 上
    (request as any).user = {
      id: decoded.id,
      username: decoded.username,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "认证令牌无效或已过期",
    });
  }
}

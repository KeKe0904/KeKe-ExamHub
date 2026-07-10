/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 创建数据库连接池（支持 socket 和 TCP 两种连接方式）
const poolConfig: mysql.PoolOptions = {
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "examhub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
};

// 优先使用 socket 连接（如果配置了 DB_SOCKET）
if (process.env.DB_SOCKET) {
  (poolConfig as any).socketPath = process.env.DB_SOCKET;
} else {
  (poolConfig as any).host = process.env.DB_HOST || "localhost";
  (poolConfig as any).port = Number(process.env.DB_PORT) || 3306;
}

export const pool = mysql.createPool(poolConfig);

// 测试数据库连接
export async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✓ 数据库连接成功");
  } catch (error) {
    console.error("✗ 数据库连接失败:", error);
    throw error;
  }
}

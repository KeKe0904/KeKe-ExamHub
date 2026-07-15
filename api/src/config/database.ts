/**
 * KeKe ExamHub - 考试信息管理系统
 * MySQL 数据库连接池配置
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 设计说明:
 *   使用 mysql2/promise 创建全局共享连接池，避免每次请求新建连接的开销。
 *   同时支持两种连接方式，便于不同部署环境复用同一份代码:
 *     1. Unix Socket（DB_SOCKET）— 推荐生产环境使用，性能优于 TCP 且无需开放 3306 端口
 *     2. TCP（DB_HOST + DB_PORT）— 适用于跨主机部署或开发环境
 *
 * 字符集说明:
 *   统一使用 utf8mb4 以支持完整 Unicode（包括 emoji 与生僻汉字），
 *   注意: 数据库、表、连接三层字符集必须一致，否则会出现乱码。
 *
 * 环境变量:
 *   - DB_USER     : 数据库用户名，默认 "root"
 *   - DB_PASSWORD : 数据库密码，默认空串
 *   - DB_NAME     : 数据库名，默认 "examhub"
 *   - DB_SOCKET   : Unix Socket 路径（如 /var/run/mysqld/mysqld.sock），优先级高于 DB_HOST
 *   - DB_HOST     : TCP 主机，默认 "localhost"
 *   - DB_PORT     : TCP 端口，默认 3306
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// 加载 .env 文件中的环境变量到 process.env
dotenv.config();

/**
 * 数据库连接池配置
 *
 * 字段说明:
 *   - waitForConnections: true  池满时排队等待，而非立即报错
 *   - connectionLimit: 10       池中最大连接数，生产环境按需调整（CPU 密集型可调低，IO 密集型可调高）
 *   - queueLimit: 0             等待队列无上限（防止突发流量被拒绝）
 *   - charset: utf8mb4          4 字节 UTF-8，支持 emoji 与完整 Unicode
 */
const poolConfig: mysql.PoolOptions = {
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "examhub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
};

// 连接方式选择: 优先 Unix Socket（性能更优），其次 TCP
// 使用 as any 是因为 mysql2 类型定义中 socketPath / host / port 不在 PoolOptions 中显式声明
if (process.env.DB_SOCKET) {
  (poolConfig as any).socketPath = process.env.DB_SOCKET;
} else {
  (poolConfig as any).host = process.env.DB_HOST || "localhost";
  (poolConfig as any).port = Number(process.env.DB_PORT) || 3306;
}

/**
 * 全局共享的 MySQL 连接池
 *
 * 使用方式:
 *   import { pool } from "../config/database.js";
 *   const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
 *
 * 注意:
 *   - 优先使用 pool.execute（预编译，防 SQL 注入）
 *   - 仅在动态拼接 LIMIT/OFFSET 等 mysql2 预编译协议不支持的子句时使用 pool.query
 *     （参见 utils/db.ts 中的 safeInt 辅助函数）
 *   - 永远不要拼接用户输入到 SQL 字符串中
 */
export const pool = mysql.createPool(poolConfig);

/**
 * 测试数据库连接是否可用
 *
 * 在 server.ts 启动流程中调用，连接失败会抛出异常阻止服务启动，
 * 避免服务上线后才发现数据库不可用。
 *
 * @throws 连接失败时抛出原始 mysql2 错误
 */
export async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    await connection.ping(); // 发送 MySQL PING 协议包，验证连接活性
    connection.release();    // 释放回池（不要用 connection.end()，否则会销毁连接）
    console.log("✓ 数据库连接成功");
  } catch (error) {
    console.error("✗ 数据库连接失败:", error);
    throw error;
  }
}

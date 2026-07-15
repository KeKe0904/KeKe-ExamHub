/**
 * KeKe ExamHub - 考试信息管理系统
 * 数据库查询辅助工具
 *
 * 提供三个安全辅助函数：
 *   - escapeLike(input)  - 转义 LIKE 查询中的通配符（防通配符注入）
 *   - likePattern(input) - 构造两端加 % 的 LIKE 参数
 *   - safeInt(value, fallback, max?) - 强制整数转换（用于 LIMIT/OFFSET）
 *
 * 安全背景：
 *   mysql2 的预处理语句（pool.execute）对 LIMIT ? / OFFSET ? 占位符要求严格整数类型，
 *   AI Function Calling 传入的 limit / page 参数经 JSON 解析后可能为字符串或浮点数，
 *   导致 `Incorrect arguments to mysqld_stmt_execute` 错误（v1.1.6.1 已修复）。
 *   修复方案：先用 safeInt 强制整数转换，再用模板字符串拼接到 SQL（值已确定安全）。
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

/**
 * 转义 LIKE 查询中的通配符，防止通配符注入
 *
 * 通配符注入场景：
 *   用户输入 "100%" 时，若直接拼入 `WHERE name LIKE '%100%%'`，
 *   末尾的 % 会被解释为通配符，导致全表扫描或泄露数据。
 *
 * 转义规则（MySQL 语法）：
 *   - `\` → `\\`  （转义反斜杠本身）
 *   - `%` → `\%`  （转义百分号）
 *   - `_` → `\_`  （转义下划线）
 *
 * 转义后，通配符会被视为字面量匹配。
 *
 * 注意：转义顺序很重要！必须先转义反斜杠，否则后续转义产生的 `\` 会被再次转义。
 *
 * 使用方式：
 *   `WHERE name LIKE ?` + params.push(`%${escapeLike(search)}%`)
 *   或直接使用 likePattern(search) 封装
 *
 * @param input 用户输入字符串
 * @returns 转义后的字符串（通配符已变为字面量）
 */
export function escapeLike(input: string): string {
  if (typeof input !== "string") return "";
  // 顺序很重要：先转义反斜杠，再转义 % 和 _
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * 构造 LIKE 查询参数：两端加 %，并转义用户输入中的通配符
 *
 * 等价于 `'%'+escapeLike(input)+'%'` 的便捷封装
 *
 * 使用方式：
 *   ```ts
 *   const params = [likePattern(search)];
 *   const [rows] = await pool.execute("SELECT * FROM users WHERE name LIKE ?", params);
 *   ```
 *
 * @param input 用户输入的搜索关键词
 * @returns 形如 `%keyword%` 的 LIKE 参数（已转义通配符）
 */
export function likePattern(input: string): string {
  return `%${escapeLike(input)}%`;
}

/**
 * 强制返回整数，用于 LIMIT / OFFSET 等不能用 ? 占位符的位置
 *
 * 安全背景：
 *   mysql2 预处理语句对 LIMIT ? / OFFSET ? 要求严格整数类型。
 *   AI Function Calling 传入的参数经 JSON 解析后可能是字符串、浮点数、null 等，
 *   直接传入会导致 `Incorrect arguments to mysqld_stmt_execute` 错误。
 *
 *   修复方案（v1.1.6.1）：先用此函数强制整数转换 + 范围限制，
 *   再用模板字符串拼接到 SQL（值已确定为安全整数，无注入风险）。
 *
 * 处理流程：
 *   1. Number(value) 尝试转换为数字
 *   2. 非有限数或负数 → 返回 fallback
 *   3. Math.floor 向下取整
 *   4. 若指定 max 且超过 max → 返回 max
 *
 * 使用方式：
 *   ```ts
 *   const limit = safeInt(args.limit, 50, 200);  // 默认 50，最大 200
 *   const sql = `SELECT * FROM exams LIMIT ${limit}`;  // 值已确定为安全整数
 *   ```
 *
 * @param value   待转换的值（可能是字符串、数字、null、undefined 等）
 * @param fallback 转换失败时返回的默认值
 * @param max      可选的最大值上限
 * @returns 安全的非负整数
 */
export function safeInt(value: unknown, fallback: number, max?: number): number {
  const n = Number(value);
  // 非有限数（NaN/Infinity）或负数 → 返回 fallback
  if (!Number.isFinite(n) || n < 0) return fallback;
  // 向下取整
  const int = Math.floor(n);
  // 范围限制
  if (max !== undefined && int > max) return max;
  return int;
}

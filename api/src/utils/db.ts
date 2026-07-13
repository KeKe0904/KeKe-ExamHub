/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

/**
 * 转义 LIKE 查询中的通配符，防止通配符注入。
 *
 * 用户输入中的 `%` 和 `_` 会被转义为字面量，`\` 也会被转义。
 * 使用方式：`WHERE name LIKE ?` + params.push(`%${escapeLike(search)}%`)
 */
export function escapeLike(input: string): string {
  if (typeof input !== "string") return "";
  // 顺序很重要：先转义反斜杠，再转义 % 和 _
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * 构造 LIKE 查询参数：两端加 %，并转义用户输入中的通配符。
 * 使用方式：`WHERE name LIKE ?` + params.push(likePattern(search))
 */
export function likePattern(input: string): string {
  return `%${escapeLike(input)}%`;
}

/**
 * 强制返回整数，用于 LIMIT / OFFSET 等不能用 ? 占位符的位置。
 * 非数字或超范围时返回 fallback。
 */
export function safeInt(value: unknown, fallback: number, max?: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  const int = Math.floor(n);
  if (max !== undefined && int > max) return max;
  return int;
}

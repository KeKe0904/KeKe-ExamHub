/**
 * KeKe ExamHub - 考试信息管理系统
 * 密码生成工具
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 *
 * 安全说明：
 *   不再使用学号/工号后 6 位等可推导信息作为默认密码，
 *   改为使用 crypto.randomInt 生成密码学安全的随机 6 位数字。
 *   结合"首次登录强制改密"中间件，杜绝默认密码被长期使用。
 */
import crypto from "crypto";

/**
 * 生成随机 6 位数字密码（密码学安全）
 * 范围：100000 ~ 999999
 *
 * @returns 6 位数字字符串
 */
export function generateRandomPassword(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

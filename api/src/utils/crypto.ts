/**
 * KeKe ExamHub - 考试信息管理系统
 * 加密工具：用于敏感配置（如 AI API Key）的加密存储
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 *
 * 安全说明：
 *   使用 AES-256-GCM 算法对敏感数据进行加密存储，
 *   密钥来源于环境变量 SETTINGS_ENCRYPTION_KEY（32 字节 hex）。
 *   若环境变量未配置，则回退到 JWT_SECRET 派生密钥，
 *   确保即使数据库泄露，攻击者也无法直接读取敏感配置。
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 推荐 12 字节 IV

// 加密前缀，用于判断字段是否已加密
const ENCRYPTED_PREFIX = "enc:";

/**
 * 获取加密密钥（32 字节）
 * 优先使用 SETTINGS_ENCRYPTION_KEY，未配置时从 JWT_SECRET 派生
 */
function getEncryptionKey(): Buffer {
  const rawKey =
    process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  // 使用 SHA-256 派生固定长度的密钥
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * 加密字符串
 * @param plaintext 明文
 * @returns 加密后的字符串（格式：enc:<iv>:<authTag>:<ciphertext>）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  // 已经加密过的直接返回
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * 解密字符串
 * @param ciphertext 加密字符串（格式：enc:<iv>:<authTag>:<ciphertext>）
 * @returns 明文；若解密失败返回空字符串
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  // 非加密格式直接返回（兼容历史明文数据）
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;

  try {
    const payload = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const parts = payload.split(":");
    if (parts.length !== 3) return "";

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // 解密失败（密钥变更、数据损坏等），返回空字符串避免泄露密文
    console.error("解密敏感配置失败：可能是加密密钥已变更");
    return "";
  }
}

/**
 * 判断字符串是否已加密
 */
export function isEncrypted(value: string): boolean {
  return Boolean(value) && value.startsWith(ENCRYPTED_PREFIX);
}

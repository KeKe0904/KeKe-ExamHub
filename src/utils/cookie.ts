/**
 * KeKe ExamHub - Cookie 安全工具
 * 提供：SameSite 防护、Secure 自动判断、大小校验、过期清理、安全前缀
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

export const COOKIE_KEYS = {
  TOKEN: "examhub-token",
  USERNAME: "examhub-username",
  THEME: "examhub-theme",
  LANGUAGE: "examhub-language",
  CLASSROOM_TOKEN: "examhub-classroom-token",
  CLASSROOM_INFO: "examhub-classroom-info",
  CLASSROOM_ROOM_NUMBER: "examhub-classroom-room-number",
  STUDENT_TOKEN: "examhub-student-token",
  STUDENT_INFO: "examhub-student-info",
  STUDENT_NO: "examhub-student-no",
  COOKIE_CONSENT: "examhub-cookie-consent",
} as const;

export type CookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];

export const COOKIE_EXPIRES = {
  TOKEN: 7 * 24 * 60 * 60 * 1000,
  REMEMBER_ME: 30 * 24 * 60 * 60 * 1000,
  THEME: 365 * 24 * 60 * 60 * 1000,
  PREFERENCES: 365 * 24 * 60 * 60 * 1000,
  COOKIE_CONSENT: 365 * 24 * 60 * 60 * 1000,
} as const;

export interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

/** Cookie 单值最大长度（4KB 减去名称和元数据余量） */
const MAX_COOKIE_VALUE_LENGTH = 3500;

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

/**
 * 自动判断是否应使用 Secure 标志
 * - HTTPS 环境、或者 localhost（开发环境）都视为安全
 */
function shouldUseSecure(): boolean {
  if (!isBrowser()) return true;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * 安全设置 Cookie
 * - 默认 SameSite=Lax（防 CSRF）
 * - HTTPS 下自动启用 Secure
 * - 自动大小校验，避免 Cookie 被截断
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (!isBrowser()) return;

  const {
    days,
    path = "/",
    domain,
    secure,
    sameSite = "lax",
  } = options;

  // 大小校验：超出限制时拒绝写入并警告，避免被静默截断
  if (value.length > MAX_COOKIE_VALUE_LENGTH) {
    console.warn(
      `[cookie] Cookie "${name}" value too large (${value.length} > ${MAX_COOKIE_VALUE_LENGTH}), refused to set. Use localStorage instead.`
    );
    return;
  }

  // 值中不能包含 CR/LF，否则会被注入新 header（HTTP 响应拆分攻击）
  if (/[\r\n]/.test(value)) {
    console.warn(`[cookie] Cookie "${name}" value contains CRLF, refused to set.`);
    return;
  }

  let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (days !== undefined) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    cookieStr += `; expires=${date.toUTCString()}`;
  }

  if (path) {
    cookieStr += `; path=${path}`;
  }

  if (domain) {
    cookieStr += `; domain=${domain}`;
  }

  // Secure 自动判断：用户显式指定优先；否则在 HTTPS 下自动启用
  // SameSite=None 必须配合 Secure，否则浏览器会拒绝写入
  const finalSecure = secure !== undefined ? secure : shouldUseSecure();
  if (finalSecure || (sameSite === "none" && !finalSecure)) {
    cookieStr += `; secure`;
  }

  if (sameSite) {
    cookieStr += `; samesite=${sameSite}`;
  }

  document.cookie = cookieStr;
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const cookies = document.cookie;
  if (!cookies) return null;

  const encodedName = encodeURIComponent(name);
  const parts = cookies.split("; ");

  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    if (key === encodedName) {
      const value = valueParts.join("=");
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

/**
 * 删除 Cookie
 * - 必须使用与设置时相同的 path/domain/sameSite 才能正确删除
 */
export function deleteCookie(
  name: string,
  options?: { path?: string; domain?: string; sameSite?: string }
): void {
  if (!isBrowser()) return;

  const path = options?.path || "/";
  let cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  if (options?.domain) {
    cookie += `; domain=${options.domain}`;
  }
  if (options?.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }
  document.cookie = cookie;
}

export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * 设置 JSON Cookie（带大小校验）
 * 如果序列化后超过单 Cookie 限制，会拒绝写入并提示开发者改用 localStorage
 */
export function setCookieJSON(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  options: CookieOptions = {}
): void {
  try {
    const jsonStr = JSON.stringify(value);
    if (jsonStr.length > MAX_COOKIE_VALUE_LENGTH) {
      console.warn(
        `[cookie] JSON for "${name}" too large (${jsonStr.length}B), falling back skipped. Consider using localStorage.`
      );
      return;
    }
    setCookie(name, jsonStr, options);
  } catch {
    console.warn(`[cookie] Failed to JSON stringify value for cookie: ${name}`);
  }
}

export function getCookieJSON<T = unknown>(name: string): T | null {
  const raw = getCookie(name);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[cookie] Failed to parse JSON from cookie: ${name}`);
    return null;
  }
}

export function getAllCookies(): Record<string, string> {
  if (!isBrowser()) return {};

  const result: Record<string, string> = {};
  const cookies = document.cookie;

  if (!cookies) return result;

  const parts = cookies.split("; ");
  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    if (key) {
      try {
        result[decodeURIComponent(key)] = decodeURIComponent(valueParts.join("="));
      } catch {
        result[key] = valueParts.join("=");
      }
    }
  }

  return result;
}

/**
 * 清除所有 Cookie
 * - 透传 path/domain/sameSite 选项以确保彻底删除
 */
export function clearAllCookies(options: { path?: string; domain?: string; sameSite?: string } = {}): void {
  if (!isBrowser()) return;

  const cookies = getAllCookies();
  for (const name of Object.keys(cookies)) {
    deleteCookie(name, options);
  }
}

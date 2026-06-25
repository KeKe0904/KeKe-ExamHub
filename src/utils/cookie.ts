// Cookie 工具函数
// 支持 SameSite、Expires、Path 等属性，兼容浏览器环境

export const COOKIE_KEYS = {
  TOKEN: "examhub-token",
  USERNAME: "examhub-username",
  THEME: "examhub-theme",
} as const;

// Cookie 过期时间配置（毫秒）
export const COOKIE_EXPIRES = {
  // Token 过期时间：7 天
  TOKEN: 7 * 24 * 60 * 60 * 1000,
  // 主题偏好：365 天
  THEME: 365 * 24 * 60 * 60 * 1000,
} as const;

interface CookieOptions {
  expires?: number; // 过期时间（毫秒）
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

// 获取 Cookie 值
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie;
  if (!cookies) return null;

  // 按 "; " 分割 cookie 字符串
  const parts = cookies.split("; ");
  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    if (key === name) {
      // 值可能包含 = 号，所以需要重新拼接
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

// 设置 Cookie
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === "undefined") return;

  const {
    expires,
    path = "/",
    domain,
    secure,
    sameSite = "Lax",
  } = options;

  let cookieStr = `${name}=${encodeURIComponent(value)}`;

  if (expires) {
    const date = new Date(Date.now() + expires);
    cookieStr += `; expires=${date.toUTCString()}`;
  }

  if (path) {
    cookieStr += `; path=${path}`;
  }

  if (domain) {
    cookieStr += `; domain=${domain}`;
  }

  if (secure) {
    cookieStr += `; secure`;
  }

  if (sameSite) {
    cookieStr += `; samesite=${sameSite}`;
  }

  document.cookie = cookieStr;
}

// 移除 Cookie
export function removeCookie(name: string, path: string = "/"): void {
  if (typeof document === "undefined") return;

  // 设置过期时间为过去的时间来删除 cookie
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

/**
 * KeKe ExamHub - 安全本地存储工具
 * 提供统一的 localStorage / sessionStorage 封装，配合 Cookie 同意偏好使用
 * - 受限模式下：非"必要"类别数据不写入持久存储
 * - 安全失败：localStorage 不可用（隐私模式/超限）时降级到 sessionStorage
 * - 容量监控：写入失败时上报并清理
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

import { getCookieJSON } from "./cookie";
import { COOKIE_KEYS } from "./cookie";
import type { CookiePreferences } from "@/types";

type StorageCategory = "essential" | "preferences" | "functional" | "analytics";

const SAFE_LS_KEY_SET = new Set<string>([
  "examhub-token",
  "examhub-username",
  "examhub-classroom-token",
  "examhub-classroom-info",
  "examhub-student-token",
  "examhub-student-info",
  "examhub-teacher-token",
  "examhub-teacher-info",
]);

/**
 * 获取当前 Cookie 偏好
 * - 未设置时默认仅"必要"启用（最严格）
 */
function getCookiePrefs(): CookiePreferences {
  const data = getCookieJSON<{ preferences?: CookiePreferences }>(COOKIE_KEYS.COOKIE_CONSENT);
  if (data?.preferences) return data.preferences;
  return {
    essential: true,
    functional: false,
    analytics: false,
    preferences: false,
  };
}

/**
 * 检查指定类别是否被允许写入持久化存储
 * - "essential" 始终允许
 * - 其他类别根据用户 Cookie 偏好
 */
export function isStorageAllowed(category: StorageCategory): boolean {
  if (category === "essential") return true;
  const prefs = getCookiePrefs();
  return Boolean(prefs[category]);
}

/**
 * 安全 localStorage 写入
 * - 自动 try-catch，失败时降级到 sessionStorage
 * - 受 Cookie 偏好控制（非必要类别可被拒绝）
 */
export function safeSetItem(key: string, value: string, category: StorageCategory = "essential"): boolean {
  if (!isStorageAllowed(category)) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // localStorage 满了或被禁用（隐私模式）
    console.warn(`[storage] localStorage.setItem failed for "${key}", fallback to sessionStorage`, e);
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 安全 localStorage 读取
 * - 自动降级到 sessionStorage
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

/**
 * 安全 localStorage 删除
 * - 同时清除 localStorage 和 sessionStorage 中的副本
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

/**
 * 仅在 key 属于白名单时清除（避免误删业务无关数据）
 */
export function safeClearAuthStorage(): void {
  SAFE_LS_KEY_SET.forEach((k) => safeRemoveItem(k));
}

/**
 * 检查 localStorage 是否可用
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const t = "__examhub_test__";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

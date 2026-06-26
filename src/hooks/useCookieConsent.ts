/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

import { useState, useCallback, useEffect } from "react";
import { COOKIE_KEYS } from "@/utils/cookie";

export interface CookiePreferences {
  essential: boolean; // 必需 Cookie（始终启用）
  analytics: boolean; // 分析 Cookie
  preferences: boolean; // 偏好 Cookie
}

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  analytics: false,
  preferences: false,
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// 检查用户是否已作出选择
function hasConsented(): boolean {
  try {
    return localStorage.getItem(COOKIE_KEYS.COOKIE_CONSENT) !== null;
  } catch {
    return false;
  }
}

// 获取已保存的偏好
function getStoredPrefs(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEYS.COOKIE_CONSENT);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

// 保存偏好到 localStorage
function savePrefs(prefs: CookiePreferences): void {
  try {
    localStorage.setItem(COOKIE_KEYS.COOKIE_CONSENT, JSON.stringify(prefs));
  } catch {
    // 静默失败
  }
}

// 检查管理员是否开启了 Cookie 弹窗
async function isCookieConsentEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    if (data.success && data.data) {
      // 默认开启（未设置时视为开启）
      return data.data.cookie_consent_enabled !== "false";
    }
    return true; // API 失败时默认开启
  } catch {
    return true;
  }
}

export function useCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);
  const [showCustomize, setShowCustomize] = useState(false);

  // 初始化：检查是否已同意 + 管理员是否开启
  useEffect(() => {
    if (hasConsented()) {
      const stored = getStoredPrefs();
      if (stored) setPrefs(stored);
      return;
    }
    // 未同意时，检查管理员开关
    isCookieConsentEnabled().then((enabled) => {
      if (enabled) {
        const timer = setTimeout(() => setShowBanner(true), 500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  // 接受全部
  const acceptAll = useCallback(() => {
    const all: CookiePreferences = {
      essential: true,
      analytics: true,
      preferences: true,
    };
    savePrefs(all);
    setPrefs(all);
    setShowBanner(false);
    setShowCustomize(false);
  }, []);

  // 拒绝非必需
  const rejectAll = useCallback(() => {
    const minimal: CookiePreferences = {
      essential: true,
      analytics: false,
      preferences: false,
    };
    savePrefs(minimal);
    setPrefs(minimal);
    setShowBanner(false);
    setShowCustomize(false);
  }, []);

  // 保存自定义选择
  const saveCustom = useCallback(() => {
    savePrefs(prefs);
    setShowBanner(false);
    setShowCustomize(false);
  }, [prefs]);

  // 切换单个选项
  const togglePref = useCallback((key: keyof CookiePreferences) => {
    if (key === "essential") return; // 必需项不可关闭
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    showBanner,
    prefs,
    showCustomize,
    setShowCustomize,
    acceptAll,
    rejectAll,
    saveCustom,
    togglePref,
  };
}

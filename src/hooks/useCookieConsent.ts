import { useState, useCallback, useEffect } from "react";
import { COOKIE_KEYS, setCookieJSON, getCookieJSON, deleteCookie } from "@/utils/cookie";
import type { CookiePreferences, CookieConsentData } from "@/types";

export type { CookiePreferences };

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  preferences: false,
};

const CONSENT_VERSION = "1.0";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function hasConsented(): boolean {
  return getCookieJSON<CookieConsentData>(COOKIE_KEYS.COOKIE_CONSENT) !== null;
}

function getStoredPrefs(): CookiePreferences | null {
  const data = getCookieJSON<CookieConsentData>(COOKIE_KEYS.COOKIE_CONSENT);
  if (data && data.preferences) {
    return data.preferences;
  }
  return null;
}

function savePrefs(prefs: CookiePreferences): void {
  const consentData: CookieConsentData = {
    preferences: prefs,
    consentedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  setCookieJSON(COOKIE_KEYS.COOKIE_CONSENT, consentData, {
    days: 365,
    sameSite: "lax",
    secure: true,
  });
}

async function isCookieConsentEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    if (data.success && data.data) {
      return data.data.cookie_consent_enabled !== "false";
    }
    return true;
  } catch {
    return true;
  }
}

export function useCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    if (hasConsented()) {
      const stored = getStoredPrefs();
      if (stored) setPrefs(stored);
      return;
    }
    isCookieConsentEnabled().then((enabled) => {
      if (enabled) {
        const timer = setTimeout(() => setShowBanner(true), 500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const acceptAll = useCallback(() => {
    const all: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      preferences: true,
    };
    savePrefs(all);
    setPrefs(all);
    setShowBanner(false);
    setShowCustomize(false);
  }, []);

  const rejectAll = useCallback(() => {
    const minimal: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      preferences: false,
    };
    savePrefs(minimal);
    setPrefs(minimal);
    setShowBanner(false);
    setShowCustomize(false);
  }, []);

  const acceptNecessary = useCallback(() => {
    rejectAll();
  }, [rejectAll]);

  const saveCustom = useCallback(() => {
    savePrefs(prefs);
    setShowBanner(false);
    setShowCustomize(false);
  }, [prefs]);

  const togglePref = useCallback((key: keyof CookiePreferences) => {
    if (key === "essential") return;
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetConsent = useCallback(() => {
    deleteCookie(COOKIE_KEYS.COOKIE_CONSENT);
    setPrefs(DEFAULT_PREFS);
    setShowBanner(true);
  }, []);

  return {
    showBanner,
    prefs,
    showCustomize,
    setShowCustomize,
    acceptAll,
    rejectAll,
    acceptNecessary,
    saveCustom,
    togglePref,
    resetConsent,
  };
}

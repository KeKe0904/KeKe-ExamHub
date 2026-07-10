import { create } from "zustand";
import { setCookie, getCookie, COOKIE_KEYS } from "@/utils/cookie";
import type { Theme } from "@/types";

const THEME_KEY = "examhub-theme";

function getInitialTheme(): Theme {
  let cached: string | null = null;
  
  try {
    cached = localStorage.getItem(THEME_KEY);
  } catch {
    // localStorage 不可用时静默降级
  }
  
  if (!cached) {
    cached = getCookie(COOKIE_KEYS.THEME);
  }
  
  if (cached === "dark" || cached === "light") {
    return cached;
  }
  
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage 不可用时静默降级
  }

  setCookie(COOKIE_KEYS.THEME, theme, {
    days: 365,
    sameSite: "lax",
    secure: true,
  });
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      persistTheme(next);
      set({ theme: next });
    },
    setTheme: (theme: Theme) => {
      applyTheme(theme);
      persistTheme(theme);
      set({ theme });
    },
  };
});

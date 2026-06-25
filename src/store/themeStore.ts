import { create } from "zustand";

const THEME_KEY = "examhub-theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  try {
    const cached = localStorage.getItem(THEME_KEY);
    if (cached === "dark" || cached === "light") return cached;
  } catch {}
  // 跟随系统偏好
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
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

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      set({ theme: next });
    },
  };
});

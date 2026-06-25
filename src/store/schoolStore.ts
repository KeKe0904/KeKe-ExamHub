import { create } from "zustand";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const CACHE_KEY = "examhub-school-name";
const TITLE_CACHE_KEY = "examhub-site-title";
const FAVICON_CACHE_KEY = "examhub-site-favicon";

function getCached(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

interface SchoolState {
  schoolName: string;
  siteTitle: string;
  siteFavicon: string;
  loaded: boolean;
  setSchoolName: (name: string) => void;
  setSiteTitle: (title: string) => void;
  setSiteFavicon: (favicon: string) => void;
  fetchSchoolName: () => Promise<void>;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  schoolName: getCached(CACHE_KEY),
  siteTitle: getCached(TITLE_CACHE_KEY),
  siteFavicon: getCached(FAVICON_CACHE_KEY),
  loaded: false,
  setSchoolName: (name: string) => {
    try {
      localStorage.setItem(CACHE_KEY, name);
    } catch {}
    set({ schoolName: name });
  },
  setSiteTitle: (title: string) => {
    try {
      localStorage.setItem(TITLE_CACHE_KEY, title);
    } catch {}
    set({ siteTitle: title });
  },
  setSiteFavicon: (favicon: string) => {
    try {
      localStorage.setItem(FAVICON_CACHE_KEY, favicon);
    } catch {}
    set({ siteFavicon: favicon });
  },
  fetchSchoolName: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        if (d.school_name) {
          try {
            localStorage.setItem(CACHE_KEY, d.school_name);
          } catch {}
          set({ schoolName: d.school_name });
        }
        if (d.site_title) {
          try {
            localStorage.setItem(TITLE_CACHE_KEY, d.site_title);
          } catch {}
          set({ siteTitle: d.site_title });
        }
        if (d.site_favicon) {
          try {
            localStorage.setItem(FAVICON_CACHE_KEY, d.site_favicon);
          } catch {}
          set({ siteFavicon: d.site_favicon });
        }
        set({ loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));

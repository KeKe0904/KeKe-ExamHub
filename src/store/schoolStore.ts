/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { create } from "zustand";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const CACHE_KEY = "examhub-school-name";
const TITLE_CACHE_KEY = "examhub-site-title";
const FAVICON_CACHE_KEY = "examhub-site-favicon";
const HOME_CACHE_KEY = "examhub-home-config";
const FOOTER_CACHE_KEY = "examhub-footer-config";

function getCached(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

// 友情链接
export interface FooterLink {
  name: string;
  url: string;
}

// 首页文案配置
export interface HomeConfig {
  badgeText: string;
  title: string;
  subtitle: string;
  statLabels: string; // 逗号分隔，如 "考试总数,即将开始,进行中"
}

// 尾栏配置
export interface FooterConfig {
  text: string;
  icp: string;
  publicSecurity: string;
  links: FooterLink[];
}

const DEFAULT_HOME_CONFIG: HomeConfig = {
  badgeText: "数字化考试信息管理平台",
  title: "",
  subtitle: "",
  statLabels: "",
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  text: "让考试信息展示更高效",
  icp: "",
  publicSecurity: "",
  links: [],
};

function parseHomeConfig(raw: string | undefined): HomeConfig {
  if (!raw) return { ...DEFAULT_HOME_CONFIG };
  try {
    return { ...DEFAULT_HOME_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_HOME_CONFIG };
  }
}

function parseFooterConfig(raw: string | undefined): FooterConfig {
  if (!raw) return { ...DEFAULT_FOOTER_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.text || DEFAULT_FOOTER_CONFIG.text,
      icp: parsed.icp || "",
      publicSecurity: parsed.publicSecurity || "",
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return { ...DEFAULT_FOOTER_CONFIG };
  }
}

function parseFooterLinksFromSettings(
  footerLinksRaw: string | undefined,
  footerText: string,
  footerIcp: string,
  footerPublicSecurity: string
): FooterConfig {
  // 兼容两种存储方式：单独的 footer_config JSON，或拆分的字段
  let links: FooterLink[] = [];
  if (footerLinksRaw) {
    try {
      const parsed = JSON.parse(footerLinksRaw);
      if (Array.isArray(parsed)) {
        links = parsed.filter(
          (item: any) => item && typeof item.name === "string" && typeof item.url === "string"
        );
      }
    } catch {
      // ignore
    }
  }
  return {
    text: footerText || DEFAULT_FOOTER_CONFIG.text,
    icp: footerIcp || "",
    publicSecurity: footerPublicSecurity || "",
    links,
  };
}

interface SchoolState {
  schoolName: string;
  siteTitle: string;
  siteFavicon: string;
  homeConfig: HomeConfig;
  footerConfig: FooterConfig;
  loaded: boolean;
  setSchoolName: (name: string) => void;
  setSiteTitle: (title: string) => void;
  setSiteFavicon: (favicon: string) => void;
  setHomeConfig: (config: HomeConfig) => void;
  setFooterConfig: (config: FooterConfig) => void;
  fetchSchoolName: () => Promise<void>;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  schoolName: getCached(CACHE_KEY),
  siteTitle: getCached(TITLE_CACHE_KEY),
  siteFavicon: getCached(FAVICON_CACHE_KEY),
  homeConfig: parseHomeConfig(getCached(HOME_CACHE_KEY)),
  footerConfig: parseFooterConfig(getCached(FOOTER_CACHE_KEY)),
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
  setHomeConfig: (config: HomeConfig) => {
    try {
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(config));
    } catch {}
    set({ homeConfig: config });
  },
  setFooterConfig: (config: FooterConfig) => {
    try {
      localStorage.setItem(FOOTER_CACHE_KEY, JSON.stringify(config));
    } catch {}
    set({ footerConfig: config });
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

        // 首页文案
        const homeConfig: HomeConfig = {
          badgeText: d.home_badge_text || DEFAULT_HOME_CONFIG.badgeText,
          title: d.home_title || DEFAULT_HOME_CONFIG.title,
          subtitle: d.home_subtitle || DEFAULT_HOME_CONFIG.subtitle,
          statLabels: d.home_stat_labels || DEFAULT_HOME_CONFIG.statLabels,
        };
        try {
          localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(homeConfig));
        } catch {}
        set({ homeConfig });

        // 尾栏配置（合并 footer_text / footer_icp / footer_public_security / footer_links）
        const footerConfig = parseFooterLinksFromSettings(
          d.footer_links,
          d.footer_text,
          d.footer_icp,
          d.footer_public_security
        );
        try {
          localStorage.setItem(FOOTER_CACHE_KEY, JSON.stringify(footerConfig));
        } catch {}
        set({ footerConfig });

        set({ loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));

import { useEffect } from "react";
import { useSchoolStore } from "@/store/schoolStore";
import type { HomeConfig, FooterConfig } from "@/store/schoolStore";

/**
 * useSchoolName - 兼容旧调用方，仅返回 schoolName 字符串
 * 新代码推荐使用 useSiteConfig 获取全部自定义配置
 */
export function useSchoolName() {
  const schoolName = useSchoolStore((state) => state.schoolName);
  const siteTitle = useSchoolStore((state) => state.siteTitle);
  const siteFavicon = useSchoolStore((state) => state.siteFavicon);
  const fetchSchoolName = useSchoolStore((state) => state.fetchSchoolName);

  useEffect(() => {
    fetchSchoolName();
  }, [fetchSchoolName]);

  // 同步更新浏览器标签页标题
  useEffect(() => {
    // 优先使用站点标题，其次学校名字，最后默认值
    const title = siteTitle || schoolName || "KeKe ExamHub";
    const isAdmin = window.location.pathname.startsWith("/admin");
    document.title = isAdmin
      ? `${title} - 管理后台`
      : `${title} - 考试信息展示平台`;
  }, [schoolName, siteTitle]);

  // 动态更新浏览器 favicon
  useEffect(() => {
    if (siteFavicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteFavicon;
    }
  }, [siteFavicon]);

  return schoolName;
}

/**
 * useSiteConfig - 暴露站点全部自定义配置（学校名、首页文案、尾栏配置等）
 */
export function useSiteConfig() {
  const schoolName = useSchoolStore((state) => state.schoolName);
  const siteTitle = useSchoolStore((state) => state.siteTitle);
  const siteFavicon = useSchoolStore((state) => state.siteFavicon);
  const homeConfig = useSchoolStore((state) => state.homeConfig);
  const footerConfig = useSchoolStore((state) => state.footerConfig);
  const fetchSchoolName = useSchoolStore((state) => state.fetchSchoolName);

  useEffect(() => {
    fetchSchoolName();
  }, [fetchSchoolName]);

  // 同步浏览器标题
  useEffect(() => {
    const title = siteTitle || schoolName || "KeKe ExamHub";
    const isAdmin = window.location.pathname.startsWith("/admin");
    document.title = isAdmin
      ? `${title} - 管理后台`
      : `${title} - 考试信息展示平台`;
  }, [schoolName, siteTitle]);

  // 同步 favicon
  useEffect(() => {
    if (siteFavicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteFavicon;
    }
  }, [siteFavicon]);

  const displayName = siteTitle || schoolName || "KeKe ExamHub";

  return {
    schoolName,
    siteTitle,
    siteFavicon,
    homeConfig,
    footerConfig,
    displayName,
  };
}

export type { HomeConfig, FooterConfig };

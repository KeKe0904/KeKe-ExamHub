import { useEffect } from "react";
import { useSchoolStore } from "@/store/schoolStore";

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

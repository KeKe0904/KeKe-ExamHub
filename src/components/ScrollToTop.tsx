/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * 路由切换时自动滚动到页面顶部
 *
 * 解决问题：从首页点击考试卡片进入详情页时，页面会保留之前的滚动位置，
 * 导致用户看到的是页面底部而非顶部。
 *
 * 行为：
 * - 路由 pathname 变化时，滚动到顶部
 * - 如果使用了浏览器后退/前进（popstate），尝试恢复历史滚动位置
 * - 排除 hash 锚点跳转（如 /#about）
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // 如果有 hash 锚点，让浏览器原生处理滚动
    if (hash) {
      const el = document.getElementById(hash.replace("#", ""));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // 路由变化时滚动到顶部
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

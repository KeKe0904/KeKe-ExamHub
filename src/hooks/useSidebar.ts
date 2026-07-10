/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";

/**
 * 统一的侧边栏/抽屉状态管理 Hook
 *
 * 功能：
 * - 管理开关状态
 * - 打开时锁定 body 滚动（防止背景穿透）
 * - ESC 键关闭
 * - 路由变化时自动关闭（需传入 pathname）
 */
export function useSidebar(pathname?: string) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // 打开时锁定 body 滚动，防止背景内容跟着滚动
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    // 计算滚动条宽度，避免锁定时页面横向抖动
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // 路由变化时自动关闭
  useEffect(() => {
    if (isOpen) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return { isOpen, open, close, toggle };
}

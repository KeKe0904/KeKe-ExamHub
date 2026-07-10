/**
 * KeKe ExamHub - 响应式工具 hook
 * 提供设备类型判断和断点响应
 * - mobile: < 768px (手机)
 * - tablet: 768px - 1023px (平板)
 * - desktop: >= 1024px (PC桌面)
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ResponsiveState {
  device: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

function getDeviceInfo(width: number): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === "undefined") {
      return {
        device: "desktop",
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1280,
        height: 800,
      };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const d = getDeviceInfo(w);
    return {
      device: d,
      isMobile: d === "mobile",
      isTablet: d === "tablet",
      isDesktop: d === "desktop",
      width: w,
      height: h,
    };
  });

  useEffect(() => {
    let frame = 0;
    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const d = getDeviceInfo(w);
        setState({
          device: d,
          isMobile: d === "mobile",
          isTablet: d === "tablet",
          isDesktop: d === "desktop",
          width: w,
          height: h,
        });
      });
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return state;
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Menu, X, Monitor } from "@/components/MathIcon";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSchoolName } from "@/hooks/useSchoolName";
import ThemeToggle from "@/components/ThemeToggle";
import CookieConsentBanner from "@/components/CookieConsent";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  const navLinks = [
    { href: "/", label: "首页" },
    { href: "/school-info", label: "学校信息" },
    { href: "/classroom/login", label: "教室端", icon: Monitor },
    { href: "/#about", label: "关于" },
    { href: "/admin/login", label: "管理后台" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100 dark:bg-black">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 bg-zinc-50 dark:bg-black border-b border-zinc-200 dark:border-zinc-600">
        <nav className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-white dark:text-black" />
              </div>
              <span className="font-serif text-xl font-bold text-black dark:text-white">
                {displayName}
              </span>
            </Link>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5",
                      location.pathname === link.href
                        ? "text-black dark:text-white font-semibold"
                        : "text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950"
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                );
              })}
              <ThemeToggle />
            </div>

            {/* 移动端菜单按钮 */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-950"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="菜单"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-black dark:text-white" />
              ) : (
                <Menu className="w-5 h-5 text-black dark:text-white" />
              )}
            </button>
          </div>

          {/* 移动端菜单 */}
          {menuOpen && (
            <div className="md:hidden py-3 border-t border-zinc-200 dark:border-zinc-600 animate-slide-down">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                );
              })}
              <div className="px-4 py-2">
                <ThemeToggle />
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* 主内容区 */}
      <main className="flex-1">{children}</main>

      {/* 页脚 */}
      <footer className="bg-zinc-900 dark:bg-black text-white dark:text-zinc-100 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              <span className="font-serif text-lg font-semibold">{displayName}</span>
            </div>
            <p className="text-sm text-zinc-400 dark:text-zinc-400">
              © 2026 {displayName} - 让考试信息展示更高效
            </p>
          </div>
        </div>
      </footer>
      {/* Cookie 同意弹窗 */}
      <CookieConsentBanner />
    </div>
  );
}

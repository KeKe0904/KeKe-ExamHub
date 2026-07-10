/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Menu, X, Monitor, User, BookOpen, Home, Info, Shield } from "@/components/MathIcon";
import { useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/useSchoolName";
import ThemeToggle from "@/components/ThemeToggle";
import CookieConsentBanner from "@/components/CookieConsent";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const location = useLocation();
  const { schoolName, siteTitle, footerConfig } = useSiteConfig();
  const displayName = siteTitle || schoolName || "KeKe ExamHub";

  // 统一使用侧边栏 Hook（路由切换时自动关闭）
  const { isOpen, close, toggle } = useSidebar(location.pathname);

  // 顶部导航：按重要性排序，公开信息 → 各端入口 → 管理后台
  const navLinks = [
    { href: "/", label: "首页", icon: Home },
    { href: "/school-info", label: "学校信息", icon: Info },
    { href: "/student/login", label: "学生端", icon: User },
    { href: "/teacher/login", label: "教师端", icon: BookOpen },
    { href: "/classroom/login", label: "教室端", icon: Monitor },
    { href: "/admin/login", label: "管理后台", icon: Shield },
  ];

  const isActiveLink = (href: string) => {
    return location.pathname === href;
  };

  const currentYear = new Date().getFullYear();

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* 侧边栏头部 */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white dark:text-zinc-900" />
        </div>
        <span className="text-base font-bold text-zinc-900 dark:text-white truncate flex-1">
          {displayName}
        </span>
        {/* 关闭按钮 */}
        <button
          onClick={close}
          className="md:hidden p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center"
          aria-label="关闭菜单"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target",
                isActiveLink(link.href)
                  ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部主题切换 */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 shrink-0 p-3">
        <ThemeToggle />
      </div>
    </div>
  );

  // 友情链接是否需要展示
  const hasFooterLinks = footerConfig.links && footerConfig.links.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-glass border-b border-zinc-200 dark:border-zinc-800 safe-top">
        <nav className="px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 group shrink-0 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-zinc-900" />
              </div>
              <span className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white truncate">
                {displayName}
              </span>
            </Link>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5",
                      isActiveLink(link.href)
                        ? "text-zinc-900 dark:text-white font-semibold bg-zinc-100 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                );
              })}
              <ThemeToggle />
            </div>

            {/* 移动端汉堡菜单 */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300"
              onClick={toggle}
              aria-label="打开菜单"
              aria-expanded={isOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* 移动端遮罩层 */}
      <div
        className={cn(
          "md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* 移动端抽屉式侧边栏（从右侧滑入，与登录页布局区分） */}
      <aside
        className={cn(
          "md:hidden w-72 max-w-[85vw] bg-white dark:bg-zinc-900 flex flex-col fixed inset-y-0 right-0 z-50 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl",
          "transform transition-transform duration-300 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {SidebarContent}
      </aside>

      <main className="flex-1">{children}</main>

      <footer className="bg-zinc-900 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 py-6 sm:py-8 safe-bottom border-t border-zinc-800 dark:border-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* 友情链接区 */}
          {hasFooterLinks && (
            <div className="mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-zinc-800 dark:border-zinc-900">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-600 mb-2 uppercase tracking-wider">
                友情链接
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {footerConfig.links.map((link, idx) => (
                  <a
                    key={`${link.url}-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-200 dark:hover:text-zinc-300 transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-center md:text-left">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-zinc-300 dark:text-zinc-600 shrink-0" />
              <span className="text-base sm:text-lg font-semibold text-zinc-200 dark:text-zinc-400">
                {displayName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-600">
              © {currentYear} {displayName} · {footerConfig.text}
            </p>
          </div>

          {/* 备案信息 */}
          {(footerConfig.icp || footerConfig.publicSecurity) && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
              {footerConfig.icp && (
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-600 hover:text-zinc-300 dark:hover:text-zinc-400 transition-colors"
                >
                  {footerConfig.icp}
                </a>
              )}
              {footerConfig.publicSecurity && (
                <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-600">
                  {footerConfig.publicSecurity}
                </span>
              )}
            </div>
          )}
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
}

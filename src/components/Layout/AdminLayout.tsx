/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  GraduationCap,
  Globe,
  ArrowLeft,
  User,
  Settings,
  Sun,
  Server,
  Box,
  Building,
  Package,
  Shield,
  Terminal,
  Monitor,
  AlertTriangle,
  Users,
  Menu,
  X,
  BookOpen,
  Bot,
} from "@/components/MathIcon";
import { useAuthStore } from "@/store/authStore";
import { useSchoolName } from "@/hooks/useSchoolName";
import { useSidebar } from "@/hooks/useSidebar";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import CookieConsentBanner from "@/components/CookieConsent";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 侧边栏菜单分组：移到模块级常量，避免每次渲染都重建数组
// 1. 概览（最高频使用） 2. 考试与教学 3. 教室端管理 4. 安全中心 5. 系统设置
const MENU_GROUPS = [
  {
    title: "概览",
    items: [
      { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
      { href: "/admin/data-dashboard", label: "数据大屏", icon: Monitor },
      { href: "/admin/ai-chat", label: "AI 助手", icon: Bot },
    ],
  },
  {
    title: "考试与教学",
    items: [
      { href: "/admin/exams", label: "考试管理", icon: FileText },
      { href: "/admin/classes", label: "班级管理", icon: GraduationCap },
      { href: "/admin/students", label: "学生管理", icon: User },
      { href: "/admin/teachers", label: "教师管理", icon: Users },
      { href: "/admin/announcements", label: "公告管理", icon: BookOpen },
    ],
  },
  {
    title: "教室端管理",
    items: [
      { href: "/admin/buildings", label: "教学楼管理", icon: Building },
      { href: "/admin/classrooms", label: "教室端账号", icon: Shield },
      { href: "/admin/registration-codes", label: "注册码管理", icon: Package },
    ],
  },
  {
    title: "安全中心",
    items: [
      { href: "/admin/abnormal-login", label: "异常登录审核", icon: AlertTriangle },
      { href: "/admin/ip-blacklist", label: "IP 黑名单", icon: Shield },
      { href: "/admin/audit-logs", label: "操作日志", icon: FileText },
    ],
  },
  {
    title: "系统设置",
    items: [
      { href: "/admin/settings", label: "系统设置", icon: Settings },
      { href: "/admin/domains", label: "域名管理", icon: Globe },
      { href: "/admin/monitor", label: "服务器监控", icon: Server },
      { href: "/admin/environment", label: "服务器环境", icon: Box },
    ],
  },
];

// ==================== SidebarContent：memo 化，仅在 pathname/theme/isOpen 等稳定值变化时重渲染 ====================

interface SidebarContentProps {
  pathname: string;
  displayName: string;
  username: string;
  theme: "light" | "dark";
  isOpen: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const SidebarContent = memo(function SidebarContent({
  pathname,
  displayName,
  username,
  theme,
  onClose,
  onToggleTheme,
  onLogout,
}: SidebarContentProps) {
  return (
    <>
      {/* 侧边栏头部 */}
      <div className="h-14 md:h-16 flex items-center gap-2.5 px-4 md:px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm md:text-base font-bold block leading-tight text-zinc-900 dark:text-white truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">管理后台</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors touch-target flex items-center justify-center"
          aria-label="关闭菜单"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto overscroll-contain">
        {MENU_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : item.href === "/admin/exams"
                  ? pathname === "/admin/exams" || /^\/admin\/exams\/\d+/.test(pathname)
                  : item.href === "/admin/announcements"
                  ? pathname === "/admin/announcements" || /^\/admin\/announcements\/\d+/.test(pathname)
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all touch-target",
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-zinc-900 dark:before:bg-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="px-3 py-2 space-y-0.5">
          <Link
            to="/classroom"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all touch-target"
          >
            <Terminal className="w-3.5 h-3.5" />
            进入教室端
          </Link>
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all touch-target"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回前台首页
          </Link>
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all touch-target"
          >
            <Sun className="w-3.5 h-3.5" />
            {theme === "dark" ? "切换到白天模式" : "切换到夜间模式"}
          </button>
        </div>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                {username || "管理员"}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">已登录</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-all touch-target"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    </>
  );
});

// ==================== AdminLayout ====================

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.username);
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  const { isOpen, open, close, toggle } = useSidebar(location.pathname);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {/* 桌面端固定侧边栏 */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex-col fixed inset-y-0 left-0 z-40 border-r border-zinc-200 dark:border-zinc-800">
        <SidebarContent
          pathname={location.pathname}
          displayName={displayName}
          username={username}
          theme={theme}
          isOpen={isOpen}
          onClose={close}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      </aside>

      {/* 移动端遮罩层 */}
      <div
        className={cn(
          "md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* 移动端抽屉式侧边栏 */}
      <aside
        className={cn(
          "md:hidden w-64 max-w-[85vw] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl",
          "transform transition-transform duration-300 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={location.pathname}
          displayName={displayName}
          username={username}
          theme={theme}
          isOpen={isOpen}
          onClose={close}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* 顶部栏 - 仅移动端显示汉堡菜单 */}
        <header className="md:hidden h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 sticky top-0 z-30 safe-top">
          <button
            onClick={toggle}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors touch-target flex items-center justify-center"
            aria-label="打开菜单"
            aria-expanded={isOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors touch-target flex items-center justify-center"
              aria-label="切换主题"
              title={theme === "dark" ? "切换到白天模式" : "切换到夜间模式"}
            >
              <Sun className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <CookieConsentBanner />
    </div>
  );
}

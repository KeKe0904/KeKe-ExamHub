/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { GraduationCap, User, LogOut, LayoutDashboard, Users, BookOpen, Menu, X } from "@/components/MathIcon";
import { useTeacherStore } from "@/store/teacherStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSchoolName";
import { useSidebar } from "@/hooks/useSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { teacher, logout } = useTeacherStore();
  const { displayName } = useSiteConfig();

  // 统一使用侧边栏 Hook（路由切换时自动关闭）
  const { isOpen, close, toggle } = useSidebar(location.pathname);
  // 当前页面标题（用于移动端顶栏显示）
  const [currentTitle] = useState("教师端");

  const handleLogout = () => {
    logout();
    navigate("/teacher/login");
  };

  const menuItems = [
    { key: "/teacher", label: "首页", icon: LayoutDashboard },
    { key: "/teacher/students", label: "班级学生", icon: Users },
    { key: "/teacher/exams", label: "监考安排", icon: BookOpen },
  ];

  const isActive = (path: string) => {
    if (path === "/teacher") {
      return location.pathname === "/teacher";
    }
    return location.pathname.startsWith(path);
  };

  const activeLabel = menuItems.find((item) => isActive(item.key))?.label || currentTitle;

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* 侧边栏头部 */}
      <div className="h-14 md:h-16 flex items-center gap-2.5 px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-zinc-900" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight truncate">
            {displayName}
          </h1>
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-tight">教师端</p>
        </div>
        {/* 移动端关闭按钮 */}
        <button
          onClick={close}
          className="md:hidden p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center"
          aria-label="关闭菜单"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 导航菜单（可滚动） */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.key);
                close();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target",
                isActive(item.key)
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 底部用户信息与退出 */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 shrink-0 p-3 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
              {teacher?.name || "教师"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {teacher?.roleName || ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all touch-target"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* 桌面端固定侧边栏 */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col fixed inset-y-0 left-0 z-40 transition-colors">
        {SidebarContent}
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
          "md:hidden w-64 max-w-[85vw] bg-white dark:bg-zinc-900 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl",
          "transform transition-transform duration-300 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {SidebarContent}
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 safe-top transition-colors">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* 移动端汉堡菜单 */}
                <button
                  onClick={toggle}
                  className="md:hidden p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center"
                  aria-label="打开菜单"
                  aria-expanded={isOpen}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-sm sm:text-base lg:text-lg font-bold text-zinc-900 dark:text-white truncate">
                  {activeLabel}
                </h2>
              </div>

              <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                {/* 桌面端用户信息 */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white leading-tight">
                      {teacher?.name || "教师"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {teacher?.roleName || ""}
                    </p>
                  </div>
                </div>
                {/* 移动端紧凑用户信息 */}
                <div className="sm:hidden flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[80px]">
                    {teacher?.name || "教师"}
                  </span>
                </div>
                {/* 桌面端顶栏主题切换 */}
                <div className="hidden md:block">
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 sm:p-2.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center"
                  title="退出登录"
                  aria-label="退出登录"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-zinc-900 dark:bg-zinc-900 border-t border-zinc-800 dark:border-zinc-900 py-3 sm:py-4 shrink-0 safe-bottom transition-colors">
          <div className="px-3 sm:px-6 lg:px-8 flex items-center justify-between text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 gap-2">
            <span className="truncate">{displayName} · 教师端</span>
            <span className="truncate text-right">工号：{teacher?.teacherNo || "--"}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

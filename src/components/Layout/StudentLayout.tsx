/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { GraduationCap, User, LogOut } from "@/components/MathIcon";
import { useStudentStore } from "@/store/studentStore";
import { useNavigate } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSchoolName";
import ThemeToggle from "@/components/ThemeToggle";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const navigate = useNavigate();
  const { student, logout } = useStudentStore();
  const { displayName } = useSiteConfig();

  const handleLogout = () => {
    logout();
    navigate("/student/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 safe-top transition-colors">
        <div className="px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-zinc-900" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  {displayName}
                </h1>
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-tight">学生端</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white leading-tight">
                    {student?.name || "学生"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {student?.className || ""}
                  </p>
                </div>
              </div>
              {/* 手机端紧凑用户信息 */}
              <div className="sm:hidden flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[80px]">
                  {student?.name || "学生"}
                </span>
              </div>
              <ThemeToggle />
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
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 gap-2">
          <span className="truncate">{displayName} · 学生端</span>
          <span className="truncate text-right">学号：{student?.studentNo || "--"}</span>
        </div>
      </footer>
    </div>
  );
}

import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  GraduationCap,
  Plus,
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
} from "@/components/MathIcon";
import { useAuthStore } from "@/store/authStore";
import { useSchoolName } from "@/hooks/useSchoolName";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.username);
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const menuGroups = [
    {
      title: "概览",
      items: [
        { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
        { href: "/classroom", label: "教室端", icon: Terminal },
      ],
    },
    {
      title: "内容管理",
      items: [
        { href: "/admin/exams", label: "考试管理", icon: FileText },
        { href: "/admin/exams/new", label: "发布考试", icon: Plus },
        { href: "/admin/announcements", label: "公告管理", icon: Globe },
      ],
    },
    {
      title: "教室端管理",
      items: [
        { href: "/admin/buildings", label: "教学楼管理", icon: Building },
        { href: "/admin/registration-codes", label: "注册码管理", icon: Package },
        { href: "/admin/classrooms", label: "教室端账号", icon: Shield },
      ],
    },
    {
      title: "系统",
      items: [
        { href: "/admin/monitor", label: "服务器监控", icon: Server },
        { href: "/admin/environment", label: "服务器环境", icon: Box },
        { href: "/admin/settings", label: "系统设置", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-black">
      {/* 侧边栏 */}
      <aside className="w-64 bg-black dark:bg-black text-white flex flex-col fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-zinc-800 dark:border-zinc-600 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-200 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-black dark:text-zinc-900" />
          </div>
          <div>
            <span className="font-serif text-base font-bold block leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-300 tracking-wider uppercase">管理后台</span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-6" : ""}>
              <div className="px-4 mb-2 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider uppercase">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? location.pathname === "/admin"
                    : item.href === "/admin/exams"
                    ? location.pathname === "/admin/exams" ||
                      /^\/admin\/exams\/\d+/.test(location.pathname)
                    : location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium mb-0.5 transition-colors group border-l-2",
                      isActive
                        ? "bg-white dark:bg-zinc-100 text-black dark:text-zinc-900 border-l-black dark:border-l-white"
                        : "text-zinc-400 dark:text-zinc-400 border-l-transparent hover:bg-zinc-900 dark:hover:bg-zinc-950 hover:text-white"
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

        {/* 返回前台 */}
        <div className="px-3 pb-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-300 hover:bg-zinc-900 dark:hover:bg-zinc-950 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回前台首页
          </Link>
        </div>

        {/* 主题切换 */}
        <div className="px-3 pb-2">
          <button
            onClick={() => useThemeStore.getState().toggle()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-300 hover:bg-zinc-900 dark:hover:bg-zinc-950 hover:text-white transition-colors"
          >
            <Sun className="w-3.5 h-3.5" />
            切换主题
          </button>
        </div>

        {/* 用户信息和退出 */}
        <div className="p-3 border-t border-zinc-800 dark:border-zinc-600">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-zinc-800 dark:bg-black flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-zinc-300 dark:text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white dark:text-zinc-100 truncate">
                {username || "管理员"}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-300">已登录</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-400 hover:bg-zinc-900 dark:hover:bg-zinc-950 hover:text-red-400 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 ml-64">
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

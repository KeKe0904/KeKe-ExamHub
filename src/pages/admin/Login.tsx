import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "@/components/MathIcon";
import { useAuthStore } from "@/store/authStore";
import { getCookie, setCookie, deleteCookie, COOKIE_KEYS } from "@/utils/cookie";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  // 后端是否处于"仅安装模式"（未完成 /setup 时为 true）
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    const savedUsername = getCookie(COOKIE_KEYS.USERNAME);
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
    // 检测后端是否处于"仅安装模式"
    // 如果是，提示用户先完成 /setup，否则登录必然失败
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.setupMode === true) {
          setSetupMode(true);
        }
      })
      .catch(() => {
        // 后端不可用时不阻塞登录页渲染，用户尝试登录时会看到网络错误
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("请输入账号和密码");
      return;
    }

    if (rememberMe) {
      setCookie(COOKIE_KEYS.USERNAME, username, {
        days: 30,
        sameSite: "lax",
      });
    } else {
      deleteCookie(COOKIE_KEYS.USERNAME);
    }

    const success = await login(username, password, rememberMe);
    if (success) {
      navigate("/admin");
    } else {
      setError(useAuthStore.getState().error || "账号或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-8 animate-scale-in transition-colors">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-zinc-900 dark:bg-white mb-4 transition-colors">
              <GraduationCap className="w-8 h-8 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
              管理员登录
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">登录后管理考试信息</p>
          </div>

          {setupMode && (
            <div className="mb-6 p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">系统尚未完成安装</p>
                  <p className="mb-3">后端处于"仅安装模式"，登录功能暂不可用。请先完成安装向导。</p>
                  <a
                    href="/setup"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                  >
                    前往安装向导
                  </a>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                账号
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入管理员账号"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={loading}
                  className="w-full pl-11 pr-11 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  aria-label="显示/隐藏密码"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white"
                      : "border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                  }`}>
                    {rememberMe && (
                      <svg
                        className="w-3 h-3 text-white dark:text-zinc-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                  7 天内自动登录
                </span>
              </label>
              {!rememberMe && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  关闭浏览器后需重新登录
                </span>
              )}
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-600 dark:text-red-400 animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

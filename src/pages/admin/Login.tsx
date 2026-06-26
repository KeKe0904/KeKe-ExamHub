/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
} from "@/components/MathIcon";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("请输入账号和密码");
      return;
    }

    const success = await login(username, password);
    if (success) {
      navigate("/admin");
    } else {
      setError("账号或密码错误,请重试");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-zinc-800/30 dark:bg-black/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-zinc-700/20 dark:bg-zinc-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-400 hover:text-zinc-200 dark:hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-black dark:bg-white mb-4">
              <GraduationCap className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
              管理员登录
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">登录后管理考试信息</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                账号
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入管理员账号"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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

            {error && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-500 dark:text-red-400 animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
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
import { useStudentStore } from "@/store/studentStore";
import { useSchoolName } from "@/hooks/useSchoolName";
import { getCookie, setCookie, deleteCookie, COOKIE_KEYS } from "@/utils/cookie";
import ThemeToggle from "@/components/ThemeToggle";

export default function StudentLogin() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useStudentStore();
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const savedStudentNo = getCookie(COOKIE_KEYS.STUDENT_NO);
    if (savedStudentNo) {
      setStudentNo(savedStudentNo);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!studentNo || !password) {
      setLocalError("请填写学号和密码");
      return;
    }

    if (rememberMe) {
      setCookie(COOKIE_KEYS.STUDENT_NO, studentNo, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
    } else {
      deleteCookie(COOKIE_KEYS.STUDENT_NO);
    }

    const success = await login(studentNo, password, rememberMe);

    if (success) {
      navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative transition-colors">
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

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-6 sm:p-8 animate-scale-in transition-colors">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-zinc-900 dark:bg-white mb-4 transition-colors">
              <GraduationCap className="w-8 h-8 text-white dark:text-zinc-900" />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-1">
              学生端登录
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {displayName} · 考试信息查询
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                学号
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  placeholder="请输入学号"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
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
                      : "border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-500 dark:group-hover:border-zinc-400"
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
                <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  记住学号
                </span>
              </label>
            </div>

            {(localError || error) && (
              <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-start gap-2 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {localError || error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

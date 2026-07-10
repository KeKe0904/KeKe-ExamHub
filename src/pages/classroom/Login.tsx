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
  Building,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Hourglass,
} from "@/components/MathIcon";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { buildingApi } from "@/utils/api";
import { getCookie, setCookie, deleteCookie, COOKIE_KEYS } from "@/utils/cookie";
import type { Building as BuildingType } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function ClassroomLogin() {
  const navigate = useNavigate();
  const { login, loading, status, rejectReason, pendingReviewMessage, pendingReviewIp, clearError } =
    useClassroomAuthStore();

  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [buildingsLoading, setBuildingsLoading] = useState(true);

  // 加载教学楼列表
  useEffect(() => {
    buildingApi
      .getAll()
      .then((res) => {
        setBuildings(res.data);
        
        const savedRoomNumber = getCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER);
        const savedBuildingId = getCookie("examhub-classroom-building-id");
        
        if (savedRoomNumber) {
          setRoomNumber(savedRoomNumber);
          setRememberMe(true);
        }
        
        if (savedBuildingId && res.data.find(b => b.id === savedBuildingId)) {
          setBuildingId(savedBuildingId);
        } else if (res.data.length > 0) {
          setBuildingId(res.data[0].id);
        }
      })
      .catch(() => {
        setError("无法加载教学楼列表,请检查网络");
      })
      .finally(() => setBuildingsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError();

    if (!buildingId || !roomNumber || !password) {
      setError("请填写所有必填字段");
      return;
    }

    if (rememberMe) {
      setCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER, roomNumber, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
      setCookie("examhub-classroom-building-id", buildingId, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
    } else {
      deleteCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER);
      deleteCookie("examhub-classroom-building-id");
    }

    const result = await login(buildingId, roomNumber, password);

    if (result.status === "approved") {
      navigate("/classroom");
    } else if (result.status === "pending") {
      // 状态由 store 管理,页面会显示审核中提示
    } else if (result.status === "rejected") {
      // 状态由 store 管理,页面会显示驳回提示
    } else {
      setError("登录失败,请重试");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dark:bg-zinc-900 p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-zinc-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-zinc-700/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-black dark:bg-white mb-4">
              <Building className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
              教室端登录
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">
              登录后查看本教室的考试信息
            </p>
          </div>

          {/* 审核中提示 */}
          {status === "pending" && (
            <div className="mb-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2 animate-slide-down">
              <Hourglass className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  账号正在审核中
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                  请等待管理员通过您的注册申请后再次登录
                </p>
              </div>
            </div>
          )}

          {/* 驳回提示 */}
          {status === "rejected" && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  注册申请已被驳回
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                  {rejectReason || "请联系管理员了解详情"}
                </p>
              </div>
            </div>
          )}

          {/* 异常登录待审核提示 */}
          {status === "pending_review" && (
            <div className="mb-4 px-4 py-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2 animate-slide-down">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  登录待审核
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  {pendingReviewMessage || "检测到非常用登录地址，请联系管理员批准后再试"}
                </p>
                {pendingReviewIp && (
                  <p className="text-xs text-orange-500 dark:text-orange-500 mt-1 font-mono">
                    当前 IP: {pendingReviewIp}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                教学楼
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  disabled={loading || buildingsLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                >
                  {buildingsLoading && <option>加载中...</option>}
                  {!buildingsLoading && buildings.length === 0 && (
                    <option value="">暂无教学楼</option>
                  )}
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                教室号
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="例如:301"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
                      ? "bg-black dark:bg-white border-black dark:border-white"
                      : "border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                  }`}>
                    {rememberMe && (
                      <svg
                        className="w-3 h-3 text-white dark:text-black"
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
                <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-800 dark:group-hover:text-zinc-100 transition-colors">
                  记住教室号
                </span>
              </label>
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

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-300">
            还没有账号?
            <Link
              to="/classroom/register"
              className="ml-1 text-black dark:text-white font-medium hover:underline"
            >
              注册教室端
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  UserPlus,
  CalendarCheck,
} from "@/components/MathIcon";
import { useTeacherStore } from "@/store/teacherStore";
import { teacherAuthApi } from "@/utils/api";
import { formatDateTime, formatDuration } from "@/utils/date";
import TeacherLayout from "@/components/Layout/TeacherLayout";
import { useNavigate } from "react-router-dom";
import type { TeacherClass, TeacherExam } from "@/types";

export default function TeacherHome() {
  const navigate = useNavigate();
  const { teacher, setTeacher } = useTeacherStore();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (teacher?.isFirstLogin) {
      setShowChangePassword(true);
    }
  }, [teacher]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesRes, examsRes] = await Promise.all([
        teacherAuthApi.getClasses(),
        teacherAuthApi.getExams({ status: "upcoming" }),
      ]);
      setClasses(classesRes.data || []);
      setExams(examsRes.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 初始加载：数据为空时显示骨架屏；后续刷新显示旋转图标
  const isInitialLoading = loading && classes.length === 0 && exams.length === 0;
  const isRefreshing = loading && (classes.length > 0 || exams.length > 0);

  const stats = {
    classCount: classes.length,
    studentCount: classes.reduce((sum, c) => sum + c.studentCount, 0),
    upcomingExams: exams.length,
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (teacher) {
      setTeacher({ ...teacher, isFirstLogin: false });
    }
  };

  return (
    <TeacherLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <WelcomeSection teacher={teacher} onRefresh={fetchData} isRefreshing={isRefreshing} />

        <StatsSection stats={stats} />

        {error ? (
          <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-14 h-14 text-zinc-700 dark:text-zinc-300 mb-4" />
            <p className="text-lg text-zinc-900 dark:text-white mb-3">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors btn-press"
            >
              <RotateCcw className="w-4 h-4" />
              重试
            </button>
          </div>
        ) : isInitialLoading ? (
          <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <PanelSkeleton />
            <PanelSkeleton />
          </section>
        ) : (
          <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <MyClasses classes={classes} navigate={navigate} loading={loading} />
            <UpcomingExams exams={exams} navigate={navigate} loading={loading} />
          </section>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChanged}
          forceChange={teacher?.isFirstLogin}
        />
      )}
    </TeacherLayout>
  );
}

function WelcomeSection({
  teacher,
  onRefresh,
  isRefreshing,
}: {
  teacher: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 sm:p-6 lg:p-8 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-zinc-900 dark:text-white mb-2">
            你好，{teacher?.name || "老师"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm lg:text-base">
            {teacher?.roleName || ""} · 工号：{teacher?.teacherNo || "--"}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="shrink-0 p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press"
              aria-label="刷新数据"
            >
              <RotateCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          <div className="text-center">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-zinc-900 dark:text-white">
              {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {new Date().toLocaleDateString("zh-CN", { weekday: "long" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-colors">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="skeleton h-5 w-24 rounded" />
        </div>
        <div className="skeleton h-4 w-16 rounded" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
            <div className="skeleton h-4 w-1/2 rounded mb-2" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSection({ stats }: { stats: { classCount: number; studentCount: number; upcomingExams: number } }) {
  const statItems = [
    {
      label: "我的班级",
      value: stats.classCount,
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: "学生总数",
      value: stats.studentCount,
      icon: <UserPlus className="w-6 h-6" />,
    },
    {
      label: "监考考试",
      value: stats.upcomingExams,
      icon: <CalendarCheck className="w-6 h-6" />,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 flex items-center gap-4 shadow-sm transition-colors"
        >
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white font-serif">{item.value}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MyClasses({
  classes,
  navigate,
  loading,
}: {
  classes: TeacherClass[];
  navigate: (path: string) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-colors">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          我的班级
        </h2>
        <button
          onClick={() => navigate("/teacher/students")}
          className="text-sm text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
        >
          查看全部
        </button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton w-10 h-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : classes.length > 0 ? (
          <div className="space-y-3">
            {classes.slice(0, 3).map((cls) => (
              <div
                key={cls.id}
                onClick={() => navigate("/teacher/students")}
                className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-between btn-press"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-900 dark:text-white truncate">{cls.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {cls.grade || ""} · {cls.studentCount} 名学生
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 animate-fade-in">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无班级信息</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingExams({
  exams,
  navigate,
  loading,
}: {
  exams: TeacherExam[];
  navigate: (path: string) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-colors">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          近期监考
        </h2>
        <button
          onClick={() => navigate("/teacher/exams")}
          className="text-sm text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
        >
          查看全部
        </button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                <div className="skeleton h-4 w-32 rounded mb-2" />
                <div className="space-y-1.5">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : exams.length > 0 ? (
          <div className="space-y-3">
            {exams.slice(0, 3).map((exam) => (
              <div
                key={exam.id}
                onClick={() => navigate("/teacher/exams")}
                className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer btn-press"
              >
                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">{exam.subject}</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-4 h-4" />
                    {formatDateTime(exam.examDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-4 h-4" />
                    {formatDuration(exam.duration)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    {exam.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 animate-fade-in">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无监考安排</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({
  onClose,
  onSuccess,
  forceChange,
}: {
  onClose: () => void;
  onSuccess: () => void;
  forceChange?: boolean;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!forceChange) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [forceChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("请填写所有密码字段");
      return;
    }

    if (newPassword.length < 6) {
      setError("新密码长度至少为 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    if (oldPassword === newPassword) {
      setError("新密码不能与旧密码相同");
      return;
    }

    try {
      setLoading(true);
      await teacherAuthApi.changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改密码失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (forceChange && e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-scale-in transition-colors">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {forceChange ? "首次登录，请修改密码" : "修改密码"}
          </h2>
          {!forceChange && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white dark:text-zinc-900" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">密码修改成功</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">即将跳转...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {forceChange && (
              <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
                为了账号安全，首次登录请修改初始密码。
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                旧密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入旧密码"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showOldPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                确认新密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 btn-press"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  修改中...
                </>
              ) : (
                "确认修改"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

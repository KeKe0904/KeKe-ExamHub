/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Building,
  Loader2,
  CalendarX,
  AlertCircle,
  RotateCcw,
  Tag,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from "@/components/MathIcon";
import { useStudentStore } from "@/store/studentStore";
import { studentAuthApi } from "@/utils/api";
import { formatDateTime, formatDuration } from "@/utils/date";
import StudentLayout from "@/components/Layout/StudentLayout";
import type { StudentExam } from "@/types";

type TabType = "upcoming" | "ongoing" | "ended";

export default function StudentHome() {
  const { student, setStudent } = useStudentStore();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (student?.isFirstLogin) {
      setShowChangePassword(true);
    }
  }, [student]);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentAuthApi.getMyExams();
      setExams(res.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取考试信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // 初始加载：考试列表为空时显示骨架屏；后续刷新显示旋转图标
  const isInitialLoading = loading && exams.length === 0;
  const isRefreshing = loading && exams.length > 0;

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => exam.examStatus === activeTab);
  }, [exams, activeTab]);

  const stats = useMemo(() => {
    return {
      upcoming: exams.filter((e) => e.examStatus === "upcoming").length,
      ongoing: exams.filter((e) => e.examStatus === "ongoing").length,
      ended: exams.filter((e) => e.examStatus === "ended").length,
      total: exams.length,
    };
  }, [exams]);

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (student) {
      setStudent({ ...student, isFirstLogin: false });
    }
  };

  return (
    <StudentLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <WelcomeSection student={student} />

        <StatsSection
          stats={stats}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={fetchExams}
          isRefreshing={isRefreshing}
        />

        <section className="mt-6 sm:mt-8">
          {isInitialLoading ? (
            <SkeletonGrid />
          ) : error ? (
            <ErrorState error={error} onRetry={fetchExams} />
          ) : filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredExams.map((exam, index) => (
                <ExamCard key={exam.id} exam={exam} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState tab={activeTab} />
          )}
        </section>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChanged}
          forceChange={student?.isFirstLogin}
        />
      )}
    </StudentLayout>
  );
}

function WelcomeSection({ student }: { student: any }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 sm:p-6 lg:p-8 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-zinc-900 dark:text-white mb-2">
            你好，{student?.name || "同学"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm lg:text-base">
            {student?.className || ""} · 学号：{student?.studentNo || "--"}
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
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

function StatsSection({
  stats,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}: {
  stats: { upcoming: number; ongoing: number; ended: number; total: number };
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "upcoming", label: "即将开始", count: stats.upcoming },
    { key: "ongoing", label: "进行中", count: stats.ongoing },
    { key: "ended", label: "已结束", count: stats.ended },
  ];

  return (
    <div className="mt-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 flex items-center gap-2 transition-colors">
      <div className="flex gap-1 overflow-x-auto flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 min-w-[110px] px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap btn-press ${
              activeTab === tab.key
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                activeTab === tab.key
                  ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="shrink-0 p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press"
          aria-label="刷新考试列表"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}

function ExamCard({ exam, index = 0 }: { exam: StudentExam; index?: number }) {
  const isOngoing = exam.examStatus === "ongoing";
  const isUpcoming = exam.examStatus === "upcoming";
  const isEnded = exam.examStatus === "ended";

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`stagger-item bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
        isOngoing
          ? "border-zinc-900 dark:border-zinc-100 shadow-sm"
          : isUpcoming
          ? "border-zinc-300 dark:border-zinc-700"
          : "border-zinc-200 dark:border-zinc-800 opacity-80"
      }`}
    >
      <div
        className={`px-5 py-3 border-b flex items-center justify-between ${
          isOngoing
            ? "bg-zinc-900 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-800"
            : isUpcoming
            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800"
            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
            isOngoing
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
              : isUpcoming
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900 animate-pulse" />}
          {isOngoing ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
        </span>
        {exam.seatNumber && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Tag className="w-3 h-3" />
            {exam.seatNumber} 号座位
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 font-serif">
          {exam.subject}
        </h3>

        <div className="space-y-2.5">
          <InfoRow icon={<Calendar className="w-4 h-4" />}>
            {formatDateTime(exam.examDate)}
          </InfoRow>
          <InfoRow icon={<Clock className="w-4 h-4" />}>
            {formatDuration(exam.duration)}
          </InfoRow>
          <InfoRow icon={<Building className="w-4 h-4" />}>
            {exam.buildingName} {exam.classroomName}
          </InfoRow>
          {isEnded && (
            <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
              {exam.score !== null ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">考试成绩</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white font-serif">
                    {exam.score} 分
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center py-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">成绩待公布</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
            <div className="skeleton h-5 w-16 rounded-md" />
            <div className="skeleton h-4 w-12 rounded" />
          </div>
          <div className="p-5">
            <div className="skeleton h-5 w-3/4 rounded mb-4" />
            <div className="space-y-2.5">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="w-14 h-14 text-zinc-700 dark:text-zinc-300 mb-4" />
      <p className="text-lg text-zinc-900 dark:text-white mb-3">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const labels: Record<TabType, { title: string; desc: string }> = {
    upcoming: { title: "暂无即将开始的考试", desc: "请耐心等待考试安排" },
    ongoing: { title: "暂无进行中的考试", desc: "当前没有正在进行的考试" },
    ended: { title: "暂无已结束的考试", desc: "已结束的考试会在这里显示" },
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
        <CalendarX className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">{labels[tab].title}</h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{labels[tab].desc}</p>
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
      await studentAuthApi.changePassword(oldPassword, newPassword);
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">即将跳转到考试列表...</p>
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

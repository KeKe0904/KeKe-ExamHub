/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  LogOut,
  Clock,
  Calendar,
  User,
  MapPin,
  Loader2,
  CalendarX,
  AlertCircle,
  RotateCcw,
  TrendingUp,
  CalendarCheck,
  Monitor,
  ChevronRight,
} from "@/components/MathIcon";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { classroomApi } from "@/utils/api";
import {
  calculateExamStatus,
  calculateCountdown,
  calculateStats,
  formatDateTime,
  formatDuration,
} from "@/utils/date";
import type { Exam, ExamStats } from "@/types";

export default function ClassroomHome() {
  const navigate = useNavigate();
  const { info, logout } = useClassroomAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const res = await classroomApi.getExams();
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
    const t = setInterval(fetchExams, 30 * 1000);
    return () => clearInterval(t);
  }, [fetchExams]);

  const handleLogout = () => {
    logout();
    navigate("/classroom/login");
  };

  const timeStr = currentTime.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = currentTime.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const examsWithStatus = useMemo(
    () => exams.map((e) => ({ ...e, status: calculateExamStatus(e) })),
    [exams]
  );
  const stats: ExamStats = useMemo(() => calculateStats(exams), [exams]);

  // 排序：进行中 > 即将开始 > 已结束
  const sorted = useMemo(() => {
    return [...examsWithStatus].sort((a, b) => {
      const o = { ongoing: 0, upcoming: 1, ended: 2 } as const;
      if (o[a.status] !== o[b.status]) return o[a.status] - o[b.status];
      return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
    });
  }, [examsWithStatus]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* 顶部栏 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <Building className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-zinc-900" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base sm:text-xl lg:text-2xl leading-tight truncate text-zinc-900 dark:text-white">
              {info?.buildingName || "教学楼"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {info?.roomNumber || ""} 教室 · 考试信息
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* 监考模式入口 */}
          <button
            onClick={() => navigate("/classroom/invigilation")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 hover:text-zinc-900 dark:hover:text-white transition-colors btn-press"
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden md:inline">监考模式</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 时间 */}
          <div className="text-right hidden lg:block">
            <div className="font-bold text-xl tabular-nums tracking-wider text-zinc-900 dark:text-white">
              {timeStr}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{dateStr}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 sm:p-3 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-target"
            title="退出"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchExams} />
        ) : (
          <>
            <HeroBanner stats={stats} />

            <section className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
              {sorted.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  {sorted.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </section>
          </>
        )}
      </main>

      {/* 底部 */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 lg:px-12 py-3 sm:py-4 flex items-center justify-between text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 shrink-0 transition-colors">
        <span>KeKe ExamHub · 教室端</span>
        <span className="hidden sm:inline">
          共 {stats.total} 场 · 进行中 {stats.ongoing} · 即将 {stats.upcoming}
        </span>
        <span className="sm:hidden">{stats.ongoing}进行 / {stats.upcoming}即将</span>
      </footer>
    </div>
  );
}

// ==================== Hero 横幅 ====================

function HeroBanner({ stats }: { stats: ExamStats }) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 lg:px-12 py-8 sm:py-10 lg:py-14 transition-colors">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            考试信息
          </h2>
          <p className="text-sm sm:base lg:text-lg text-zinc-500 dark:text-zinc-400">
            实时查看本教室考试安排
          </p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
          <StatItem icon={<CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />} value={stats.total} label="考试总数" />
          <StatItem icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />} value={stats.upcoming} label="即将开始" />
          <StatItem icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />} value={stats.ongoing} label="进行中" highlight />
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 border ${
        highlight ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
      }`}>
        {icon}
      </div>
      <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums ${
        highlight ? "text-zinc-900 dark:text-white" : "text-zinc-900 dark:text-white"
      }`}>
        {value}
      </div>
      <div className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

// ==================== 大屏考试卡片 ====================

function ExamCard({ exam }: { exam: Exam & { status: string } }) {
  const [countdown, setCountdown] = useState(calculateCountdown(exam));
  const isOngoing = exam.status === "ongoing";
  const isUpcoming = exam.status === "upcoming";
  const isEnding = isOngoing && countdown.hours === 0 && countdown.minutes <= 15 && !countdown.isFinished;

  useEffect(() => {
    const t = setInterval(() => setCountdown(calculateCountdown(exam)), 1000);
    return () => clearInterval(t);
  }, [exam]);

  return (
    <div
      className={`rounded-xl border-2 p-4 sm:p-6 lg:p-8 transition-all bg-white dark:bg-zinc-900 transition-colors ${
        isOngoing
          ? isEnding
            ? "border-red-300 dark:border-red-900 bg-red-50/30 dark:bg-red-950/30 shadow-sm"
            : "border-zinc-900 dark:border-zinc-100 shadow-sm"
          : isUpcoming
          ? "border-zinc-300 dark:border-zinc-700"
          : "border-zinc-200 dark:border-zinc-800 opacity-75"
      }`}
    >
      {/* 状态 + 科目 */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider ${
            isOngoing
              ? isEnding
                ? "bg-red-600 text-white animate-pulse"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
              : isUpcoming
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700"
              : "bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900 animate-pulse" />}
          {isOngoing ? (isEnding ? "即将结束" : "进行中") : isUpcoming ? "即将开始" : "已结束"}
        </span>
      </div>

      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">
        {exam.subject}
      </h3>

      {/* 信息行 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <InfoRow icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5" />}>
          {formatDateTime(exam.examDate)}
        </InfoRow>
        <InfoRow icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}>
          {formatDuration(exam.duration)}
        </InfoRow>
        <InfoRow icon={<MapPin className="w-4 h-4 sm:w-5 sm:h-5" />}>
          {exam.location}
        </InfoRow>
        <InfoRow icon={<User className="w-4 h-4 sm:w-5 sm:h-5" />}>
          {exam.invigilator}
        </InfoRow>
      </div>

      {/* 倒计时 */}
      {!countdown.isFinished && (
        <div className="pt-4 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 sm:mb-3">
            {isOngoing ? "剩余时间" : "距开考"}
          </p>
          <div className="flex items-center gap-1 sm:gap-1.5 font-bold tabular-nums">
            {countdown.days > 0 && (
              <>
                <CountBlock v={countdown.days} l="天" warn={isEnding} />
                <span className="text-base sm:text-xl text-zinc-300 dark:text-zinc-700">:</span>
              </>
            )}
            <CountBlock v={String(countdown.hours).padStart(2, "0")} l="时" warn={isEnding} />
            <span className="text-base sm:text-xl text-zinc-300 dark:text-zinc-700">:</span>
            <CountBlock v={String(countdown.minutes).padStart(2, "0")} l="分" warn={isEnding} />
            <span className="text-base sm:text-xl text-zinc-300 dark:text-zinc-700">:</span>
            <CountBlock v={String(countdown.seconds).padStart(2, "0")} l="秒" warn={isEnding} />
          </div>
        </div>
      )}
    </div>
  );
}

function CountBlock({ v, l, warn }: { v: number | string; l: string; warn?: boolean }) {
  return (
    <div className="text-center min-w-[2.25rem] sm:min-w-[2.5rem]">
      <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${warn ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}>
        {v}
      </div>
      <div className={`text-[10px] ${warn ? "text-red-500/70 dark:text-red-400/60" : "text-zinc-400 dark:text-zinc-500"}`}>{l}</div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-300">
      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

// ==================== 状态 ====================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 sm:py-32 lg:py-40">
      <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 dark:text-zinc-500 animate-spin" />
      <span className="ml-3 text-zinc-500 dark:text-zinc-400 text-base sm:text-lg">加载考试信息...</span>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-32 lg:py-40 px-4">
      <AlertCircle className="w-12 h-12 sm:w-14 sm:h-14 text-red-500 mb-4" />
      <p className="text-base sm:text-lg lg:text-xl text-red-600 dark:text-red-400 mb-3 text-center">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm sm:text-base font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors btn-press"
      >
        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        重试
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-32 lg:py-40 px-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 sm:mb-6 transition-colors">
        <CalendarX className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-zinc-700 dark:text-zinc-200 mb-2">暂无考试安排</h3>
      <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 text-center">本教室当前没有分配的考试</p>
    </div>
  );
}

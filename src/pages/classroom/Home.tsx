/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 顶部栏 */}
      <header className="border-b border-zinc-800 px-6 lg:px-12 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
            <Building className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-xl lg:text-3xl font-bold leading-tight">
              {info?.buildingName || "教学楼"}
            </h1>
            <p className="text-sm lg:text-base text-zinc-400">
              {info?.roomNumber || ""} 教室 · 考试信息
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 监考模式入口 */}
          <button
            onClick={() => navigate("/classroom/invigilation")}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-white hover:text-white transition-colors"
          >
            <Monitor className="w-4 h-4" />
            监考模式
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 时间 */}
          <div className="text-right hidden lg:block">
            <div className="font-serif text-2xl font-bold tabular-nums tracking-wider">
              {timeStr}
            </div>
            <div className="text-xs text-zinc-500">{dateStr}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-3 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
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

            <section className="px-6 lg:px-12 py-10">
              {sorted.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
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
      <footer className="border-t border-zinc-800 px-6 lg:px-12 py-4 flex items-center justify-between text-sm text-zinc-600 shrink-0">
        <span>KeKe ExamHub · 教室端</span>
        <span>
          共 {stats.total} 场 · 进行中 {stats.ongoing} · 即将 {stats.upcoming}
        </span>
      </footer>
    </div>
  );
}

// ==================== Hero 横幅 ====================

function HeroBanner({ stats }: { stats: ExamStats }) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-6 lg:px-12 py-10 lg:py-14">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-2">
            考试信息
          </h2>
          <p className="text-base lg:text-lg text-zinc-400">
            实时查看本教室考试安排
          </p>
        </div>
        <div className="flex items-center gap-6 lg:gap-10">
          <StatItem icon={<CalendarCheck className="w-6 h-6" />} value={stats.total} label="考试总数" />
          <StatItem icon={<Clock className="w-6 h-6" />} value={stats.upcoming} label="即将开始" />
          <StatItem icon={<TrendingUp className="w-6 h-6" />} value={stats.ongoing} label="进行中" highlight />
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
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
        highlight ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-300 border-zinc-700"
      }`}>
        {icon}
      </div>
      <div className={`text-3xl lg:text-4xl font-bold font-serif tabular-nums ${
        highlight ? "text-white" : "text-white"
      }`}>
        {value}
      </div>
      <div className="text-xs lg:text-sm text-zinc-500 mt-1">{label}</div>
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
      className={`rounded-2xl border-2 p-6 lg:p-8 transition-all ${
        isOngoing
          ? isEnding
            ? "border-red-500/50 bg-red-950/10 shadow-lg shadow-red-500/5"
            : "border-white/30 bg-zinc-950/80"
          : isUpcoming
          ? "border-zinc-700 bg-zinc-950/50"
          : "border-zinc-800 bg-transparent opacity-50"
      }`}
    >
      {/* 状态 + 科目 */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider ${
            isOngoing
              ? isEnding
                ? "bg-red-600 text-white animate-pulse"
                : "bg-white text-black"
              : isUpcoming
              ? "bg-zinc-800 text-zinc-200"
              : "bg-transparent text-zinc-600 border border-zinc-800"
          }`}
        >
          {isOngoing && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          {isOngoing ? (isEnding ? "即将结束" : "进行中") : isUpcoming ? "即将开始" : "已结束"}
        </span>
      </div>

      <h3 className="font-serif text-2xl lg:text-3xl font-bold text-white mb-6">
        {exam.subject}
      </h3>

      {/* 信息行 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoRow icon={<Calendar className="w-5 h-5" />}>
          {formatDateTime(exam.examDate)}
        </InfoRow>
        <InfoRow icon={<Clock className="w-5 h-5" />}>
          {formatDuration(exam.duration)}
        </InfoRow>
        <InfoRow icon={<MapPin className="w-5 h-5" />}>
          {exam.location}
        </InfoRow>
        <InfoRow icon={<User className="w-5 h-5" />}>
          {exam.invigilator}
        </InfoRow>
      </div>

      {/* 倒计时 */}
      {!countdown.isFinished && (
        <div className="pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            {isOngoing ? "剩余时间" : "距开考"}
          </p>
          <div className="flex items-center gap-1.5 font-serif tabular-nums">
            {countdown.days > 0 && (
              <>
                <CountBlock v={countdown.days} l="天" />
                <span className="text-xl text-zinc-700">:</span>
              </>
            )}
            <CountBlock v={String(countdown.hours).padStart(2, "0")} l="时" warn={isEnding} />
            <span className="text-xl text-zinc-700">:</span>
            <CountBlock v={String(countdown.minutes).padStart(2, "0")} l="分" warn={isEnding} />
            <span className="text-xl text-zinc-700">:</span>
            <CountBlock v={String(countdown.seconds).padStart(2, "0")} l="秒" warn={isEnding} />
          </div>
        </div>
      )}
    </div>
  );
}

function CountBlock({ v, l, warn }: { v: number | string; l: string; warn?: boolean }) {
  return (
    <div className="text-center min-w-[2.5rem]">
      <div className={`text-2xl lg:text-3xl font-bold ${warn ? "text-red-400" : "text-white"}`}>
        {v}
      </div>
      <div className={`text-[10px] ${warn ? "text-red-400/60" : "text-zinc-600"}`}>{l}</div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm lg:text-base text-zinc-300">
      <span className="text-zinc-500 shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

// ==================== 状态 ====================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
      <span className="ml-3 text-zinc-400 text-lg">加载考试信息...</span>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-40">
      <AlertCircle className="w-14 h-14 text-red-500 mb-4" />
      <p className="text-xl text-red-400 mb-3">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl text-base font-medium hover:bg-zinc-200 transition-colors"
      >
        <RotateCcw className="w-5 h-5" />
        重试
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="w-24 h-24 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6">
        <CalendarX className="w-12 h-12 text-zinc-600" />
      </div>
      <h3 className="text-2xl font-serif font-bold text-zinc-300 mb-2">暂无考试安排</h3>
      <p className="text-lg text-zinc-500">本教室当前没有分配的考试</p>
    </div>
  );
}

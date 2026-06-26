import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  Maximize,
  Minimize,
} from "@/components/MathIcon";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { classroomApi } from "@/utils/api";
import {
  calculateExamStatus,
  calculateCountdown,
  formatDateTime,
  formatDuration,
} from "@/utils/date";
import type { Exam, Countdown } from "@/types";

export default function Invigilation() {
  const navigate = useNavigate();
  const { info } = useClassroomAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // 每秒刷新时间
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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

  // 附加状态
  const examsWithStatus = useMemo(
    () =>
      exams
        .map((e) => ({ ...e, status: calculateExamStatus(e) }))
        .filter((e) => e.status === "ongoing" || e.status === "upcoming")
        .sort((a, b) => {
          const o = { ongoing: 0, upcoming: 1 } as const;
          if (o[a.status] !== o[b.status]) return o[a.status] - o[b.status];
          return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
        }),
    [exams]
  );

  // 自动选中：优先进行中，否则第一个
  useEffect(() => {
    if (examsWithStatus.length === 0) return;
    const autoId = examsWithStatus[0].id;
    setSelectedId((prev) => (examsWithStatus.some((e) => e.id === prev) ? prev : autoId));
  }, [examsWithStatus]);

  const selected = examsWithStatus.find((e) => e.id === selectedId);

  // 全屏
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white flex flex-col">
      {/* 顶部栏 */}
      <header className="border-b border-zinc-800 px-6 lg:px-12 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/classroom")}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-lg lg:text-2xl font-bold">
              {info?.buildingName || ""} · {info?.roomNumber || ""}
            </h1>
            <p className="text-xs text-zinc-500">监考模式</p>
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          title={isFullscreen ? "退出全屏" : "全屏显示"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </header>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchExams} />
        ) : examsWithStatus.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="px-6 lg:px-12 py-8 max-w-7xl mx-auto space-y-10">
            {/* 考试选择器 */}
            <div className="flex items-center gap-3 flex-wrap">
              {examsWithStatus.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedId(exam.id)}
                  className={`px-5 py-3 rounded-xl text-base font-medium transition-all border-2 ${
                    exam.id === selectedId
                      ? "bg-white text-black border-white"
                      : exam.status === "ongoing"
                      ? "bg-zinc-950 text-zinc-200 border-zinc-700 hover:border-zinc-500"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {exam.status === "ongoing" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2" />
                  )}
                  {exam.subject}
                </button>
              ))}
            </div>

            {/* 考试详情 */}
            {selected && <ExamDetail exam={selected} now={now} />}
          </div>
        )}
      </main>

      {/* 底部 */}
      <footer className="border-t border-zinc-800 px-6 lg:px-12 py-3 flex items-center justify-between text-sm text-zinc-600 shrink-0">
        <span>KeKe ExamHub · 监考模式</span>
        <span>
          {now.toLocaleTimeString("zh-CN", { hour12: false })}
        </span>
      </footer>
    </div>
  );
}

// ==================== 考试详情 ====================

function ExamDetail({ exam, now }: { exam: Exam & { status: string }; now: Date }) {
  const [countdown, setCountdown] = useState<Countdown>(calculateCountdown(exam));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(calculateCountdown(exam));
      const start = new Date(exam.examDate).getTime();
      const end = start + exam.duration * 60 * 1000;
      const n = Date.now();
      if (n >= start) {
        setElapsed(Math.floor((Math.min(n, end) - start) / 60000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [exam]);

  const isOngoing = exam.status === "ongoing";
  const isWarning = isOngoing && countdown.hours === 0 && countdown.minutes <= 5 && !countdown.isFinished;
  const progressPercent = exam.duration > 0
    ? Math.min(100, Math.max(0, (elapsed / exam.duration) * 100))
    : 0;

  return (
    <div className="space-y-10">
      {/* 核心倒计时区 */}
      <div className="rounded-3xl border-2 border-white/20 bg-zinc-950 p-10 lg:p-16">
        {/* 状态标签 */}
        <div className="text-center mb-8">
          <span
            className={`inline-block px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider ${
              isOngoing
                ? isWarning
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-white text-black"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {isOngoing ? (isWarning ? "⚠ 最后五分钟" : "考试进行中") : "待开考"}
          </span>
        </div>

        {/* 科目名称 */}
        <h2 className="font-serif text-4xl lg:text-6xl font-bold text-center mb-10">
          {exam.subject}
        </h2>

        {/* 进度条 */}
        {isOngoing && (
          <div className="max-w-3xl mx-auto mb-10">
            <div className="flex justify-between text-sm text-zinc-400 mb-3">
              <span>已过 {elapsed} 分钟</span>
              <span>共 {exam.duration} 分钟</span>
            </div>
            <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isWarning ? "bg-red-500" : "bg-white"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 倒计时 */}
        <div className="text-center">
          <p className="text-sm text-zinc-500 uppercase tracking-wider mb-4">
            {isOngoing ? "剩余时间" : countdown.isFinished ? "考试已结束" : "距离开考"}
          </p>
          <div className="inline-flex items-center gap-3 font-serif tabular-nums">
            {countdown.days > 0 && (
              <>
                <BigCount v={countdown.days} l="天" />
                <span className="text-5xl lg:text-6xl text-zinc-700">:</span>
              </>
            )}
            <BigCount v={String(countdown.hours).padStart(2, "0")} l="时" warn={isWarning} />
            <span className="text-5xl lg:text-6xl text-zinc-700">:</span>
            <BigCount v={String(countdown.minutes).padStart(2, "0")} l="分" warn={isWarning} />
            <span className="text-5xl lg:text-6xl text-zinc-700">:</span>
            <BigCount v={String(countdown.seconds).padStart(2, "0")} l="秒" warn={isWarning} />
          </div>
        </div>
      </div>

      {/* 信息网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoTile icon={<Calendar className="w-5 h-5" />} label="考试时间">
          {formatDateTime(exam.examDate)}
        </InfoTile>
        <InfoTile icon={<Clock className="w-5 h-5" />} label="考试时长">
          {formatDuration(exam.duration)}
        </InfoTile>
        <InfoTile icon={<User className="w-5 h-5" />} label="监考老师">
          {exam.invigilator}
        </InfoTile>
        <InfoTile icon={<MapPin className="w-5 h-5" />} label="考试地点">
          {exam.location}
        </InfoTile>
      </div>

      {/* 注意事项 */}
      {exam.notes && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 lg:p-8">
          <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-4">
            考试注意事项
          </h3>
          <p className="text-base lg:text-xl text-zinc-200 whitespace-pre-wrap leading-relaxed">
            {exam.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function BigCount({ v, l, warn }: { v: number | string; l: string; warn?: boolean }) {
  return (
    <div className="text-center min-w-[4rem] lg:min-w-[5rem]">
      <div className={`text-6xl lg:text-8xl font-bold ${warn ? "text-red-400" : "text-white"}`}>
        {v}
      </div>
      <div className={`text-sm mt-2 ${warn ? "text-red-400/60" : "text-zinc-500"}`}>{l}</div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        {icon}
        {label}
      </div>
      <div className="text-base lg:text-lg font-medium text-zinc-200">
        {children}
      </div>
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
      <p className="text-xl text-zinc-500">当前没有进行中或即将开始的考试</p>
    </div>
  );
}

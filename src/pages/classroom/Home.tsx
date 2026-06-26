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
  Eye,
  TrendingUp,
  RotateCcw,
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
import Hero from "@/components/Hero";
import SearchFilterBar from "@/components/SearchFilterBar";
import PublicExamCard from "@/components/ExamCard";
import type { Exam, ExamStats, ExamStatus } from "@/types";

type DisplayMode = "display" | "invigilation";

export default function ClassroomHome() {
  const navigate = useNavigate();
  const { info, logout } = useClassroomAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mode, setMode] = useState<DisplayMode>("display");

  // 实时更新当前时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取考试数据
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
    const timer = setInterval(fetchExams, 30 * 1000);
    return () => clearInterval(timer);
  }, [fetchExams]);

  const handleLogout = () => {
    logout();
    navigate("/classroom/login");
  };

  // 分类考试
  const examsWithStatus = exams.map((e) => ({
    ...e,
    status: calculateExamStatus(e),
  }));
  const ongoing = examsWithStatus.filter((e) => e.status === "ongoing");
  const upcoming = examsWithStatus.filter((e) => e.status === "upcoming");
  const ended = examsWithStatus.filter((e) => e.status === "ended");

  // 焦点考试（进行中优先，其次即将开始）
  const featuredExam = ongoing[0] || upcoming[0];

  // 格式化时间
  const timeStr = currentTime.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = currentTime.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 顶部栏 */}
      <header className="border-b border-zinc-800 px-6 lg:px-10 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-white flex items-center justify-center">
            <Building className="w-5 h-5 lg:w-6 lg:h-6 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-lg lg:text-2xl font-bold leading-tight">
              {info?.buildingName || "教学楼"}
            </h1>
            <p className="text-xs lg:text-sm text-zinc-400">
              {info?.roomNumber || ""} 教室
            </p>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="hidden sm:flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setMode("display")}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              mode === "display"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Eye className="w-4 h-4 inline mr-1.5" />
            显示模式
          </button>
          <button
            onClick={() => setMode("invigilation")}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              mode === "invigilation"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" />
            监考模式
          </button>
        </div>

        {/* 时间 */}
        <div className="text-center hidden md:block">
          <div className="font-serif text-xl lg:text-3xl font-bold tabular-nums tracking-wider">
            {timeStr}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{dateStr}</div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">退出</span>
        </button>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 px-6 lg:px-10 py-6 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchExams} />
        ) : exams.length === 0 ? (
          <EmptyState />
        ) : mode === "display" ? (
          <DisplayMode
            featuredExam={featuredExam}
            ongoing={ongoing}
            upcoming={upcoming}
            ended={ended}
            currentTime={currentTime}
          />
        ) : (
          <InvigilationMode
            featuredExam={featuredExam}
            examinations={examsWithStatus}
            currentTime={currentTime}
          />
        )}
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t border-zinc-800 px-6 lg:px-10 py-3 flex items-center justify-between text-xs text-zinc-600 shrink-0">
        <span>KeKe ExamHub · 教室端</span>
        <span>
          共 {exams.length} 场 · 进行中 {ongoing.length} · 即将 {upcoming.length} · 已结束 {ended.length}
        </span>
      </footer>
    </div>
  );
}

// ==================== 显示模式 ====================

function DisplayMode({
  featuredExam,
  ongoing,
  upcoming,
  ended,
  currentTime,
}: {
  featuredExam: (Exam & { status: string }) | undefined;
  ongoing: (Exam & { status: string })[];
  upcoming: (Exam & { status: string })[];
  ended: (Exam & { status: string })[];
  currentTime: Date;
}) {
  // 跳过 featured 中已展示的那场
  const featuredId = featuredExam?.id;
  const remainingUpcoming = upcoming.filter((e) => e.id !== featuredId);
  const remainingOngoing = ongoing.filter((e) => e.id !== featuredId);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 焦点考试 */}
      {featuredExam && (
        <FeaturedExamCard exam={featuredExam} currentTime={currentTime} />
      )}

      {/* 其他进行中的考试 */}
      {remainingOngoing.length > 0 && (
        <ExamSection title="进行中" count={remainingOngoing.length} highlight>
          {remainingOngoing.map((e) => (
            <ExamCard key={e.id} exam={e} />
          ))}
        </ExamSection>
      )}

      {/* 即将开始 */}
      {remainingUpcoming.length > 0 && (
        <ExamSection title="即将开始" count={remainingUpcoming.length}>
          {remainingUpcoming.map((e) => (
            <ExamCard key={e.id} exam={e} />
          ))}
        </ExamSection>
      )}

      {/* 已结束 */}
      {ended.length > 0 && (
        <ExamSection title="已结束" count={ended.length} dimmed>
          {ended.map((e) => (
            <ExamCard key={e.id} exam={e} dimmed />
          ))}
        </ExamSection>
      )}
    </div>
  );
}

// ==================== 监考模式（与公众首页相同布局） ====================

function InvigilationMode({
  examinations,
}: {
  featuredExam: (Exam & { status: string }) | undefined;
  examinations: (Exam & { status: string })[];
  currentTime: Date;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "all">("all");

  // 计算统计数据
  const stats: ExamStats = useMemo(() => calculateStats(examinations), [examinations]);

  // 搜索筛选
  const filteredExams = useMemo(() => {
    return examinations
      .filter((exam) => {
        if (statusFilter !== "all" && exam.status !== statusFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            exam.subject.toLowerCase().includes(q) ||
            exam.location.toLowerCase().includes(q) ||
            exam.invigilator.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const order = { upcoming: 0, ongoing: 1, ended: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
      });
  }, [examinations, searchQuery, statusFilter]);

  return (
    <div className="animate-fade-in -mx-6 lg:-mx-10 -my-6">
      {/* Hero 统计区 */}
      <Hero stats={stats} />

      {/* 考试卡片区 */}
      <section className="px-6 lg:px-10 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
              本教室考试安排
            </h2>
            <p className="text-sm text-zinc-400">
              共 {filteredExams.length} 场考试
            </p>
          </div>
        </div>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div key={exam.id}>
                <PublicExamCard exam={exam} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
              <CalendarX className="w-10 h-10 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-400 mb-2">
              无匹配考试
            </h3>
            <p className="text-sm text-zinc-600">试试调整搜索条件或筛选器</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ==================== 显示模式 - 焦点考试卡片 ====================

function FeaturedExamCard({
  exam,
  currentTime,
}: {
  exam: Exam & { status: string };
  currentTime: Date;
}) {
  const [countdown, setCountdown] = useState(calculateCountdown(exam));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(exam));
      const start = new Date(exam.examDate).getTime();
      const end = start + exam.duration * 60 * 1000;
      const now = Date.now();
      if (now >= start) {
        setElapsed(Math.floor((Math.min(now, end) - start) / 60000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [exam]);

  const isOngoing = exam.status === "ongoing";
  const isEnding = isOngoing && countdown.hours === 0 && countdown.minutes <= 15 && !countdown.isFinished;

  return (
    <div
      className={`rounded-xl border-2 p-6 lg:p-10 transition-shadow ${
        isOngoing
          ? isEnding
            ? "border-red-500/50 bg-red-950/20 shadow-lg shadow-red-500/10"
            : "border-white bg-zinc-900 shadow-lg shadow-white/5"
          : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex-1">
          {/* 状态标签 + 进度条 */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-wider ${
                isOngoing
                  ? isEnding
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-white text-black"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {isOngoing ? (isEnding ? "即将结束" : "正在进行") : "即将开始"}
            </span>

            {isOngoing && (
              <div className="flex-1 max-w-xs hidden lg:block">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isEnding ? "bg-red-500" : "bg-white"
                    }`}
                    style={{
                      width: `${Math.min(100, (elapsed / exam.duration) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <h2 className="font-serif text-3xl lg:text-5xl font-bold mb-4">
            {exam.subject}
          </h2>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base lg:text-lg text-zinc-300">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {formatDateTime(exam.examDate)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {formatDuration(exam.duration)}
            </span>
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {exam.invigilator}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {exam.location}
            </span>
          </div>
        </div>

        {/* 倒计时 */}
        <div className="text-center shrink-0">
          <p className="text-sm text-zinc-500 mb-3 uppercase tracking-wider">
            {isOngoing ? "剩余时间" : "距开考"}
          </p>
          <div className="flex items-center gap-2 font-serif tabular-nums">
            {countdown.days > 0 && (
              <>
                <MiniCount value={countdown.days} label="天" />
                <span className="text-2xl text-zinc-700">:</span>
              </>
            )}
            <MiniCount
              value={String(countdown.hours).padStart(2, "0")}
              label="时"
              warn={isEnding}
            />
            <span className="text-2xl text-zinc-700">:</span>
            <MiniCount
              value={String(countdown.minutes).padStart(2, "0")}
              label="分"
              warn={isEnding}
            />
            <span className="text-2xl text-zinc-700">:</span>
            <MiniCount
              value={String(countdown.seconds).padStart(2, "0")}
              label="秒"
              warn={isEnding}
            />
          </div>
        </div>
      </div>

      {exam.notes && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-2">注意事项</p>
          <p className="text-base text-zinc-300 whitespace-pre-wrap">
            {exam.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function MiniCount({
  value,
  label,
  warn = false,
}: {
  value: number | string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-4xl lg:text-5xl font-bold tabular-nums ${
          warn ? "text-red-400" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

// ==================== 考试列表卡片（显示模式） ====================

function ExamSection({
  title,
  count,
  children,
  dimmed = false,
  highlight = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  dimmed?: boolean;
  highlight?: boolean;
}) {
  return (
    <section>
      <h2
        className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
          highlight
            ? "text-white"
            : dimmed
            ? "text-zinc-600"
            : "text-zinc-400"
        }`}
      >
        {title} ({count})
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function ExamCard({
  exam,
  dimmed = false,
}: {
  exam: Exam & { status: string };
  dimmed?: boolean;
}) {
  const isOngoing = exam.status === "ongoing";
  return (
    <div
      className={`rounded-lg border p-5 transition-all hover:border-zinc-600 ${
        dimmed
          ? "border-zinc-900 bg-transparent opacity-50"
          : isOngoing
          ? "border-white/20 bg-zinc-950"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-lg font-bold flex items-center gap-2">
          {isOngoing && (
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {exam.subject}
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded uppercase tracking-wider ${
            exam.status === "ongoing"
              ? "bg-white/10 text-white"
              : exam.status === "upcoming"
              ? "bg-zinc-800 text-zinc-300"
              : "text-zinc-600"
          }`}
        >
          {exam.status === "ongoing"
            ? "进行中"
            : exam.status === "upcoming"
            ? "即将开始"
            : "已结束"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDateTime(exam.examDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {formatDuration(exam.duration)}
        </span>
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {exam.invigilator}
        </span>
      </div>
    </div>
  );
}

// ==================== 状态页 ====================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
      <span className="ml-3 text-zinc-400 text-lg">加载考试信息...</span>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <p className="text-xl text-red-400 mb-2">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
        <CalendarX className="w-12 h-12 text-zinc-600" />
      </div>
      <h2 className="text-3xl font-serif font-bold text-zinc-300 mb-2">
        暂无考试安排
      </h2>
      <p className="text-lg text-zinc-500">本教室当前没有分配的考试</p>
    </div>
  );
}

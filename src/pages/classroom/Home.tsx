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
  Search,
  X,
  CalendarCheck,
  TrendingUp,
} from "@/components/MathIcon";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { classroomApi } from "@/utils/api";
import {
  calculateExamStatus,
  calculateStats,
  formatDateTime,
  formatDuration,
} from "@/utils/date";
import type { Exam, ExamStats, ExamStatus } from "@/types";

export default function ClassroomHome() {
  const navigate = useNavigate();
  const { info, logout } = useClassroomAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "all">("all");

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
    const timer = setInterval(fetchExams, 30 * 1000);
    return () => clearInterval(timer);
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

  // 附加状态 + 统计
  const examsWithStatus = useMemo(
    () => exams.map((e) => ({ ...e, status: calculateExamStatus(e) })),
    [exams]
  );
  const stats: ExamStats = useMemo(() => calculateStats(exams), [exams]);

  // 搜索筛选
  const filteredExams = useMemo(() => {
    return examsWithStatus
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
  }, [examsWithStatus, searchQuery, statusFilter]);

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
              {info?.roomNumber || ""} 教室 · 监考模式
            </p>
          </div>
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
      <main className="flex-1 overflow-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchExams} />
        ) : (
          <>
            {/* 统计横幅 */}
            <StatsBanner stats={stats} />

            {/* 搜索筛选 + 卡片网格 */}
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

              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
              />

              {filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              ) : exams.length > 0 ? (
                <NoMatchState />
              ) : (
                <EmptyState />
              )}
            </section>
          </>
        )}
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t border-zinc-800 px-6 lg:px-10 py-3 flex items-center justify-between text-xs text-zinc-600 shrink-0">
        <span>KeKe ExamHub · 教室端</span>
        <span>
          共 {stats.total} 场 · 进行中 {stats.ongoing} · 即将 {stats.upcoming}
        </span>
      </footer>
    </div>
  );
}

// ==================== 统计横幅 ====================

function StatsBanner({ stats }: { stats: ExamStats }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-zinc-800" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-zinc-800" />
      </div>
      <div className="relative px-6 lg:px-10 py-12 lg:py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black border border-zinc-700 mb-6">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">数字化考试信息管理平台</span>
        </div>
        <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-3">
          监考模式
        </h2>
        <p className="text-sm text-zinc-500 mb-10 max-w-xl mx-auto">
          实时掌握本教室考试动态，清晰了解每场考试的时间与安排
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <StatCard icon={<CalendarCheck className="w-5 h-5" />} value={stats.total} label="考试总数" />
          <StatCard icon={<Clock className="w-5 h-5" />} value={stats.upcoming} label="即将开始" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} value={stats.ongoing} label="进行中" />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-black rounded-lg p-4 border border-zinc-800">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-zinc-900 text-white border border-zinc-700">
        {icon}
      </div>
      <div className="text-2xl font-bold font-serif text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

// ==================== 筛选栏 ====================

const statusOptions: { value: ExamStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "upcoming", label: "即将开始" },
  { value: "ongoing", label: "进行中" },
  { value: "ended", label: "已结束" },
];

function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: ExamStatus | "all";
  onStatusChange: (s: ExamStatus | "all") => void;
}) {
  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索科目、地点、监考老师..."
            className="w-full pl-10 pr-10 py-2.5 bg-black border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                statusFilter === opt.value
                  ? "bg-white text-black border-white"
                  : "bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 考试卡片 ====================

function ExamCard({ exam }: { exam: Exam & { status: string } }) {
  const isOngoing = exam.status === "ongoing";
  const isUpcoming = exam.status === "upcoming";

  return (
    <div
      className={`group block bg-zinc-950 rounded-lg border p-6 transition-all duration-300 hover:border-zinc-600 ${
        isOngoing
          ? "border-white/30"
          : isUpcoming
          ? "border-zinc-700"
          : "border-zinc-800 opacity-60"
      }`}
    >
      {/* 状态标签 */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
            isOngoing
              ? "bg-white text-black"
              : isUpcoming
              ? "bg-zinc-800 text-zinc-200"
              : "bg-transparent text-zinc-600 border border-zinc-800"
          }`}
        >
          {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
          {isOngoing ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
        </span>
      </div>

      {/* 科目名称 */}
      <h3 className="font-serif text-xl font-bold text-white mb-4">
        {exam.subject}
      </h3>

      {/* 考试信息 */}
      <div className="space-y-2.5 text-sm">
        <Row icon={<Calendar className="w-4 h-4" />}>
          {formatDateTime(exam.examDate)}
        </Row>
        <Row icon={<Clock className="w-4 h-4" />}>
          {formatDuration(exam.duration)}
        </Row>
        <Row icon={<MapPin className="w-4 h-4" />}>{exam.location}</Row>
        <Row icon={<User className="w-4 h-4" />}>{exam.invigilator}</Row>
      </div>

      {exam.notes && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-2">
            {exam.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-zinc-400">
      <span className="text-zinc-600 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ==================== 状态页 ====================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      <span className="ml-3 text-zinc-400">加载考试信息...</span>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-lg text-red-400 mb-2">{error}</p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4">
        <CalendarX className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-400 mb-2">暂无考试安排</h3>
      <p className="text-sm text-zinc-600">本教室当前没有分配的考试</p>
    </div>
  );
}

function NoMatchState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-400 mb-2">无匹配考试</h3>
      <p className="text-sm text-zinc-600">试试调整搜索条件或筛选器</p>
    </div>
  );
}

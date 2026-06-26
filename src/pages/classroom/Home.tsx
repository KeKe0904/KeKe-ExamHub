import { useState, useEffect, useCallback } from "react";
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
} from "@/components/MathIcon";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { classroomApi } from "@/utils/api";
import { calculateExamStatus, calculateCountdown, formatDateTime, formatDuration } from "@/utils/date";
import type { Exam } from "@/types";

export default function ClassroomHome() {
  const navigate = useNavigate();
  const { info, logout } = useClassroomAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

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
    // 每 30 秒自动刷新
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

  // 最近的一场考试(进行中或即将开始)
  const featuredExam = ongoing[0] || upcoming[0];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 顶部栏 */}
      <header className="border-b border-zinc-800 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
            <Building className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">
              {info?.buildingName || "教学楼"}
            </h1>
            <p className="text-sm text-zinc-400">
              {info?.roomNumber || ""} 教室
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="font-serif text-3xl font-bold tabular-nums tracking-wider">
            {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            {currentTime.toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          退出
        </button>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 px-8 py-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
            <span className="ml-3 text-zinc-400 text-lg">加载考试信息...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-xl text-red-400 mb-2">{error}</p>
            <button
              onClick={fetchExams}
              className="mt-4 px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              重试
            </button>
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
              <CalendarX className="w-12 h-12 text-zinc-600" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-zinc-300 mb-2">
              暂无考试安排
            </h2>
            <p className="text-lg text-zinc-500">
              本教室当前没有分配的考试
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 焦点考试(进行中或即将开始) */}
            {featuredExam && (
              <FeaturedExamCard exam={featuredExam} currentTime={currentTime} />
            )}

            {/* 即将开始的考试列表 */}
            {upcoming.length > 1 && (
              <section>
                <h2 className="text-lg font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                  即将开始 ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {upcoming.slice(featuredExam ? 1 : 0).map((exam) => (
                    <ExamRow key={exam.id} exam={exam} />
                  ))}
                </div>
              </section>
            )}

            {/* 已结束的考试 */}
            {ended.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-zinc-600 mb-3 uppercase tracking-wider">
                  已结束 ({ended.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {ended.map((exam) => (
                    <ExamRow key={exam.id} exam={exam} dimmed />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t border-zinc-800 px-8 py-3 flex items-center justify-between text-xs text-zinc-600 shrink-0">
        <span>KeKe ExamHub · 教室端</span>
        <span>
          共 {exams.length} 场考试 · 进行中 {ongoing.length} · 即将开始{" "}
          {upcoming.length} · 已结束 {ended.length}
        </span>
      </footer>
    </div>
  );
}

// 焦点考试卡片(进行中或最近一场即将开始)
function FeaturedExamCard({
  exam,
  currentTime,
}: {
  exam: Exam & { status: string };
  currentTime: Date;
}) {
  const [countdown, setCountdown] = useState(calculateCountdown(exam));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(exam));
    }, 1000);
    return () => clearInterval(timer);
  }, [exam]);

  const isOngoing = exam.status === "ongoing";

  return (
    <div
      className={`rounded-xl border-2 p-8 ${
        isOngoing
          ? "border-white bg-zinc-900"
          : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-wider ${
                isOngoing
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {isOngoing ? "正在进行" : "即将开始"}
            </span>
          </div>
          <h2 className="font-serif text-5xl font-bold mb-4">
            {exam.subject}
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-lg text-zinc-300">
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
        <div className="text-center ml-8 shrink-0">
          <p className="text-sm text-zinc-500 mb-2 uppercase tracking-wider">
            {isOngoing ? "剩余时间" : "距开考"}
          </p>
          <div className="flex items-center gap-2 font-serif tabular-nums">
            {countdown.days > 0 && (
              <>
                <div className="text-center">
                  <div className="text-5xl font-bold">{countdown.days}</div>
                  <div className="text-xs text-zinc-500 mt-1">天</div>
                </div>
                <span className="text-3xl text-zinc-700">:</span>
              </>
            )}
            <div className="text-center">
              <div className="text-5xl font-bold">
                {String(countdown.hours).padStart(2, "0")}
              </div>
              <div className="text-xs text-zinc-500 mt-1">时</div>
            </div>
            <span className="text-3xl text-zinc-700">:</span>
            <div className="text-center">
              <div className="text-5xl font-bold">
                {String(countdown.minutes).padStart(2, "0")}
              </div>
              <div className="text-xs text-zinc-500 mt-1">分</div>
            </div>
            <span className="text-3xl text-zinc-700">:</span>
            <div className="text-center">
              <div className="text-5xl font-bold">
                {String(countdown.seconds).padStart(2, "0")}
              </div>
              <div className="text-xs text-zinc-500 mt-1">秒</div>
            </div>
          </div>
        </div>
      </div>

      {exam.notes && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-1">注意事项</p>
          <p className="text-base text-zinc-300 whitespace-pre-wrap">
            {exam.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// 考试行(列表项)
function ExamRow({
  exam,
  dimmed = false,
}: {
  exam: Exam & { status: string };
  dimmed?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-950 p-5 ${
        dimmed ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-xl font-bold">{exam.subject}</h3>
        <span className="text-xs text-zinc-500 uppercase">
          {exam.status === "ongoing"
            ? "进行中"
            : exam.status === "upcoming"
            ? "即将开始"
            : "已结束"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {formatDateTime(exam.examDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatDuration(exam.duration)}
        </span>
        <span className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          {exam.invigilator}
        </span>
      </div>
    </div>
  );
}

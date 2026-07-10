/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  CalendarX,
} from "@/components/MathIcon";
import { teacherAuthApi } from "@/utils/api";
import { formatDateTime, formatDuration } from "@/utils/date";
import TeacherLayout from "@/components/Layout/TeacherLayout";
import type { TeacherExam } from "@/types";

type TabType = "upcoming" | "ongoing" | "ended" | "all";

export default function TeacherExams() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherAuthApi.getExams({ status: "all" });
      setExams(res.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取考试列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const stats = useMemo(() => {
    return {
      upcoming: exams.filter((e) => e.status === "upcoming").length,
      ongoing: exams.filter((e) => e.status === "ongoing").length,
      ended: exams.filter((e) => e.status === "ended").length,
      total: exams.length,
    };
  }, [exams]);

  const filteredExams = useMemo(() => {
    if (activeTab === "all") return exams;
    return exams.filter((e) => e.status === activeTab);
  }, [exams, activeTab]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "upcoming", label: "即将开始", count: stats.upcoming },
    { key: "ongoing", label: "进行中", count: stats.ongoing },
    { key: "ended", label: "已结束", count: stats.ended },
    { key: "all", label: "全部", count: stats.total },
  ];

  return (
    <TeacherLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white font-serif flex items-center gap-2">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-900 dark:text-white" />
            监考安排
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            查看您负责监考的考试安排
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 mb-6 shadow-sm transition-colors">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[100px] px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key
                      ? "bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-14 h-14 text-zinc-700 dark:text-zinc-300 mb-4" />
            <p className="text-lg text-zinc-900 dark:text-white mb-3">{error}</p>
            <button
              onClick={fetchExams}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重试
            </button>
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}
      </div>
    </TeacherLayout>
  );
}

function ExamCard({ exam }: { exam: TeacherExam }) {
  const isOngoing = exam.status === "ongoing";
  const isUpcoming = exam.status === "upcoming";
  const isEnded = exam.status === "ended";

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden transition-all hover:shadow-md ${
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
          {isOngoing && (
            <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900 animate-pulse" />
          )}
          {isOngoing ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
        </span>
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
          <InfoRow icon={<MapPin className="w-4 h-4" />}>
            {exam.location}
          </InfoRow>
        </div>

        {exam.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{exam.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const labels: Record<TabType, { title: string; desc: string }> = {
    upcoming: { title: "暂无即将开始的考试", desc: "请耐心等待考试安排" },
    ongoing: { title: "暂无进行中的考试", desc: "当前没有正在进行的考试" },
    ended: { title: "暂无已结束的考试", desc: "已结束的考试会在这里显示" },
    all: { title: "暂无监考安排", desc: "您目前没有监考任务" },
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
        <CalendarX className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
        {labels[tab].title}
      </h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{labels[tab].desc}</p>
    </div>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarX, Loader2, Globe, X, ChevronDown, ChevronUp } from "@/components/MathIcon";
import UserLayout from "@/components/Layout/UserLayout";
import Hero from "@/components/Hero";
import SearchFilterBar from "@/components/SearchFilterBar";
import ExamCard from "@/components/ExamCard";
import { useExamStore } from "@/store/examStore";
import { calculateStats, calculateExamStatus } from "@/utils/date";
import type { ExamStats, ExamStatus } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

interface Announcement {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function Home() {
  const { exams, loading, fetchExams } = useExamStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "all">("all");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);

  // 初始加载考试数据
  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // 获取公告
  useEffect(() => {
    fetch(`${API_BASE}/announcements`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAnnouncements(data.data);
      })
      .catch(() => {});
  }, []);

  const visibleAnnouncements = announcements.filter((a) => !dismissed.includes(a.id));

  // 计算统计数据
  const stats: ExamStats = useMemo(() => calculateStats(exams), [exams]);

  // 前端筛选(用于即时反馈,实际数据已从后端获取)
  const filteredExams = useMemo(() => {
    return exams
      .map((exam) => ({ ...exam, status: calculateExamStatus(exam) }))
      .filter((exam) => {
        if (statusFilter !== "all" && exam.status !== statusFilter) {
          return false;
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            exam.subject.toLowerCase().includes(query) ||
            exam.location.toLowerCase().includes(query) ||
            exam.invigilator.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const statusOrder = { upcoming: 0, ongoing: 1, ended: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
      });
  }, [exams, searchQuery, statusFilter]);

  return (
    <UserLayout>
      <Hero stats={stats} />

      {/* 公告横幅 */}
      {visibleAnnouncements.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-6 relative z-10">
          <div className="space-y-2">
            {visibleAnnouncements.map((a) => {
              const isExpanded = expanded.includes(a.id);
              const isLong = a.content.length > 80;
              return (
                <div
                  key={a.id}
                  className={`rounded-lg border p-4 flex items-start gap-3 ${
                    a.isPinned
                      ? "border-black dark:border-white bg-black dark:bg-black text-white dark:text-white"
                      : "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black text-black dark:text-white"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.isPinned ? "bg-zinc-50 dark:bg-black text-black dark:text-white" : "bg-zinc-100 dark:bg-black text-black dark:text-white"}`}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.isPinned && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${a.isPinned ? "bg-zinc-50 dark:bg-black text-black dark:text-white" : "bg-black dark:bg-white text-white dark:text-black"}`}>
                          置顶
                        </span>
                      )}
                      <h3 className="text-sm font-semibold break-words">{a.title}</h3>
                    </div>
                    <p
                      className={`text-xs whitespace-pre-wrap break-words ${
                        a.isPinned ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-300"
                      } ${!isExpanded && isLong ? "line-clamp-2" : ""}`}
                    >
                      {a.content}
                    </p>
                    {isLong && (
                      <button
                        onClick={() =>
                          setExpanded(
                            isExpanded
                              ? expanded.filter((id) => id !== a.id)
                              : [...expanded, a.id]
                          )
                        }
                        className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                          a.isPinned ? "text-white dark:text-zinc-100 hover:text-zinc-200 dark:hover:text-zinc-300" : "text-black dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            展开全部
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissed([...dismissed, a.id])}
                    className={`shrink-0 p-1 rounded transition-colors ${a.isPinned ? "hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-400 dark:text-zinc-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-950 text-zinc-400 dark:text-zinc-400"}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">
              考试信息
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">
              {loading ? "加载中..." : `共 ${filteredExams.length} 场考试`}
            </p>
          </div>
        </div>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {loading ? (
          <LoadingState />
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </UserLayout>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
      <span className="ml-2 text-zinc-500 dark:text-zinc-300">加载考试信息...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
        <CalendarX className="w-10 h-10 text-zinc-400 dark:text-zinc-400" />
      </div>
      <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">暂无考试信息</h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-400">试试调整搜索条件或筛选器</p>
    </div>
  );
}

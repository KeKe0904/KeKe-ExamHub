/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import { CalendarX, Globe, X, ChevronDown, ChevronUp, RotateCcw } from "@/components/MathIcon";
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

  // 初始加载：考试列表为空时的 loading 显示骨架屏；后续刷新显示旋转图标
  const isInitialLoading = loading && exams.length === 0;
  const isRefreshing = loading && exams.length > 0;

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
                  className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                    a.isPinned
                      ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.isPinned ? "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.isPinned && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${a.isPinned ? "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200" : "bg-zinc-200 text-zinc-700"}`}>
                          置顶
                        </span>
                      )}
                      <h3 className="text-sm font-semibold break-words">{a.title}</h3>
                    </div>
                    <div
                      className={`text-xs break-words announcement-content ${
                        a.isPinned ? "text-amber-800/80 dark:text-amber-200/70" : "text-zinc-500 dark:text-zinc-400"
                      } ${!isExpanded && isLong ? "line-clamp-2" : ""}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }}
                    />
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
                          a.isPinned ? "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                    className={`shrink-0 p-1 rounded-lg transition-colors ${a.isPinned ? "hover:bg-amber-200/70 dark:hover:bg-amber-900/60 text-amber-700/80 dark:text-amber-200/80" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500"}`}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-1">
              考试信息
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "加载中..." : `共 ${filteredExams.length} 场考试`}
            </p>
          </div>
          <button
            onClick={() => fetchExams()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press"
            aria-label="刷新考试列表"
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </div>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {isInitialLoading ? (
          <SkeletonGrid />
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam, index) => (
              <ExamCard key={exam.id} exam={exam} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </UserLayout>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-4 w-4 rounded" />
          </div>
          <div className="skeleton h-6 w-3/4 rounded mb-4" />
          <div className="space-y-2.5">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
        <CalendarX className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">暂无考试信息</h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">试试调整搜索条件或筛选器</p>
    </div>
  );
}

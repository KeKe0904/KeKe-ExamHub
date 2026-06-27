/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarX,
  Loader2,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "@/components/MathIcon";
import UserLayout from "@/components/Layout/UserLayout";
import Hero from "@/components/Hero";
import SearchFilterBar from "@/components/SearchFilterBar";
import ExamCard from "@/components/ExamCard";
import { useExamStore } from "@/store/examStore";
import { calculateStats, calculateExamStatus } from "@/utils/date";
import type { ExamStats, ExamStatus } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const EXAMS_PER_PAGE = 6;

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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetch(`${API_BASE}/announcements`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAnnouncements(data.data);
      })
      .catch(() => {});
  }, []);

  const visibleAnnouncements = announcements.filter((a) => !dismissed.includes(a.id));
  const stats: ExamStats = useMemo(() => calculateStats(exams), [exams]);

  const filteredExams = useMemo(() => {
    return exams
      .map((exam) => ({ ...exam, status: calculateExamStatus(exam) }))
      .filter((exam) => {
        if (statusFilter !== "all" && exam.status !== statusFilter) return false;
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

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage);
  }, [currentPage, safePage]);

  const pagedExams = useMemo(() => {
    const start = (safePage - 1) * EXAMS_PER_PAGE;
    return filteredExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredExams, safePage]);

  return (
    <UserLayout compactFooter>
      {/* 固定视口高度，禁止整页滚动 */}
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-zinc-100 dark:bg-black">
        <div className="container mx-auto flex h-full flex-col px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          {/* 紧凑 Hero */}
          <Hero stats={stats} compact />

          {/* 公告区：仅显示首条 */}
          {visibleAnnouncements.length > 0 && (() => {
            const a = visibleAnnouncements[0];
            const isExpanded = expanded.includes(a.id);
            const isLong = a.content.length > 80;
            return (
              <section className="mt-3 shrink-0">
                <div
                  className={`rounded-lg border p-3 flex items-start gap-3 ${
                    a.isPinned
                      ? "border-black dark:border-white bg-black dark:bg-black text-white dark:text-white"
                      : "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black text-black dark:text-white"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.isPinned ? "bg-zinc-50 dark:bg-black text-black dark:text-white" : "bg-zinc-100 dark:bg-black text-black dark:text-white"}`}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {a.isPinned && (
                        <span className="shrink-0 rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-black dark:bg-black dark:text-white">
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
                            isExpanded ? expanded.filter((id) => id !== a.id) : [...expanded, a.id],
                          )
                        }
                        className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                          a.isPinned
                            ? "text-white hover:text-zinc-200"
                            : "text-black hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
                        }`}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3 w-3" />收起</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" />展开全部</>
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissed([...dismissed, a.id])}
                    className={`shrink-0 rounded p-1 transition-colors ${
                      a.isPinned
                        ? "hover:bg-zinc-800 text-zinc-400"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-950 text-zinc-400 dark:text-zinc-400"
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </section>
            );
          })()}

          {/* 考试信息区块：弹性填充剩余空间 */}
          <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 shadow-sm dark:border-zinc-600 dark:bg-black/90">
            <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-bold text-black dark:text-white sm:text-3xl">
                  考试信息
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-300">
                  {loading
                    ? "加载中..."
                    : `共 ${filteredExams.length} 场考试 · 第 ${safePage}/${totalPages} 页`}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                compact
              />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <LoadingState />
              ) : filteredExams.length > 0 ? (
                <div className="flex h-full flex-col">
                  <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2 lg:grid-cols-3">
                    {pagedExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </section>
        </div>
      </div>
    </UserLayout>
  );
}

/* ====== 分页组件 ====== */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-600">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </button>

      <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
        {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ====== 辅助组件 ====== */

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-300" />
      <span className="ml-2 text-zinc-500 dark:text-zinc-300">加载考试信息...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-black">
        <CalendarX className="h-10 w-10 text-zinc-400 dark:text-zinc-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-zinc-600 dark:text-zinc-300">暂无考试信息</h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-400">试试调整搜索条件或筛选器</p>
    </div>
  );
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { Search, X } from "@/components/MathIcon";
import { cn } from "@/lib/utils";
import type { ExamStatus } from "@/types";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ExamStatus | "all";
  onStatusChange: (status: ExamStatus | "all") => void;
}

const statusOptions: { value: ExamStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "upcoming", label: "即将开始" },
  { value: "ongoing", label: "进行中" },
  { value: "ended", label: "已结束" },
];

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: SearchFilterBarProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-5 mb-6 sm:mb-8">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索考试科目、地点..."
            className="w-full pl-9 sm:pl-11 pr-9 sm:pr-11 py-2 sm:py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors touch-target flex items-center justify-center"
              aria-label="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all border touch-target flex items-center",
                statusFilter === option.value
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

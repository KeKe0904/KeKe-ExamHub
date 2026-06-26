/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
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
    <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 shadow-sm p-4 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索考试科目、地点、监考老师..."
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-black dark:focus:border-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                statusFilter === option.value
                  ? "bg-black text-white border-black"
                  : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white"
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

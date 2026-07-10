/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { cn } from "@/lib/utils";
import { getStatusText } from "@/utils/date";
import type { ExamStatus } from "@/types";

interface StatusBadgeProps {
  status: ExamStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
        status === "upcoming" && "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        status === "ongoing" && "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100",
        status === "ended" && "bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "upcoming" && "bg-zinc-500 animate-pulse dark:bg-zinc-400",
          status === "ongoing" && "bg-white animate-pulse dark:bg-zinc-900",
          status === "ended" && "bg-zinc-400 dark:bg-zinc-500"
        )}
      />
      {getStatusText(status)}
    </span>
  );
}

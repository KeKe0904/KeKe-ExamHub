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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        status === "upcoming" && "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600",
        status === "ongoing" && "bg-black text-white border-black",
        status === "ended" && "bg-zinc-50 dark:bg-black text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-600",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "upcoming" && "bg-zinc-600 animate-pulse",
          status === "ongoing" && "bg-white animate-pulse",
          status === "ended" && "bg-zinc-400"
        )}
      />
      {getStatusText(status)}
    </span>
  );
}

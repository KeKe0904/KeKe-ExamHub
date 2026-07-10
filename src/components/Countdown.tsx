/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useState } from "react";
import { Hourglass } from "@/components/MathIcon";
import type { Exam } from "@/types";
import { calculateCountdown } from "@/utils/date";
import { cn } from "@/lib/utils";

interface CountdownProps {
  exam: Exam;
}

export default function Countdown({ exam }: CountdownProps) {
  const [countdown, setCountdown] = useState(() => calculateCountdown(exam));

  // 仅依赖考试时间相关字段，避免父组件每秒重渲染时 exam 对象引用变化导致定时器反复重置
  useEffect(() => {
    // 立即计算一次，确保切换考试时立即显示正确倒计时
    setCountdown(calculateCountdown(exam));
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(exam));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, exam.examDate, exam.duration]);

  if (countdown.isFinished) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 text-center">
        <Hourglass className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-3" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">考试已结束</p>
      </div>
    );
  }

  const isOngoing = exam.status === "ongoing";

  return (
    <div
      className={cn(
        "rounded-lg p-6 text-center",
        isOngoing
          ? "bg-white dark:bg-zinc-900 border border-black dark:border-white"
          : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600"
      )}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Hourglass className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        <span className="text-zinc-600 dark:text-zinc-300 text-sm font-medium">
          {isOngoing ? "考试剩余时间" : "距离考试开始还有"}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {countdown.days > 0 && (
          <TimeUnit value={countdown.days} label="天" />
        )}
        <TimeUnit value={countdown.hours} label="时" />
        <TimeUnit value={countdown.minutes} label="分" />
        <TimeUnit value={countdown.seconds} label="秒" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg px-3 py-3 min-w-[60px]">
        <span className="text-2xl sm:text-3xl font-bold text-black dark:text-white font-serif tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">{label}</span>
    </div>
  );
}

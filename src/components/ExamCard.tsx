/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { Link } from "react-router-dom";
import { Clock, MapPin, User, Calendar, ArrowRight } from "@/components/MathIcon";
import type { Exam } from "@/types";
import { formatDateTime, formatDuration, calculateExamStatus } from "@/utils/date";
import StatusBadge from "@/components/StatusBadge";

interface ExamCardProps {
  exam: Exam;
  /** 交错动画索引，用于列表项依次出现 */
  index?: number;
}

export default function ExamCard({ exam, index = 0 }: ExamCardProps) {
  const currentStatus = calculateExamStatus(exam);

  return (
    <Link
      to={`/exam/${exam.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="stagger-item group relative block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-4 sm:p-6 transition-all duration-200 overflow-hidden min-h-[44px] no-select-mobile"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
        <StatusBadge status={currentStatus} className="transition-transform duration-200 group-hover:scale-[1.02]" />
        <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 sm:mb-4 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors relative z-10">
        {exam.subject}
      </h3>

      <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm relative z-10">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="truncate">{formatDateTime(exam.examDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span>{formatDuration(exam.duration)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="truncate">{exam.location}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="truncate">{exam.invigilator}</span>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800 relative z-10">
        <span className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">点击查看详情</span>
      </div>
    </Link>
  );
}

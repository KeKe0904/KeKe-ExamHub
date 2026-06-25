import { Link } from "react-router-dom";
import { Clock, MapPin, User, Calendar, ArrowRight } from "@/components/MathIcon";
import type { Exam } from "@/types";
import { formatDateTime, formatDuration, calculateExamStatus } from "@/utils/date";
import StatusBadge from "@/components/StatusBadge";

interface ExamCardProps {
  exam: Exam;
}

export default function ExamCard({ exam }: ExamCardProps) {
  const currentStatus = calculateExamStatus(exam);

  return (
    <Link
      to={`/exam/${exam.id}`}
      className="group block bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 p-6 transition-all duration-300 hover:-translate-y-1"
    >
      {/* 头部:状态标签 */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={currentStatus} />
        <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>

      {/* 科目名称 */}
      <h3 className="font-serif text-xl font-bold text-black dark:text-white mb-4 group-hover:text-black dark:group-hover:text-white transition-colors">
        {exam.subject}
      </h3>

      {/* 考试信息 */}
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-300 flex-shrink-0" />
          <span>{formatDateTime(exam.examDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-300 flex-shrink-0" />
          <span>{formatDuration(exam.duration)}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <MapPin className="w-4 h-4 text-zinc-500 dark:text-zinc-300 flex-shrink-0" />
          <span>{exam.location}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <User className="w-4 h-4 text-zinc-500 dark:text-zinc-300 flex-shrink-0" />
          <span>{exam.invigilator}</span>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-600">
        <span className="text-xs text-zinc-400 dark:text-zinc-400">点击查看详情</span>
      </div>
    </Link>
  );
}

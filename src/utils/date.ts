import { format, parseISO, differenceInSeconds } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Exam, ExamStatus, Countdown, ExamStats } from "@/types";

// 格式化日期时间
export function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "yyyy年MM月dd日 HH:mm", { locale: zhCN });
}

// 格式化日期
export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "yyyy年MM月dd日", { locale: zhCN });
}

// 根据当前时间计算考试状态
export function calculateExamStatus(exam: Exam): ExamStatus {
  const now = new Date();
  const startTime = parseISO(exam.examDate);
  const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);

  if (now < startTime) return "upcoming";
  if (now >= startTime && now <= endTime) return "ongoing";
  return "ended";
}

// 计算倒计时
export function calculateCountdown(exam: Exam): Countdown {
  const now = new Date();
  const startTime = parseISO(exam.examDate);
  const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);

  // 如果考试已结束
  if (now > endTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
  }

  // 如果考试进行中
  if (now >= startTime && now <= endTime) {
    const remaining = differenceInSeconds(endTime, now);
    return {
      days: 0,
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
      isFinished: false,
    };
  }

  // 考试未开始
  const totalSeconds = differenceInSeconds(startTime, now);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isFinished: false,
  };
}

// 获取状态显示文本
export function getStatusText(status: ExamStatus): string {
  const textMap: Record<ExamStatus, string> = {
    upcoming: "即将开始",
    ongoing: "进行中",
    ended: "已结束",
  };
  return textMap[status];
}

// 计算统计数据
export function calculateStats(exams: Exam[]): ExamStats {
  const stats: ExamStats = {
    total: exams.length,
    upcoming: 0,
    ongoing: 0,
    ended: 0,
  };

  exams.forEach((exam) => {
    const status = calculateExamStatus(exam);
    stats[status]++;
  });

  return stats;
}

// 格式化时长(分钟转小时分钟)
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

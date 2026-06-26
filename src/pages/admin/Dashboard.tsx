﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  CheckCircle,
  Plus,
  FileText,
  ArrowRight,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { useExamStore } from "@/store/examStore";
import {
  calculateStats,
  calculateExamStatus,
  formatDateTime,
} from "@/utils/date";

export default function Dashboard() {
  const { exams, fetchExams } = useExamStore();

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const stats = useMemo(() => calculateStats(exams), [exams]);

  const recentExams = useMemo(() => {
    return [...exams]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((exam) => ({ ...exam, status: calculateExamStatus(exam) }));
  }, [exams]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
            仪表盘
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">考试信息管理概览</p>
        </div>
        <Link
          to="/admin/exams/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          发布考试
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CalendarCheck className="w-6 h-6" />}
          value={stats.total}
          label="考试总数"
          color="primary"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          value={stats.upcoming}
          label="即将开始"
          color="accent"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          value={stats.ongoing}
          label="进行中"
          color="green"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          value={stats.ended}
          label="已结束"
          color="gray"
        />
      </div>

      <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-black dark:text-white" />
            <h2 className="font-serif text-lg font-bold text-black dark:text-white">
              最近发布
            </h2>
          </div>
          <Link
            to="/admin/exams"
            className="inline-flex items-center gap-1 text-sm text-black dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            查看全部
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentExams.length > 0 ? (
          <div className="space-y-2">
            {recentExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {exam.subject}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-300">
                      {formatDateTime(exam.examDate)}
                    </div>
                  </div>
                </div>
                <StatusBadge status={exam.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm">暂无考试信息</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "primary" | "accent" | "green" | "gray";
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const colorClasses = {
    primary: {
      bg: "bg-zinc-100 dark:bg-black",
      text: "text-black dark:text-white",
      border: "border-zinc-200 dark:border-zinc-600",
    },
    accent: {
      bg: "bg-zinc-100 dark:bg-black",
      text: "text-black dark:text-white",
      border: "border-zinc-200 dark:border-zinc-600",
    },
    green: {
      bg: "bg-zinc-100 dark:bg-black",
      text: "text-black dark:text-white",
      border: "border-zinc-200 dark:border-zinc-600",
    },
    gray: {
      bg: "bg-zinc-100 dark:bg-black",
      text: "text-black dark:text-white",
      border: "border-zinc-200 dark:border-zinc-600",
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-5">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 border ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {icon}
      </div>
      <div className="text-3xl font-bold font-serif text-black dark:text-white">
        {value}
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">{label}</div>
    </div>
  );
}

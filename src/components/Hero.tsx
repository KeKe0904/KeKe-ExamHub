﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { CalendarCheck, Clock, TrendingUp } from "@/components/MathIcon";
import type { ExamStats } from "@/types";
import { useSchoolName } from "@/hooks/useSchoolName";

interface HeroProps {
  stats: ExamStats;
}

export default function Hero({ stats }: HeroProps) {
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";
  return (
    <section className="relative overflow-hidden bg-zinc-100 dark:bg-black">
      {/* 装饰几何图形 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-zinc-200 dark:border-zinc-600" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-zinc-200 dark:border-zinc-600" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full border border-zinc-200 dark:border-zinc-600" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* 标题 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              数字化考试信息管理平台
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-6 animate-slide-up">
            让考试信息
            <span className="block text-zinc-700 dark:text-zinc-300 mt-2">一目了然</span>
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-300 mb-10 max-w-2xl mx-auto animate-slide-up">
            告别传统手写考试信息的繁琐,{displayName}
            为您提供清晰、高效的考试信息展示,实时掌握考试动态。
          </p>

          {/* 统计数据卡片 */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto animate-scale-in">
            <StatCard
              icon={<CalendarCheck className="w-5 h-5" />}
              value={stats.total}
              label="考试总数"
              color="primary"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value={stats.upcoming}
              label="即将开始"
              color="accent"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value={stats.ongoing}
              label="进行中"
              color="green"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "primary" | "accent" | "green";
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const colorClasses = {
    primary: "bg-zinc-100 dark:bg-black text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600",
    accent: "bg-zinc-100 dark:bg-black text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600",
    green: "bg-zinc-100 dark:bg-black text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600",
  };

  return (
    <div className="bg-zinc-50 dark:bg-black rounded-lg p-4 border border-zinc-200 dark:border-zinc-600 shadow-sm">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 border ${colorClasses[color]}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold font-serif text-black dark:text-white">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-300 mt-0.5">{label}</div>
    </div>
  );
}

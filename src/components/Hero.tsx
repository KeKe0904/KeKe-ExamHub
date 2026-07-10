/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { CalendarCheck, Clock, TrendingUp } from "@/components/MathIcon";
import type { ExamStats } from "@/types";
import { useSiteConfig } from "@/hooks/useSchoolName";

interface HeroProps {
  stats: ExamStats;
}

const DEFAULT_TITLE_LINES = ["让考试信息", "一目了然"];
const DEFAULT_STAT_LABELS = ["考试总数", "即将开始", "进行中"];

export default function Hero({ stats }: HeroProps) {
  const { homeConfig, displayName } = useSiteConfig();

  // 徽章文案：自定义优先，否则默认
  const badgeText = homeConfig.badgeText?.trim() || "数字化考试信息管理平台";

  // 主标题：支持自定义（按换行符拆分为多行）
  const titleLines =
    homeConfig.title?.trim().split(/\r?\n/).filter(Boolean).length
      ? homeConfig.title.trim().split(/\r?\n/).filter(Boolean)
      : DEFAULT_TITLE_LINES;

  // 副标题：自定义优先，否则默认
  const subtitle = homeConfig.subtitle?.trim()
    ? homeConfig.subtitle
    : `告别传统手写考试信息的繁琐，${displayName} 为您提供清晰、高效的考试信息展示，实时掌握考试动态。`;

  // 统计标签：按逗号分隔，缺省项回退默认
  const customLabels = homeConfig.statLabels
    ? homeConfig.statLabels.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const statLabels = DEFAULT_STAT_LABELS.map(
    (label, i) => customLabels[i] || label
  );

  return (
    <section className="relative overflow-hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      {/* 背景装饰 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-30"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-zinc-100 dark:bg-zinc-900 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-zinc-100 dark:bg-zinc-900 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-4 sm:mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {badgeText}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6 animate-slide-up leading-tight">
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="text-sm sm:text-lg text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-10 max-w-2xl mx-auto animate-slide-up leading-relaxed px-2 sm:px-4">
            {subtitle}
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto animate-scale-in">
            <StatCard
              icon={<CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
              value={stats.total}
              label={statLabels[0]}
            />
            <StatCard
              icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
              value={stats.upcoming}
              label={statLabels[1]}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
              value={stats.ongoing}
              label={statLabels[2]}
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
}

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 sm:p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5">
      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center mb-2 sm:mb-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
        {icon}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}

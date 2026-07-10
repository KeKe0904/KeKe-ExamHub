/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  CheckCircle,
  Sun,
  Activity,
  Building,
  FileText,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { examApi } from "@/utils/api";
import type { DashboardStats, OngoingExam, UpcomingExam, RecentEndedExam, BuildingStat } from "@/types";
import { formatDateTime, formatTime, formatDuration } from "@/utils/date";

export default function DataDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setError(null);
      const res = await examApi.getDashboardStats();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 首次加载展示 loading
    fetchData(true);
    // 定时刷新时不展示 loading，避免界面闪烁
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressList = data
    ? data.ongoingExamList.map((exam) => {
        const now = new Date();
        const startTime = new Date(exam.startTime);
        const endTime = new Date(exam.endTime);
        const elapsed = now.getTime() - startTime.getTime();
        const total = endTime.getTime() - startTime.getTime();
        const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        return { ...exam, progress: Math.round(progress * 10) / 10 };
      })
    : [];

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
              考试数据大屏
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              实时监控考试状态与教室使用情况
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="text-right flex-1 md:flex-none">
              <div className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-zinc-900 dark:text-white">
                {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
              </div>
              <div className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {currentTime.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600 dark:text-zinc-300" />
              ) : (
                <RefreshCw className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <StatCard
            icon={<CalendarCheck className="w-5 h-5 md:w-6 md:h-6" />}
            value={data?.totalExams ?? 0}
            label="考试总数"
            loading={loading}
          />
          <StatCard
            icon={<Activity className="w-5 h-5 md:w-6 md:h-6" />}
            value={data?.ongoingExams ?? 0}
            label="进行中"
            loading={loading}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 md:w-6 md:h-6" />}
            value={data?.upcomingExams ?? 0}
            label="即将开始"
            loading={loading}
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
            value={data?.endedExams ?? 0}
            label="已结束"
            loading={loading}
          />
          <StatCard
            icon={<Sun className="w-5 h-5 md:w-6 md:h-6" />}
            value={data?.todayExams ?? 0}
            label="今日考试"
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 md:w-6 md:h-6" />}
            value={`${data?.classroomUtilization ?? 0}%`}
            label="教室使用率"
            loading={loading}
          />
        </div>

        {/* 中部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 进行中的考试 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <Activity className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">进行中的考试</h2>
              <span className="ml-auto text-xs md:text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {data?.ongoingExamList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                      <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : progressList.length > 0 ? (
              <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2">
                {progressList.map((exam) => (
                  <OngoingExamItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm">暂无进行中的考试</p>
              </div>
            )}
          </div>

          {/* 即将开始的考试 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <Clock className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">即将开始</h2>
              <span className="ml-auto text-xs md:text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                最近 {data?.upcomingExamList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="w-16 h-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            ) : data?.upcomingExamList && data.upcomingExamList.length > 0 ? (
              <div className="space-y-2 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2">
                {data.upcomingExamList.map((exam) => (
                  <UpcomingExamItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm">暂无即将开始的考试</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 教学楼考试分布 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <Building className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">教学楼考试分布</h2>
              <span className="ml-auto text-xs md:text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                共 {data?.totalBuildings ?? 0} 栋
              </span>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : data?.buildingStats && data.buildingStats.length > 0 ? (
              <div className="space-y-4 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2">
                {data.buildingStats.map((stat, index) => (
                  <BuildingStatItem
                    key={stat.name}
                    stat={stat}
                    rank={index + 1}
                    maxCount={Math.max(...data.buildingStats.map((s) => s.examCount), 1)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Building className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm">暂无教学楼数据</p>
              </div>
            )}
          </div>

          {/* 最近结束的考试 */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <FileText className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">最近结束</h2>
              <span className="ml-auto text-xs md:text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                最近 {data?.recentEndedList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="w-12 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            ) : data?.recentEndedList && data.recentEndedList.length > 0 ? (
              <div className="space-y-2 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2">
                {data.recentEndedList.map((exam) => (
                  <RecentEndedItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm">暂无已结束的考试</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="pt-4 md:pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
              <span>数据每 30 秒自动刷新</span>
            </div>
            <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
            <span>教室总数 <span className="text-zinc-900 dark:text-white font-mono font-medium">{data?.totalClassrooms ?? 0}</span></span>
            <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
            <span>今日使用 <span className="text-zinc-900 dark:text-white font-mono font-medium">{data?.activeClassrooms ?? 0}</span> 间</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
            <span>KeKe ExamHub 考试数据大屏</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  loading: boolean;
}

function StatCard({ icon, value, label, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
      {/* 图标容器 */}
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
        {icon}
      </div>

      {/* 数值 */}
      <div className="text-2xl md:text-3xl font-bold font-mono text-zinc-900 dark:text-white">
        {loading ? (
          <span className="inline-block w-12 md:w-16 h-6 md:h-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>

      {/* 标签 */}
      <div className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

function OngoingExamItem({ exam }: { exam: OngoingExam & { progress: number } }) {
  const now = new Date();
  const endTime = new Date(exam.endTime);
  const remainingMs = endTime.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  return (
    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-zinc-900 dark:text-white truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{exam.location}</span>
          </div>
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
            {exam.progress}%
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            剩余 {remainingHours > 0 ? `${remainingHours}时` : ""}
            {remainingMins}分
          </div>
        </div>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-1000"
          style={{ width: `${exam.progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>{formatTime(exam.startTime)}</span>
        <span>{formatTime(exam.endTime)}</span>
      </div>
    </div>
  );
}

function UpcomingExamItem({ exam }: { exam: UpcomingExam }) {
  const now = new Date();
  const startTime = new Date(exam.examDate);
  const diffMs = startTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMinutes = Math.floor((diffMs % 3600000) / 60000);

  let countdownText = "";
  if (diffHours > 24) {
    countdownText = `${Math.floor(diffHours / 24)}天后`;
  } else if (diffHours > 0) {
    countdownText = `${diffHours}小时后`;
  } else {
    countdownText = `${diffMinutes}分钟后`;
  }

  return (
    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-zinc-900 dark:text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-900 dark:text-white text-sm truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {formatDateTime(exam.examDate)} · {formatDuration(exam.duration)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-zinc-900 dark:text-white text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">{countdownText}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{exam.location}</div>
        </div>
      </div>
    </div>
  );
}

function RecentEndedItem({ exam }: { exam: RecentEndedExam }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-700 dark:text-zinc-200 text-sm truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {exam.location} · {formatDuration(exam.duration)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">已结束</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{formatTime(exam.endedAt)}</div>
        </div>
      </div>
    </div>
  );
}

function BuildingStatItem({
  stat,
  rank,
  maxCount,
}: {
  stat: BuildingStat;
  rank: number;
  maxCount: number;
}) {
  const percentage = maxCount > 0 ? (stat.examCount / maxCount) * 100 : 0;

  // Top 3 用 zinc-900，其余用 zinc-300
  const isTopRank = rank <= 3;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border ${
              isTopRank
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
            }`}
          >
            {rank}
          </div>
          <span className="font-medium text-zinc-900 dark:text-white">{stat.name}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
            {stat.examCount}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">场考试</span>
        </div>
      </div>
      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isTopRank ? "bg-zinc-900 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{stat.classroomCount} 间教室</span>
        <span className="font-mono">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

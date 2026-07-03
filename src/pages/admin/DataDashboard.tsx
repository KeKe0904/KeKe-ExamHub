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

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examApi.getDashboardStats();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
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
      <div className="min-h-screen bg-black text-white">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">考试数据大屏</h1>
            <p className="text-sm text-zinc-400">
              实时监控考试状态与教室使用情况
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
              </div>
              <div className="text-xs text-zinc-400">
                {currentTime.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              ) : (
                <RefreshCw className="w-5 h-5 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-900 bg-red-950/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={<CalendarCheck className="w-6 h-6" />}
            value={data?.totalExams ?? 0}
            label="考试总数"
            color="zinc"
            loading={loading}
          />
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            value={data?.ongoingExams ?? 0}
            label="进行中"
            color="green"
            loading={loading}
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            value={data?.upcomingExams ?? 0}
            label="即将开始"
            color="yellow"
            loading={loading}
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            value={data?.endedExams ?? 0}
            label="已结束"
            color="zinc"
            loading={loading}
          />
          <StatCard
            icon={<Sun className="w-6 h-6" />}
            value={data?.todayExams ?? 0}
            label="今日考试"
            color="blue"
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            value={`${data?.classroomUtilization ?? 0}%`}
            label="教室使用率"
            color="purple"
            loading={loading}
          />
        </div>

        {/* 中部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 进行中的考试 */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="font-serif text-lg font-bold">进行中的考试</h2>
              <span className="ml-auto text-sm text-zinc-500">
                {data?.ongoingExamList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : progressList.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {progressList.map((exam) => (
                  <OngoingExamItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无进行中的考试</p>
              </div>
            )}
          </div>

          {/* 即将开始的考试 */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h2 className="font-serif text-lg font-bold">即将开始</h2>
              <span className="ml-auto text-sm text-zinc-500">
                最近 {data?.upcomingExamList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : data?.upcomingExamList && data.upcomingExamList.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {data.upcomingExamList.map((exam) => (
                  <UpcomingExamItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无即将开始的考试</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 教学楼考试分布 */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Building className="w-5 h-5 text-blue-400" />
              <h2 className="font-serif text-lg font-bold">教学楼考试分布</h2>
              <span className="ml-auto text-sm text-zinc-500">
                共 {data?.totalBuildings ?? 0} 栋教学楼
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : data?.buildingStats && data.buildingStats.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
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
              <div className="text-center py-12 text-zinc-600">
                <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无教学楼数据</p>
              </div>
            )}
          </div>

          {/* 最近结束的考试 */}
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <FileText className="w-5 h-5 text-zinc-400" />
              <h2 className="font-serif text-lg font-bold">最近结束</h2>
              <span className="ml-auto text-sm text-zinc-500">
                最近 {data?.recentEndedList.length ?? 0} 场
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            ) : data?.recentEndedList && data.recentEndedList.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {data.recentEndedList.map((exam) => (
                  <RecentEndedItem key={exam.id} exam={exam} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无已结束的考试</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <div>
            数据每 30 秒自动刷新 · 教室总数 {data?.totalClassrooms ?? 0} · 今日使用 {data?.activeClassrooms ?? 0} 间
          </div>
          <div>KeKe ExamHub 考试数据大屏</div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: "zinc" | "green" | "yellow" | "blue" | "purple";
  loading: boolean;
}

function StatCard({ icon, value, label, color, loading }: StatCardProps) {
  const colorClasses = {
    zinc: {
      iconBg: "bg-zinc-900 border-zinc-800",
      iconText: "text-zinc-300",
      value: "text-white",
      border: "border-zinc-800",
    },
    green: {
      iconBg: "bg-green-950/50 border-green-900",
      iconText: "text-green-400",
      value: "text-green-400",
      border: "border-zinc-800",
    },
    yellow: {
      iconBg: "bg-yellow-950/50 border-yellow-900",
      iconText: "text-yellow-400",
      value: "text-yellow-400",
      border: "border-zinc-800",
    },
    blue: {
      iconBg: "bg-blue-950/50 border-blue-900",
      iconText: "text-blue-400",
      value: "text-blue-400",
      border: "border-zinc-800",
    },
    purple: {
      iconBg: "bg-purple-950/50 border-purple-900",
      iconText: "text-purple-400",
      value: "text-purple-400",
      border: "border-zinc-800",
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`bg-zinc-950 rounded-xl border ${colors.border} p-5`}>
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 border ${colors.iconBg} ${colors.iconText}`}
      >
        {icon}
      </div>
      <div className={`text-3xl font-bold font-serif ${colors.value}`}>
        {loading ? (
          <span className="inline-block w-16 h-8 bg-zinc-800 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
      <div className="text-sm text-zinc-500 mt-1">{label}</div>
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
    <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{exam.location}</span>
          </div>
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className="text-green-400 font-mono text-sm font-bold">
            {exam.progress}%
          </div>
          <div className="text-xs text-zinc-500">
            剩余 {remainingHours > 0 ? `${remainingHours}时` : ""}
            {remainingMins}分
          </div>
        </div>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${exam.progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-zinc-600">
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
    <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-950/50 border border-yellow-900 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-white text-sm truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {formatDateTime(exam.examDate)} · {formatDuration(exam.duration)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-yellow-400 text-xs font-medium">{countdownText}</div>
          <div className="text-xs text-zinc-600 mt-0.5">{exam.location}</div>
        </div>
      </div>
    </div>
  );
}

function RecentEndedItem({ exam }: { exam: RecentEndedExam }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-300 text-sm truncate">{exam.subject}</div>
          <div className="text-xs text-zinc-600 mt-0.5">
            {exam.location} · {formatDuration(exam.duration)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-zinc-500 text-xs">已结束</div>
          <div className="text-xs text-zinc-600 mt-0.5">{formatTime(exam.endedAt)}</div>
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

  const rankColors = [
    "text-yellow-400 bg-yellow-950/50 border-yellow-900",
    "text-zinc-300 bg-zinc-800 border-zinc-700",
    "text-orange-400 bg-orange-950/50 border-orange-900",
  ];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : "text-zinc-500 bg-zinc-900 border-zinc-800";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border ${rankColor}`}
          >
            {rank}
          </div>
          <span className="font-medium text-white">{stat.name}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold font-serif text-white">
            {stat.examCount}
          </span>
          <span className="text-xs text-zinc-500 ml-1">场考试</span>
        </div>
      </div>
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-zinc-700 to-zinc-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-600">
        <span>{stat.classroomCount} 间教室</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

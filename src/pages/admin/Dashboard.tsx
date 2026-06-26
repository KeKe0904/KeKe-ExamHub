﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  CheckCircle,
  Plus,
  FileText,
  ArrowRight,
  GitBranch,
  Download,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { useExamStore } from "@/store/examStore";
import {
  calculateStats,
  calculateExamStatus,
  formatDateTime,
} from "@/utils/date";
import { repoCheckApi } from "@/utils/api";

export default function Dashboard() {
  const { exams, fetchExams } = useExamStore();
  const [repoUpdate, setRepoUpdate] = useState<{
    hasUpdate: boolean;
    commitsBehind: number;
    changelog: string[];
    localCommit: string;
    remoteCommit: string;
  } | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // 检查仓库更新
  useEffect(() => {
    repoCheckApi.check().then((res) => {
      if (res.success && res.data.ok) {
        setRepoUpdate({
          hasUpdate: res.data.hasUpdate,
          commitsBehind: res.data.commitsBehind,
          changelog: res.data.changelog,
          localCommit: res.data.localCommit,
          remoteCommit: res.data.remoteCommit,
        });
      }
    }).catch(() => {});
  }, []);

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

      {/* 仓库更新通知 */}
      {repoUpdate?.hasUpdate && (
        <div className="mb-6 p-4 rounded-lg border border-yellow-300/60 dark:border-yellow-600/40 bg-yellow-50/80 dark:bg-yellow-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  发现新版本！落后 {repoUpdate.commitsBehind} 个提交
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-500/70 mt-0.5">
                  本地 {repoUpdate.localCommit} → 远程 {repoUpdate.remoteCommit}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="text-xs px-2.5 py-1 rounded border border-yellow-400/60 dark:border-yellow-600/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
              >
                {showChangelog ? "收起" : "查看变更"}
              </button>
              <a
                href="https://github.com/KeKe0904/KeKe-ExamHub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Download className="w-3 h-3" />
                前往 GitHub
              </a>
            </div>
          </div>
          {showChangelog && repoUpdate.changelog.length > 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-300/40 dark:border-yellow-600/20">
              <p className="text-xs font-medium text-yellow-700/60 dark:text-yellow-500/50 mb-2">
                更新日志：
              </p>
              <div className="space-y-1">
                {repoUpdate.changelog.map((line, i) => (
                  <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400 font-mono pl-2 border-l-2 border-yellow-300/60 dark:border-yellow-600/30">
                    {line}
                  </p>
                ))}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                请在服务器上执行 <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[11px]">sudo ./install.sh</code> 以更新部署
              </p>
            </div>
          )}
        </div>
      )}

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

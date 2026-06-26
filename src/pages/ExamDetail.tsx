/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Info,
  Loader2,
  Maximize,
} from "@/components/MathIcon";
import UserLayout from "@/components/Layout/UserLayout";
import Countdown from "@/components/Countdown";
import StatusBadge from "@/components/StatusBadge";
import { useExamStore } from "@/store/examStore";
import {
  formatDateTime,
  formatDuration,
  calculateExamStatus,
} from "@/utils/date";
import { parseISO } from "date-fns";

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { exams, loading, fetchExams } = useExamStore();
  const [now, setNow] = useState(new Date());

  // 每秒更新时间，用于判断监考入口是否开放
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 如果没有考试数据,则获取
  useEffect(() => {
    if (exams.length === 0) {
      fetchExams();
    }
  }, [exams.length, fetchExams]);

  const exam = exams.find((e) => e.id === id);

  // 加载中状态
  if (loading && !exam) {
    return (
      <UserLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
            <span className="ml-2 text-zinc-500 dark:text-zinc-300">加载考试信息...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  // 考试未找到
  if (!exam) {
    return (
      <UserLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">考试未找到</h2>
          <p className="text-zinc-500 dark:text-zinc-300 mb-6">该考试信息可能已被删除</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </UserLayout>
    );
  }

  const currentStatus = calculateExamStatus(exam);

  // 判断监考页面是否开放（考前1小时开放，考试结束后仍可访问）
  const startTime = parseISO(exam.examDate);
  const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
  const monitorOpen = now >= oneHourBefore;

  const handlePrint = () => {
    window.print();
  };

  return (
    <UserLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6 no-print">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <div className="flex items-center gap-2">
            {monitorOpen && (
              <button
                onClick={() => navigate(`/exam/${exam.id}/monitor`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white text-sm font-medium rounded-lg hover:border-black dark:hover:border-white transition-colors"
              >
                <Maximize className="w-4 h-4" />
                监考模式
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              打印考试信息
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧:考试信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 主信息卡片 */}
            <div className="bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 shadow-sm p-6 lg:p-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <StatusBadge status={currentStatus} />
              </div>

              <h1 className="font-serif text-3xl font-bold text-black dark:text-white mb-6">
                {exam.subject}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Calendar className="w-5 h-5" />}
                  label="考试时间"
                  value={formatDateTime(exam.examDate)}
                />
                <InfoItem
                  icon={<Clock className="w-5 h-5" />}
                  label="考试时长"
                  value={formatDuration(exam.duration)}
                />
                <InfoItem
                  icon={<MapPin className="w-5 h-5" />}
                  label="考试地点"
                  value={exam.location}
                />
                <InfoItem
                  icon={<User className="w-5 h-5" />}
                  label="监考老师"
                  value={exam.invigilator}
                />
              </div>
            </div>

            {/* 注意事项卡片 */}
            {exam.notes && (
              <div className="bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 shadow-sm p-6 lg:p-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center">
                    <Info className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <h2 className="font-serif text-lg font-bold text-black dark:text-white">
                    注意事项
                  </h2>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {exam.notes}
                </p>
              </div>
            )}
          </div>

          {/* 右侧:倒计时与操作 */}
          <div className="space-y-6">
            {/* 倒计时模块 */}
            <Countdown exam={{ ...exam, status: currentStatus }} />

            {/* 快速信息 */}
            <div className="bg-zinc-50 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
                <h3 className="font-medium text-zinc-700 dark:text-zinc-300">考试概要</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-300">科目</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {exam.subject}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-300">时长</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatDuration(exam.duration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-300">地点</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {exam.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-300">监考</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {exam.invigilator}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-600">
      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-black text-zinc-700 dark:text-zinc-300 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500 dark:text-zinc-300 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

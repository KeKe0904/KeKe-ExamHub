﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { parseISO, differenceInSeconds } from "date-fns";
import { zhCN } from "date-fns/locale";
import { format } from "date-fns";
import {
  Maximize,
  Minimize,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
} from "@/components/MathIcon";
import { useExamStore } from "@/store/examStore";
import { useSchoolName } from "@/hooks/useSchoolName";
import { calculateExamStatus, formatDateTime, formatDuration } from "@/utils/date";
import type { Exam } from "@/types";

// 倒计时数据
interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// 计算剩余时间
function calcRemaining(target: Date): TimeRemaining {
  const now = new Date();
  const total = Math.max(0, differenceInSeconds(target, now));
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

// 数字补零
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function Monitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { exams, fetchExams } = useExamStore();
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取考试数据
  useEffect(() => {
    if (exams.length === 0) {
      fetchExams();
    }
  }, [exams.length, fetchExams]);

  // 每秒更新时间
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // 进入全屏
  const enterFullscreen = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  // 退出全屏
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const exam: Exam | undefined = exams.find((e) => e.id === id);

  // 计算考试时间和开放状态
  const startTime = exam ? parseISO(exam.examDate) : new Date(0);
  const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
  const isOpen = exam ? now >= oneHourBefore : false;

  // 自动进入全屏（仅首次开放时）
  useEffect(() => {
    if (isOpen && !isFullscreen && !document.fullscreenElement && exam) {
      const timer = setTimeout(() => {
        if (containerRef.current?.requestFullscreen && !document.fullscreenElement) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isFullscreen, exam]);

  // 考试未找到
  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-zinc-400 dark:text-zinc-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-black dark:text-white mb-2">考试未找到</h2>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const endTime = new Date(startTime.getTime() + exam.duration * 60 * 1000);
  const status = calculateExamStatus(exam);

  // 未到开放时间
  if (!isOpen) {
    const waitTime = calcRemaining(oneHourBefore);
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4">
        <div className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-600 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-zinc-500 dark:text-zinc-300" />
          </div>
          <h2 className="text-xl font-bold text-black dark:text-white mb-2">监考页面尚未开放</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
            将在考前 1 小时开放（{formatDateTime(exam.examDate)} 开始）
          </p>
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-600 p-4 mb-6">
            <div className="text-xs text-zinc-500 dark:text-zinc-300 mb-2">距离开放还有</div>
            <div className="font-mono text-2xl font-bold text-black dark:text-white">
              {waitTime.days > 0 && `${waitTime.days}天 `}
              {pad(waitTime.hours)}:{pad(waitTime.minutes)}:{pad(waitTime.seconds)}
            </div>
          </div>
          <button
            onClick={() => navigate(`/exam/${exam.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回考试详情
          </button>
        </div>
      </div>
    );
  }

  // 计算倒计时
  const beforeStart = calcRemaining(startTime);
  const duringExam = calcRemaining(endTime);

  // 考试已结束
  const isEnded = status === "ended";

  // 全屏切换按钮
  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col"
    >
      {/* 顶部栏 */}
      <header className="border-b border-zinc-200 dark:border-zinc-600 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/exam/${exam.id}`)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-950 text-zinc-600 dark:text-zinc-300"
            title="返回考试详情"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-900" />
          <div>
            <div className="font-serif text-lg font-bold text-black dark:text-white leading-tight">
              {displayName}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-300">监考模式</div>
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-950 text-zinc-600 dark:text-zinc-300"
          title={isFullscreen ? "退出全屏" : "进入全屏"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* 考试科目 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 mb-6">
            <span className={`w-2 h-2 rounded-full ${isEnded ? "bg-zinc-400 dark:bg-zinc-9000" : "bg-black dark:bg-white animate-pulse"}`} />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {isEnded ? "考试已结束" : status === "ongoing" ? "考试进行中" : "考试即将开始"}
            </span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-3">
            {exam.subject}
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-300">
            {format(startTime, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
          </p>
        </div>

        {/* 倒计时区域 */}
        {!isEnded ? (
          <div className="w-full max-w-4xl mb-8">
            <div className="text-center mb-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-300 tracking-wider uppercase">
                {status === "ongoing" ? "距离考试结束" : "距离考试开始"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <TimeBlock value={beforeStart.days || duringExam.days} label="天" />
              <Separator />
              <TimeBlock
                value={status === "ongoing" ? duringExam.hours : beforeStart.hours}
                label="时"
              />
              <Separator />
              <TimeBlock
                value={status === "ongoing" ? duringExam.minutes : beforeStart.minutes}
                label="分"
              />
              <Separator />
              <TimeBlock
                value={status === "ongoing" ? duringExam.seconds : beforeStart.seconds}
                label="秒"
              />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mb-8 text-center">
            <div className="inline-block px-8 py-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600">
              <span className="font-serif text-2xl font-bold text-zinc-600 dark:text-zinc-300">
                考试已于 {format(endTime, "HH:mm")} 结束
              </span>
            </div>
          </div>
        )}

        {/* 考试信息卡片 */}
        <div className="w-full max-w-4xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="开始时间"
            value={format(startTime, "HH:mm")}
            sub={format(startTime, "MM月dd日")}
          />
          <InfoCard
            icon={<Clock className="w-5 h-5" />}
            label="考试时长"
            value={formatDuration(exam.duration)}
            sub={`结束 ${format(endTime, "HH:mm")}`}
          />
          <InfoCard
            icon={<MapPin className="w-5 h-5" />}
            label="考试地点"
            value={exam.location}
          />
          <InfoCard
            icon={<User className="w-5 h-5" />}
            label="监考老师"
            value={exam.invigilator}
          />
        </div>

        {/* 注意事项 */}
        {exam.notes && (
          <div className="w-full max-w-4xl mt-6 p-5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-300 tracking-wider uppercase mb-2">
              注意事项
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {exam.notes}
            </p>
          </div>
        )}
      </main>

      {/* 底部信息 */}
      <footer className="border-t border-zinc-200 dark:border-zinc-600 px-6 py-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-400 shrink-0">
        <span>{displayName} · 监考模式</span>
        <span className="font-mono">
          {format(now, "yyyy-MM-dd HH:mm:ss")}
        </span>
      </footer>
    </div>
  );
}

// 倒计时数字块
function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-20 h-24 sm:w-28 sm:h-32 rounded-lg bg-black dark:bg-white flex items-center justify-center">
          <span className="font-mono font-bold text-white dark:text-black text-4xl sm:text-6xl tabular-nums">
            {pad(value)}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
    </div>
  );
}

// 分隔符
function Separator() {
  return (
    <div className="flex items-center pb-6">
      <span className="font-mono font-bold text-black dark:text-white text-4xl sm:text-6xl">:</span>
    </div>
  );
}

// 信息卡片
interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function InfoCard({ icon, label, value, sub }: InfoCardProps) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-2 text-zinc-500 dark:text-zinc-300">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-serif text-lg font-bold text-black dark:text-white break-words">
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-400 dark:text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}

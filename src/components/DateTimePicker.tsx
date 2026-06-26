/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Sparkles, Sunrise, Sun, Moon } from "@/components/MathIcon";

interface DateTimePickerProps {
  value: string; // datetime-local 格式: "2026-08-01T09:00"
  onChange: (value: string) => void;
  error?: string;
}

// 预设时间段（用数学函数生成的 SVG 图标替代 emoji）
const quickTimes = [
  { label: "上午", time: "09:00", Icon: Sunrise },
  { label: "下午", time: "14:00", Icon: Sun },
  { label: "晚间", time: "19:00", Icon: Moon },
];

// 小时选项
const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08-21
// 分钟选项
const minutes = [0, 15, 30, 45];

export default function DateTimePicker({
  value,
  onChange,
  error,
}: DateTimePickerProps) {
  // 解析当前值
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const datePart = value ? value.split("T")[0] : "";
  const timePart = value ? value.split("T")[1] || "" : "";
  const [hourStr, minuteStr] = timePart.split(":");
  const selectedHour = hourStr ? parseInt(hourStr) : -1;
  const selectedMinute = minuteStr ? parseInt(minuteStr) : -1;

  // 选择日期
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    const time = timePart || "09:00";
    const dateStr = format(date, "yyyy-MM-dd");
    onChange(`${dateStr}T${time}`);
  };

  // 选择小时
  const handleHourSelect = (hour: number) => {
    const date = datePart || format(new Date(), "yyyy-MM-dd");
    const minute = selectedMinute >= 0 ? String(selectedMinute).padStart(2, "0") : "00";
    onChange(`${date}T${String(hour).padStart(2, "0")}:${minute}`);
  };

  // 选择分钟
  const handleMinuteSelect = (minute: number) => {
    const date = datePart || format(new Date(), "yyyy-MM-dd");
    const hour = selectedHour >= 0 ? String(selectedHour).padStart(2, "0") : "09";
    onChange(`${date}T${hour}:${String(minute).padStart(2, "0")}`);
  };

  // 快捷时间
  const handleQuickTime = (time: string) => {
    const date = datePart || format(new Date(), "yyyy-MM-dd");
    onChange(`${date}T${time}`);
  };

  // 预览文本
  const previewText = useMemo(() => {
    if (!value) return null;
    try {
      const date = parseISO(value);
      return format(date, "yyyy年M月d日 EEEE HH:mm", { locale: zhCN });
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
        error
          ? "border-red-300 bg-red-50/30"
          : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black hover:border-zinc-400 dark:hover:border-zinc-500"
      }`}
    >
      <div className="relative p-5 lg:p-6">
        {/* 标题行 */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              考试时间
            </label>
            <span className="ml-1 text-red-500">*</span>
          </div>
        </div>

        {/* 日历和时间选择 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
          {/* 日历视图 */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black p-3">
            <DayPicker
              mode="single"
              locale={zhCN}
              selected={selectedDate}
              onSelect={handleDateSelect}
              defaultMonth={selectedDate || new Date()}
              className="rdp-custom"
              showOutsideDays
              fixedWeeks
            />
          </div>

          {/* 时间选择 */}
          <div className="flex flex-col gap-4">
            {/* 快捷时间段 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Clock className="h-3.5 w-3.5 text-black" />
                <span>快捷选择</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {quickTimes.map((qt) => {
                  const isActive = timePart === qt.time;
                  const Icon = qt.Icon;
                  return (
                    <button
                      key={qt.time}
                      type="button"
                      onClick={() => handleQuickTime(qt.time)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all ${
                        isActive
                          ? "border-black bg-black text-white"
                          : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black text-zinc-600 dark:text-zinc-300 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{qt.label}</span>
                      <span className={`text-[10px] ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                        {qt.time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 小时选择 */}
            <div>
              <div className="mb-2 text-xs font-medium text-zinc-500">
                小时
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {hours.map((h) => {
                  const isActive = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "border-black bg-black text-white"
                          : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black text-zinc-600 dark:text-zinc-300 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 分钟选择 */}
            <div>
              <div className="mb-2 text-xs font-medium text-zinc-500">
                分钟
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {minutes.map((m) => {
                  const isActive = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "border-black bg-black text-white"
                          : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black text-zinc-600 dark:text-zinc-300 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      :{String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 日期时间预览 */}
        {previewText && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 animate-scale-in">
            <Sparkles className="h-4 w-4 shrink-0 text-black" />
            <span className="text-sm font-medium text-black">
              {previewText}
            </span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <p className="mt-2 text-xs text-red-500 animate-slide-down">{error}</p>
        )}
      </div>
    </div>
  );
}

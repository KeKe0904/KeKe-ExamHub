/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */

import { X, Check, ChevronDown, ChevronUp, Cookie } from "@/components/MathIcon";
import { useCookieConsent, type CookiePreferences } from "@/hooks/useCookieConsent";
import { cn } from "@/lib/utils";

export default function CookieConsentBanner() {
  const {
    showBanner,
    prefs,
    showCustomize,
    setShowCustomize,
    acceptAll,
    rejectAll,
    saveCustom,
    togglePref,
  } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <>
      {/* 底部横幅 */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-700 shadow-2xl animate-slide-up",
          showCustomize ? "pointer-events-none opacity-40" : ""
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* 左侧：图标 + 文案 */}
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
                  Cookie 偏好设置
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-300 leading-relaxed">
                  本网站使用 Cookie 来保障基本功能、分析访问数据并记住您的偏好。
                  不勾选非必需 Cookie 不会影响您的正常使用。
                </p>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCustomize(true)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-black dark:hover:border-white transition-colors"
              >
                自定义
              </button>
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-600 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-400 transition-colors"
              >
                全部拒绝
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-xs font-medium text-white dark:text-black bg-black dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                全部接受
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 自定义面板（弹窗） */}
      {showCustomize && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomize(false);
          }}
        >
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-white dark:text-black" />
                </div>
                <h3 className="font-serif text-lg font-bold text-black dark:text-white">
                  管理 Cookie 偏好
                </h3>
              </div>
              <button
                onClick={() => setShowCustomize(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 选项列表 */}
            <div className="p-5 space-y-4">
              <CookieOption
                key="essential"
                label="必需 Cookie"
                description="用于网站基本功能，如页面导航、表单提交和用户认证。这些 Cookie 必不可少，无法禁用。"
                checked={prefs.essential}
                disabled
              />
              <CookieOption
                key="analytics"
                label="分析 Cookie"
                description="帮助我们了解访问者如何使用网站，如页面浏览量、停留时间和访问来源。用于改进服务质量。"
                checked={prefs.analytics}
                onChange={() => togglePref("analytics")}
              />
              <CookieOption
                key="preferences"
                label="偏好 Cookie"
                description="记住您的主题偏好、语言设置等个性化选项，让您下次访问时保持一致的体验。"
                checked={prefs.preferences}
                onChange={() => togglePref("preferences")}
              />
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
              >
                全部拒绝
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-black dark:hover:border-white transition-colors"
              >
                全部接受
              </button>
              <button
                onClick={saveCustom}
                className="px-4 py-2 text-xs font-medium text-white dark:text-black bg-black dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                保存偏好
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CookieOptionProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}

function CookieOption({
  label,
  description,
  checked,
  disabled,
  onChange,
}: CookieOptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onChange}
            disabled={disabled}
            className={cn(
              "relative w-10 h-6 rounded-full transition-colors",
              checked
                ? "bg-black dark:bg-white"
                : "bg-zinc-200 dark:bg-zinc-700",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-black shadow-sm transition-transform",
                checked ? "left-[18px]" : "left-[2px]"
              )}
            />
          </button>
          <span className="text-sm font-medium text-black dark:text-white">
            {label}
          </span>
          {checked && (
            <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded text-zinc-400 hover:text-black dark:hover:text-white"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
      {expanded && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-300 leading-relaxed pl-[52px]">
          {description}
        </p>
      )}
    </div>
  );
}

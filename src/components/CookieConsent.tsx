import { X, Check, ChevronDown, ChevronUp, Cookie, Settings, Shield, BarChart3, Palette } from "@/components/MathIcon";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CookieConsentBanner() {
  const {
    showBanner,
    prefs,
    showCustomize,
    setShowCustomize,
    acceptAll,
    acceptNecessary,
    saveCustom,
    togglePref,
  } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[100] pointer-events-none",
          showCustomize && "opacity-40"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
          <div className="pointer-events-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border-t-2 border-zinc-200 dark:border-zinc-700 overflow-hidden animate-slide-up-float">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                <div className="flex items-start gap-4 flex-1">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-sm">
                      <Cookie className="w-6 h-6 text-white dark:text-zinc-900" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-zinc-700 dark:bg-zinc-300 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white dark:text-zinc-900" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">
                      Cookie 偏好设置
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      我们使用 Cookie 来提供核心功能、分析网站流量并个性化您的体验。
                      您可以选择接受所有 Cookie，或仅启用必要的 Cookie。
                      <button
                        type="button"
                        className="text-zinc-900 dark:text-zinc-100 hover:underline ml-1 font-medium underline-offset-2"
                      >
                        了解更多
                      </button>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button
                    onClick={() => setShowCustomize(true)}
                    className="group flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200 active:scale-[0.98]"
                  >
                    <Settings className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    自定义
                  </button>
                  <button
                    onClick={acceptNecessary}
                    className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-transparent border border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-all duration-200 active:scale-[0.98]"
                  >
                    仅必要
                  </button>
                  <button
                    onClick={acceptAll}
                    className="group relative px-5 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98] overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      接受全部
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCustomize && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomize(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg max-h-[85vh] overflow-hidden animate-scale-in">
            <div className="border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-white dark:text-zinc-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-lg">
                      管理 Cookie 偏好
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      自定义您的隐私偏好
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <CookieOption
                icon={<Shield className="w-5 h-5" />}
                iconBg="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                label="必要 Cookie"
                description="这些 Cookie 是网站正常运行所必需的，无法被禁用。它们通常只在您执行相当于服务请求的操作时设置。"
                checked={prefs.essential}
                disabled
              />
              <CookieOption
                icon={<Palette className="w-5 h-5" />}
                iconBg="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                label="偏好 Cookie"
                description="这些 Cookie 允许网站记住您的偏好设置，如主题、语言等，以提供更个性化的体验。"
                checked={prefs.preferences}
                onChange={() => togglePref("preferences")}
              />
              <CookieOption
                icon={<Settings className="w-5 h-5" />}
                iconBg="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                label="功能性 Cookie"
                description="这些 Cookie 使网站能够提供增强的功能和个性化设置。如果您不允许使用这些 Cookie，部分服务可能无法正常工作。"
                checked={prefs.functional}
                onChange={() => togglePref("functional")}
              />
              <CookieOption
                icon={<BarChart3 className="w-5 h-5" />}
                iconBg="bg-zinc-50 text-zinc-500 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                label="分析性 Cookie"
                description="这些 Cookie 帮助我们了解访问者如何与网站互动，收集和报告匿名信息，以改进我们的服务。"
                checked={prefs.analytics}
                onChange={() => togglePref("analytics")}
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <button
                onClick={acceptNecessary}
                className="px-4 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                仅启用必要
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-100 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-all duration-200 active:scale-[0.98]"
                >
                  取消
                </button>
                <button
                  onClick={saveCustom}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98]"
                >
                  保存偏好
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CookieOptionProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}

function CookieOption({
  icon,
  iconBg,
  label,
  description,
  checked,
  disabled,
  onChange,
}: CookieOptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border transition-all duration-200 overflow-hidden",
      checked
        ? "border-zinc-300 dark:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/50"
        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
      disabled && "opacity-80"
    )}>
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          iconBg
        )}>
          {icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              {label}
            </span>
            {checked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium">
                <Check className="w-3 h-3" />
                已启用
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
            {description}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium hover:underline underline-offset-2"
          >
            {expanded ? (
              <>
                收起详情
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                查看详情
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>

          {expanded && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed animate-fade-in">
              {description}
            </p>
          )}
        </div>

        <button
          onClick={onChange}
          disabled={disabled}
          className={cn(
            "relative w-12 h-7 rounded-full transition-all duration-300 shrink-0 mt-0.5",
            checked
              ? "bg-zinc-900 dark:bg-zinc-100"
              : "bg-zinc-200 dark:bg-zinc-700",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 flex items-center justify-center",
              checked ? "left-[22px]" : "left-0.5"
            )}
          >
            {checked && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 font-bold" />}
          </span>
        </button>
      </div>
    </div>
  );
}

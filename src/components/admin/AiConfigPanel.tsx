/**
 * KeKe ExamHub - 考试信息管理系统
 * AI 配置面板（嵌入 Settings 页面）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect } from "react";
import {
  Bot,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Zap,
  Sparkles,
  Check,
  Shield,
  ImageIcon,
  FileText,
} from "@/components/MathIcon";
import { cn } from "@/lib/utils";
import { localizeFetchError, localizeHttpResponse } from "@/utils/localize-error";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
// 读取 token：localStorage（rememberMe=true 时存储）优先，sessionStorage 兜底
const getToken = () => {
  try {
    return localStorage.getItem("examhub-token") || sessionStorage.getItem("examhub-token") || "";
  } catch {
    return sessionStorage.getItem("examhub-token") || "";
  }
};

interface AiConfigState {
  apiUrl: string;
  apiKey: string;
  apiKeySet: boolean;
  model: string;
  enabled: boolean;
  systemPrompt: string;
}

interface AiModel {
  id: string;
  ownedBy?: string;
}

export default function AiConfigPanel() {
  const [config, setConfig] = useState<AiConfigState>({
    apiUrl: "",
    apiKey: "",
    apiKeySet: false,
    model: "",
    enabled: false,
    systemPrompt: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [models, setModels] = useState<AiModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMsg, setModelsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/config`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          setConfig({
            apiUrl: data.data.apiUrl || "",
            apiKey: "",
            apiKeySet: data.data.apiKeySet || false,
            model: data.data.model || "",
            enabled: data.data.enabled || false,
            systemPrompt: data.data.systemPrompt || "",
          });
        }
      } catch (e) {
        // 忽略
      }
    })();
  }, []);

  const fetchModels = async () => {
    if (!config.apiUrl || (!config.apiKey && !config.apiKeySet)) {
      setModelsMsg({ type: "error", text: "请先填写接口地址和 API Key 并保存" });
      return;
    }
    setModelsLoading(true);
    setModelsMsg(null);
    try {
      const res = await fetch(`${API_BASE}/ai/models`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setModelsMsg({
          type: "error",
          text: localizeHttpResponse(res.status, errText, "获取模型列表失败"),
        });
        return;
      }
      const data = await res.json();
      if (data.success && data.data?.models) {
        setModels(data.data.models);
        setModelsMsg({ type: "success", text: `获取到 ${data.data.models.length} 个可用模型` });
      } else {
        setModelsMsg({ type: "error", text: data.message || "获取模型列表失败" });
      }
    } catch (e: any) {
      setModelsMsg({ type: "error", text: localizeFetchError(e, "获取模型列表失败") });
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const body: any = {
        apiUrl: config.apiUrl,
        model: config.model,
        enabled: config.enabled ? "true" : "false",
        systemPrompt: config.systemPrompt,
      };
      if (config.apiKey && !config.apiKey.includes("****")) {
        body.apiKey = config.apiKey;
      }
      const res = await fetch(`${API_BASE}/ai/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setMsg({
          type: "error",
          text: localizeHttpResponse(res.status, errText, "AI 配置保存失败"),
        });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "AI 配置保存成功" });
        setConfig((c) => ({ ...c, apiKey: "", apiKeySet: config.apiKey ? true : c.apiKeySet }));
      } else {
        setMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: localizeFetchError(e, "AI 配置保存失败") });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setTestResult({
          type: "error",
          text: localizeHttpResponse(res.status, errText, "AI 连接测试失败"),
        });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTestResult({
          type: "success",
          text: `连接成功（耗时 ${data.data.elapsed}ms，模型回复：${data.data.reply}）`,
        });
      } else {
        setTestResult({ type: "error", text: data.message || "连接失败" });
      }
    } catch (e: any) {
      setTestResult({ type: "error", text: localizeFetchError(e, "AI 连接测试失败") });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
          <Bot className="w-5 h-5 text-white dark:text-zinc-900" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            AI 助手配置
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Sparkles className="w-3 h-3" />
              改变世界
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            一句话管理整个系统 · 自然语言创建考试、导入数据、排查问题
          </p>
        </div>
      </div>

      {/* 启用开关 */}
      <div className="mb-5 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-white">启用 AI 助手</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              关闭后管理后台的 AI 对话入口将不可用
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            aria-pressed={config.enabled}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200",
              config.enabled ? "bg-zinc-900 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-700"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200",
                config.enabled ? "left-[22px]" : "left-[2px]"
              )}
            />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 接口地址 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            接口地址（API URL）
          </label>
          <input
            type="text"
            value={config.apiUrl}
            onChange={(e) => setConfig((c) => ({ ...c, apiUrl: e.target.value }))}
            placeholder="https://api.openai.com 或中转商地址"
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            支持官网或中转商地址，会自动补全 /v1/chat/completions 路径
          </p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={config.apiKey}
              onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
              placeholder={config.apiKeySet ? "已设置（输入新值可覆盖）" : "sk-..."}
              className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {config.apiKeySet && !config.apiKey && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              API Key 已配置
            </p>
          )}
        </div>

        {/* 模型选择 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            AI 模型
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              placeholder="如 gpt-4o-mini、deepseek-chat"
              className="flex-1 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
            <button
              type="button"
              onClick={fetchModels}
              disabled={modelsLoading}
              className="px-3 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {modelsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              获取模型
            </button>
          </div>
          {modelsMsg && (
            <p className={cn(
              "text-xs mt-1.5",
              modelsMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            )}>
              {modelsMsg.text}
            </p>
          )}
          {models.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, model: m.id }))}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    config.model === m.id
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
                  )}
                >
                  {m.id}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            提示：选择支持 Vision 的模型（如 gpt-4o、claude-3.5-sonnet）可启用图片识别能力
          </p>
        </div>

        {/* 系统提示词 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            自定义系统提示词（可选）
          </label>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
            placeholder="可补充平台特有规则、学校内部约定等，AI 会在内置平台知识之上额外学习这些内容"
            rows={4}
            maxLength={20000}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-y font-mono"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {config.systemPrompt.length} / 20000 字符 · 平台已内置默认提示词，此处为补充内容
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "保存中..." : "保存配置"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {testing ? "测试中..." : "测试连接"}
          </button>
        </div>

        {msg && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            msg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          )}>
            {msg.type === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {msg.text}
          </p>
        )}
        {testResult && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            testResult.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          )}>
            {testResult.type === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {testResult.text}
          </p>
        )}
      </div>

      {/* 能力 + 权限说明 */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI 助手能力
          </div>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>• <strong>考试管理</strong>：自然语言创建考试</li>
            <li>• <strong>数据导入</strong>：粘贴/上传名单批量导入</li>
            <li>• <strong>排查问题</strong>：查日志、异常登录、IP 黑名单、系统健康</li>
            <li>• <strong>用户管理</strong>：创建/启停用户、重置密码</li>
            <li>• <strong>内容整理</strong>：表格、文档、CSV 导出</li>
          </ul>
        </div>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            权限与安全
          </div>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>• <strong>危险操作</strong>：写入类操作需管理员确认</li>
            <li>• <strong>系统删除</strong>：AI 严禁删除系统内容</li>
            <li>• <strong>多模态输入</strong>：支持上传图片/文档</li>
            <li>• <strong>多模态输出</strong>：表格/文档/CSV 可下载</li>
            <li>• <strong>审计日志</strong>：所有 AI 操作均记录</li>
          </ul>
        </div>
      </div>

      {/* 多模态能力提示 */}
      <div className="mt-3 p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          多模态能力说明
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-500" />
            <div>
              <strong>输入</strong>：可上传图片（截图/照片/扫描件）和文档，AI 自动识别。需所选模型支持 Vision。
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-500" />
            <div>
              <strong>输出</strong>：AI 可生成 Markdown 表格、文档、CSV 代码块，提供一键复制/下载。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

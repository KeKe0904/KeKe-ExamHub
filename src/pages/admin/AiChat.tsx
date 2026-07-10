/**
 * KeKe ExamHub - 考试信息管理系统
 * AI 助手对话页面（流式 SSE + Function Calling + 危险操作确认 + 多模态输入/输出）
 *
 * 架构说明：请求生命周期由全局 Zustand store（aiChatStore）接管，
 * 组件只负责渲染和输入交互。页面切换时组件卸载，但 store 中的请求
 * 继续执行，切回来时直接显示最新回答，不丢失记录。
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/Layout/AdminLayout";
import Markdown, { CopyButton } from "@/components/Markdown";
import {
  Bot,
  Send,
  User,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
  Trash2,
  Wrench,
  Shield,
  ImageIcon,
  X,
  Download,
  ListOrdered,
} from "@/components/MathIcon";
import { cn } from "@/lib/utils";
import { localizeFetchError } from "@/utils/localize-error";
import { useAiChatStore, type Attachment, type ChatMessage } from "@/store/aiChatStore";

// ==================== 快捷指令 ====================

const QUICK_PROMPTS = [
  { label: "查看平台统计", prompt: "帮我查询一下平台的统计数据，包括考试、教师、学生、班级总数" },
  { label: "查询即将开始的考试", prompt: "查询即将开始的考试列表" },
  { label: "排查系统问题", prompt: "帮我排查一下系统是否有问题，查看健康状况、异常登录和 IP 黑名单" },
  { label: "查询教学楼和教室", prompt: "查询教学楼列表和每个楼下的教室" },
];

const TOOL_NAME_MAP: Record<string, string> = {
  query_exams: "查询考试",
  query_teachers: "查询教师",
  query_students: "查询学生",
  query_classes: "查询班级",
  query_stats: "查询统计",
  query_audit_logs: "查询操作日志",
  query_abnormal_logins: "查询异常登录",
  query_ip_blacklist: "查询 IP 黑名单",
  query_system_health: "查询系统健康",
  query_buildings: "查询教学楼",
  query_classrooms: "查询教室",
  query_domains: "查询域名",
  query_exam_students: "查询考试学生名单",
  create_exam: "创建考试",
  create_teacher: "创建教师",
  create_student: "创建学生",
  import_teachers: "批量导入教师",
  import_students: "批量导入学生",
  create_class: "创建班级",
  reset_teacher_password: "重置教师密码",
  reset_student_password: "重置学生密码",
  toggle_user_status: "启用/停用账号",
  create_announcement: "发布公告",
  edit_exam: "修改考试",
  edit_teacher: "修改教师",
  edit_student: "修改学生",
  assign_head_teacher: "分配班主任",
};

function getToolLabel(name: string): string {
  return TOOL_NAME_MAP[name] || name;
}

// ==================== 主组件 ====================

export default function AiChat() {
  // 从全局 store 读取状态（store 是模块级单例，页面切换不销毁）
  const messages = useAiChatStore((s) => s.messages);
  const sending = useAiChatStore((s) => s.sending);
  const aiEnabled = useAiChatStore((s) => s.aiEnabled);
  const errorMsg = useAiChatStore((s) => s.errorMsg);
  const streamingEnabled = useAiChatStore((s) => s.streamingEnabled);
  const pendingConfirm = useAiChatStore((s) => s.pendingConfirm);

  const loadHistory = useAiChatStore((s) => s.loadHistory);
  const checkAiEnabled = useAiChatStore((s) => s.checkAiEnabled);
  const sendMessage = useAiChatStore((s) => s.sendMessage);
  const confirmDangerous = useAiChatStore((s) => s.confirmDangerous);
  const cancelDangerous = useAiChatStore((s) => s.cancelDangerous);
  const stopGenerate = useAiChatStore((s) => s.stopGenerate);
  const clearHistory = useAiChatStore((s) => s.clearHistory);
  const toggleStreaming = useAiChatStore((s) => s.toggleStreaming);
  const setErrorMsg = useAiChatStore((s) => s.setErrorMsg);

  // 组件局部状态：仅输入框和附件（不影响请求生命周期）
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 首次挂载：加载历史 + 检查 AI 启用状态
  // store 内部用 historyLoaded 标记保证 loadHistory 只执行一次，
  // 页面切换回来时不会用 localStorage 覆盖进行中的对话
  useEffect(() => {
    loadHistory();
    checkAiEnabled();
  }, [loadHistory, checkAiEnabled]);

  // 滚动到底部（只在消息数量变化时滚动，流式增量不滚动避免抖动）
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const count = messages.length;
    if (count !== prevMsgCountRef.current) {
      prevMsgCountRef.current = count;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // textarea 自适应高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // ==================== 文件上传 ====================

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`文件 ${file.name} 超过 10MB 限制`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newAttachments.push({
          type: file.type.startsWith("image/") ? "image" : "file",
          dataUrl,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
      } catch (e: any) {
        setErrorMsg(localizeFetchError(e, `读取文件 ${file.name} 失败`));
      }
    }
    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      setErrorMsg(null);
    }
  };

  // 粘贴图片
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleFileSelect({ 0: file, length: 1 } as any);
      }
    }
  };

  // 统一发送处理：发送后立即清空输入框和附件
  const handleSend = () => {
    const text = input;
    const atts = attachments;
    if (!text.trim() && atts.length === 0) return;
    setInput("");
    setAttachments([]);
    sendMessage(text, atts);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ==================== 渲染 ====================

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8rem)]">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-zinc-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">小羽</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">AI 管理助手</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {aiEnabled === false && (
              <Link
                to="/admin/settings"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                未启用，去配置
              </Link>
            )}
            {/* 流式输出开关 */}
            <button
              type="button"
              onClick={toggleStreaming}
              disabled={sending}
              title={streamingEnabled ? "流式输出已开启，点击关闭（关闭后直接返回完整内容）" : "流式输出已关闭，点击开启"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40",
                streamingEnabled
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{streamingEnabled ? "流式" : "完整"}</span>
            </button>
            <button
              type="button"
              onClick={clearHistory}
              disabled={sending || messages.length === 0}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">清空</span>
            </button>
          </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
          {messages.length === 0 ? (
            <EmptyState onQuickPrompt={(p) => sendMessage(p)} aiEnabled={aiEnabled} />
          ) : (
            <div className="space-y-5">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* 附件预览 */}
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <div
                key={idx}
                className="relative group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              >
                {a.type === "image" ? (
                  <img src={a.dataUrl} alt={a.filename} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-zinc-500" />
                )}
                <span className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                  {a.filename}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区 */}
        <div className="mt-3 shrink-0">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => sendMessage(q.prompt)}
                  disabled={sending || aiEnabled === false}
                  className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  {q.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={aiEnabled === false}
              className="shrink-0 w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center disabled:opacity-40"
              title="上传图片/文档"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={aiEnabled === false ? "AI 助手未启用，请先在系统设置中开启" : "输入消息，Enter 发送，Shift+Enter 换行..."}
              disabled={aiEnabled === false}
              rows={1}
              className="flex-1 px-2 py-2 bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none resize-none disabled:opacity-50 max-h-[200px]"
            />
            {sending ? (
              <button
                type="button"
                onClick={stopGenerate}
                className="shrink-0 w-9 h-9 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center"
                title="停止生成"
              >
                <span className="block w-3 h-3 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || aiEnabled === false}
                className="shrink-0 w-9 h-9 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center justify-center"
                title="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 危险操作确认弹窗 */}
      {pendingConfirm && (
        <DangerousConfirmDialog
          name={pendingConfirm.name}
          args={pendingConfirm.args}
          dangerHint={pendingConfirm.dangerHint}
          onConfirm={confirmDangerous}
          onCancel={cancelDangerous}
        />
      )}
    </AdminLayout>
  );
}

// ==================== 读取文件为 DataURL ====================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== 空状态 ====================

function EmptyState({
  onQuickPrompt,
  aiEnabled,
}: {
  onQuickPrompt: (p: string) => void;
  aiEnabled: boolean | null;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-white dark:text-zinc-900" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1.5">你好，我是小羽</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">有什么可以帮你的？</p>

      {aiEnabled === false ? (
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          前往配置 AI 助手
        </Link>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onQuickPrompt(q.prompt)}
              className="text-left p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800 transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{q.label}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{q.prompt}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 消息气泡 ====================

// memo 化：仅在 message 引用变化时重渲染，避免 store setState 时所有历史消息重渲染
const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[85%]">
          {/* 用户消息的附件预览 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 justify-end">
              {message.attachments.map((a, idx) => (
                <div key={idx} className="relative">
                  {a.type === "image" ? (
                    <img
                      src={a.dataUrl}
                      alt={a.filename}
                      className="w-20 h-20 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl rounded-tr-sm px-4 py-2.5">
            <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
      </div>
      <div className="max-w-[85%] flex-1">
        {/* 任务阶段进度（分阶段回复机制） */}
        {message.phases && message.phases.length > 0 && (
          <PhaseProgress phases={message.phases} streaming={message.streaming} />
        )}

        {/* 工具调用过程 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {message.toolCalls.map((tc, idx) => (
              <ToolCallCard key={idx} toolCall={tc} />
            ))}
          </div>
        )}

        {/* 内容 */}
        <div
          className={cn(
            "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-2.5",
            message.error && "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
          )}
        >
          {message.content ? (
            <>
              <Markdown content={message.content} className="text-sm" streaming={message.streaming} />
              {/* 输出操作按钮 */}
              {!message.streaming && !message.error && message.content.length > 50 && (
                <OutputActions content={message.content} />
              )}
            </>
          ) : message.streaming ? (
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {message.phases && message.phases.length > 0
                ? `执行中：${message.phases[message.phases.length - 1].title}...`
                : "思考中..."}
            </div>
          ) : null}
          {message.streaming && message.content && (
            <span className="inline-block w-1.5 h-3.5 bg-zinc-400 dark:bg-zinc-500 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
});

// ==================== 任务阶段进度 ====================

function PhaseProgress({
  phases,
  streaming,
}: {
  phases: NonNullable<ChatMessage["phases"]>;
  streaming?: boolean;
}) {
  const total = phases.length;
  const completed = phases.filter((p) => p.status === "done" || p.status === "failed").length;
  const current = phases[phases.length - 1];
  const isRunning = streaming && current?.status === "start";

  return (
    <div className="mb-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <ListOrdered className="w-3.5 h-3.5" />
          任务进度
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
          {completed}/{total}
        </div>
      </div>
      {/* 进度条 */}
      <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-zinc-900 dark:bg-white transition-all duration-300"
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>
      {/* 当前阶段 */}
      {current && (
        <div className="flex items-center gap-1.5 text-xs">
          {current.status === "start" ? (
            <Loader2 className="w-3 h-3 animate-spin text-zinc-500 dark:text-zinc-400" />
          ) : current.status === "done" ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
          <span
            className={cn(
              "text-zinc-600 dark:text-zinc-400",
              isRunning && "text-zinc-900 dark:text-white font-medium"
            )}
          >
            {current.title}
          </span>
          {isRunning && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">进行中</span>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 工具调用卡片 ====================

function ToolCallCard({ toolCall }: { toolCall: import("@/store/aiChatStore").ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const label = getToolLabel(toolCall.name);
  const isDangerous = toolCall.risk === "dangerous";

  return (
    <div
      className={cn(
        "bg-zinc-50 dark:bg-zinc-800/50 border rounded-lg overflow-hidden",
        isDangerous
          ? "border-amber-200 dark:border-amber-900"
          : "border-zinc-200 dark:border-zinc-700"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Wrench
          className={cn(
            "w-3 h-3 shrink-0",
            isDangerous ? "text-amber-500" : "text-zinc-500 dark:text-zinc-400"
          )}
        />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {isDangerous && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5" />
            危险
          </span>
        )}
        {toolCall.status === "calling" && (
          <Loader2 className="w-3 h-3 animate-spin text-zinc-400 ml-auto" />
        )}
        {toolCall.status === "pending" && (
          <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
            <Shield className="w-3 h-3" />
            待确认
          </span>
        )}
        {toolCall.status === "done" && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
        )}
        {toolCall.status === "failed" && (
          <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">参数：</div>
            <pre className="p-1.5 bg-white dark:bg-zinc-900 rounded text-[11px] overflow-x-auto font-mono text-zinc-700 dark:text-zinc-300">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">结果：</div>
              <pre
                className={cn(
                  "p-1.5 rounded text-[11px] overflow-x-auto font-mono",
                  toolCall.success
                    ? "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                    : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                )}
              >
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 输出操作按钮 ====================

function OutputActions({ content }: { content: string }) {
  const downloadFile = (filename: string, text: string, mime: string) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 检测是否包含表格
  const hasTable = /\|.*\|[\s\S]*?\|/.test(content);
  // 检测是否包含代码块
  const hasCodeBlock = content.includes("```");

  // 提取 CSV 内容（从 Markdown 表格转换）
  const tableToCsv = (md: string): string | null => {
    const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
    if (lines.length < 2) return null;
    // 跳过分隔行
    const dataLines = lines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l));
    return dataLines
      .map((line) =>
        line
          .split("|")
          .map((c) => c.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1)
          .map((c) => `"${c.replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
  };

  return (
    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-1.5">
      <CopyButton text={content} />
      <button
        type="button"
        onClick={() => downloadFile(`ai-reply-${Date.now()}.md`, content, "text/markdown")}
        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
      >
        <Download className="w-2.5 h-2.5" />
        .md
      </button>
      {hasTable && (
        <button
          type="button"
          onClick={() => {
            const csv = tableToCsv(content);
            if (csv) downloadFile(`ai-table-${Date.now()}.csv`, "\ufeff" + csv, "text/csv;charset=utf-8");
          }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <Download className="w-2.5 h-2.5" />
          .csv
        </button>
      )}
      {hasCodeBlock && (
        <button
          type="button"
          onClick={() => {
            // 提取所有代码块内容
            const blocks = content.match(/```[\s\S]*?```/g) || [];
            const text = blocks.map((b) => b.replace(/^```\w*\n?/, "").replace(/```$/, "")).join("\n\n---\n\n");
            downloadFile(`ai-code-${Date.now()}.txt`, text, "text/plain");
          }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <Download className="w-2.5 h-2.5" />
          代码块
        </button>
      )}
    </div>
  );
}

// ==================== 危险操作确认弹窗 ====================

function DangerousConfirmDialog({
  name,
  args,
  dangerHint,
  onConfirm,
  onCancel,
}: {
  name: string;
  args: any;
  dangerHint: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const label = getToolLabel(name);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">危险操作确认</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">AI 请求执行一项需要管理员确认的操作</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">操作说明</div>
            <div className="text-sm text-amber-900 dark:text-amber-200">{dangerHint}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">工具：{label}</div>
            <pre className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-[11px] overflow-x-auto font-mono text-zinc-700 dark:text-zinc-300 max-h-40">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              确认后该操作将立即执行并写入数据库。所有 AI 操作均记录在审计日志中。
              如需取消，请点击"取消"。
            </span>
          </div>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}

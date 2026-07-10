/**
 * KeKe ExamHub - AI 对话全局状态管理
 *
 * 设计目标：把 AI 请求生命周期从组件中解耦，让请求在页面切换时继续执行，
 * 切回来时直接显示最新回答。组件卸载不中断请求，不丢失回答记录。
 *
 * 关键机制：
 * - Zustand store 是模块级单例，不受组件挂载/卸载影响
 * - 流式 SSE 持续写入 store，组件通过 useSyncExternalStore 订阅
 * - 历史记录持久化到 localStorage，不再过滤 streaming 消息
 * - rAF 节流用闭包变量，不依赖组件 ref
 *
 * @author 落梦陳 (KeKe0904) | 本项目使用 Trae IDE 开发
 */
import { create } from "zustand";
import { localizeFetchError, localizeHttpResponse } from "@/utils/localize-error";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const HISTORY_KEY = "examhub-ai-chat-history";

// ==================== 类型 ====================

export interface ToolCall {
  name: string;
  args: any;
  result?: any;
  success?: boolean;
  status: "calling" | "done" | "failed" | "pending";
  risk?: string;
  dangerHint?: string;
}

export interface Attachment {
  type: "image" | "file";
  dataUrl: string;
  filename: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  streaming?: boolean;
  error?: boolean;
  attachments?: Attachment[];
  /** 任务阶段进度（用于显示"步骤 1/N：XX"徽章） */
  phases?: Array<{
    phase: number;
    title: string;
    status: "start" | "done" | "failed";
  }>;
}

// ==================== 模块级变量（不触发重渲染） ====================

let msgIdCounter = 0;
const genMsgId = () => `msg-${Date.now()}-${++msgIdCounter}`;

// 当前请求的 AbortController（组件卸载不中断，只在发新消息/停止时中断）
let abortController: AbortController | null = null;
// 流式内容缓冲区（rAF 节流）
let streamingBuffer = "";
let rafId: number | null = null;
// 危险操作挂起时的完整 messages 快照（确认后回传后端）
let pendingMessagesSnapshot: any[] | null = null;
// 历史保存 debounce 计时器
let saveHistoryTimer: ReturnType<typeof setTimeout> | null = null;
// 标记历史是否已加载（避免页面切换回来时用 localStorage 覆盖进行中的对话）
let historyLoaded = false;

const getToken = () => {
  try {
    return localStorage.getItem("examhub-token") || sessionStorage.getItem("examhub-token") || "";
  } catch {
    return sessionStorage.getItem("examhub-token") || "";
  }
};

// 构建多模态消息内容（OpenAI Vision 格式）
function buildUserMessageContent(text: string, atts?: Attachment[]) {
  if (!atts || atts.length === 0) return text;
  const parts: any[] = [];
  if (text.trim()) parts.push({ type: "text", text });
  for (const a of atts) {
    if (a.type === "image") {
      parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
    } else {
      parts.push({ type: "text", text: `[已上传文件: ${a.filename}（${a.mimeType}）]` });
    }
  }
  return parts;
}

/**
 * 把前端 ChatMessage[] 转换为 OpenAI 兼容的 messages 数组。
 *
 * 关键点：OpenAI 要求 assistant 调用工具后，必须紧跟 role="tool" 的消息
 * （含 tool_call_id 和工具结果）。前端把工具调用和结果都存在 assistant
 * 消息的 toolCalls 数组里，这里需要展开成独立消息，否则 API 报 400。
 */
function buildPayloadMessages(history: ChatMessage[]): any[] {
  const result: any[] = [];
  for (const m of history) {
    // 跳过错误消息；跳过既无内容也无工具调用的空消息
    if (m.error) continue;
    if (!m.content && (!m.toolCalls || m.toolCalls.length === 0)) continue;

    if (m.role === "user") {
      result.push({ role: "user", content: m.content });
      continue;
    }

    // assistant：若有 toolCalls，按 OpenAI 规范展开
    if (m.toolCalls && m.toolCalls.length > 0) {
      // 1. assistant 消息携带 tool_calls（需要稳定的 id）
      const toolCallsPayload = m.toolCalls.map((tc, i) => ({
        id: `call_${m.id}_${i}`,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args || {}),
        },
      }));
      result.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: toolCallsPayload,
      });
      // 2. 每个工具调用对应一条 tool 消息
      for (let i = 0; i < m.toolCalls.length; i++) {
        const tc = m.toolCalls[i];
        const id = `call_${m.id}_${i}`;
        // pending（待确认）/ calling（执行中）的工具没有结果，用占位内容
        // 避免 OpenAI 报"missing tool result"
        const toolContent =
          tc.result !== undefined
            ? JSON.stringify(tc.result)
            : tc.status === "pending"
            ? JSON.stringify({ success: false, pending_confirmation: true, message: "等待管理员确认" })
            : JSON.stringify({ success: false, error: "工具执行未完成" });
        result.push({
          role: "tool",
          tool_call_id: id,
          content: toolContent,
        });
      }
    } else {
      // 纯文本 assistant 消息
      if (m.content) {
        result.push({ role: "assistant", content: m.content });
      }
    }
  }
  return result;
}

// 历史保存（debounce 500ms；保留所有消息，streaming 标记在加载时统一置 false）
function scheduleSaveHistory(msgs: ChatMessage[]) {
  if (saveHistoryTimer) clearTimeout(saveHistoryTimer);
  saveHistoryTimer = setTimeout(() => {
    try {
      const toSave = msgs.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        error: m.error,
        // 不持久化附件 data URL（可能数 MB，导致 localStorage 阻塞）
        attachments: m.attachments?.map((a) => ({
          type: a.type,
          filename: a.filename,
          mimeType: a.mimeType,
          dataUrl: "",
        })),
      }));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave.slice(-30)));
    } catch {}
  }, 500);
}

// ==================== Store 接口 ====================

interface AiChatState {
  messages: ChatMessage[];
  sending: boolean;
  aiEnabled: boolean | null;
  errorMsg: string | null;
  streamingEnabled: boolean;
  pendingConfirm: { name: string; args: any; dangerHint: string } | null;

  loadHistory: () => void;
  checkAiEnabled: () => Promise<void>;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  confirmDangerous: () => Promise<void>;
  cancelDangerous: () => void;
  stopGenerate: () => void;
  clearHistory: () => void;
  toggleStreaming: () => void;
  setErrorMsg: (msg: string | null) => void;
}

// ==================== Store 实现 ====================

export const useAiChatStore = create<AiChatState>((set, get) => {
  // 统一的 setMessages：更新消息并触发历史保存
  const setMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    set((state) => {
      const next = updater(state.messages);
      scheduleSaveHistory(next);
      return { messages: next };
    });
  };

  // rAF 节流 flush：把缓冲区内容追加到最后一条 assistant 消息
  const flushBuffer = () => {
    const buf = streamingBuffer;
    if (!buf) return;
    streamingBuffer = "";
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + buf };
      }
      return next;
    });
  };

  const scheduleFlush = () => {
    if (rafId) return; // 已有等待中的帧
    rafId = requestAnimationFrame(() => {
      rafId = null;
      flushBuffer();
    });
  };

  // 合并 flush + updater 为单次 setMessages（避免 setState 风暴）
  const updateLastMessage = (updater: (m: ChatMessage) => ChatMessage) => {
    const buf = streamingBuffer;
    streamingBuffer = "";
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        const withBuf = buf ? { ...last, content: last.content + buf } : last;
        next[next.length - 1] = updater(withBuf);
      }
      return next;
    });
  };

  // 消费 SSE 流
  const consumeSSE = async (res: Response) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("无法读取流式响应");
    const decoder = new TextDecoder();
    let buffer = "";

    // 把"挂起确认"逻辑独立成一个函数：
    // 即使 JSON 解析失败，也能用已经解析出的字段保证 pendingConfirm 被设置（弹框必弹）
    const handleDangerousPending = (rawData: any, parsedOk: boolean, parseErr?: any) => {
      // rawData 可能为 null（JSON 解析失败），此时退化为最小可用字段
      const name = rawData?.name || "(未知工具)";
      const args = rawData?.args || {};
      const dangerHint = rawData?.dangerHint || "该操作将修改系统数据，请确认";
      const idx = typeof rawData?.index === "number" ? rawData.index : 0;
      const pendingMessages = Array.isArray(rawData?.pendingMessages)
        ? rawData.pendingMessages
        : null;

      // 如果 pendingMessages 因 JSON 解析失败而丢失，记录错误（仍允许用户看到弹框，
      // 确认时会因为缺快照而失败，但至少用户能感知到 AI 在等待确认）
      if (!pendingMessages) {
        console.error("[aiChat] dangerous_pending 缺少 pendingMessages", {
          parsedOk,
          parseErr: parseErr?.message,
          name,
        });
      }

      pendingMessagesSnapshot = pendingMessages;
      updateLastMessage((m) => {
        const calls = [...(m.toolCalls || [])];
        // 即使索引错位，也兜底：把第一个 pending 工具标记为待确认
        if (calls[idx]) {
          calls[idx] = { ...calls[idx], status: "pending", dangerHint };
        } else if (calls.length > 0) {
          calls[calls.length - 1] = {
            ...calls[calls.length - 1],
            status: "pending",
            dangerHint,
          };
        }
        return { ...m, toolCalls: calls, streaming: false };
      });
      // 关键：无论 toolCalls 索引是否匹配，都必定设置 pendingConfirm → 弹框必弹
      set({
        pendingConfirm: { name, args, dangerHint },
      });
    };

    try {
      while (true) {
        // 检查是否已被主动中断
        if (abortController?.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          const lines = evt.split("\n");
          let eventType = "";
          let eventData = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) eventType = ln.slice(6).trim();
            else if (ln.startsWith("data:")) eventData += ln.slice(5).trim();
          }
          if (!eventType) continue;

          // dangerous_pending 单独处理：保证弹框必弹（即使 JSON 解析失败）
          if (eventType === "dangerous_pending") {
            let parsed: any = null;
            let parseErr: any = null;
            try {
              parsed = JSON.parse(eventData);
            } catch (e) {
              parseErr = e;
            }
            handleDangerousPending(parsed, parsed !== null, parseErr);
            continue;
          }

          try {
            const data = JSON.parse(eventData);
            if (eventType === "delta") {
              streamingBuffer += data.delta || "";
              scheduleFlush();
            } else if (eventType === "phase") {
              // 任务阶段进度（分阶段回复机制）
              updateLastMessage((m) => {
                const phases = [...(m.phases || [])];
                const idx = phases.findIndex((p) => p.phase === data.phase);
                const entry = {
                  phase: data.phase,
                  title: data.title,
                  status: data.status as "start" | "done" | "failed",
                };
                if (idx >= 0) {
                  phases[idx] = entry;
                } else {
                  phases.push(entry);
                }
                return { ...m, phases };
              });
            } else if (eventType === "tool_call") {
              updateLastMessage((m) => ({
                ...m,
                toolCalls: [
                  ...(m.toolCalls || []),
                  {
                    name: data.name,
                    args: data.args,
                    status: data.risk === "dangerous" ? "pending" : "calling",
                    risk: data.risk,
                  },
                ],
              }));
            } else if (eventType === "tool_result") {
              updateLastMessage((m) => {
                const calls = [...(m.toolCalls || [])];
                if (calls[data.index]) {
                  calls[data.index] = {
                    ...calls[data.index],
                    result: data.result,
                    success: data.success,
                    status: data.success ? "done" : "failed",
                  };
                }
                return { ...m, toolCalls: calls };
              });
            } else if (eventType === "done") {
              updateLastMessage((m) => ({
                ...m,
                content: data.full || m.content,
                streaming: false,
              }));
            } else if (eventType === "error") {
              // 区分错误来源：
              // - api_error     → 上游 AI 服务返回错误（API Key/模型/额度等）
              // - network_error → 连不上上游
              // - system_error  → 后端代码异常
              const errorType = data.errorType || "system_error";
              const rawMsg = String(data.message || "AI 服务返回错误");
              const prefix =
                errorType === "api_error"
                  ? "AI 服务错误"
                  : errorType === "network_error"
                  ? "网络错误"
                  : "系统错误";
              const errMsg = `[${prefix}] ${rawMsg}`;
              updateLastMessage((m) => ({
                ...m,
                content: m.content + `\n\n[错误] ${errMsg}`,
                streaming: false,
                error: true,
              }));
            }
          } catch (e) {
            // 仅记录，不静默吞错（避免漏掉关键事件如 dangerous_pending）
            console.warn("[aiChat] SSE 事件解析失败", {
              eventType,
              error: (e as Error)?.message,
            });
          }
        }
      }
      // 流正常结束：flush 残留 buffer + 确保 streaming 关闭
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushBuffer();
      updateLastMessage((m) => ({ ...m, streaming: false }));
    } catch (streamErr: any) {
      // SSE 流读取异常（网络中断、服务器关闭连接等）
      // 保留已收到的内容，并附加错误提示
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushBuffer();
      const errName = streamErr?.name || "";
      const isAbort = errName === "AbortError" || abortController?.signal.aborted;
      updateLastMessage((m) => {
        if (isAbort) {
          // 用户主动停止：保留已有内容
          return { ...m, streaming: false };
        }
        // 网络中断：附加错误提示
        const hint = "AI 响应流中断（可能是网络不稳定或服务器超时），请重试";
        return {
          ...m,
          content: m.content ? `${m.content}\n\n${hint}` : hint,
          streaming: false,
          error: true,
        };
      });
    } finally {
      // 任何退出路径都释放 reader，避免底层流连接泄漏
      try {
        await reader.cancel();
      } catch {}
      try {
        reader.releaseLock();
      } catch {}
    }
  };

  // 调用 /ai/chat（根据 streamingEnabled 决定流式或非流式）
  const streamChat = async (payloadMessages: any[]) => {
    set({ sending: true });
    const controller = abortController!;
    const useStream = get().streamingEnabled;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ messages: payloadMessages, stream: useStream }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const errMsg = localizeHttpResponse(res.status, errText, "AI 对话请求失败");
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last)
            next[next.length - 1] = { ...last, content: errMsg, streaming: false, error: true };
          return next;
        });
        return;
      }

      if (useStream) {
        await consumeSSE(res);
      } else {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.pendingConfirmation) {
            // 非流式模式遇到 dangerous 工具
            pendingMessagesSnapshot = data.data.pendingMessages;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.toolCalls) {
                next[next.length - 1] = {
                  ...last,
                  streaming: false,
                  toolCalls: last.toolCalls.map((tc, i) =>
                    i === (data.data.toolCallIndex || 0)
                      ? { ...tc, status: "pending" as const, dangerHint: data.data.dangerHint }
                      : tc
                  ),
                };
              }
              return next;
            });
            set({
              pendingConfirm: {
                name: data.data.name,
                args: data.data.args,
                dangerHint: data.data.dangerHint,
              },
            });
          } else {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                const toolCalls = data.data.toolCalls?.map((tc: any) => ({
                  name: tc.name,
                  args: tc.args,
                  result: tc.result,
                  success: tc.success,
                  status: (tc.success ? "done" : "failed") as "done" | "failed",
                  risk: tc.risk,
                }));
                next[next.length - 1] = {
                  ...last,
                  content: data.data.content || last.content || "（AI 未返回内容）",
                  streaming: false,
                  toolCalls: toolCalls || last.toolCalls,
                };
              }
              return next;
            });
          }
        } else {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last)
              next[next.length - 1] = {
                ...last,
                content: data.message || "AI 回复失败",
                streaming: false,
                error: true,
              };
            return next;
          });
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // 用户主动停止：保留已有内容，标记结束
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              streaming: false,
              content: last.content || "（已停止）",
            };
          }
          return next;
        });
      } else {
        const errMsg = localizeFetchError(e, "AI 对话请求异常");
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: last.content || errMsg,
              streaming: false,
              error: true,
            };
          }
          return next;
        });
      }
    } finally {
      streamingBuffer = "";
      set({ sending: false });
    }
  };

  return {
    messages: [],
    sending: false,
    aiEnabled: null,
    errorMsg: null,
    streamingEnabled: (() => {
      try {
        return localStorage.getItem("examhub-ai-streaming") !== "false";
      } catch {
        return true;
      }
    })(),
    pendingConfirm: null,

    // 加载历史（仅首次挂载执行，避免页面切换回来时覆盖进行中的对话）
    loadHistory: () => {
      if (historyLoaded) return;
      historyLoaded = true;
      try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            set({
              messages: parsed.map((m: ChatMessage) => ({
                ...m,
                id: genMsgId(),
                streaming: false,
              })),
            });
          }
        }
      } catch {}
    },

    checkAiEnabled: async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/config`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        set({ aiEnabled: data.success && data.data ? data.data.enabled : false });
      } catch {
        set({ aiEnabled: false });
      }
    },

    sendMessage: async (text, attachments) => {
      const trimmed = text.trim();
      if ((!trimmed && (!attachments || attachments.length === 0)) || get().sending) return;
      if (get().aiEnabled === false) {
        set({ errorMsg: "AI 助手未启用，请先在系统设置中开启" });
        return;
      }

      set({ errorMsg: null });
      pendingMessagesSnapshot = null;
      // 取消上一次进行中的请求（若有）
      abortController?.abort();
      abortController = new AbortController();
      streamingBuffer = "";

      const userMsg: ChatMessage = {
        id: genMsgId(),
        role: "user",
        content: trimmed || "(已上传文件)",
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };
      const assistantMsg: ChatMessage = {
        id: genMsgId(),
        role: "assistant",
        content: "",
        streaming: true,
        toolCalls: [],
      };

      const previousMessages = get().messages;
      const newMessages = [...previousMessages, userMsg, assistantMsg];
      setMessages(() => newMessages);

      // 构建发送给后端的消息：把历史 ChatMessage[] 转为 OpenAI 兼容格式
      // （保留 tool_calls 和 tool 角色消息，避免多轮工具对话上下文断裂）
      const payloadMessages = [
        ...buildPayloadMessages(previousMessages),
        {
          role: "user" as const,
          content: buildUserMessageContent(trimmed, attachments),
        },
      ];

      await streamChat(payloadMessages);
    },

    confirmDangerous: async () => {
      if (!get().pendingConfirm) {
        return;
      }
      // pendingMessagesSnapshot 为 null 表示 dangerous_pending 事件数据不完整
      // （极端兜底场景：JSON 解析失败导致 pendingMessages 丢失）
      if (!pendingMessagesSnapshot) {
        set({ pendingConfirm: null });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content:
                last.content +
                "\n\n[失败] 无法执行该操作：确认上下文已丢失（可能是网络中断或数据解析错误），请重新发起请求。",
              streaming: false,
              error: true,
            };
          }
          return next;
        });
        return;
      }
      set({ pendingConfirm: null, sending: true });

      abortController?.abort();
      abortController = new AbortController();
      streamingBuffer = "";

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            content: last.content + "\n\n[已确认] 管理员已确认，开始执行...",
            streaming: true,
            toolCalls: last.toolCalls?.map((tc) =>
              tc.status === "pending" ? { ...tc, status: "calling" as const } : tc
            ),
          };
        }
        return next;
      });

      try {
        const res = await fetch(`${API_BASE}/ai/chat/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            messages: pendingMessagesSnapshot,
            stream: get().streamingEnabled,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          const errMsg = localizeHttpResponse(res.status, errText, "确认后执行失败");
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last)
              next[next.length - 1] = {
                ...last,
                content: last.content + `\n\n[失败] ${errMsg}`,
                streaming: false,
                error: true,
              };
            return next;
          });
          return;
        }

        if (get().streamingEnabled) {
          await consumeSSE(res);
        } else {
          const data = await res.json();
          if (data.success && data.data) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                const toolCalls = data.data.toolCalls?.map((tc: any) => ({
                  name: tc.name,
                  args: tc.args,
                  result: tc.result,
                  success: tc.success,
                  status: (tc.success ? "done" : "failed") as "done" | "failed",
                  risk: tc.risk,
                }));
                next[next.length - 1] = {
                  ...last,
                  content: data.data.content || last.content || "（AI 未返回内容）",
                  streaming: false,
                  toolCalls: toolCalls || last.toolCalls,
                };
              }
              return next;
            });
          } else {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last)
                next[next.length - 1] = {
                  ...last,
                  content: data.message || "确认后执行失败",
                  streaming: false,
                  error: true,
                };
              return next;
            });
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          const errMsg = localizeFetchError(e, "确认执行异常");
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last)
              next[next.length - 1] = {
                ...last,
                content: last.content + `\n\n[失败] ${errMsg}`,
                streaming: false,
                error: true,
              };
            return next;
          });
        }
      } finally {
        streamingBuffer = "";
        set({ sending: false });
        pendingMessagesSnapshot = null;
      }
    },

    cancelDangerous: () => {
      set({ pendingConfirm: null });
      pendingMessagesSnapshot = null;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          const toolCalls = (last.toolCalls || []).map((tc) =>
            tc.status === "pending"
              ? {
                  ...tc,
                  status: "failed" as const,
                  success: false,
                  result: { success: false, error: "管理员已取消" },
                }
              : tc
          );
          next[next.length - 1] = {
            ...last,
            content: last.content + "\n\n[已取消] 管理员已取消该危险操作。",
            streaming: false,
            toolCalls,
          };
        }
        return next;
      });
      set({ sending: false });
    },

    stopGenerate: () => {
      abortController?.abort();
      abortController = null;
      streamingBuffer = "";
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      set({ sending: false });
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && last.streaming) {
          next[next.length - 1] = {
            ...last,
            streaming: false,
            content: last.content + "\n\n（已停止）",
          };
        }
        return next;
      });
    },

    clearHistory: () => {
      if (get().sending) return;
      set({ messages: [] });
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {}
    },

    toggleStreaming: () => {
      set((state) => {
        const next = !state.streamingEnabled;
        try {
          localStorage.setItem("examhub-ai-streaming", String(next));
        } catch {}
        return { streamingEnabled: next };
      });
    },

    setErrorMsg: (msg) => set({ errorMsg: msg }),
  };
});

/**
 * KeKe ExamHub - 考试信息管理系统
 * AI 助手路由（配置 / 模型 / 测试 / 多模态对话 + Function Calling + 危险操作确认）
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { logAdminAction } from "../utils/audit-log.js";
import { buildSystemPrompt } from "../utils/ai-prompt.js";
import { AI_TOOLS, executeAiTool, TOOL_META } from "../utils/ai-tools.js";
import {
  localizeNetworkError,
  localizeUpstreamHttpError,
  localizeError,
} from "../utils/localize-error.js";

// ==================== 配置读取 ====================

interface AiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  systemPrompt: string;
}

async function loadAiConfig(): Promise<AiConfig> {
  const [rows] = await pool.execute(
    `SELECT setting_key, setting_value FROM settings
     WHERE setting_key IN ('ai_api_url','ai_api_key','ai_model','ai_enabled','ai_system_prompt')`
  );
  const map: Record<string, string> = {};
  (rows as any[]).forEach((r) => {
    map[r.setting_key] = r.setting_value;
  });
  return {
    apiUrl: map.ai_api_url || "",
    apiKey: map.ai_api_key || "",
    model: map.ai_model || "",
    enabled: map.ai_enabled === "true",
    systemPrompt: map.ai_system_prompt || "",
  };
}

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function normalizeApiUrl(url: string): string {
  let u = (url || "").trim().replace(/\/+$/, "");
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function chatCompletionsUrl(apiUrl: string): string {
  const base = normalizeApiUrl(apiUrl);
  if (/\/v1\/chat\/completions$/.test(base)) return base;
  if (/\/v1$/.test(base)) return base + "/chat/completions";
  return base + "/v1/chat/completions";
}

function modelsUrl(apiUrl: string): string {
  const base = normalizeApiUrl(apiUrl);
  if (/\/v1\/models$/.test(base)) return base;
  if (/\/v1$/.test(base)) return base + "/models";
  return base + "/v1/models";
}

// ==================== 消息类型 ====================

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
  tool_calls?: any[];
  tool_call_id?: string;
}

// ==================== 路由主函数 ====================

export default async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authMiddleware);

  // ---------- GET /config ----------
  fastify.get("/config", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cfg = await loadAiConfig();
      return reply.send(
        successResponse({
          apiUrl: cfg.apiUrl,
          apiKey: maskApiKey(cfg.apiKey),
          apiKeySet: Boolean(cfg.apiKey),
          model: cfg.model,
          enabled: cfg.enabled,
          systemPrompt: cfg.systemPrompt,
        })
      );
    } catch (error) {
      console.error("获取 AI 配置失败:", error);
      return reply.status(500).send(errorResponse("获取 AI 配置失败"));
    }
  });

  // ---------- PUT /config ----------
  fastify.put("/config", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { apiUrl, apiKey, model, enabled, systemPrompt } = request.body as {
        apiUrl?: string;
        apiKey?: string;
        model?: string;
        enabled?: boolean | string;
        systemPrompt?: string;
      };

      const updates: { key: string; value: string }[] = [];

      if (apiUrl !== undefined) {
        if (apiUrl.length > 500) return reply.status(400).send(errorResponse("AI 接口地址过长"));
        updates.push({ key: "ai_api_url", value: apiUrl });
      }
      if (apiKey !== undefined && !apiKey.includes("****")) {
        if (apiKey.length > 500) return reply.status(400).send(errorResponse("AI API Key 过长"));
        updates.push({ key: "ai_api_key", value: apiKey });
      }
      if (model !== undefined) {
        if (model.length > 200) return reply.status(400).send(errorResponse("AI 模型名称过长"));
        updates.push({ key: "ai_model", value: model });
      }
      if (enabled !== undefined) {
        const val = typeof enabled === "boolean" ? (enabled ? "true" : "false") : enabled;
        updates.push({ key: "ai_enabled", value: val });
      }
      if (systemPrompt !== undefined) {
        if (systemPrompt.length > 20000)
          return reply.status(400).send(errorResponse("AI 系统提示词过长（最大 20000 字符）"));
        updates.push({ key: "ai_system_prompt", value: systemPrompt });
      }

      for (const { key, value } of updates) {
        await pool.execute(
          `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, value]
        );
      }

      logAdminAction(user.id, user.username, "ai_config_update", {
        updatedKeys: updates.map((u) => u.key),
      });
      return reply.send(successResponse(null, "AI 配置更新成功"));
    } catch (error) {
      console.error("更新 AI 配置失败:", error);
      return reply.status(500).send(errorResponse(localizeError(error, "更新 AI 配置失败")));
    }
  });

  // ---------- GET /models ----------
  fastify.get("/models", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const cfg = await loadAiConfig();
      if (!cfg.apiUrl || !cfg.apiKey)
        return reply.status(400).send(errorResponse("请先配置 AI 接口地址和 API Key"));

      const url = modelsUrl(cfg.apiUrl);
      const resp = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        logAdminAction(user.id, user.username, "ai_models_fetch", {
          success: false,
          status: resp.status,
        });
        return reply
          .status(resp.status)
          .send(errorResponse(localizeUpstreamHttpError(resp.status, errText, "获取模型列表失败")));
      }

      const data: any = await resp.json();
      const models: Array<{ id: string; ownedBy?: string }> = Array.isArray(data?.data)
        ? data.data.map((m: any) => ({ id: m.id || m.name || String(m), ownedBy: m.owned_by }))
        : Array.isArray(data?.models)
        ? data.models.map((m: any) => ({
            id: typeof m === "string" ? m : m.id || m.name || "",
            ownedBy: typeof m === "object" ? m.owned_by : undefined,
          }))
        : [];

      logAdminAction(user.id, user.username, "ai_models_fetch", {
        success: true,
        count: models.length,
      });
      return reply.send(successResponse({ models }));
    } catch (error: any) {
      console.error("获取 AI 模型列表失败:", error);
      return reply.status(500).send(errorResponse(localizeNetworkError(error, "获取模型列表失败")));
    }
  });

  // ---------- POST /test ----------
  fastify.post("/test", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const cfg = await loadAiConfig();
      if (!cfg.apiUrl || !cfg.apiKey)
        return reply.status(400).send(errorResponse("请先配置 AI 接口地址和 API Key"));

      const url = chatCompletionsUrl(cfg.apiUrl);
      const startTime = Date.now();
      const testModel = cfg.model || "gpt-3.5-turbo";

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            { role: "system", content: "你是一个连接测试助手，请回复'连接成功'。" },
            { role: "user", content: "ping" },
          ],
          max_tokens: 20,
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const elapsed = Date.now() - startTime;
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        logAdminAction(user.id, user.username, "ai_connection_test", {
          success: false,
          status: resp.status,
          elapsed,
        });
        return reply
          .status(resp.status)
          .send(errorResponse(localizeUpstreamHttpError(resp.status, errText, "AI 连接测试失败")));
      }

      const data: any = await resp.json();
      const replyContent = data?.choices?.[0]?.message?.content || "(空响应)";

      logAdminAction(user.id, user.username, "ai_connection_test", {
        success: true,
        model: testModel,
        elapsed,
      });
      return reply.send(
        successResponse({ model: testModel, elapsed, reply: replyContent }, "AI 连接测试成功")
      );
    } catch (error: any) {
      console.error("AI 连接测试失败:", error);
      return reply.status(500).send(errorResponse(localizeNetworkError(error, "AI 连接测试失败")));
    }
  });

  // ---------- POST /upload：上传图片/文档（base64），返回 data URL ----------
  fastify.post("/upload", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { mimeType, base64Data, filename } = request.body as {
        mimeType?: string;
        base64Data?: string;
        filename?: string;
      };

      if (!base64Data) {
        return reply.status(400).send(errorResponse("缺少 base64Data 字段"));
      }
      // 限制 10MB
      const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
      if (sizeBytes > 10 * 1024 * 1024) {
        return reply.status(413).send(errorResponse("文件过大（最大 10MB）"));
      }

      const type = mimeType || "application/octet-stream";
      const dataUrl = `data:${type};base64,${base64Data}`;

      logAdminAction((request as any).user.id, (request as any).user.username, "ai_tool_execute", {
        tool: "upload_file",
        filename: filename || "",
        mimeType: type,
        sizeBytes,
      });

      return reply.send(
        successResponse(
          {
            dataUrl,
            mimeType: type,
            filename: filename || "",
            sizeBytes,
            // 是否为图片（Vision 模型可直接识别）
            isImage: type.startsWith("image/"),
          },
          "上传成功"
        )
      );
    } catch (error: any) {
      console.error("AI 文件上传失败:", error);
      return reply.status(500).send(errorResponse(localizeError(error, "文件上传失败")));
    }
  });

  // ---------- POST /chat：流式对话 + Function Calling + 危险操作确认 ----------
  fastify.post("/chat", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const cfg = await loadAiConfig();

      if (!cfg.enabled)
        return reply.status(403).send(errorResponse("AI 助手未启用，请先在设置中开启"));
      if (!cfg.apiUrl || !cfg.apiKey)
        return reply.status(400).send(errorResponse("请先配置 AI 接口地址和 API Key"));
      if (!cfg.model) return reply.status(400).send(errorResponse("请先选择 AI 模型"));

      const { messages, stream = true, autoConfirmDangerous = false } = request.body as {
        messages: ChatMessage[];
        stream?: boolean;
        // 前端可标记本次请求中所有 dangerous 工具调用均已通过用户确认
        autoConfirmDangerous?: boolean;
      };

      if (!Array.isArray(messages) || messages.length === 0)
        return reply.status(400).send(errorResponse("消息列表为空"));

      // 安全/稳定性修复：限制输入消息数量，避免上下文无限增长导致 API 400/413
      // 保留最近 30 条消息（足够多轮对话），更早的历史由前端持久化展示
      const MAX_INPUT_MESSAGES = 30;
      const trimmedMessages = messages.length > MAX_INPUT_MESSAGES
        ? messages.slice(-MAX_INPUT_MESSAGES)
        : messages;

      const lastUserMsg = [...trimmedMessages].reverse().find((m) => m.role === "user");
      const previewText =
        typeof lastUserMsg?.content === "string"
          ? lastUserMsg.content
          : Array.isArray(lastUserMsg?.content)
          ? (lastUserMsg!.content.find((c: any) => c.type === "text") as any)?.text || ""
          : "";
      logAdminAction(user.id, user.username, "ai_chat", {
        messageCount: trimmedMessages.length,
        originalCount: messages.length,
        preview: previewText.slice(0, 100),
        stream,
      });

      const systemPrompt = buildSystemPrompt(cfg.systemPrompt);
      const fullMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ];

      const url = chatCompletionsUrl(cfg.apiUrl);

      // ---------- 流式 ----------
      if (stream) {
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });

        const send = (event: string, data: any) => {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // 标记 onError 是否已处理过错误，避免外层 catch 重复发送 error 事件
        let errorHandled = false;

        try {
          await runChatLoop({
            url,
            apiKey: cfg.apiKey,
            model: cfg.model,
            messages: fullMessages,
            stream: true,
            autoConfirmDangerous,
            adminUser: user,
            onDelta: (delta) => send("delta", { delta }),
            onToolCall: (info) => send("tool_call", info),
            onToolResult: (info) => send("tool_result", info),
            onDangerousPending: (info) => send("dangerous_pending", info),
            onPhase: (info) => send("phase", info),
            onDone: (full) => send("done", { full }),
            onError: (message, errorType, details) => {
              if (errorHandled) return; // 防止重复发送
              errorHandled = true;
              send("error", { message, errorType, details });
              // 同步记录到审计日志，便于排查
              logAdminAction(user.id, user.username, "ai_error", {
                errorType,
                message,
                status: details?.status,
                upstreamBodyPreview: details?.upstreamBody?.slice(0, 500),
                code: details?.code,
              });
            },
          });
        } catch (e: any) {
          // 兜底：仅当 onError 未处理过时才发送 system_error
          if (!errorHandled) {
            const errMsg = e?.message || "流式响应异常";
            send("error", { message: errMsg, errorType: "system_error" });
            logAdminAction(user.id, user.username, "ai_error", {
              errorType: "system_error",
              message: errMsg,
              stack: e?.stack,
            });
          }
        } finally {
          reply.raw.end();
        }
        return;
      }

      // ---------- 非流式 ----------
      const result = await runChatLoop({
        url,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages: fullMessages,
        stream: false,
        autoConfirmDangerous,
        adminUser: user,
      });

      // 非流式模式下可能返回 pendingConfirmation（危险操作待确认）
      if (result.pendingConfirmation) {
        return reply.send(
          successResponse(
            {
              content: result.content,
              toolCalls: result.toolCalls,
              pendingConfirmation: true,
              name: result.pendingConfirmation.name,
              args: result.pendingConfirmation.args,
              toolCallIndex: result.pendingConfirmation.toolCallIndex,
              dangerHint: result.pendingConfirmation.dangerHint,
              pendingMessages: result.pendingConfirmation.pendingMessages,
            },
            "等待管理员确认"
          )
        );
      }

      return reply.send(
        successResponse(
          { content: result.content, toolCalls: result.toolCalls },
          "AI 回复成功"
        )
      );
    } catch (error: any) {
      console.error("AI 对话失败:", error);
      return reply.status(500).send(errorResponse(localizeError(error, "AI 对话失败")));
    }
  });

  // ---------- POST /chat/confirm：危险操作确认后继续执行 ----------
  // 请求体携带原 messages + 已确认的工具调用列表，后端重新跑一轮循环
  fastify.post("/chat/confirm", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const cfg = await loadAiConfig();
      if (!cfg.enabled)
        return reply.status(403).send(errorResponse("AI 助手未启用"));
      if (!cfg.apiUrl || !cfg.apiKey || !cfg.model)
        return reply.status(400).send(errorResponse("AI 配置不完整"));

      const { messages, stream = true } = request.body as {
        messages: ChatMessage[];
        stream?: boolean;
      };

      if (!Array.isArray(messages) || messages.length === 0)
        return reply.status(400).send(errorResponse("消息列表为空"));

      // 修复：pendingMessages 末尾是 assistant(带 tool_calls) 但没有对应的 tool 消息，
      // 直接传给 OpenAI 会报 400 "工具调用格式错误"。
      // 这里为每个未完成的 tool_call 补一条占位 tool 消息（提示 AI 重新发起调用），
      // AI 在下一轮会重新发起工具调用（autoConfirmDangerous=true 时 runChatLoop 会真正执行）。
      const patchedMessages = [...messages];
      const lastMsg = patchedMessages[patchedMessages.length - 1];
      if (lastMsg && lastMsg.role === "assistant" && Array.isArray(lastMsg.tool_calls) && lastMsg.tool_calls.length > 0) {
        for (const tc of lastMsg.tool_calls) {
          patchedMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              status: "confirmed",
              message: "管理员已确认此操作。请重新调用该工具以真正执行。",
            }),
          } as any);
        }
      }

      logAdminAction(user.id, user.username, "ai_tool_execute", {
        tool: "dangerous_confirm",
        messageCount: patchedMessages.length,
      });

      const systemPrompt = buildSystemPrompt(cfg.systemPrompt);
      const fullMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...patchedMessages,
      ];

      const url = chatCompletionsUrl(cfg.apiUrl);

      if (stream) {
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        const send = (event: string, data: any) => {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        // 标记 onError 是否已处理过错误，避免外层 catch 重复发送 error 事件
        let errorHandled = false;
        try {
          // 确认模式下：所有 dangerous 工具视为已确认，自动执行
          await runChatLoop({
            url,
            apiKey: cfg.apiKey,
            model: cfg.model,
            messages: fullMessages,
            stream: true,
            autoConfirmDangerous: true,
            adminUser: user,
            onDelta: (delta) => send("delta", { delta }),
            onToolCall: (info) => send("tool_call", info),
            onToolResult: (info) => send("tool_result", info),
            onDangerousPending: () => {
              /* 不会触发 */
            },
            onPhase: (info) => send("phase", info),
            onDone: (full) => send("done", { full }),
            onError: (message, errorType, details) => {
              if (errorHandled) return;
              errorHandled = true;
              send("error", { message, errorType, details });
              logAdminAction(user.id, user.username, "ai_error", {
                errorType,
                message,
                stage: "dangerous_confirm",
                status: details?.status,
                upstreamBodyPreview: details?.upstreamBody?.slice(0, 500),
                code: details?.code,
              });
            },
          });
        } catch (e: any) {
          if (!errorHandled) {
            const errMsg = e?.message || "确认后执行异常";
            send("error", { message: errMsg, errorType: "system_error" });
            logAdminAction(user.id, user.username, "ai_error", {
              errorType: "system_error",
              message: errMsg,
              stage: "dangerous_confirm",
              stack: e?.stack,
            });
          }
        } finally {
          reply.raw.end();
        }
        return;
      }

      const result = await runChatLoop({
        url,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages: fullMessages,
        stream: false,
        autoConfirmDangerous: true,
        adminUser: user,
      });
      return reply.send(successResponse({ content: result.content, toolCalls: result.toolCalls }));
    } catch (error: any) {
      console.error("AI 确认执行失败:", error);
      return reply.status(500).send(errorResponse(localizeError(error, "确认执行失败")));
    }
  });
}

// ==================== Function Calling 循环 ====================

interface ChatLoopParams {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  autoConfirmDangerous: boolean;
  adminUser: { id: number; username: string };
  onDelta?: (delta: string) => void;
  onToolCall?: (info: { name: string; args: any; index: number; risk: string }) => void;
  onToolResult?: (info: {
    name: string;
    args: any;
    result: any;
    success: boolean;
    index: number;
  }) => void;
  onDangerousPending?: (info: {
    name: string;
    args: any;
    index: number;
    dangerHint: string;
    // 传给前端的"挂起快照"：完整的 messages（含 assistant tool_calls），前端确认后回传
    pendingMessages: ChatMessage[];
  }) => void;
  /** 任务阶段进度通知（分阶段回复机制） */
  onPhase?: (info: {
    phase: number;          // 当前阶段编号（从 1 开始）
    total?: number;         // 预估总阶段数（可选，AI 不一定提供）
    title: string;          // 阶段标题（如"创建教师"、"查询考试"）
    status: "start" | "done" | "failed";
  }) => void;
  onDone?: (full: string) => void;
  /**
   * 错误回调。
   * - message: 已本地化的中文错误提示（用于直接展示给用户）
   * - errorType: 错误来源分类，便于前端区分提示
   *     api_error     → 上游 AI 服务返回 4xx/5xx（如 API Key 错误、模型不存在、额度不足）
   *     network_error → 连不上上游（DNS、超时、连接拒绝）
   *     system_error  → 后端代码异常或数据库错误
   * - details: 原始调试信息（不展示给用户，仅记录到审计日志）
   */
  onError?: (
    message: string,
    errorType: "api_error" | "network_error" | "system_error",
    details?: { status?: number; upstreamBody?: string; stack?: string; code?: string }
  ) => void;
}

interface ChatLoopResult {
  content: string;
  toolCalls: Array<{ name: string; args: any; result: any; success: boolean; risk?: string }>;
  /**
   * 非流式模式下，遇到 dangerous 工具且 autoConfirmDangerous=false 时，
   * 直接返回 pendingConfirmation 信息让前端处理（避免死循环耗尽迭代次数）。
   */
  pendingConfirmation?: {
    name: string;
    args: any;
    toolCallIndex: number;
    dangerHint: string;
    pendingMessages: any[];
  };
}

// 工具阶段标题映射（用于前端显示任务进度）
const TOOL_PHASE_TITLES: Record<string, string> = {
  query_exams: "查询考试",
  query_teachers: "查询教师",
  query_students: "查询学生",
  query_classes: "查询班级",
  query_stats: "查询统计数据",
  query_audit_logs: "查询操作日志",
  query_abnormal_logins: "查询异常登录",
  query_ip_blacklist: "查询 IP 黑名单",
  query_system_health: "检查系统健康",
  create_exam: "创建考试",
  edit_exam: "修改考试",
  import_teachers: "批量导入教师",
  import_students: "批量导入学生",
  create_class: "创建班级",
  create_teacher: "创建教师",
  create_student: "创建学生",
  edit_teacher: "修改教师信息",
  edit_student: "修改学生信息",
  assign_head_teacher: "分配班主任",
  reset_teacher_password: "重置教师密码",
  reset_student_password: "重置学生密码",
  toggle_user_status: "切换账号状态",
  create_announcement: "发布公告",
  query_buildings: "查询教学楼",
  query_classrooms: "查询教室",
  query_domains: "查询域名",
  query_exam_students: "查询考试学生名单",
};

/**
 * 根据工具名和参数生成阶段标题（含关键参数预览）
 */
function getToolPhaseTitle(name: string, args: any): string {
  const base = TOOL_PHASE_TITLES[name] || name;
  // 对部分工具附加关键参数预览，让进度更直观
  try {
    if (name === "create_exam" && args.subject) return `${base}：${args.subject}`;
    if (name === "create_teacher" && args.name) return `${base}：${args.name}`;
    if (name === "create_student" && args.name) return `${base}：${args.name}`;
    if (name === "create_class" && args.name) return `${base}：${args.name}`;
    if (name === "edit_exam" && args.subject) return `${base}：${args.subject}`;
    if (name === "edit_teacher" && args.name) return `${base}：${args.name}`;
    if (name === "edit_student" && args.name) return `${base}：${args.name}`;
    if (name === "create_announcement" && args.title) return `${base}：${args.title}`;
    if (name === "toggle_user_status") {
      const t = args.userType === "teacher" ? "教师" : "学生";
      return `${base}：${t}#${args.userId} → ${args.active ? "启用" : "停用"}`;
    }
    if (name === "reset_teacher_password") return `${base}：教师#${args.teacherId}`;
    if (name === "reset_student_password") return `${base}：学生#${args.studentId}`;
    if (name === "assign_head_teacher" && args.classId) return `${base}：班级#${args.classId}`;
    if (name === "import_teachers" && Array.isArray(args.teachers)) return `${base}：${args.teachers.length} 位`;
    if (name === "import_students" && Array.isArray(args.students)) return `${base}：${args.students.length} 名`;
  } catch {}
  return base;
}

async function runChatLoop(params: ChatLoopParams): Promise<ChatLoopResult> {
  const {
    url,
    apiKey,
    model,
    stream,
    autoConfirmDangerous,
    adminUser,
    onDelta,
    onToolCall,
    onToolResult,
    onDangerousPending,
    onPhase,
    onDone,
    onError,
  } = params;
  let messages = [...params.messages];

  const MAX_ITERATIONS = 15;
  let fullContent = "";
  const allToolCalls: Array<{ name: string; args: any; result: any; success: boolean; risk?: string }> = [];
  // 阶段计数器（每完成一个工具调用算一个阶段）
  let phaseCounter = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const body: any = {
      model,
      messages,
      tools: AI_TOOLS,
      tool_choice: "auto",
      stream,
      // 关键：显式设置较大的 max_tokens，避免默认值过小导致
      // AI 文本输出完后 tool_calls 部分被截断（"说完就停"问题）
      max_tokens: 4096,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    }).catch((fetchErr: any) => {
      // 网络层错误：DNS/超时/连接拒绝等
      const msg = localizeNetworkError(fetchErr, "AI 服务请求失败");
      onError?.(msg, "network_error", {
        code: String(fetchErr?.code || ""),
        stack: fetchErr?.stack,
      });
      throw new Error(msg);
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      const msg = localizeUpstreamHttpError(resp.status, errText, "AI 服务返回错误");
      onError?.(msg, "api_error", {
        status: resp.status,
        upstreamBody: errText.slice(0, 1000),
      });
      throw new Error(msg);
    }

    // ---------- 流式 ----------
    if (stream) {
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("无法读取流式响应");

      const decoder = new TextDecoder();
      let buffer = "";
      let iterContent = "";
      let finishReason: string | null = null;
      const toolCallMap: Map<number, { id: string; name: string; argsStr: string }> = new Map();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const chunk: any = JSON.parse(dataStr);
            const choice = chunk?.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta || {};

            // 记录 finish_reason（流末尾会出现）
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }

            if (delta.content) {
              iterContent += delta.content;
              fullContent += delta.content;
              onDelta?.(delta.content);
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallMap.has(idx))
                  toolCallMap.set(idx, { id: "", name: "", argsStr: "" });
                const cur = toolCallMap.get(idx)!;
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name += tc.function.name;
                // 关键修复：arguments 可能是 undefined（第一片只有 name），
                // 不能直接 += 否则会拼接 "undefined" 字符串
                if (tc.function?.arguments) cur.argsStr += tc.function.arguments;
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // 检测 finish_reason：如果是 "length"，说明 max_tokens 不足导致截断
      if (finishReason === "length" && toolCallMap.size === 0) {
        const msg = "AI 回复因 token 限制被截断（finish_reason=length），请减少输入或增大 max_tokens";
        onError?.(msg, "api_error", { status: 200, upstreamBody: `finish_reason=${finishReason}` });
        onDone?.(fullContent);
        return { content: fullContent, toolCalls: allToolCalls };
      }

      // 无工具调用 → 结束
      if (toolCallMap.size === 0) {
        onDone?.(fullContent);
        return { content: fullContent, toolCalls: allToolCalls };
      }

      const assistantToolCalls = Array.from(toolCallMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => ({
          id: v.id,
          type: "function",
          function: { name: v.name, arguments: v.argsStr || "{}" },
        }));

      messages.push({
        role: "assistant",
        content: iterContent || null,
        tool_calls: assistantToolCalls,
      } as any);

      // 逐个处理工具调用
      for (let i = 0; i < assistantToolCalls.length; i++) {
        const tc = assistantToolCalls[i];
        let args: any = {};
        let argsParseError: string | null = null;
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch (e: any) {
          // 稳定性修复：参数解析失败时不静默置空，记录错误并反馈给 AI
          argsParseError = `参数 JSON 解析失败: ${e?.message || "未知错误"}`;
          args = {};
        }

        const meta = TOOL_META[tc.function.name];
        const risk = meta?.risk || "safe";

        // 参数解析失败：直接返回错误给 AI，不执行工具，避免以空参数调用
        if (argsParseError) {
          const errResult = JSON.stringify({
            success: false,
            error: argsParseError,
            hint: "请检查 function.arguments 是否为合法 JSON 字符串",
          });
          onToolCall?.({ name: tc.function.name, args, index: i, risk });
          onToolResult?.({
            name: tc.function.name,
            args,
            result: { success: false, error: argsParseError },
            success: false,
            index: i,
          });
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: errResult,
          } as any);
          continue;
        }

        // 危险操作且未确认 → 挂起，等待前端确认
        if (risk === "dangerous" && !autoConfirmDangerous) {
          onDangerousPending?.({
            name: tc.function.name,
            args,
            index: i,
            dangerHint: meta?.dangerHint || "该操作将修改系统数据",
            pendingMessages: messages,
          });
          // 直接退出循环：前端收到 dangerous_pending 事件后已设置 streaming=false 并弹出确认框，
          // 后端关闭 SSE 流，等待前端 /chat/confirm 重新发起请求
          return { content: fullContent, toolCalls: allToolCalls };
        }

        // forbidden 类（理论不会出现，因未注册到 AI_TOOLS）
        if (risk === "forbidden") {
          onToolCall?.({ name: tc.function.name, args, index: i, risk });
          const resultObj = {
            success: false,
            error: "该操作为系统级删除，AI 无权执行，请管理员手动处理。",
          };
          onToolResult?.({
            name: tc.function.name,
            args,
            result: resultObj,
            success: false,
            index: i,
          });
          allToolCalls.push({ name: tc.function.name, args, result: resultObj, success: false, risk });
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(resultObj),
          } as any);
          continue;
        }

        // safe 或已确认的 dangerous → 执行
        phaseCounter++;
        const phaseTitle = getToolPhaseTitle(tc.function.name, args);
        onPhase?.({ phase: phaseCounter, title: phaseTitle, status: "start" });

        onToolCall?.({ name: tc.function.name, args, index: i, risk });

        logAdminAction(adminUser.id, adminUser.username, "ai_tool_execute", {
          tool: tc.function.name,
          risk,
          argsPreview: JSON.stringify(args).slice(0, 200),
        });

        // 稳定性修复：工具执行加 30s 超时，避免慢查询或 DB 连接池耗尽时无限挂起
        let resultStr: string;
        try {
          const toolPromise = executeAiTool(tc.function.name, args);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("工具执行超时（30s）")), 30000)
          );
          resultStr = await Promise.race([toolPromise, timeoutPromise]);
        } catch (toolErr: any) {
          resultStr = JSON.stringify({
            success: false,
            error: toolErr?.message || "工具执行异常",
          });
        }

        // 稳定性修复：截断过长的工具结果，避免回灌上下文后撑爆 token 上限
        // 单个工具结果最多保留 4000 字符（足够 AI 理解结果）
        const MAX_TOOL_RESULT_CHARS = 4000;
        let truncatedResultStr = resultStr;
        if (resultStr.length > MAX_TOOL_RESULT_CHARS) {
          truncatedResultStr =
            resultStr.slice(0, MAX_TOOL_RESULT_CHARS) +
            `\n...（结果已截断，原始长度 ${resultStr.length} 字符）`;
        }

        let parsedResult: any;
        let success = true;
        try {
          parsedResult = JSON.parse(truncatedResultStr);
          if (parsedResult?.success === false) success = false;
        } catch {
          parsedResult = { raw: truncatedResultStr };
        }

        onPhase?.({
          phase: phaseCounter,
          title: phaseTitle,
          status: success ? "done" : "failed",
        });

        onToolResult?.({
          name: tc.function.name,
          args,
          result: parsedResult,
          success,
          index: i,
        });
        allToolCalls.push({ name: tc.function.name, args, result: parsedResult, success, risk });

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: truncatedResultStr,
        } as any);
      }
      continue;
    }

    // ---------- 非流式 ----------
    const data: any = await resp.json();
    const choice = data?.choices?.[0];
    const msg = choice?.message || {};
    if (msg.content) {
      if (typeof msg.content === "string") fullContent += msg.content;
    }

    if (!Array.isArray(msg.tool_calls) || msg.tool_calls.length === 0) {
      onDone?.(fullContent);
      return { content: fullContent, toolCalls: allToolCalls };
    }

    messages.push({
      role: "assistant",
      content: msg.content || null,
      tool_calls: msg.tool_calls,
    } as any);

    for (let i = 0; i < msg.tool_calls.length; i++) {
      const tc = msg.tool_calls[i];
      let args: any = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }

      const meta = TOOL_META[tc.function.name];
      const risk = meta?.risk || "safe";

      if (risk === "dangerous" && !autoConfirmDangerous) {
        // 非流式模式：直接返回 pendingConfirmation 信息，避免死循环耗尽迭代次数
        onToolCall?.({ name: tc.function.name, args, index: i, risk });
        allToolCalls.push({
          name: tc.function.name,
          args,
          result: { success: false, pending_confirmation: true, message: "等待管理员确认" },
          success: false,
          risk,
        });
        return {
          content: fullContent,
          toolCalls: allToolCalls,
          pendingConfirmation: {
            name: tc.function.name,
            args,
            toolCallIndex: i,
            dangerHint: meta?.dangerHint || "该操作将修改系统数据",
            pendingMessages: messages,
          },
        };
      }

      if (risk === "forbidden") {
        onToolCall?.({ name: tc.function.name, args, index: i, risk });
        const resultObj = {
          success: false,
          error: "系统级删除操作，AI 无权执行，请管理员手动处理。",
        };
        onToolResult?.({ name: tc.function.name, args, result: resultObj, success: false, index: i });
        allToolCalls.push({ name: tc.function.name, args, result: resultObj, success: false, risk });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(resultObj),
        } as any);
        continue;
      }

      onToolCall?.({ name: tc.function.name, args, index: i, risk });
      logAdminAction(adminUser.id, adminUser.username, "ai_tool_execute", {
        tool: tc.function.name,
        risk,
      });
      const resultStr = await executeAiTool(tc.function.name, args);
      let parsedResult: any;
      let success = true;
      try {
        parsedResult = JSON.parse(resultStr);
        if (parsedResult?.success === false) success = false;
      } catch {
        parsedResult = { raw: resultStr };
      }
      onToolResult?.({ name: tc.function.name, args, result: parsedResult, success, index: i });
      allToolCalls.push({ name: tc.function.name, args, result: parsedResult, success, risk });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: resultStr,
      } as any);
    }
  }

  const exhaustionMsg = "已达到最大工具调用迭代次数，停止继续调用。";
  if (stream) onDelta?.(exhaustionMsg);
  fullContent += exhaustionMsg;
  onDone?.(fullContent);
  return { content: fullContent, toolCalls: allToolCalls };
}

/**
 * AI 错误本地化工具
 * 将上游（Node fetch / OpenAI API / MySQL / 浏览器）的英文错误信息映射为中文用户友好提示
 * @author 落梦陳 (KeKe0904)
 */

/**
 * 本地化 Node 原生网络错误（fetch failed / ETIMEDOUT / ENOTFOUND 等）
 */
export function localizeNetworkError(error: any, prefix: string = ""): string {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const sysError = code || message;

  let cn = "";
  if (/ETIMEDOUT/i.test(sysError)) cn = "连接 AI 服务超时，请检查网络或接口地址";
  else if (/ENOTFOUND/i.test(sysError)) cn = "无法解析 AI 服务域名，请检查 API URL 是否正确";
  else if (/ECONNREFUSED/i.test(sysError)) cn = "AI 服务拒绝连接，请确认服务已启动且端口正确";
  else if (/ECONNRESET/i.test(sysError)) cn = "AI 服务连接被重置，请稍后重试";
  else if (/EHOSTUNREACH/i.test(sysError)) cn = "无法访问 AI 服务主机";
  else if (/EAI_AGAIN/i.test(sysError)) cn = "DNS 解析临时失败，请稍后重试";
  else if (/UND_ERR_SOCKET/i.test(sysError)) cn = "与 AI 服务的 socket 连接异常";
  else if (/aborted/i.test(sysError)) cn = "请求已取消";
  else if (/fetch failed/i.test(message)) cn = "无法连接到 AI 服务，请检查接口地址与网络";
  else if (/Unable to determine the domain name/i.test(message)) cn = "无法确定域名，请检查 API URL";
  else cn = `AI 服务请求失败: ${message || "未知错误"}`;

  return prefix ? `${prefix}: ${cn}` : cn;
}

/**
 * 本地化 OpenAI / 兼容协议返回的 HTTP 错误
 * @param status HTTP 状态码
 * @param body 上游返回的响应体（文本或 JSON 字符串）
 * @param prefix 前缀，例如 "获取模型列表失败"
 */
export function localizeUpstreamHttpError(
  status: number,
  body: string,
  prefix: string = ""
): string {
  // 尝试解析 OpenAI 风格错误：{ "error": { "message": "...", "type": "...", "code": "..." } }
  let upstreamMsg = "";
  let upstreamType = "";
  let upstreamCode = "";
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error) {
      upstreamMsg = String(parsed.error.message || "");
      upstreamType = String(parsed.error.type || "");
      upstreamCode = String(parsed.error.code || "");
    } else if (parsed?.message) {
      upstreamMsg = String(parsed.message);
    }
  } catch {
    // 非 JSON 响应，忽略
  }

  let cn = "";
  if (status === 401) cn = "AI 服务认证失败，请检查 API Key 是否正确";
  else if (status === 403) cn = "AI 服务拒绝访问，可能是 Key 无权限或被禁用";
  else if (status === 404) cn = "AI 服务接口地址不正确，或所选模型不存在";
  else if (status === 408) cn = "AI 服务请求超时";
  else if (status === 413) cn = "请求体过大，请减少输入内容或附件大小";
  else if (status === 422) cn = "请求参数有误，请检查模型名称与请求格式";
  else if (status === 429) cn = "AI 服务调用频率过高或额度不足，请稍后重试";
  else if (status >= 500) cn = "AI 服务内部错误，请稍后重试";
  else cn = `AI 服务返回错误（HTTP ${status}）`;

  // 附加原始上游消息的中文翻译（如果是常见英文错误）
  const extra = translateUpstreamMessage(upstreamMsg, upstreamType, upstreamCode);
  if (extra) cn += `（${extra}）`;

  return prefix ? `${prefix}: ${cn}` : cn;
}

/**
 * 翻译 OpenAI 风格的上游错误消息为中文（覆盖常见错误）
 */
function translateUpstreamMessage(
  msg: string,
  type: string,
  code: string
): string {
  if (!msg) return "";
  const m = msg.toLowerCase();

  // 常见错误关键字翻译
  const map: Array<[RegExp, string]> = [
    [/invalid api key/i, "API Key 无效"],
    [/incorrect api key/i, "API Key 不正确"],
    [/api key not provided/i, "未提供 API Key"],
    [/you can find your api key/i, "请检查 API Key 配置"],
    [/rate limit/i, "调用频率超限"],
    [/insufficient_quota/i, "额度不足"],
    [/quota/i, "额度不足"],
    [/billing/i, "计费问题，请检查账户余额"],
    [/model_not_found/i, "模型不存在或无权访问"],
    [/model not found/i, "模型不存在或无权访问"],
    [/context_length_exceeded/i, "上下文长度超限，请缩短对话或清理历史"],
    [/maximum context length/i, "上下文长度超限，请缩短对话或清理历史"],
    [/invalid model/i, "模型名称无效"],
    [/no such model/i, "模型不存在"],
    [/function call/i, "工具调用格式错误"],
    [/tool call/i, "工具调用格式错误"],
    [/image_url/i, "图片 URL 格式错误或不支持"],
    [/unsupported media type/i, "不支持的媒体类型"],
    [/invalid_request_error/i, "请求参数错误"],
    [/server_error/i, "AI 服务内部错误"],
    [/engine/i, "引擎/模型不可用"],
    [/overloaded/i, "AI 服务过载，请稍后重试"],
  ];

  for (const [re, cn] of map) {
    if (re.test(m) || re.test(type.toLowerCase()) || re.test(code.toLowerCase())) {
      return cn;
    }
  }

  // 未匹配时，截断显示原消息（避免完整英文 JSON 透传）
  if (msg.length > 80) return msg.slice(0, 80) + "…";
  return msg;
}

/**
 * 本地化 MySQL 错误
 */
export function localizeMysqlError(error: any, prefix: string = "数据库操作失败"): string {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  let cn = "";
  if (code === "ER_DUP_ENTRY") cn = "数据重复，唯一字段冲突";
  else if (code === "ER_NO_SUCH_TABLE") cn = "数据表不存在";
  else if (code === "ER_BAD_FIELD_ERROR") cn = "字段不存在";
  else if (code === "ER_PARSE_ERROR") cn = "SQL 语法错误";
  else if (code === "ER_NO_DEFAULT_FOR_FIELD") cn = "必填字段缺失";
  else if (code === "ER_DATA_TOO_LONG") cn = "数据长度超过字段限制";
  else if (code === "ER_ROW_IS_REFERENCED_2") cn = "数据被其他记录引用，无法删除";
  else if (code === "ER_TRUNCATED_WRONG_VALUE") cn = "数据格式不正确";
  else if (code === "ER_ACCESS_DENIED_ERROR") cn = "数据库访问被拒绝";
  else if (code === "ER_DBACCESS_DENIED_ERROR") cn = "数据库访问被拒绝";
  else if (code === "ECONNREFUSED") cn = "数据库连接被拒绝";
  else if (code === "ETIMEDOUT") cn = "数据库连接超时";
  else if (code === "PROTOCOL_CONNECTION_LOST") cn = "数据库连接丢失";
  else if (code === "ER_LOCK_WAIT_TIMEOUT") cn = "数据库锁等待超时";
  else if (code === "ER_LOCK_DEADLOCK") cn = "数据库死锁";
  else cn = `数据库错误: ${message || code || "未知错误"}`;

  return prefix ? `${prefix}: ${cn}` : cn;
}

/**
 * 通用错误本地化：自动识别网络错误、HTTP 错误、MySQL 错误
 */
export function localizeError(error: any, prefix: string = ""): string {
  if (!error) return prefix || "未知错误";

  // 已是中文字符串，直接返回
  if (typeof error === "string" && /[\u4e00-\u9fa5]/.test(error)) {
    return prefix ? `${prefix}: ${error}` : error;
  }

  // MySQL 错误特征：errno / code 以 ER_ 开头 / sqlState 等
  if (error?.code && /^(ER_|PROTOCOL_|ECONNREFUSED|ETIMEDOUT)/.test(String(error.code))) {
    return localizeMysqlError(error, prefix);
  }

  // Node fetch / 网络错误特征：code 以 E 开头 / message 含 fetch failed
  if (
    error?.code ||
    /fetch failed|ENOTFOUND|ECONNRESET|EHOSTUNREACH|EAI_AGAIN|UND_ERR/i.test(
      String(error?.message || "")
    )
  ) {
    return localizeNetworkError(error, prefix);
  }

  // 通用兜底
  const msg = String(error?.message || error || "未知错误");
  return prefix ? `${prefix}: ${msg}` : msg;
}

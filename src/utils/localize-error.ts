/**
 * 前端错误本地化工具
 * 将浏览器 fetch 错误、HTTP 错误、后端响应错误翻译为中文用户友好提示
 * @author 落梦陳 (KeKe0904)
 */

/**
 * 本地化浏览器原生 fetch 错误
 * - "Failed to fetch" (Chrome)
 * - "NetworkError when attempting to fetch resource" (Firefox)
 * - "Network request failed" / "Load failed" (Safari)
 * - AbortError
 */
export function localizeFetchError(error: any, prefix: string = ""): string {
  if (!error) return prefix || "未知错误";

  const name = String(error?.name || "");
  const message = String(error?.message || "");

  // 已是中文，直接返回
  if (/[\u4e00-\u9fa5]/.test(message)) {
    return prefix ? `${prefix}: ${message}` : message;
  }

  let cn = "";
  if (name === "AbortError") cn = "请求已取消";
  else if (/Failed to fetch/i.test(message)) cn = "网络连接失败，请检查网络或后端服务是否可用";
  else if (/NetworkError/i.test(message)) cn = "网络连接失败，请检查网络或后端服务是否可用";
  else if (/Network request failed/i.test(message)) cn = "网络连接失败，请检查网络或后端服务是否可用";
  else if (/Load failed/i.test(message)) cn = "加载失败，请检查网络或后端服务是否可用";
  else if (/timeout/i.test(message) || /timed?\s*out/i.test(message)) cn = "请求超时，请稍后重试";
  else if (/CORS/i.test(message)) cn = "跨域请求被拒绝，请检查服务配置";
  else cn = message || "未知错误";

  return prefix ? `${prefix}: ${cn}` : cn;
}

/**
 * 本地化后端返回的错误响应
 * - 解析 JSON 提取 message
 * - 若 message 是中文，直接返回
 * - 若 message 是英文，根据 HTTP 状态码翻译
 * - 若非 JSON，按 HTTP 状态码给出通用中文提示
 */
export function localizeHttpResponse(
  status: number,
  errText: string,
  prefix: string = ""
): string {
  // 尝试解析后端 JSON
  let serverMsg = "";
  try {
    const parsed = JSON.parse(errText);
    serverMsg = String(parsed?.message || parsed?.error || "");
  } catch {
    // 非 JSON（如 nginx HTML 错误页），不附加原始 HTML
  }

  // 后端返回的中文 message 优先
  if (serverMsg && /[\u4e00-\u9fa5]/.test(serverMsg)) {
    return prefix ? `${prefix}: ${serverMsg}` : serverMsg;
  }

  let cn = "";
  if (status === 0 || status === -1) cn = "无法连接到服务器";
  else if (status === 400) cn = "请求参数错误";
  else if (status === 401) cn = "登录已过期，请重新登录";
  else if (status === 403) cn = "没有权限执行此操作";
  else if (status === 404) cn = "请求的接口不存在";
  else if (status === 408) cn = "请求超时";
  else if (status === 413) cn = "请求数据过大";
  else if (status === 429) cn = "请求过于频繁，请稍后重试";
  else if (status >= 500) cn = "服务器异常，请稍后重试";
  else cn = `请求失败（HTTP ${status}）`;

  return prefix ? `${prefix}: ${cn}` : cn;
}

/**
 * 通用错误本地化入口：自动识别类型
 */
export function localizeError(error: any, prefix: string = ""): string {
  if (!error) return prefix || "未知错误";

  // 字符串
  if (typeof error === "string") {
    if (/[\u4e00-\u9fa5]/.test(error)) return prefix ? `${prefix}: ${error}` : error;
    return localizeFetchError({ message: error }, prefix);
  }

  // 含 name/message 的 Error 对象
  if (error?.name || error?.message) {
    return localizeFetchError(error, prefix);
  }

  const msg = String(error);
  return prefix ? `${prefix}: ${msg}` : msg;
}

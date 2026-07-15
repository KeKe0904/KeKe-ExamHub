/**
 * KeKe ExamHub - 考试信息管理系统
 * XSS 过滤工具（基于 isomorphic-dompurify）
 *
 * 提供两个层次的过滤函数：
 *   - sanitizeHtml(html)  - 富文本过滤，保留安全标签（用于公告、富文本编辑器内容）
 *   - sanitizeText(text)  - 纯文本过滤，移除所有 HTML 标签（用于标题、用户名等）
 *
 * 安全设计：
 *   1. 基于 DOMPurify（业界标准 XSS 过滤库，isomorphic 版本支持 SSR）
 *   2. 白名单策略：仅允许指定的标签和属性，其余全部移除
 *   3. URI 协议白名单：仅允许 http(s) / mailto / tel / data:image
 *   4. 显式禁止危险标签和事件属性（on* 系列）
 *
 * 调用位置：
 *   - 后端：routes 中所有写入数据库前调用
 *   - 前端：渲染公告内容前再次调用（纵深防御）
 *
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import DOMPurify from "isomorphic-dompurify";

/**
 * 富文本 HTML 过滤（保留安全标签，移除危险内容）
 *
 * 使用场景：
 *   - 公告内容（announcement.content）
 *   - 富文本编辑器（TipTap）输出的 HTML
 *
 * 白名单配置：
 *   - 允许的标签：段落/文本格式/标题/列表/引用/代码/链接/图片/表格/通用容器
 *   - 允许的属性：href/target/rel/src/alt/title/class/style/colspan/rowspan
 *   - 允许的 URI 协议：http/https/mailto/tel/data:image
 *
 * 显式禁止：
 *   - 危险标签：script/style/iframe/form/input/button/textarea/select/option
 *   - 事件属性：onerror/onload/onclick/onmouseover/onfocus/onblur/onchange/onsubmit
 *
 * @param html 原始 HTML 字符串（可能包含恶意脚本）
 * @returns 过滤后的安全 HTML 字符串
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // 白名单标签：仅允许富文本所需的标签
    ALLOWED_TAGS: [
      // 段落与换行
      "p", "br",
      // 文本格式
      "strong", "b", "em", "i", "u", "s",
      // 标题
      "h1", "h2", "h3", "h4", "h5", "h6",
      // 列表
      "ul", "ol", "li",
      // 引用与代码
      "blockquote", "code", "pre",
      // 媒体（链接、图片）
      "a", "img",
      // 表格
      "table", "thead", "tbody", "tr", "th", "td",
      // 通用容器
      "span", "div",
    ],
    // 白名单属性
    ALLOWED_ATTR: [
      // 链接属性
      "href", "target", "rel",
      // 图片属性
      "src", "alt", "title",
      // 样式属性
      "class", "style",
      // 表格合并单元格
      "colspan", "rowspan",
    ],
    // URI 协议白名单：仅允许 http(s) / mailto / tel / data:image
    // 注意：data:image 用于内嵌图片，但应限制大小避免内存溢出
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|data:image\/)/i,
    // 显式禁止的危险标签（即使白名单漏配也会被移除）
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "textarea", "select", "option"],
    // 显式禁止的事件属性（on* 系列，可执行任意 JS）
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
  });
}

/**
 * 纯文本过滤（移除所有 HTML 标签和属性）
 *
 * 使用场景：
 *   - 标题、用户名、班级名称等纯文本字段
 *   - 任何不应包含 HTML 标签的用户输入
 *
 * 处理逻辑：
 *   - 设置 ALLOWED_TAGS 和 ALLOWED_ATTR 为空数组，DOMPurify 会移除所有标签
 *   - 保留标签内的文本内容（仅移除标签本身）
 *   - 末尾 trim() 去除首尾空白
 *
 * @param text 原始字符串（可能包含 HTML 标签或脚本）
 * @returns 过滤后的纯文本（无任何 HTML 标签）
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],   // 不允许任何标签
    ALLOWED_ATTR: [],   // 不允许任何属性
  }).trim();
}

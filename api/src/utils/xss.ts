/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "span", "div",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "src", "alt", "title",
      "class", "style",
      "colspan", "rowspan",
    ],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|data:image\/)/i,
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "textarea", "select", "option"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
  });
}

export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

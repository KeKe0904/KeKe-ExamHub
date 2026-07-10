/**
 * KeKe ExamHub - 考试信息管理系统
 * 轻量级 Markdown 渲染器（无第三方依赖）
 * 支持标题、加粗、行内代码、代码块、列表、表格、引用、链接
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, memo } from "react";

interface MarkdownProps {
  content: string;
  className?: string;
  /**
   * 流式模式：为 true 时仅渲染纯文本（whitespace-pre-wrap），不做 Markdown 解析。
   * 避免 AI 流式输出期间每帧都重新解析整篇 Markdown 导致卡顿。
   * streaming 结束后应切回 false 以渲染完整 Markdown。
   */
  streaming?: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[0.9em] font-mono">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-white">$1</strong>');
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">$1</a>'
  );
  return s;
}

const MarkdownBase = function Markdown({ content, className, streaming }: MarkdownProps) {
  // 流式模式：仅渲染纯文本，避免每帧全文 Markdown 解析导致卡顿
  if (streaming) {
    return (
      <div className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {content}
      </div>
    );
  }
  const lines = (content || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块 ```
    if (line.trim().startsWith("```")) {
      const codeLang = line.trim().slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeText = codeLines.join("\n");
      blocks.push(
        <div key={key++} className="my-2 relative group">
          <pre className="p-3 rounded-lg bg-zinc-900 dark:bg-zinc-900 text-zinc-100 text-xs overflow-x-auto font-mono">
            <code>{codeText}</code>
          </pre>
          {codeLang && (
            <span className="absolute top-1 right-2 text-[10px] text-zinc-500 font-mono">{codeLang}</span>
          )}
          <CopyButton text={codeText} className="absolute top-1.5 right-12 opacity-0 group-hover:opacity-100" />
        </div>
      );
      continue;
    }

    // 标题
    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      const sizes = ["text-lg", "text-base", "text-sm", "text-sm"];
      blocks.push(
        <div
          key={key++}
          className={`${sizes[level - 1]} font-bold text-zinc-900 dark:text-white mt-3 mb-1.5`}
          dangerouslySetInnerHTML={{ __html: renderInline(text) }}
        />
      );
      i++;
      continue;
    }

    // 表格
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const tableRows: string[][] = [];
      tableRows.push(line.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || (idx === 0 && _.length > 0) || (idx === arr.length - 1 && _.length > 0)));
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].split("|").map((c) => c.trim());
        if (cells.length >= 2) {
          if (cells[0] === "" && cells[cells.length - 1] === "") {
            tableRows.push(cells.slice(1, -1));
          } else {
            tableRows.push(cells);
          }
        }
        i++;
      }
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1);
        const tableMarkdown = [line, lines[i - tableRows.length + 1] || "", ...tableRows.slice(1).map((r) => "| " + r.join(" | ") + " |")].join("\n");
        blocks.push(
          <div key={key++} className="my-2 relative group">
            <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <CopyButton text={tableMarkdown} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    {header.map((h, hi) => (
                      <th
                        key={hi}
                        className="px-2.5 py-1.5 text-left font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                        dangerouslySetInnerHTML={{ __html: renderInline(h) }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} className="even:bg-zinc-50 dark:even:bg-zinc-800/30">
                      {row.map((c, ci) => (
                        <td
                          key={ci}
                          className="px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          dangerouslySetInnerHTML={{ __html: renderInline(c) }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      continue;
    }

    // 引用
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 pl-3 border-l-2 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 italic"
          dangerouslySetInnerHTML={{ __html: renderInline(quoteLines.join(" ")) }}
        />
      );
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1.5 ml-5 list-disc space-y-0.5">
          {items.map((it, ii) => (
            <li
              key={ii}
              className="text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: renderInline(it) }}
            />
          ))}
        </ul>
      );
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-1.5 ml-5 list-decimal space-y-0.5">
          {items.map((it, ii) => (
            <li
              key={ii}
              className="text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: renderInline(it) }}
            />
          ))}
        </ol>
      );
      continue;
    }

    // 分隔线
    if (/^---+\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-zinc-200 dark:border-zinc-700" />);
      i++;
      continue;
    }

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 普通段落
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith(">") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      // 关键修复：先对每一行单独 renderInline（内部会 escapeHtml），
      // 再用 <br/> join。之前的写法 renderInline(paraLines.join("<br/>")) 会把
      // <br/> 当作普通文本 escapeHtml 转义成 &lt;br/&gt;，导致换行显示成源码。
      blocks.push(
        <p
          key={key++}
          className="my-1 leading-relaxed text-zinc-700 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: paraLines.map(renderInline).join("<br/>") }}
        />
      );
    }
  }

  return <div className={className}>{blocks}</div>;
};

// memo 化：仅在 content/className/streaming 变化时重渲染
// 注意：流式期间 content 每帧都变，会触发重渲染，但 streaming=true 时走纯文本分支，开销极低
function Markdown(props: MarkdownProps) {
  return <MarkdownBase {...props} />;
}
export default memo(Markdown);

// 复制按钮
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
        copied
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      } ${className || ""}`}
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

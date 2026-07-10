/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo,
  Redo,
} from "./MathIcon";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLORS = [
  "#000000",
  "#71717a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: placeholder || "请输入内容...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (linkInputRef.current && !linkInputRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setLink = () => {
    if (editor) {
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkInput(false);
      setLinkUrl("");
    }
  };

  const addImage = () => {
    const url = window.prompt("请输入图片 URL:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, children, title }: { onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded border transition-colors ${
        isActive
          ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
          : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950"
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />;

  return (
    <div className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-black">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="加粗"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="下划线"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="删除线"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="标题 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="标题 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="标题 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="无序列表"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="引用"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="代码块"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        <div className="relative" ref={linkInputRef}>
          <ToolbarButton
            onClick={() => {
              setShowLinkInput(!showLinkInput);
              setLinkUrl(editor.getAttributes("link").href || "");
            }}
            isActive={editor.isActive("link")}
            title="链接"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg z-10 w-64">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="输入链接 URL..."
                className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") setLink();
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={setLink}
                  className="flex-1 px-3 py-1 text-xs bg-black dark:bg-white text-white dark:text-black rounded"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkInput(false);
                  }}
                  className="flex-1 px-3 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded text-zinc-700 dark:text-zinc-300"
                >
                  移除
                </button>
              </div>
            </div>
          )}
        </div>

        <ToolbarButton onClick={addImage} title="图片">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="表格"
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="左对齐"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="居中对齐"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="右对齐"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        <div className="relative" ref={colorPickerRef}>
          <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="文字颜色">
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg z-10">
              <div className="grid grid-cols-8 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="撤销"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="重做"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* 编辑区域 */}
      <EditorContent
        editor={editor}
        className="min-h-[200px] text-sm text-black dark:text-white"
      />
    </div>
  );
}

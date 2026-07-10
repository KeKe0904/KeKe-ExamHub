﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Calendar, FileText, X } from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import RichTextEditor from "@/components/RichTextEditor";
import DateTimePicker from "@/components/DateTimePicker";
import { announcementApi } from "@/utils/api";
import { format, parseISO } from "date-fns";
import {
  announcementTemplates,
  TEMPLATE_CATEGORIES,
  type AnnouncementTemplate,
  type TemplateCategory,
} from "@/utils/announcement-templates";

export default function AnnouncementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [expireMode, setExpireMode] = useState<"never" | "scheduled">("never");
  const [publishAt, setPublishAt] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const templatePanelRef = useRef<HTMLDivElement>(null);

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (!isEdit) return;
    const fetchAnnouncement = async () => {
      try {
        const data = await announcementApi.getById(id!);
        if (data.success) {
          const a = data.data;
          setTitle(a.title);
          setContent(a.content);
          setIsPinned(a.isPinned);
          setIsActive(a.isActive);
          if (a.publishAt) {
            setPublishMode("scheduled");
            setPublishAt(format(parseISO(a.publishAt), "yyyy-MM-dd'T'HH:mm"));
          } else {
            setPublishMode("now");
          }
          if (a.expireAt) {
            setExpireMode("scheduled");
            setExpireAt(format(parseISO(a.expireAt), "yyyy-MM-dd'T'HH:mm"));
          } else {
            setExpireMode("never");
          }
        }
      } catch (error) {
        console.error("获取公告失败:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchAnnouncement();
  }, [id, isEdit]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templatePanelRef.current && !templatePanelRef.current.contains(e.target as Node)) {
        setShowTemplatePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyTemplate = (template: AnnouncementTemplate) => {
    setTitle(template.title);
    setContent(template.content);
    setShowTemplatePanel(false);
  };

  const filteredTemplates = activeCategory === "all"
    ? announcementTemplates
    : announcementTemplates.filter((t) => t.category === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const publishAtValue = publishMode === "scheduled" && publishAt ? publishAt : null;
      const expireAtValue = expireMode === "scheduled" && expireAt ? expireAt : null;

      const payload = {
        title,
        content,
        isPinned,
        isActive,
        publishAt: publishAtValue,
        expireAt: expireAtValue,
      };

      if (isEdit) {
        await announcementApi.update(id!, payload);
      } else {
        await announcementApi.create(payload);
      }
      navigate("/admin/announcements");
    } catch (error) {
      console.error("保存公告失败:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/announcements")}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:border-black dark:hover:border-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {isEdit ? "编辑公告" : "发布公告"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
              {isEdit ? "修改公告内容" : "发布新公告，前端将同步显示"}
            </p>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6">
          {/* 标题 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                公告标题 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative" ref={templatePanelRef}>
                <button
                  type="button"
                  onClick={() => setShowTemplatePanel(!showTemplatePanel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-600 rounded-lg hover:border-black dark:hover:border-white transition-colors text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
                >
                  <FileText className="w-3.5 h-3.5" />
                  使用模板
                </button>
                {showTemplatePanel && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg z-20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                      <h3 className="text-sm font-semibold text-black dark:text-white">选择模板</h3>
                      <button
                        type="button"
                        onClick={() => setShowTemplatePanel(false)}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <X className="w-4 h-4 text-zinc-500" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 border-b border-zinc-100 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setActiveCategory("all")}
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                          activeCategory === "all"
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        全部
                      </button>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setActiveCategory(cat.value)}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                            activeCategory === cat.value
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                      {filteredTemplates.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500 py-4">暂无模板</p>
                      ) : (
                        filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-black dark:text-white truncate">
                                {template.name}
                              </span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                              {template.title}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入公告标题"
              maxLength={200}
              className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              required
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              公告内容 <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="请输入公告内容..."
            />
          </div>

          {/* 选项 */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-black dark:accent-white"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">置顶显示</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-black dark:accent-white"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">启用</span>
            </label>
          </div>

          {/* 发布设置 */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-black dark:text-white" />
              <h3 className="text-sm font-semibold text-black dark:text-white">发布设置</h3>
            </div>

            {/* 发布时间 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                发布时间
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="publishMode"
                    checked={publishMode === "now"}
                    onChange={() => setPublishMode("now")}
                    className="w-4 h-4 accent-black dark:accent-white"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">立即发布</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="publishMode"
                    checked={publishMode === "scheduled"}
                    onChange={() => setPublishMode("scheduled")}
                    className="w-4 h-4 accent-black dark:accent-white"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">定时发布</span>
                </label>
              </div>
              {publishMode === "scheduled" && (
                <div className="mt-2">
                  <DateTimePicker
                    value={publishAt}
                    onChange={setPublishAt}
                  />
                </div>
              )}
            </div>

            {/* 下架时间 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                下架时间
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="expireMode"
                    checked={expireMode === "never"}
                    onChange={() => setExpireMode("never")}
                    className="w-4 h-4 accent-black dark:accent-white"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">永不下架</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="expireMode"
                    checked={expireMode === "scheduled"}
                    onChange={() => setExpireMode("scheduled")}
                    className="w-4 h-4 accent-black dark:accent-white"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">定时下架</span>
                </label>
              </div>
              {expireMode === "scheduled" && (
                <div className="mt-2">
                  <DateTimePicker
                    value={expireAt}
                    onChange={setExpireAt}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => navigate("/admin/announcements")}
              className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium hover:border-black dark:hover:border-white transition-colors text-black dark:text-white"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "保存修改" : "发布公告"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

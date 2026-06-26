/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export default function AnnouncementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const getToken = () => sessionStorage.getItem("examhub-token") || "";

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (!isEdit) return;
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch(`${API_BASE}/announcements/${id}`);
        const data = await res.json();
        if (data.success) {
          setTitle(data.data.title);
          setContent(data.data.content);
          setIsPinned(data.data.isPinned);
          setIsActive(data.data.isActive);
        }
      } catch (error) {
        console.error("获取公告失败:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchAnnouncement();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const url = isEdit
        ? `${API_BASE}/announcements/${id}`
        : `${API_BASE}/announcements`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, content, isPinned, isActive }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/admin/announcements");
      }
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              公告标题 <span className="text-red-500 dark:text-red-400">*</span>
            </label>
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入公告内容..."
              rows={8}
              className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              required
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
              <span className="text-sm text-zinc-700 dark:text-zinc-300">立即显示</span>
            </label>
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

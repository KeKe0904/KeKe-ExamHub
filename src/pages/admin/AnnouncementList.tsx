/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

interface Announcement {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementList() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getToken = () => sessionStorage.getItem("examhub-token") || "";

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/announcements/admin/all`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data);
      }
    } catch (error) {
      console.error("获取公告列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/announcements/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(announcements.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error("删除公告失败:", error);
    } finally {
      setDeleting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">公告管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">管理系统公告，发布后前端同步显示</p>
          </div>
          <button
            onClick={() => navigate("/admin/announcements/new")}
            className="bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            发布公告
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索公告标题或内容..."
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* 公告列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-black">
            <p className="text-zinc-500 dark:text-zinc-300">暂无公告</p>
            <Link
              to="/admin/announcements/new"
              className="mt-3 inline-block text-sm text-black dark:text-white underline"
            >
              发布第一条公告
            </Link>
          </div>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-black">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">标题</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">发布时间</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-950">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.isPinned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-medium">置顶</span>
                        )}
                        <span className="font-medium text-black dark:text-white">{a.title}</span>
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1 line-clamp-1">{a.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      {a.isActive ? (
                        <span className="text-xs px-2 py-1 rounded border border-black dark:border-white text-black dark:text-white bg-white dark:bg-black">显示中</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-400 bg-zinc-50 dark:bg-black">已隐藏</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-300">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/announcements/${a.id}/edit`}
                          className="p-1.5 rounded border border-zinc-200 dark:border-zinc-600 hover:border-black dark:hover:border-white transition-colors"
                        >
                          <Edit className="w-4 h-4 text-black dark:text-white" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 rounded border border-zinc-200 dark:border-zinc-600 hover:border-black dark:hover:border-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-black dark:text-white" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6 max-w-md w-full relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-black dark:text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">确认删除</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              确定要删除公告「{deleteTarget.title}」吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium hover:border-black dark:hover:border-white transition-colors text-black dark:text-white"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-40"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

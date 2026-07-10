/**
 * KeKe ExamHub - 考试信息管理系统
 * IP 黑名单管理页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  XCircle,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { ipBlacklistApi, type IpBlacklistItem } from "@/utils/api";
import { ConfirmDialog } from "@/components/ui";

type FilterStatus = "all" | "active" | "expired";

export default function IpBlacklist() {
  const [items, setItems] = useState<IpBlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<IpBlacklistItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formIp, setFormIp] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formIsPermanent, setFormIsPermanent] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<IpBlacklistItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipBlacklistApi.getList({
        page,
        pageSize,
        search: search || undefined,
        status: filter === "all" ? undefined : filter,
      });
      setItems(res.data.list);
      setTotal(res.data.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAdd = () => {
    setFormIp("");
    setFormReason("");
    setFormExpiresAt("");
    setFormIsPermanent(true);
    setShowAddModal(true);
  };

  const handleEdit = (item: IpBlacklistItem) => {
    setEditingItem(item);
    setFormReason(item.reason);
    setFormExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 16) : "");
    setFormIsPermanent(item.isPermanent);
    setShowEditModal(true);
  };

  const submitAdd = async () => {
    if (!formIp.trim()) {
      setError("请输入 IP 地址");
      return;
    }
    setSubmitting(true);
    try {
      await ipBlacklistApi.add({
        ipAddress: formIp.trim(),
        reason: formReason || undefined,
        expiresAt: formIsPermanent ? null : formExpiresAt || null,
      });
      setShowAddModal(false);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      await ipBlacklistApi.update(editingItem.id, {
        reason: formReason || undefined,
        expiresAt: formIsPermanent ? null : formExpiresAt || null,
      });
      setShowEditModal(false);
      setEditingItem(null);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await ipBlacklistApi.remove(id);
      setDeleteTarget(null);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            IP 黑名单
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            管理被封禁的 IP 地址，封禁后将无法访问系统
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加封禁
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索 IP 地址..."
            className="form-input pl-10"
          />
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              { key: "all", label: "全部" },
              { key: "active", label: "生效中" },
              { key: "expired", label: "已过期" },
            ] as { key: FilterStatus; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === tab.key
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无封禁记录
          </h3>
          <p className="text-sm text-zinc-400">
            被封禁的 IP 地址会显示在这里
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    IP 地址
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    封禁原因
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    封禁人
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    过期时间
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
                {items.map((item) => {
                  const isExpired =
                    !item.isPermanent &&
                    item.expiresAt &&
                    new Date(item.expiresAt) <= new Date();
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-sm font-mono font-medium text-black dark:text-white">
                            {item.ipAddress}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {item.reason || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                        {item.bannedBy || "系统"}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                            已过期
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                            封禁中
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                        {item.isPermanent
                          ? "永久封禁"
                          : item.expiresAt
                          ? new Date(item.expiresAt).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                            aria-label="编辑"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors btn-press"
                            aria-label="解封"
                            title="解封"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-300">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 添加弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              添加 IP 封禁
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  IP 地址
                </label>
                <input
                  type="text"
                  value={formIp}
                  onChange={(e) => setFormIp(e.target.value)}
                  placeholder="例如: 192.168.1.100"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  封禁原因（可选）
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="请输入封禁原因"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPermanent}
                    onChange={(e) => setFormIsPermanent(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    永久封禁
                  </span>
                </label>
              </div>
              {!formIsPermanent && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    过期时间
                  </label>
                  <input
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitAdd}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                确认封禁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              编辑 IP 封禁
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  IP 地址
                </label>
                <input
                  type="text"
                  value={editingItem.ipAddress}
                  disabled
                  className="form-input bg-zinc-50 dark:bg-zinc-900 opacity-60 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  封禁原因（可选）
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="请输入封禁原因"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPermanent}
                    onChange={(e) => setFormIsPermanent(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    永久封禁
                  </span>
                </label>
              </div>
              {!formIsPermanent && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    过期时间
                  </label>
                  <input
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitEdit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="解封 IP"
        message={
          deleteTarget ? (
            <>
              确定要解封 IP{" "}
              <span className="font-semibold text-black dark:text-white font-mono">
                {deleteTarget.ipAddress}
              </span>{" "}
              吗？解封后该 IP 可正常访问系统。
            </>
          ) : (
            ""
          )
        }
        confirmText="确认解封"
        variant="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}

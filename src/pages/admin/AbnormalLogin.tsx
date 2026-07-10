/**
 * KeKe ExamHub - 考试信息管理系统
 * 异常登录审核页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
  Search,
  Check,
  X,
  Lock,
  Clock,
  Monitor,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { ipBlacklistApi, type AbnormalLoginItem } from "@/utils/api";
import { ConfirmDialog } from "@/components/ui";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function AbnormalLogin() {
  const [items, setItems] = useState<AbnormalLoginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [acting, setActing] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approveTarget, setApproveTarget] = useState<AbnormalLoginItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    item: AbnormalLoginItem;
    banIp: boolean;
  } | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ipBlacklistApi.getAbnormalList({
        page,
        pageSize,
        reviewStatus: filter === "all" ? undefined : filter,
      });
      setItems(res.data.list);
      setTotal(res.data.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter]);

  const fetchCount = useCallback(async () => {
    try {
      const res = await ipBlacklistApi.getAbnormalCount();
      setPendingCount(res.data.count);
    } catch (err) {
      console.error("获取待审核数量失败:", err);
    }
  }, []);

  useEffect(() => {
    fetchList();
    fetchCount();
  }, [fetchList, fetchCount]);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await ipBlacklistApi.reviewAbnormal(id, { action: "approve" });
      setApproveTarget(null);
      fetchList();
      fetchCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string, banIp: boolean = false) => {
    setActing(id);
    try {
      await ipBlacklistApi.reviewAbnormal(id, { action: "reject", banIp });
      setRejectTarget(null);
      fetchList();
      fetchCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActing(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusConfig: Record<string, { label: string; classes: string }> = {
    pending: {
      label: "待审核",
      classes:
        "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    },
    approved: {
      label: "已通过",
      classes:
        "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white",
    },
    rejected: {
      label: "已拒绝",
      classes:
        "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    },
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            异常登录审核
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            教室端非常用 IP 登录需要在此审核
            {pendingCount > 0 && (
              <span className="ml-2 text-zinc-900 dark:text-white font-medium">
                · {pendingCount} 个待审核
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 筛选标签 */}
      <div className="flex items-center gap-2 mb-4">
        {(
          [
            { key: "pending", label: "待审核" },
            { key: "approved", label: "已通过" },
            { key: "rejected", label: "已拒绝" },
            { key: "all", label: "全部" },
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无{filter === "pending" ? "待审核" : ""}异常登录
          </h3>
          <p className="text-sm text-zinc-400">
            教室端从非常用 IP 登录时会在此处等待审核
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const cfg = statusConfig[item.reviewStatus] || statusConfig.pending;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-zinc-900 dark:text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-black dark:text-white">
                              {item.classroomName}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.classes}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {item.abnormalReason}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Search className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                          <span className="font-mono">{item.ipAddress}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                          <span>
                            {new Date(item.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <Monitor className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                            <span>{item.location}</span>
                          </div>
                        )}
                      </div>

                      {item.userAgent && (
                        <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 truncate">
                          UA: {item.userAgent}
                        </div>
                      )}
                    </div>

                    {item.reviewStatus === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setApproveTarget(item)}
                          disabled={acting === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 btn-press"
                        >
                          {acting === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          允许
                        </button>
                        <button
                          onClick={() =>
                            setRejectTarget({ item, banIp: false })
                          }
                          disabled={acting === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50 btn-press"
                        >
                          <X className="w-3 h-3" />
                          拒绝
                        </button>
                        <button
                          onClick={() =>
                            setRejectTarget({ item, banIp: true })
                          }
                          disabled={acting === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 btn-press"
                          title="拒绝并封禁该 IP"
                        >
                          <Lock className="w-3 h-3" />
                          拒绝并封禁
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!approveTarget}
        onClose={() => !acting && setApproveTarget(null)}
        onConfirm={() => approveTarget && handleApprove(approveTarget.id)}
        title="允许登录"
        message={
          approveTarget ? (
            <>
              确定允许教室{" "}
              <span className="font-semibold text-black dark:text-white">
                {approveTarget.classroomName}
              </span>{" "}
              从 IP{" "}
              <span className="font-semibold text-black dark:text-white font-mono">
                {approveTarget.ipAddress}
              </span>{" "}
              登录吗？批准后该 IP 将被标记为可信 IP。
            </>
          ) : (
            ""
          )
        }
        confirmText="确认允许"
        variant="primary"
        loading={!!acting}
      />

      <ConfirmDialog
        isOpen={!!rejectTarget}
        onClose={() => !acting && setRejectTarget(null)}
        onConfirm={() =>
          rejectTarget && handleReject(rejectTarget.item.id, rejectTarget.banIp)
        }
        title={rejectTarget?.banIp ? "拒绝并封禁 IP" : "拒绝登录"}
        message={
          rejectTarget ? (
            rejectTarget.banIp ? (
              <>
                确定拒绝教室{" "}
                <span className="font-semibold text-black dark:text-white">
                  {rejectTarget.item.classroomName}
                </span>{" "}
                从 IP{" "}
                <span className="font-semibold text-black dark:text-white font-mono">
                  {rejectTarget.item.ipAddress}
                </span>{" "}
                的登录请求，并封禁该 IP 吗？封禁后该 IP 将无法访问系统。
              </>
            ) : (
              <>
                确定拒绝教室{" "}
                <span className="font-semibold text-black dark:text-white">
                  {rejectTarget.item.classroomName}
                </span>{" "}
                从 IP{" "}
                <span className="font-semibold text-black dark:text-white font-mono">
                  {rejectTarget.item.ipAddress}
                </span>{" "}
                的登录请求吗？
              </>
            )
          ) : (
            ""
          )
        }
        confirmText={rejectTarget?.banIp ? "拒绝并封禁" : "确认拒绝"}
        variant={rejectTarget?.banIp ? "danger" : "primary"}
        loading={!!acting}
      />
    </AdminLayout>
  );
}

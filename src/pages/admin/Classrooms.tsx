import { useState, useEffect, useCallback } from "react";
import {
  Building,
  Loader2,
  AlertCircle,
  CalendarX,
  Check,
  X,
  Trash2,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { classroomAdminApi } from "@/utils/api";
import type { Classroom, ClassroomStatus } from "@/types";

type FilterStatus = "all" | ClassroomStatus;

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    try {
      const params =
        filter === "all" ? undefined : { status: filter };
      const res = await classroomAdminApi.getAll(params);
      setClassrooms(res.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await classroomAdminApi.approve(id);
      fetchClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActing(rejectingId);
    try {
      await classroomAdminApi.reject(rejectingId, rejectReason);
      setRejectingId(null);
      setRejectReason("");
      fetchClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此教室账号吗?此操作不可恢复。")) return;
    try {
      await classroomAdminApi.delete(id);
      fetchClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const pendingCount = classrooms.filter((c) => c.status === "pending").length;

  const statusConfig: Record<
    ClassroomStatus,
    { label: string; icon: React.ElementType; classes: string }
  > = {
    pending: {
      label: "待审核",
      icon: Hourglass,
      classes:
        "bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    },
    approved: {
      label: "已通过",
      icon: CheckCircle2,
      classes:
        "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    },
    rejected: {
      label: "已驳回",
      icon: AlertTriangle,
      classes:
        "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    },
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            教室端管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            审核和管理教室端注册账号
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
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

      {/* 驳回弹窗 */}
      {rejectingId && (
        <div className="mb-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            驳回原因
          </h2>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入驳回原因(可选)"
            rows={3}
            className="form-input resize-none mb-4"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setRejectingId(null);
                setRejectReason("");
              }}
              className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              disabled={acting === rejectingId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {acting === rejectingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              确认驳回
            </button>
          </div>
        </div>
      )}

      {/* 筛选标签 */}
      <div className="flex items-center gap-2 mb-4">
        {(
          [
            { key: "all", label: "全部" },
            { key: "pending", label: "待审核" },
            { key: "approved", label: "已通过" },
            { key: "rejected", label: "已驳回" },
          ] as { key: FilterStatus; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
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
      ) : classrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
            <CalendarX className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无教室端账号
          </h3>
          <p className="text-sm text-zinc-400">
            教室端注册后会显示在此处等待审核
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  教室
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
              {classrooms.map((classroom) => {
                const cfg = statusConfig[classroom.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr
                    key={classroom.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center shrink-0">
                          <Building className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-black dark:text-white">
                            {classroom.buildingName} - {classroom.roomNumber}
                          </div>
                          {classroom.rejectReason && (
                            <div className="text-xs text-red-500 mt-0.5">
                              驳回原因: {classroom.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${cfg.classes}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                      {new Date(classroom.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {classroom.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(classroom.id)}
                              disabled={acting === classroom.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                              {acting === classroom.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              通过
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(classroom.id);
                                setRejectReason("");
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            >
                              <X className="w-3 h-3" />
                              驳回
                            </button>
                          </>
                        )}
                        {classroom.status === "rejected" && (
                          <button
                            onClick={() => handleApprove(classroom.id)}
                            disabled={acting === classroom.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                          >
                            {acting === classroom.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            重新通过
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(classroom.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Calendar,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { auditLogApi, type AuditLog } from "@/utils/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLabels, setActionLabels] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const [filterAction, setFilterAction] = useState("");
  const [filterAdminId, setFilterAdminId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: {
        page: number;
        pageSize: number;
        action?: string;
        adminId?: string;
        startDate?: string;
        endDate?: string;
      } = {
        page,
        pageSize,
      };
      if (filterAction) params.action = filterAction;
      if (filterAdminId) params.adminId = filterAdminId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await auditLogApi.getList(params);
      setLogs(res.data.list);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setActionLabels(res.data.actionLabels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterAction, filterAdminId, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setFilterAction("");
    setFilterAdminId("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatJson = (obj: Record<string, any> | null) => {
    if (!obj) return "-";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">操作日志</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
              查看管理员的所有操作记录
            </p>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                操作类型
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="form-input"
              >
                <option value="">全部</option>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                管理员ID
              </label>
              <input
                type="text"
                value={filterAdminId}
                onChange={(e) => setFilterAdminId(e.target.value)}
                placeholder="输入管理员ID"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                开始日期
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                结束日期
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              筛选
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* 日志列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-black">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-300">暂无操作日志</p>
          </div>
        ) : (
          <>
            <div className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-black">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">
                      时间
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">
                      管理员
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">
                      操作类型
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">
                      IP地址
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <Calendar className="w-4 h-4 shrink-0 text-zinc-400" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <Shield className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-black dark:text-white">
                              {log.adminUsername}
                            </div>
                            <div className="text-xs text-zinc-500">ID: {log.adminId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-zinc-600 dark:text-zinc-300">
                        {log.ipAddress || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <div>
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-sm text-zinc-900 dark:text-zinc-100 hover:underline"
                            >
                              {expandedLogId === log.id ? "收起详情" : "查看详情"}
                            </button>
                            {expandedLogId === log.id && (
                              <pre className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto font-mono whitespace-pre-wrap">
                                {formatJson(log.details)}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

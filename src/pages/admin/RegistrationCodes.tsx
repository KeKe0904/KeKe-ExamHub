/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  CalendarX,
  CheckCircle2,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { registrationCodeApi } from "@/utils/api";
import type { RegistrationCode } from "@/types";
import { ConfirmDialog } from "@/components/ui";

type FilterStatus = "all" | "unused" | "used";

export default function RegistrationCodes() {
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [showGenerate, setShowGenerate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCodes = useCallback(async () => {
    try {
      const params =
        filter === "unused"
          ? { used: false }
          : filter === "used"
          ? { used: true }
          : undefined;
      const res = await registrationCodeApi.getAll(params);
      setCodes(res.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await registrationCodeApi.create(generateCount);
      setShowGenerate(false);
      setGenerateCount(1);
      fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await registrationCodeApi.delete(id);
      setDeleteTarget(null);
      fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const unusedCount = codes.filter((c) => !c.isUsed).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            注册码管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            生成注册码供教室端注册使用 ·{" "}
            <span className="font-medium">
              当前列表中 {unusedCount} 个未使用
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          生成注册码
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 生成表单 */}
      {showGenerate && (
        <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            生成注册码
          </h2>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                生成数量 (1-50)
              </label>
              <input
                type="number"
                value={generateCount}
                onChange={(e) =>
                  setGenerateCount(
                    Math.min(Math.max(Number(e.target.value) || 1, 1), 50)
                  )
                }
                min="1"
                max="50"
                className="form-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowGenerate(false);
                  setGenerateCount(1);
                }}
                className="px-4 py-2.5 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                生成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选标签 */}
      <div className="flex items-center gap-2 mb-4">
        {(
          [
            { key: "all", label: "全部" },
            { key: "unused", label: "未使用" },
            { key: "used", label: "已使用" },
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
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
            <CalendarX className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无注册码
          </h3>
          <p className="text-sm text-zinc-400">点击右上角"生成注册码"创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {codes.map((code) => (
            <div
              key={code.id}
              className={`bg-white dark:bg-zinc-900 border rounded-lg p-4 transition-all ${
                code.isUsed
                  ? "border-zinc-200 dark:border-zinc-600 opacity-60"
                  : "border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      code.isUsed
                        ? "bg-zinc-100 dark:bg-zinc-900"
                        : "bg-black dark:bg-white"
                    }`}
                  >
                    {code.isUsed ? (
                      <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Shield className="w-4 h-4 text-white dark:text-black" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      code.isUsed
                        ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {code.isUsed ? "已使用" : "可用"}
                  </span>
                </div>
                {!code.isUsed && (
                  <button
                    onClick={() => setDeleteTarget(code)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors btn-press"
                    aria-label="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <code className="font-mono text-lg font-bold text-black dark:text-white tracking-wider">
                  {code.code}
                </code>
                <button
                  onClick={() => handleCopy(code.code)}
                  className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950 rounded-lg transition-colors"
                  aria-label="复制"
                >
                  {copiedCode === code.code ? (
                    <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-zinc-400 mt-2">
                {code.isUsed
                  ? `使用于 ${new Date(code.usedAt || "").toLocaleString("zh-CN")}`
                  : `创建于 ${new Date(code.createdAt).toLocaleString("zh-CN")}`}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="删除注册码"
        message={
          deleteTarget ? (
            <>
              确定要删除注册码{" "}
              <span className="font-semibold text-black dark:text-white font-mono">
                {deleteTarget.code}
              </span>{" "}
              吗？删除后该注册码将无法被使用。
            </>
          ) : (
            ""
          )
        }
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}

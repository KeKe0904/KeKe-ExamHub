import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  X,
  AlertTriangle,
  Loader2,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { useExamStore } from "@/store/examStore";
import {
  calculateExamStatus,
  formatDateTime,
  formatDuration,
} from "@/utils/date";
import type { Exam } from "@/types";

export default function ExamList() {
  const { exams, loading, fetchExams, deleteExam } = useExamStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 初始加载
  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredExams = useMemo(() => {
    return exams
      .map((exam) => ({ ...exam, status: calculateExamStatus(exam) }))
      .filter((exam) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          exam.subject.toLowerCase().includes(query) ||
          exam.location.toLowerCase().includes(query) ||
          exam.invigilator.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [exams, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error("删除失败:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
            考试管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            {loading ? "加载中..." : `共 ${exams.length} 场考试`}
          </p>
        </div>
        <Link
          to="/admin/exams/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          发布考试
        </Link>
      </div>

      <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索考试科目、地点、监考老师..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-black dark:focus:border-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
            <span className="ml-2 text-zinc-500 dark:text-zinc-300">加载考试数据...</span>
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-black border-b border-zinc-200 dark:border-zinc-600">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    考试科目
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    考试时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    时长
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    地点
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {filteredExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-black dark:text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {exam.subject}
                          </div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-400">
                            {exam.invigilator}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {formatDateTime(exam.examDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {formatDuration(exam.duration)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {exam.location}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exam.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/exams/${exam.id}/edit`}
                          className="p-2 text-black dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(exam)}
                          className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              {searchQuery ? "未找到匹配的考试" : "暂无考试信息"}
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 mb-4">
              {searchQuery ? "试试调整搜索条件" : "点击上方按钮发布第一场考试"}
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          exam={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </AdminLayout>
  );
}

interface DeleteConfirmDialogProps {
  exam: Exam;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmDialog({
  exam,
  onConfirm,
  onCancel,
  deleting,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-black rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-600 max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-black dark:text-white mb-1">
              确认删除
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              确定要删除考试「{exam.subject}」吗?此操作无法撤销。
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-black border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                删除中...
              </>
            ) : (
              "确认删除"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

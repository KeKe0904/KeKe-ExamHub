/**
 * KeKe ExamHub - 考试信息管理系统
 * 班级管理页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  GraduationCap,
  User,
  ListOrdered,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import {
  classApi,
  type Class,
  teacherApi,
  type Teacher,
} from "@/utils/api";
import { ConfirmDialog } from "@/components/ui";

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formHeadTeacherId, setFormHeadTeacherId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  const gradeOptions = [
    "一年级",
    "二年级",
    "三年级",
    "四年级",
    "五年级",
    "六年级",
    "初一",
    "初二",
    "初三",
    "高一",
    "高二",
    "高三",
  ];

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await classApi.getList({
        page,
        pageSize,
        search: search || undefined,
        grade: gradeFilter || undefined,
      });
      const data = res.data as { list: Class[]; total: number };
      setClasses(data.list);
      setTotal(data.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, gradeFilter]);

  const fetchTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const res = await teacherApi.getList({ all: true });
      const data = res.data as Teacher[] | { list: Teacher[] };
      if (Array.isArray(data)) {
        setTeachers(data);
      } else {
        setTeachers(data.list);
      }
    } catch (err) {
      console.error("加载教师列表失败:", err);
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  const handleAdd = () => {
    setFormName("");
    setFormGrade("");
    setFormHeadTeacherId("");
    setFormSortOrder("");
    setShowAddModal(true);
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormGrade(cls.grade || "");
    setFormHeadTeacherId(cls.headTeacherId || "");
    setFormSortOrder(String(cls.sortOrder));
    setShowEditModal(true);
  };

  const submitAdd = async () => {
    if (!formName.trim()) {
      setError("请输入班级名称");
      return;
    }
    const parsedSortOrder = formSortOrder ? parseInt(formSortOrder, 10) : undefined;
    if (parsedSortOrder !== undefined && Number.isNaN(parsedSortOrder)) {
      setError("排序必须为数字");
      return;
    }
    setSubmitting(true);
    try {
      await classApi.create({
        name: formName.trim(),
        grade: formGrade || undefined,
        headTeacherId: formHeadTeacherId || undefined,
        sortOrder: parsedSortOrder,
      });
      setShowAddModal(false);
      fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editingClass) return;
    const parsedSortOrder = formSortOrder ? parseInt(formSortOrder, 10) : undefined;
    if (parsedSortOrder !== undefined && Number.isNaN(parsedSortOrder)) {
      setError("排序必须为数字");
      return;
    }
    setSubmitting(true);
    try {
      await classApi.update(editingClass.id, {
        name: formName.trim(),
        grade: formGrade || null,
        headTeacherId: formHeadTeacherId || null,
        sortOrder: parsedSortOrder,
      });
      setShowEditModal(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await classApi.remove(id);
      setDeleteTarget(null);
      fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (cls: Class) => {
    try {
      await classApi.update(cls.id, { isActive: !cls.isActive });
      fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            班级管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            管理班级信息，分配班主任
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加班级
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索班级名称..."
            className="form-input pl-10"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-auto min-w-[140px]"
        >
          <option value="">全部年级</option>
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无班级
          </h3>
          <p className="text-sm text-zinc-400">
            点击上方按钮添加班级信息
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    班级名称
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    年级
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    班主任
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    排序
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <Users className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <div className="font-medium text-black dark:text-white">
                            {cls.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cls.grade ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                          <GraduationCap className="w-3 h-3" />
                          {cls.grade}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cls.headTeacherName ? (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {cls.headTeacherName}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                        <ListOrdered className="w-3.5 h-3.5 text-zinc-400" />
                        {cls.sortOrder}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(cls)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          cls.isActive
                            ? "bg-black dark:bg-white"
                            : "bg-zinc-200 dark:bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                            cls.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(cls)}
                          className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                          aria-label="编辑"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cls)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors btn-press"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-300">
                共 {total} 个班级，第 {page} / {totalPages} 页
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              添加班级
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  班级名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="请输入班级名称，如：高三(1)班"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  年级
                </label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="form-input"
                >
                  <option value="">请选择年级</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  班主任
                </label>
                <select
                  value={formHeadTeacherId}
                  onChange={(e) => setFormHeadTeacherId(e.target.value)}
                  className="form-input"
                  disabled={teachersLoading}
                >
                  <option value="">请选择班主任</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  排序
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  placeholder="数字越小越靠前，默认 0"
                  className="form-input"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitAdd}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              编辑班级
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  班级名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  年级
                </label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="form-input"
                >
                  <option value="">请选择年级</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  班主任
                </label>
                <select
                  value={formHeadTeacherId}
                  onChange={(e) => setFormHeadTeacherId(e.target.value)}
                  className="form-input"
                  disabled={teachersLoading}
                >
                  <option value="">请选择班主任</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  排序
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
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
        title="删除班级"
        message={
          <>
            确定要删除班级
            <span className="font-semibold text-zinc-900 dark:text-white">
              「{deleteTarget?.name}」
            </span>
            吗？删除后无法恢复。
          </>
        }
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}

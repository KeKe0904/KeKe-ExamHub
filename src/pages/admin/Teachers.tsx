/**
 * KeKe ExamHub - 考试信息管理系统
 * 教师管理页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  Tag,
  Phone,
  Mail,
  BookOpen,
  Lock,
  Copy,
  CheckCircle2,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { teacherApi, type Teacher, type TeacherRole } from "@/utils/api";
import { ConfirmDialog } from "@/components/ui";

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [roles, setRoles] = useState<TeacherRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<TeacherRole | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  const [formName, setFormName] = useState("");
  const [formTeacherNo, setFormTeacherNo] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resettingTeacher, setResettingTeacher] = useState<Teacher | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);
  // 切换启用/停用状态的 loading id
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherApi.getList({
        page,
        pageSize,
        search: search || undefined,
        roleId: roleFilter || undefined,
      });
      const data = res.data as { list: Teacher[]; total: number };
      setTeachers(data.list);
      setTotal(data.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await teacherApi.getRoles();
      setRoles(res.data);
    } catch (err) {
      console.error("加载教师身份失败:", err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchRoles();
  }, [fetchTeachers, fetchRoles]);

  const handleAdd = () => {
    setFormName("");
    setFormTeacherNo("");
    setFormRoleId("");
    setFormPhone("");
    setFormEmail("");
    setFormNotes("");
    setShowAddModal(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormName(teacher.name);
    setFormTeacherNo(teacher.teacherNo || "");
    setFormRoleId(teacher.roleId || "");
    setFormPhone(teacher.phone);
    setFormEmail(teacher.email);
    setFormNotes(teacher.notes);
    setShowEditModal(true);
  };

  const submitAdd = async () => {
    if (!formName.trim()) {
      setError("请输入教师姓名");
      return;
    }
    if (formPhone && !/^1[3-9]\d{9}$/.test(formPhone)) {
      setError("手机号格式不正确");
      return;
    }
    setSubmitting(true);
    try {
      await teacherApi.add({
        name: formName.trim(),
        teacherNo: formTeacherNo.trim() || undefined,
        roleId: formRoleId || undefined,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        notes: formNotes || undefined,
      });
      setShowAddModal(false);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editingTeacher) return;
    if (formPhone && !/^1[3-9]\d{9}$/.test(formPhone)) {
      setError("手机号格式不正确");
      return;
    }
    setSubmitting(true);
    try {
      await teacherApi.update(editingTeacher.id, {
        name: formName.trim(),
        teacherNo: formTeacherNo.trim() || undefined,
        roleId: formRoleId || null,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        notes: formNotes || undefined,
      });
      setShowEditModal(false);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await teacherApi.remove(id);
      setDeleteTarget(null);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    setDeletingRole(true);
    try {
      await teacherApi.deleteRole(id);
      setDeleteRoleTarget(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingRole(false);
    }
  };

  const handleToggleActive = async (teacher: Teacher) => {
    setTogglingId(teacher.id);
    try {
      await teacherApi.update(teacher.id, { isActive: !teacher.isActive });
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPassword = (teacher: Teacher) => {
    setResettingTeacher(teacher);
    setResetPassword("");
    setResetSuccess(false);
    setResetCopied(false);
    setShowResetPasswordModal(true);
  };

  const submitResetPassword = async () => {
    if (!resettingTeacher) return;
    setSubmitting(true);
    try {
      const res = await teacherApi.resetPassword(
        resettingTeacher.id,
        resetPassword || undefined
      );
      setResetPassword(res.data.newPassword);
      setResetSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置密码失败");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      setError("请输入身份名称");
      return;
    }
    setSubmitting(true);
    try {
      await teacherApi.addRole({ name: newRoleName.trim() });
      setNewRoleName("");
      setShowRoleModal(false);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-black dark:text-white">
            教师管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            管理教师信息，考试发布时可直接选择监考老师
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowRoleModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-600 text-sm font-medium text-black dark:text-white rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors flex-1 sm:flex-none"
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">管理身份</span>
            <span className="sm:hidden">身份</span>
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            添加教师
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索教师姓名或电话..."
            className="form-input pl-10 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-full sm:w-auto sm:min-w-[140px]"
        >
          <option value="">全部身份</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无教师
          </h3>
          <p className="text-sm text-zinc-400">
            点击上方按钮添加教师信息
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      工号
                    </th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      身份
                    </th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      联系电话
                    </th>
                    <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-black dark:text-white">
                              {teacher.name}
                            </div>
                            {teacher.notes && (
                              <div className="text-xs text-zinc-400 truncate">
                                {teacher.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                          <Tag className="w-3.5 h-3.5 text-zinc-400" />
                          {teacher.teacherNo || (
                            <span className="text-zinc-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {teacher.roleName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                            <BookOpen className="w-3 h-3" />
                            {teacher.roleName}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {teacher.phone ? (
                          <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                            <Phone className="w-3.5 h-3.5 text-zinc-400" />
                            {teacher.phone}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(teacher)}
                          disabled={togglingId === teacher.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            teacher.isActive
                              ? "bg-black dark:bg-white"
                              : "bg-zinc-200 dark:bg-zinc-700"
                          }`}
                        >
                          {togglingId === teacher.id ? (
                            <span className="absolute left-1/2 -translate-x-1/2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900 dark:text-white" />
                            </span>
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${
                                teacher.isActive ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleResetPassword(teacher)}
                            className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                            aria-label="重置密码"
                            title="重置密码"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(teacher)}
                            className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                            aria-label="编辑"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(teacher)}
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

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-300 text-center sm:text-left">
                共 {total} 位教师，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center justify-center gap-2">
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

      {/* 添加教师弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              添加教师
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  教师姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="请输入教师姓名"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  教师工号
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={formTeacherNo}
                    onChange={(e) => setFormTeacherNo(e.target.value)}
                    placeholder="请输入教师工号"
                    className="form-input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  教师身份
                </label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="form-input"
                >
                  <option value="">请选择身份</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  联系电话
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="请输入联系电话"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  备注
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="请输入备注信息"
                  rows={2}
                  className="form-input resize-none"
                />
              </div>
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
                <p>默认登录密码为工号后6位，未设置工号时将生成随机密码。</p>
              </div>
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

      {/* 编辑教师弹窗 */}
      {showEditModal && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              编辑教师
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  教师姓名 <span className="text-red-500">*</span>
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
                  教师工号
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={formTeacherNo}
                    onChange={(e) => setFormTeacherNo(e.target.value)}
                    placeholder="请输入教师工号"
                    className="form-input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  教师身份
                </label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="form-input"
                >
                  <option value="">请选择身份</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  联系电话
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  备注
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="form-input resize-none"
                />
              </div>
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

      {/* 重置密码弹窗 */}
      {showResetPasswordModal && resettingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowResetPasswordModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                重置教师密码
              </h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-zinc-900 dark:text-white shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      密码重置成功
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      请将新密码告知教师
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    新密码
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={resetPassword}
                        readOnly
                        className="form-input font-mono bg-zinc-50 dark:bg-zinc-950"
                      />
                    </div>
                    <button
                      onClick={copyPassword}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors inline-flex items-center gap-2"
                    >
                      {resetCopied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          复制
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowResetPasswordModal(false)}
                    className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    完成
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <Lock className="w-6 h-6 text-zinc-900 dark:text-white shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      重置 {resettingTeacher.name} 的密码
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      工号: {resettingTeacher.teacherNo || "未设置"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    新密码（选填）
                  </label>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="留空则自动生成随机密码"
                    className="form-input"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                    留空将自动生成 8 位随机密码
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowResetPasswordModal(false)}
                    className="flex-1 py-2.5 bg-white dark:bg-zinc-900 text-black dark:text-white border border-zinc-300 dark:border-zinc-600 font-medium rounded-lg hover:border-black dark:hover:border-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={submitResetPassword}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        重置中...
                      </>
                    ) : (
                      "确认重置"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 管理身份弹窗 */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRoleModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              教师身份管理
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="输入新身份名称，如：体育老师"
                  className="form-input flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                />
                <button
                  onClick={handleAddRole}
                  disabled={submitting || !newRoleName.trim()}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  添加
                </button>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 max-h-64 overflow-y-auto">
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                  </div>
                ) : roles.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">
                    暂无身份
                  </p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-black dark:text-white">
                            {role.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setDeleteRoleTarget(role)}
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors btn-press"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="删除教师"
        message={
          deleteTarget ? (
            <>
              确定要删除教师{" "}
              <span className="font-semibold text-black dark:text-white">
                {deleteTarget.name}
              </span>{" "}
              吗？此操作不可撤销。
            </>
          ) : (
            ""
          )
        }
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={!!deleteRoleTarget}
        onClose={() => !deletingRole && setDeleteRoleTarget(null)}
        onConfirm={() => deleteRoleTarget && handleDeleteRole(deleteRoleTarget.id)}
        title="删除身份"
        message={
          deleteRoleTarget ? (
            <>
              确定要删除身份{" "}
              <span className="font-semibold text-black dark:text-white">
                {deleteRoleTarget.name}
              </span>{" "}
              吗？已分配该身份的教师将变为未分配状态。
            </>
          ) : (
            ""
          )
        }
        confirmText="删除"
        variant="danger"
        loading={deletingRole}
      />
    </AdminLayout>
  );
}

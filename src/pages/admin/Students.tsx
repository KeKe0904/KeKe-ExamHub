/**
 * KeKe ExamHub - 考试信息管理系统
 * 学生管理页面
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  User,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  Phone,
  FileText,
  Lock,
  Download,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import {
  studentApi,
  type Student,
  classApi,
  type Class,
} from "@/utils/api";
import { ConfirmDialog } from "@/components/ui";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [resetting, setResetting] = useState(false);

  const [formStudentNo, setFormStudentNo] = useState("");
  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formGender, setFormGender] = useState<Student["gender"]>("unknown");
  const [formPhone, setFormPhone] = useState("");
  const [formIdCard, setFormIdCard] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [batchText, setBatchText] = useState("");
  const [batchResult, setBatchResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const genderOptions = [
    { value: "male", label: "男" },
    { value: "female", label: "女" },
    { value: "unknown", label: "未知" },
  ];

  const statusOptions = [
    { value: "", label: "全部状态" },
    { value: "active", label: "正常" },
    { value: "suspended", label: "停用" },
    { value: "graduated", label: "已毕业" },
  ];

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.getList({
        page,
        pageSize,
        search: search || undefined,
        classId: classFilter || undefined,
        status: statusFilter || undefined,
      });
      const data = res.data as { list: Student[]; total: number };
      setStudents(data.list);
      setTotal(data.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, classFilter, statusFilter]);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await classApi.getList({ all: true });
      const data = res.data as Class[] | { list: Class[] };
      if (Array.isArray(data)) {
        setClasses(data);
      } else {
        setClasses(data.list);
      }
    } catch (err) {
      console.error("加载班级列表失败:", err);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleAdd = () => {
    setFormStudentNo("");
    setFormName("");
    setFormClassId("");
    setFormGender("unknown");
    setFormPhone("");
    setFormIdCard("");
    setFormNotes("");
    setShowAddModal(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormStudentNo(student.studentNo);
    setFormName(student.name);
    setFormClassId(student.classId || "");
    setFormGender(student.gender || "unknown");
    setFormPhone(student.phone || "");
    setFormIdCard(student.idCard || "");
    setFormNotes(student.notes || "");
    setShowEditModal(true);
  };

  const submitAdd = async () => {
    if (!formStudentNo.trim()) {
      setError("请输入学号");
      return;
    }
    if (!formName.trim()) {
      setError("请输入姓名");
      return;
    }
    if (formPhone && !/^1[3-9]\d{9}$/.test(formPhone)) {
      setError("手机号格式不正确");
      return;
    }
    if (formIdCard && !/^\d{17}[\dXx]$/.test(formIdCard)) {
      setError("身份证号格式不正确");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.create({
        studentNo: formStudentNo.trim(),
        name: formName.trim(),
        classId: formClassId || undefined,
        gender: formGender || undefined,
        phone: formPhone || undefined,
        idCard: formIdCard || undefined,
        notes: formNotes || undefined,
      });
      setShowAddModal(false);
      fetchStudents();
      setSuccess("添加成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editingStudent) return;
    if (!formStudentNo.trim()) {
      setError("请输入学号");
      return;
    }
    if (!formName.trim()) {
      setError("请输入姓名");
      return;
    }
    if (formPhone && !/^1[3-9]\d{9}$/.test(formPhone)) {
      setError("手机号格式不正确");
      return;
    }
    if (formIdCard && !/^\d{17}[\dXx]$/.test(formIdCard)) {
      setError("身份证号格式不正确");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.update(editingStudent.id, {
        studentNo: formStudentNo.trim(),
        name: formName.trim(),
        classId: formClassId || null,
        gender: formGender || undefined,
        phone: formPhone || undefined,
        idCard: formIdCard || undefined,
        notes: formNotes || undefined,
      });
      setShowEditModal(false);
      setEditingStudent(null);
      fetchStudents();
      setSuccess("保存成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await studentApi.remove(id);
      setDeleteTarget(null);
      fetchStudents();
      setSuccess("删除成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    setResetting(true);
    try {
      await studentApi.resetPassword(id);
      setResetTarget(null);
      setSuccess("密码重置成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setResetting(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchText.trim()) {
      setError("请输入学生数据");
      return;
    }

    const lines = batchText.trim().split("\n").filter((line) => line.trim());
    const students: Partial<Student>[] = [];

    for (const line of lines) {
      const parts = line.split(/[,，\t]/).map((s) => s.trim());
      if (parts.length < 2) continue;

      const [studentNo, name, className, gender, phone, idCard, ...notesParts] = parts;
      const notes = notesParts.join(",");

      let classId = formClassId || undefined;
      if (className) {
        const cls = classes.find((c) => c.name === className);
        if (cls) classId = cls.id;
      }

      let genderValue: Student["gender"] = "unknown";
      if (gender === "男") genderValue = "male";
      else if (gender === "女") genderValue = "female";

      students.push({
        studentNo: studentNo || "",
        name: name || "",
        classId: classId || null,
        gender: genderValue,
        phone: phone || null,
        idCard: idCard || null,
        notes: notes || null,
      });
    }

    if (students.length === 0) {
      setError("未解析到有效学生数据");
      return;
    }

    setSubmitting(true);
    try {
      const res = await studentApi.batchCreate(students);
      const result = res.data as { success: number; failed: number; results: Array<{ id: string; studentNo: string; name: string }>; errors: string[] };
      setBatchResult({
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      });
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量导入失败");
    } finally {
      setSubmitting(false);
    }
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case "male":
        return "男";
      case "female":
        return "女";
      default:
        return "未知";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "正常";
      case "suspended":
        return "停用";
      case "graduated":
        return "已毕业";
      default:
        return status;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-black dark:text-white">
            学生管理
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
            管理学生信息，支持批量导入和密码重置
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setBatchText("");
              setBatchResult(null);
              setFormClassId("");
              setShowBatchModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-600 text-sm font-medium text-black dark:text-white rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">批量导入</span>
            <span className="sm:hidden">导入</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">添加学生</span>
            <span className="sm:hidden">添加</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索学号或姓名..."
            className="form-input pl-10"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-full sm:w-auto sm:min-w-[140px]"
          disabled={classesLoading}
        >
          <option value="">全部班级</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-full sm:w-auto sm:min-w-[120px]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            暂无学生
          </h3>
          <p className="text-sm text-zinc-400">
            点击上方按钮添加或批量导入学生信息
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-950">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    学号
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    班级
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    性别
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
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-sm font-mono text-zinc-600 dark:text-zinc-300">
                        {student.studentNo}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <User className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <div className="font-medium text-black dark:text-white">
                            {student.name}
                          </div>
                          {student.phone && (
                            <div className="flex items-center gap-1 text-xs text-zinc-400">
                              <Phone className="w-3 h-3" />
                              {student.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {student.className ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                          <FileText className="w-3 h-3" />
                          {student.className}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">
                        {getGenderText(student.gender)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                          student.status === "active"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                            : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            student.status === "active"
                              ? "bg-zinc-900 dark:bg-white"
                              : "bg-zinc-400"
                          }`}
                        />
                        {getStatusText(student.status)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setResetTarget(student)}
                          className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors btn-press"
                          aria-label="重置密码"
                          title="重置密码"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors btn-press"
                          aria-label="编辑"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(student)}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-300 text-center sm:text-left">
                共 {total} 位学生，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-end">
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
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              添加学生
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  学号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formStudentNo}
                  onChange={(e) => setFormStudentNo(e.target.value)}
                  placeholder="请输入学号"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="请输入姓名"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  班级
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="form-input"
                  disabled={classesLoading}
                >
                  <option value="">请选择班级</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  性别
                </label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as Student["gender"])}
                  className="form-input"
                >
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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
                  身份证号
                </label>
                <input
                  type="text"
                  value={formIdCard}
                  onChange={(e) => setFormIdCard(e.target.value)}
                  placeholder="请输入身份证号"
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

      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              编辑学生
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  学号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formStudentNo}
                  onChange={(e) => setFormStudentNo(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
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
                  班级
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="form-input"
                  disabled={classesLoading}
                >
                  <option value="">请选择班级</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  性别
                </label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as Student["gender"])}
                  className="form-input"
                >
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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
                  身份证号
                </label>
                <input
                  type="text"
                  value={formIdCard}
                  onChange={(e) => setFormIdCard(e.target.value)}
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

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBatchModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6 animate-slide-down max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
              批量导入学生
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  默认班级（可选）
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="form-input"
                  disabled={classesLoading}
                >
                  <option value="">不设置（每行可单独指定）</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  学生数据
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={`每行一个学生，格式：学号,姓名,班级,性别,电话,身份证号,备注\n\n示例：\n2024001,张三,高一(1)班,男,13800138000,\n2024002,李四,高一(1)班,女,,,\n\n支持逗号、制表符分隔。班级、性别、电话、身份证号、备注可选。`}
                  rows={10}
                  className="form-input resize-none font-mono text-sm"
                />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                <p>• 初始密码为学号后6位</p>
                <p>• 班级名称需与系统中已有的班级一致</p>
                <p>• 性别可选值：男/女</p>
              </div>

              {batchResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    batchResult.failed > 0
                      ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="text-sm font-medium mb-2">
                    导入结果：成功 {batchResult.success} 条，失败{" "}
                    {batchResult.failed} 条
                  </div>
                  {batchResult.errors.length > 0 && (
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 max-h-32 overflow-y-auto">
                      {batchResult.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                {batchResult ? "关闭" : "取消"}
              </button>
              {!batchResult && (
                <button
                  onClick={handleBatchImport}
                  disabled={submitting || !batchText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  开始导入
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="删除学生"
        message={
          <>
            确定要删除学生
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

      <ConfirmDialog
        isOpen={!!resetTarget}
        onClose={() => !resetting && setResetTarget(null)}
        onConfirm={() => resetTarget && handleResetPassword(resetTarget.id)}
        title="重置密码"
        message={
          <>
            确定要重置
            <span className="font-semibold text-zinc-900 dark:text-white">
              「{resetTarget?.name}」
            </span>
            的密码吗？
            {"\n\n"}重置后密码为学号后 6 位：
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">
              {resetTarget?.studentNo?.slice(-6)}
            </span>
          </>
        }
        confirmText="重置"
        variant="primary"
        loading={resetting}
      />
    </AdminLayout>
  );
}

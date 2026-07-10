/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Edit,
  Phone,
  User,
  Loader2,
  AlertCircle,
  RotateCcw,
  X,
  CheckCircle2,
  BookOpen,
} from "@/components/MathIcon";
import { teacherAuthApi } from "@/utils/api";
import TeacherLayout from "@/components/Layout/TeacherLayout";
import type { TeacherStudent, TeacherClass } from "@/types";

export default function TeacherStudents() {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editingStudent, setEditingStudent] = useState<TeacherStudent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await teacherAuthApi.getClasses();
      setClasses(res.data || []);
    } catch (err) {
      console.error("获取班级列表失败:", err);
    }
  }, []);

  const fetchStudents = useCallback(async (searchValue?: string) => {
    try {
      setLoading(true);
      const res = await teacherAuthApi.getStudents({
        classId: selectedClassId || undefined,
        search: (searchValue ?? search) || undefined,
      });
      setStudents(res.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取学生列表失败");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, search]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (searchTimer) clearTimeout(searchTimer);
    };
  }, [searchTimer]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => fetchStudents(value), 300);
    setSearchTimer(timer);
  };

  const handleEdit = (student: TeacherStudent) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleSave = async (data: { phone: string; notes: string }) => {
    if (!editingStudent) return;
    try {
      await teacherAuthApi.updateStudent(editingStudent.id, data);
      setShowEditModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      throw err;
    }
  };

  return (
    <TeacherLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white font-serif flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-900 dark:text-white" />
            班级学生
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            管理您所带班级的学生信息
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-colors">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索学生姓名、学号、电话..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            >
              <option value="">全部班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-14 h-14 text-zinc-700 dark:text-zinc-300 mb-4" />
              <p className="text-lg text-zinc-900 dark:text-white mb-3">{error}</p>
              <button
                onClick={() => fetchStudents()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重试
              </button>
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      学号
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      班级
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      性别
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      电话
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-white">
                        {student.studentNo}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-white">
                        {student.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                        {student.className}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                        {student.gender === "male"
                          ? "男"
                          : student.gender === "female"
                          ? "女"
                          : "未知"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                        {student.phone || "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === "active"
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                              : student.status === "suspended"
                              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {student.status === "active"
                            ? "在读"
                            : student.status === "suspended"
                            ? "休学"
                            : "已毕业"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(student)}
                          className="inline-flex items-center gap-1 text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
              <Users className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无学生数据</p>
            </div>
          )}
        </div>
      </div>

      {showEditModal && editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => {
            setShowEditModal(false);
            setEditingStudent(null);
          }}
          onSave={handleSave}
        />
      )}
    </TeacherLayout>
  );
}

function EditStudentModal({
  student,
  onClose,
  onSave,
}: {
  student: TeacherStudent;
  onClose: () => void;
  onSave: (data: { phone: string; notes: string }) => Promise<void>;
}) {
  const [phone, setPhone] = useState(student.phone || "");
  const [notes, setNotes] = useState(student.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave({ phone, notes });
      setSuccess(true);
      // 保持 loading=true 直到 onClose 触发，防止 setTimeout 期间重复点击
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-scale-in transition-colors">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">编辑学生信息</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white dark:text-zinc-900" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">保存成功</h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white truncate">{student.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {student.studentNo} · {student.className}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                联系电话
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入联系电话"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                备注
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-3 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="请输入备注信息"
                  disabled={loading}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all disabled:opacity-50 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-start gap-2 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

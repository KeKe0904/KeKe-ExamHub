﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Loader2,
  Building,
  Check,
  AlertCircle,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import DateTimePicker from "@/components/DateTimePicker";
import { useExamStore } from "@/store/examStore";
import { examClassroomApi } from "@/utils/api";
import type { ExamInput, Classroom } from "@/types";

export default function ExamForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { exams, addExam, updateExam, loading, fetchExams } = useExamStore();

  const isEdit = Boolean(id);
  const existingExam = isEdit ? exams.find((e) => e.id === id) : undefined;

  const [formData, setFormData] = useState<ExamInput>({
    subject: "",
    examDate: "",
    duration: 120,
    location: "",
    invigilator: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExamInput, string>>>({});
  const [submitError, setSubmitError] = useState("");

  // 教室分配相关状态
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<Set<string>>(new Set());
  const [originalClassroomIds, setOriginalClassroomIds] = useState<Set<string>>(new Set());
  const [classroomsLoading, setClassroomsLoading] = useState(false);

  // 编辑模式:加载数据
  useEffect(() => {
    if (isEdit && exams.length === 0) {
      fetchExams();
    }
  }, [isEdit, exams.length, fetchExams]);

  // 加载所有可分配教室(已审核通过)
  useEffect(() => {
    let cancelled = false;
    const loadAvailable = async () => {
      setClassroomsLoading(true);
      try {
        const res = await examClassroomApi.getAvailable();
        if (!cancelled) {
          setAvailableClassrooms(res.data);
        }
      } catch {
        // 静默失败,不阻塞表单
      } finally {
        if (!cancelled) setClassroomsLoading(false);
      }
    };
    loadAvailable();
    return () => {
      cancelled = true;
    };
  }, []);

  // 编辑模式:加载已分配的教室
  useEffect(() => {
    let cancelled = false;
    const loadAssigned = async () => {
      if (!isEdit || !id) return;
      try {
        const res = await examClassroomApi.getAssigned(id);
        if (!cancelled) {
          const ids = new Set(res.data.map((c) => c.id));
          setSelectedClassroomIds(ids);
          setOriginalClassroomIds(new Set(ids));
        }
      } catch {
        // 静默失败
      }
    };
    loadAssigned();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id]);

  useEffect(() => {
    if (existingExam) {
      const date = new Date(existingExam.examDate);
      const localDateTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);

      setFormData({
        subject: existingExam.subject,
        examDate: localDateTime,
        duration: existingExam.duration,
        location: existingExam.location,
        invigilator: existingExam.invigilator,
        notes: existingExam.notes,
      });
    }
  }, [existingExam]);

  const handleInputChange = (
    field: keyof ExamInput,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // 切换教室选择
  const toggleClassroom = useCallback((classroomId: string) => {
    setSelectedClassroomIds((prev) => {
      const next = new Set(prev);
      if (next.has(classroomId)) {
        next.delete(classroomId);
      } else {
        next.add(classroomId);
      }
      return next;
    });
  }, []);

  // 切换整组教室选择
  const toggleGroup = useCallback(
    (groupIds: string[], selectAll: boolean) => {
      setSelectedClassroomIds((prev) => {
        const next = new Set(prev);
        if (selectAll) {
          groupIds.forEach((gid) => next.add(gid));
        } else {
          groupIds.forEach((gid) => next.delete(gid));
        }
        return next;
      });
    },
    []
  );

  // 按教学楼分组
  const groupedClassrooms = useMemo(() => {
    const groups = new Map<string, { buildingName: string; classrooms: Classroom[] }>();
    availableClassrooms.forEach((c) => {
      const key = c.buildingId;
      if (!groups.has(key)) {
        groups.set(key, { buildingName: c.buildingName, classrooms: [] });
      }
      groups.get(key)!.classrooms.push(c);
    });
    // 按教学楼名称排序,教室号自然排序
    return Array.from(groups.values())
      .sort((a, b) => a.buildingName.localeCompare(b.buildingName, "zh-CN"))
      .map((g) => ({
        ...g,
        classrooms: g.classrooms.sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, "zh-CN", { numeric: true })
        ),
      }));
  }, [availableClassrooms]);

  // 教室分配是否有变化
  const hasClassroomChanges = useMemo(() => {
    if (selectedClassroomIds.size !== originalClassroomIds.size) return true;
    for (const id of selectedClassroomIds) {
      if (!originalClassroomIds.has(id)) return true;
    }
    return false;
  }, [selectedClassroomIds, originalClassroomIds]);

  // 同步教室分配(计算差异:新增批量 assign,取消逐个 unassign)
  const syncClassroomAssignments = async (examId: string) => {
    const toAdd: string[] = [];
    selectedClassroomIds.forEach((cid) => {
      if (!originalClassroomIds.has(cid)) toAdd.push(cid);
    });
    const toRemove: string[] = [];
    originalClassroomIds.forEach((cid) => {
      if (!selectedClassroomIds.has(cid)) toRemove.push(cid);
    });

    if (toAdd.length > 0) {
      await examClassroomApi.assign(examId, toAdd);
    }
    if (toRemove.length > 0) {
      await Promise.all(
        toRemove.map((cid) => examClassroomApi.unassign(examId, cid))
      );
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ExamInput, string>> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "请输入考试科目";
    }
    if (!formData.examDate) {
      newErrors.examDate = "请选择考试时间";
    }
    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = "请输入有效的考试时长";
    }
    if (!formData.location.trim()) {
      newErrors.location = "请输入考试地点";
    }
    if (!formData.invigilator.trim()) {
      newErrors.invigilator = "请输入监考老师";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    const isoDate = new Date(formData.examDate).toISOString();

    const examData: ExamInput = {
      ...formData,
      examDate: isoDate,
    };

    try {
      let examId: string;
      if (isEdit && id) {
        await updateExam(id, examData);
        examId = id;
      } else {
        const newExam = await addExam(examData);
        examId = newExam.id;
      }

      // 同步教室分配(仅当有变化时)
      if (hasClassroomChanges) {
        await syncClassroomAssignments(examId);
      }

      navigate("/admin/exams");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "操作失败,请重试"
      );
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-950 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white">
            {isEdit ? "编辑考试" : "发布考试"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            {isEdit ? "修改考试信息" : "填写考试信息并发布"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6 lg:p-8 space-y-6">
          <FormField
            label="考试科目"
            icon={<FileText className="w-4 h-4" />}
            error={errors.subject}
            required
          >
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder="例如:高等数学(下)"
              className="form-input"
            />
          </FormField>

          {/* 日期时间选择卡片 */}
          <DateTimePicker
            value={formData.examDate}
            onChange={(val) => handleInputChange("examDate", val)}
            error={errors.examDate}
          />

          <FormField
            label="考试时长(分钟)"
            icon={<Clock className="w-4 h-4" />}
            error={errors.duration}
            required
          >
            <input
              type="number"
              value={formData.duration}
              onChange={(e) =>
                handleInputChange("duration", Number(e.target.value))
              }
              min="1"
              placeholder="120"
              className="form-input"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="考试地点"
              icon={<MapPin className="w-4 h-4" />}
              error={errors.location}
              required
            >
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="例如:教学楼A-301"
                className="form-input"
              />
            </FormField>

            <FormField
              label="监考老师"
              icon={<User className="w-4 h-4" />}
              error={errors.invigilator}
              required
            >
              <input
                type="text"
                value={formData.invigilator}
                onChange={(e) =>
                  handleInputChange("invigilator", e.target.value)
                }
                placeholder="例如:王教授"
                className="form-input"
              />
            </FormField>
          </div>

          <FormField label="注意事项" icon={<FileText className="w-4 h-4" />}>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="请输入考试注意事项,如携带物品、考试要求等..."
              rows={4}
              className="form-input resize-none"
            />
          </FormField>

          {/* 教室分配 */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Building className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  教室分配
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-300">
                  已选 {selectedClassroomIds.size} / {availableClassrooms.length} 间
                </span>
              </div>
              {availableClassrooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allIds = availableClassrooms.map((c) => c.id);
                    const allSelected = allIds.every((cid) =>
                      selectedClassroomIds.has(cid)
                    );
                    toggleGroup(allIds, !allSelected);
                  }}
                  className="text-xs font-medium text-black dark:text-white hover:underline"
                >
                  {availableClassrooms.every((c) =>
                    selectedClassroomIds.has(c.id)
                  )
                    ? "取消全选"
                    : "全选"}
                </button>
              )}
            </div>

            {classroomsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-300">
                  加载教室列表...
                </span>
              </div>
            ) : availableClassrooms.length === 0 ? (
              <div className="flex items-center gap-2 py-6 px-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-500 dark:text-zinc-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                暂无可分配教室,请先在"教室端管理"中审核教室端账号
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {groupedClassrooms.map((group) => {
                  const groupIds = group.classrooms.map((c) => c.id);
                  const selectedInGroup = groupIds.filter((gid) =>
                    selectedClassroomIds.has(gid)
                  ).length;
                  const allInGroupSelected =
                    selectedInGroup === groupIds.length;
                  return (
                    <div
                      key={group.buildingName}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950">
                        <button
                          type="button"
                          onClick={() =>
                            toggleGroup(groupIds, !allInGroupSelected)
                          }
                          className="flex items-center gap-2 text-sm font-medium text-black dark:text-white"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                              allInGroupSelected
                                ? "bg-black dark:bg-white border-black dark:border-white"
                                : "border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {allInGroupSelected && (
                              <Check className="w-3 h-3 text-white dark:text-black" />
                            )}
                          </span>
                          <Building className="w-3.5 h-3.5" />
                          {group.buildingName}
                        </button>
                        <span className="text-xs text-zinc-500 dark:text-zinc-300">
                          {selectedInGroup}/{groupIds.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
                        {group.classrooms.map((c) => {
                          const checked = selectedClassroomIds.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleClassroom(c.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                                checked
                                  ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                                  : "border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white text-black dark:text-white"
                              }`}
                            >
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded border shrink-0 ${
                                  checked
                                    ? "border-white dark:border-black"
                                    : "border-zinc-300 dark:border-zinc-600"
                                }`}
                              >
                                {checked && (
                                  <Check className="w-2.5 h-2.5 text-white dark:text-black" />
                                )}
                              </span>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{c.roomNumber}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isEdit && hasClassroomChanges && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                教室分配已修改,保存后生效
              </p>
            )}
          </div>
        </div>

        {submitError && (
          <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-black dark:text-white bg-white dark:bg-black border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "保存修改" : "发布考试"}
              </>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  label,
  icon,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        <span className="text-black dark:text-white">{icon}</span>
        {label}
        {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}

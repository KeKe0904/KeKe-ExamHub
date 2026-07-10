﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
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
  Search,
  X,
  ChevronDown,
  Users,
  Plus,
  GraduationCap,
  Trash2,
  Shuffle,
  BookOpen,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import DateTimePicker from "@/components/DateTimePicker";
import { useExamStore } from "@/store/examStore";
import { examClassroomApi, teacherApi, examStudentApi, classApi, studentApi } from "@/utils/api";
import type { ExamInput, Classroom, ExamConflict, Teacher, ExamStudent, Class, Student } from "@/types";

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

  // 冲突检测相关状态
  const [conflicts, setConflicts] = useState<ExamConflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // 监考老师选择器状态
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedInvigilators, setSelectedInvigilators] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherRoleFilter, setTeacherRoleFilter] = useState("");
  const [teacherRoles, setTeacherRoles] = useState<any[]>([]);

  // 教室搜索
  const [classroomSearch, setClassroomSearch] = useState("");
  const [classroomBuildingFilter, setClassroomBuildingFilter] = useState("");

  // 学生分配相关状态
  const [assignedStudents, setAssignedStudents] = useState<ExamStudent[]>([]);
  const [assignedStudentsLoading, setAssignedStudentsLoading] = useState(false);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [studentClassroomFilter, setStudentClassroomFilter] = useState("");
  const [autoAssignSeats, setAutoAssignSeats] = useState(true);
  const [studentActionLoading, setStudentActionLoading] = useState(false);

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

  // 加载所有教师和教师身份
  useEffect(() => {
    let cancelled = false;
    const loadTeachers = async () => {
      setTeachersLoading(true);
      try {
        const [teachersRes, rolesRes] = await Promise.all([
          teacherApi.getList({ all: true }),
          teacherApi.getRoles(),
        ]);
        if (!cancelled) {
          const teacherList = Array.isArray(teachersRes.data)
            ? teachersRes.data
            : (teachersRes.data as any).list || [];
          setAllTeachers(teacherList);
          setTeacherRoles(rolesRes.data);
        }
      } catch (err) {
        console.error("加载教师列表失败:", err);
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    };
    loadTeachers();
    return () => {
      cancelled = true;
    };
  }, []);

  // 编辑模式:加载已分配的监考老师
  useEffect(() => {
    let cancelled = false;
    const loadInvigilators = async () => {
      if (!isEdit || !id) return;
      try {
        const res = await teacherApi.getExamInvigilators(id);
        if (!cancelled) {
          setSelectedInvigilators(res.data);
          // 同时同步到 invigilator 文本字段（兼容旧数据）
          const names = res.data.map((t) => t.name).join("、");
          setFormData((prev) => ({ ...prev, invigilator: names }));
        }
      } catch {
        // 静默失败
      }
    };
    loadInvigilators();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id]);

  // 加载所有班级
  useEffect(() => {
    let cancelled = false;
    const loadClasses = async () => {
      setClassesLoading(true);
      try {
        const res = await classApi.getList({ all: true });
        if (!cancelled) {
          const classList = Array.isArray(res.data)
            ? res.data
            : (res.data as any).list || [];
          setAllClasses(classList);
        }
      } catch (err) {
        console.error("加载班级列表失败:", err);
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    };
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  // 编辑模式:加载已分配的学生
  useEffect(() => {
    let cancelled = false;
    const loadAssignedStudents = async () => {
      if (!isEdit || !id) return;
      setAssignedStudentsLoading(true);
      try {
        const res = await examStudentApi.getAssigned(id);
        if (!cancelled) {
          setAssignedStudents(res.data);
        }
      } catch {
        // 静默失败
      } finally {
        if (!cancelled) setAssignedStudentsLoading(false);
      }
    };
    loadAssignedStudents();
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

  // 切换监考老师选择
  const toggleInvigilator = useCallback((teacher: Teacher) => {
    setSelectedInvigilators((prev) => {
      const exists = prev.some((t) => t.id === teacher.id);
      let next: Teacher[];
      if (exists) {
        next = prev.filter((t) => t.id !== teacher.id);
      } else {
        next = [...prev, teacher];
      }
      // 同步到 invigilator 字段
      const names = next.map((t) => t.name).join("、");
      setFormData((prevData) => ({ ...prevData, invigilator: names }));
      return next;
    });
  }, []);

  // 移除已选监考老师
  const removeInvigilator = useCallback((teacherId: string) => {
    setSelectedInvigilators((prev) => {
      const next = prev.filter((t) => t.id !== teacherId);
      const names = next.map((t) => t.name).join("、");
      setFormData((prevData) => ({ ...prevData, invigilator: names }));
      return next;
    });
  }, []);

  // 过滤后的教师列表
  const filteredTeachers = useMemo(() => {
    let list = allTeachers;
    if (teacherSearch.trim()) {
      const query = teacherSearch.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.roleName?.toLowerCase().includes(query) ||
          t.phone?.includes(query)
      );
    }
    if (teacherRoleFilter) {
      list = list.filter((t) => t.roleId === teacherRoleFilter);
    }
    return list;
  }, [allTeachers, teacherSearch, teacherRoleFilter]);

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

  // 过滤后的教室列表（支持搜索和按教学楼筛选）
  const filteredClassrooms = useMemo(() => {
    let list = availableClassrooms;
    if (classroomSearch.trim()) {
      const query = classroomSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.roomNumber.toLowerCase().includes(query) ||
          c.buildingName.toLowerCase().includes(query)
      );
    }
    if (classroomBuildingFilter) {
      list = list.filter((c) => c.buildingId === classroomBuildingFilter);
    }
    return list;
  }, [availableClassrooms, classroomSearch, classroomBuildingFilter]);

  // 按教学楼分组（过滤后）
  const filteredGroupedClassrooms = useMemo(() => {
    const groups = new Map<string, { buildingName: string; classrooms: Classroom[] }>();
    filteredClassrooms.forEach((c) => {
      const key = c.buildingId;
      if (!groups.has(key)) {
        groups.set(key, { buildingName: c.buildingName, classrooms: [] });
      }
      groups.get(key)!.classrooms.push(c);
    });
    return Array.from(groups.values())
      .sort((a, b) => a.buildingName.localeCompare(b.buildingName, "zh-CN"))
      .map((g) => ({
        ...g,
        classrooms: g.classrooms.sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, "zh-CN", { numeric: true })
        ),
      }));
  }, [filteredClassrooms]);

  // 已选教室列表
  const selectedClassrooms = useMemo(() => {
    return availableClassrooms.filter((c) => selectedClassroomIds.has(c.id));
  }, [availableClassrooms, selectedClassroomIds]);

  // 移除已选教室
  const removeSelectedClassroom = useCallback((classroomId: string) => {
    setSelectedClassroomIds((prev) => {
      const next = new Set(prev);
      next.delete(classroomId);
      return next;
    });
  }, []);

  // 切换班级选择
  const toggleClassSelection = useCallback((classId: string) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  }, []);

  // 按班级批量分配学生
  const handleAssignByClass = useCallback(async () => {
    if (!id || selectedClassIds.size === 0) return;
    setStudentActionLoading(true);
    try {
      await examStudentApi.assignByClass(id, {
        classIds: Array.from(selectedClassIds),
        classroomId: studentClassroomFilter || undefined,
        autoAssignSeats,
      });
      const res = await examStudentApi.getAssigned(id);
      setAssignedStudents(res.data);
      setSelectedClassIds(new Set());
    } catch (error) {
      console.error("分配学生失败:", error);
    } finally {
      setStudentActionLoading(false);
    }
  }, [id, selectedClassIds, studentClassroomFilter, autoAssignSeats]);

  // 移除学生
  const handleRemoveStudent = useCallback(async (studentId: string) => {
    if (!id) return;
    try {
      await examStudentApi.remove(id, studentId);
      setAssignedStudents((prev) => prev.filter((s) => s.studentId !== studentId));
    } catch (error) {
      console.error("移除学生失败:", error);
    }
  }, [id]);

  // 更新学生座位号
  const handleUpdateSeatNumber = useCallback(async (studentId: string, seatNumber: string) => {
    if (!id) return;
    try {
      await examStudentApi.update(id, studentId, { seatNumber });
      setAssignedStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentId ? { ...s, seatNumber } : s
        )
      );
    } catch (error) {
      console.error("更新座位号失败:", error);
    }
  }, [id]);

  // 自动按学号排序重新分配座位号
  const handleAutoArrangeSeats = useCallback(async () => {
    if (!id || assignedStudents.length === 0) return;
    setStudentActionLoading(true);
    try {
      const sorted = [...assignedStudents].sort((a, b) =>
        a.studentNo.localeCompare(b.studentNo, "zh-CN", { numeric: true })
      );
      // 改为串行更新，避免部分失败导致座位号不一致
      const updateData = sorted.map((student, index) => ({
        id: student.studentId,
        seatNumber: String(index + 1),
      }));
      let successCount = 0;
      let failCount = 0;
      for (const item of updateData) {
        try {
          await examStudentApi.update(id, item.id, {
            seatNumber: item.seatNumber,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }
      if (failCount > 0) {
        alert(`成功更新${successCount}个，失败${failCount}个`);
      }
      const res = await examStudentApi.getAssigned(id);
      setAssignedStudents(res.data);
    } catch (error) {
      console.error("自动排座失败:", error);
    } finally {
      setStudentActionLoading(false);
    }
  }, [id, assignedStudents]);

  // 检测冲突
  const handleCheckConflicts = async () => {
    if (!isEdit || !id) return;
    if (selectedClassroomIds.size === 0) {
      setConflicts([]);
      return;
    }

    setConflictsLoading(true);
    try {
      const res = await examClassroomApi.checkConflicts(
        id,
        Array.from(selectedClassroomIds)
      );
      setConflicts(res.data.conflicts);
    } catch (error) {
      setConflicts([]);
    } finally {
      setConflictsLoading(false);
    }
  };

  // 格式化时间显示
  const formatConflictTime = (examDate: string, duration: number) => {
    const start = new Date(examDate);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const formatDate = (d: Date) => {
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${month}-${day} ${hours}:${minutes}`;
    };
    return `${formatDate(start)} ~ ${formatDate(end)}`;
  };

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

  // 同步监考老师
  const syncInvigilators = async (examId: string) => {
    const teacherIds = selectedInvigilators.map((t) => t.id);
    await teacherApi.setExamInvigilators(examId, teacherIds);
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

  const doSubmit = async () => {
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

      // 同步监考老师
      await syncInvigilators(examId);

      navigate("/admin/exams");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "操作失败,请重试"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    // 编辑模式且有教室分配变化时，先检测冲突
    if (isEdit && id && hasClassroomChanges && selectedClassroomIds.size > 0) {
      setConflictsLoading(true);
      try {
        const toAdd: string[] = [];
        selectedClassroomIds.forEach((cid) => {
          if (!originalClassroomIds.has(cid)) toAdd.push(cid);
        });

        if (toAdd.length > 0) {
          const res = await examClassroomApi.checkConflicts(id, toAdd);
          if (res.data.conflicts.length > 0) {
            setConflicts(res.data.conflicts);
            setShowConflictDialog(true);
            setConflictsLoading(false);
            return;
          }
        }
      } catch {
        // 冲突检测失败，继续提交
      } finally {
        setConflictsLoading(false);
      }
    }

    await doSubmit();
  };

  const handleConfirmWithConflicts = async () => {
    setShowConflictDialog(false);
    await doSubmit();
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
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-600 p-6 lg:p-8 space-y-6">
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTeacherPicker((v) => !v)}
                  className="form-input w-full text-left flex items-center justify-between min-h-[42px]"
                >
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {selectedInvigilators.length === 0 ? (
                      <span className="text-zinc-400">请选择监考老师</span>
                    ) : (
                      selectedInvigilators.map((teacher) => (
                        <span
                          key={teacher.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeInvigilator(teacher.id);
                          }}
                        >
                          {teacher.name}
                          <X className="w-3 h-3 hover:text-red-500 cursor-pointer" />
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      showTeacherPicker ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* 教师选择下拉面板 */}
                {showTeacherPicker && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg overflow-hidden">
                    {/* 搜索和筛选 */}
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          placeholder="搜索教师姓名..."
                          className="form-input pl-10 py-1.5 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={teacherRoleFilter}
                          onChange={(e) => setTeacherRoleFilter(e.target.value)}
                          className="form-input py-1.5 text-sm flex-1"
                        >
                          <option value="">全部身份</option>
                          {teacherRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            // 快速跳转到教师管理页
                            window.open("/admin/teachers", "_blank");
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-black dark:text-white border border-zinc-200 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          新增
                        </button>
                      </div>
                    </div>

                    {/* 教师列表 */}
                    <div className="max-h-64 overflow-y-auto">
                      {teachersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                        </div>
                      ) : filteredTeachers.length === 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-400">
                          没有找到符合条件的教师
                        </div>
                      ) : (
                        filteredTeachers.map((teacher) => {
                          const checked = selectedInvigilators.some(
                            (t) => t.id === teacher.id
                          );
                          return (
                            <button
                              key={teacher.id}
                              type="button"
                              onClick={() => toggleInvigilator(teacher)}
                              className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors border-b border-zinc-100 dark:border-zinc-900 last:border-0 ${
                                checked ? "bg-zinc-50 dark:bg-zinc-950" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded border shrink-0 ${
                                    checked
                                      ? "bg-black dark:bg-white border-black dark:border-white"
                                      : "border-zinc-300 dark:border-zinc-600"
                                  }`}
                                >
                                  {checked && (
                                    <Check className="w-3.5 h-3.5 text-white dark:text-black" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="text-sm font-medium text-black dark:text-white">
                                    {teacher.name}
                                  </div>
                                  {teacher.roleName && (
                                    <div className="text-xs text-zinc-400">
                                      {teacher.roleName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {teacher.phone && (
                                <span className="text-xs text-zinc-400">
                                  {teacher.phone}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* 底部操作 */}
                    <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        已选 {selectedInvigilators.length} 位
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTeacherPicker(false)}
                        className="text-xs font-medium text-black dark:text-white hover:underline"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="flex items-center gap-3">
                {isEdit && availableClassrooms.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCheckConflicts}
                    disabled={conflictsLoading || selectedClassroomIds.size === 0}
                    className="text-xs font-medium text-black dark:text-white hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {conflictsLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    检测冲突
                  </button>
                )}
                {availableClassrooms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredClassrooms.map((c) => c.id);
                      const allSelected = allIds.every((cid) =>
                        selectedClassroomIds.has(cid)
                      );
                      toggleGroup(allIds, !allSelected);
                    }}
                    className="text-xs font-medium text-black dark:text-white hover:underline"
                  >
                    {filteredClassrooms.length > 0 && filteredClassrooms.every((c) =>
                      selectedClassroomIds.has(c.id)
                    )
                      ? "取消全选"
                      : "全选"}
                  </button>
                )}
              </div>
            </div>

            {/* 已选教室标签 */}
            {selectedClassrooms.length > 0 && (
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  已选教室
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedClassrooms.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black rounded text-xs"
                    >
                      <Building className="w-3 h-3" />
                      {c.buildingName} {c.roomNumber}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-300"
                        onClick={() => removeSelectedClassroom(c.id)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 搜索和筛选 */}
            {availableClassrooms.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={classroomSearch}
                    onChange={(e) => setClassroomSearch(e.target.value)}
                    placeholder="搜索教室号或教学楼..."
                    className="form-input pl-10 py-2 text-sm w-full"
                  />
                </div>
                <select
                  value={classroomBuildingFilter}
                  onChange={(e) => setClassroomBuildingFilter(e.target.value)}
                  className="form-input py-2 text-sm"
                >
                  <option value="">全部教学楼</option>
                  {groupedClassrooms.map((g) => (
                    <option key={g.buildingName} value={g.classrooms[0]?.buildingId}>
                      {g.buildingName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 冲突警告 */}
            {conflicts.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                      检测到 {conflicts.length} 个时段冲突
                    </h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      以下教室在相同时段已分配给其他考试
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {conflicts.map((conflict, idx) => (
                    <div
                      key={`${conflict.examId}-${conflict.classroomId}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900/50 rounded border border-red-100 dark:border-red-900/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                          {conflict.buildingName} {conflict.classroomName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-zinc-800 dark:text-zinc-200 text-xs">
                          {conflict.subject}
                        </div>
                        <div className="text-red-600 dark:text-red-400 text-xs">
                          {formatConflictTime(conflict.examDate, conflict.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            ) : filteredClassrooms.length === 0 ? (
              <div className="flex items-center gap-2 py-6 px-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-500 dark:text-zinc-300">
                <Search className="w-4 h-4 shrink-0" />
                没有找到符合条件的教室
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filteredGroupedClassrooms.map((group) => {
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
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                教室分配已修改,保存后生效
              </p>
            )}
          </div>

          {/* 学生分配 */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <GraduationCap className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  学生分配
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-300">
                  已分配 {assignedStudents.length} 名学生
                </span>
              </div>
              {isEdit && assignedStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoArrangeSeats}
                    disabled={studentActionLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-black dark:text-white border border-zinc-200 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-50"
                  >
                    {studentActionLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Shuffle className="w-3 h-3" />
                    )}
                    按学号排座
                  </button>
                </div>
              )}
            </div>

            {!isEdit ? (
              <div className="flex items-center gap-2 py-6 px-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-500 dark:text-zinc-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                请先保存考试，然后再进行学生分配
              </div>
            ) : (
              <>
                {/* 按班级批量分配 */}
                <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      按班级批量分配
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">
                        分配到教室
                      </label>
                      <select
                        value={studentClassroomFilter}
                        onChange={(e) => setStudentClassroomFilter(e.target.value)}
                        className="form-input py-2 text-sm w-full"
                      >
                        <option value="">不指定教室</option>
                        {selectedClassrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.buildingName} {c.roomNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAssignSeats}
                          onChange={(e) => setAutoAssignSeats(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                        />
                        自动按学号分配座位
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    选择班级（可多选）：
                  </div>

                  {classesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                      <span className="ml-2 text-sm text-zinc-500">加载班级列表...</span>
                    </div>
                  ) : allClasses.length === 0 ? (
                    <div className="text-sm text-zinc-400 py-2">
                      暂无班级，请先创建班级
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
                      {allClasses.map((cls) => {
                        const checked = selectedClassIds.has(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleClassSelection(cls.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                              checked
                                ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white text-black dark:text-white"
                            }`}
                          >
                            <span
                              className={`flex h-3 w-3 items-center justify-center rounded border shrink-0 ${
                                checked
                                  ? "border-white dark:border-black"
                                  : "border-zinc-300 dark:border-zinc-600"
                              }`}
                            >
                              {checked && (
                                <Check className="w-2 h-2 text-white dark:text-black" />
                              )}
                            </span>
                            {cls.grade && <span>{cls.grade}</span>}
                            <span>{cls.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      已选 {selectedClassIds.size} 个班级
                    </span>
                    <button
                      type="button"
                      onClick={handleAssignByClass}
                      disabled={selectedClassIds.size === 0 || studentActionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {studentActionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      批量分配
                    </button>
                  </div>
                </div>

                {/* 已分配学生列表 */}
                {assignedStudentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-300">
                      加载学生列表...
                    </span>
                  </div>
                ) : assignedStudents.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 px-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-500 dark:text-zinc-300">
                    <Users className="w-4 h-4 shrink-0" />
                    暂无分配的学生，请从上方选择班级进行批量分配
                  </div>
                ) : (
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">
                              座位号
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              学号
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              姓名
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              班级
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              教室
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                          {assignedStudents.map((student) => (
                            <tr
                              key={student.id}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={student.seatNumber}
                                  onChange={(e) =>
                                    handleUpdateSeatNumber(
                                      student.studentId,
                                      e.target.value
                                    )
                                  }
                                  className="w-14 px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-zinc-900 text-black dark:text-white"
                                  placeholder="--"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {student.studentNo}
                              </td>
                              <td className="px-3 py-2 font-medium text-black dark:text-white">
                                {student.name}
                              </td>
                              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                                {student.grade && <span>{student.grade}</span>}
                                {student.className}
                              </td>
                              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 text-xs">
                                {student.buildingName && student.classroomName
                                  ? `${student.buildingName} ${student.classroomName}`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(student.studentId)}
                                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                                  title="移除学生"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
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
            className="px-5 py-2.5 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || pendingSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading || pendingSubmit ? (
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

      {/* 冲突确认对话框 */}
      {showConflictDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-zinc-900/70">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-black dark:text-white">
                    存在时段冲突
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    检测到 {conflicts.length} 个教室时段冲突
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-64 overflow-y-auto">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                以下教室在相同时段已分配给其他考试，是否仍要继续分配？
              </p>
              <div className="space-y-2">
                {conflicts.map((conflict, idx) => (
                  <div
                    key={`dialog-${conflict.examId}-${conflict.classroomId}-${idx}`}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {conflict.buildingName} {conflict.classroomName}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-800 dark:text-zinc-200 text-xs">
                        {conflict.subject}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-xs">
                        {formatConflictTime(conflict.examDate, conflict.duration)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConflictDialog(false);
                  setPendingSubmit(false);
                }}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 hover:border-black dark:hover:border-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmWithConflicts}
                className="px-4 py-2 text-sm font-medium text-white dark:text-red-300 bg-red-600 dark:bg-red-950 border border-red-500 dark:border-red-600 hover:bg-red-500 dark:hover:bg-red-900 rounded-lg transition-colors"
              >
                仍要继续
              </button>
            </div>
          </div>
        </div>
      )}
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

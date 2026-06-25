import { useState, useEffect } from "react";
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
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import DateTimePicker from "@/components/DateTimePicker";
import { useExamStore } from "@/store/examStore";
import type { ExamInput } from "@/types";

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

  // 编辑模式:加载数据
  useEffect(() => {
    if (isEdit && exams.length === 0) {
      fetchExams();
    }
  }, [isEdit, exams.length, fetchExams]);

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
      if (isEdit && id) {
        await updateExam(id, examData);
      } else {
        await addExam(examData);
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

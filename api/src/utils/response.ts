// 统一响应格式
export function successResponse<T>(data: T, message: string = "操作成功") {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code: string = "ERROR") {
  return {
    success: false,
    message,
    code,
  };
}

// 考试数据类型
export interface ExamRow {
  id: number;
  subject: string;
  exam_date: Date;
  duration: number;
  location: string;
  invigilator: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// 转换数据库行为前端格式
export function formatExam(row: ExamRow) {
  return {
    id: String(row.id),
    subject: row.subject,
    examDate: row.exam_date.toISOString(),
    duration: row.duration,
    location: row.location,
    invigilator: row.invigilator,
    notes: row.notes || "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

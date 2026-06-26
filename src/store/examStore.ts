/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { create } from "zustand";
import type { Exam, ExamInput } from "@/types";
import { examApi } from "@/utils/api";
import { calculateExamStatus } from "@/utils/date";

interface ExamState {
  exams: Exam[];
  loading: boolean;
  error: string | null;
  // 获取所有考试
  fetchExams: (params?: { search?: string; status?: string }) => Promise<void>;
  // 根据ID获取考试
  getExamById: (id: string) => Exam | undefined;
  // 添加考试
  addExam: (input: ExamInput) => Promise<Exam>;
  // 更新考试
  updateExam: (id: string, input: ExamInput) => Promise<void>;
  // 删除考试
  deleteExam: (id: string) => Promise<void>;
  // 清除错误
  clearError: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  loading: false,
  error: null,

  fetchExams: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await examApi.getAll(params);
      const exams = response.data.map((exam: any) => ({
        ...exam,
        status: calculateExamStatus(exam),
      }));
      set({ exams, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "获取考试列表失败",
      });
    }
  },

  getExamById: (id: string) => {
    const exam = get().exams.find((e) => e.id === id);
    if (!exam) return undefined;
    return { ...exam, status: calculateExamStatus(exam) };
  },

  addExam: async (input: ExamInput) => {
    set({ loading: true, error: null });
    try {
      const response = await examApi.create(input);
      const newExam = {
        ...response.data,
        status: calculateExamStatus(response.data),
      };
      set((state) => ({
        exams: [newExam, ...state.exams],
        loading: false,
      }));
      return newExam;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "创建考试失败",
      });
      throw error;
    }
  },

  updateExam: async (id: string, input: ExamInput) => {
    set({ loading: true, error: null });
    try {
      const response = await examApi.update(id, input);
      const updatedExam = {
        ...response.data,
        status: calculateExamStatus(response.data),
      };
      set((state) => ({
        exams: state.exams.map((exam) =>
          exam.id === id ? updatedExam : exam
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "更新考试失败",
      });
      throw error;
    }
  },

  deleteExam: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await examApi.delete(id);
      set((state) => ({
        exams: state.exams.filter((exam) => exam.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "删除考试失败",
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

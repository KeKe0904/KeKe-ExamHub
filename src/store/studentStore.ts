import { create } from "zustand";
import {
  studentAuthApi,
  setStudentToken,
  removeStudentToken,
  getStudentToken,
  setStudentInfo,
  removeStudentInfo,
  getStudentInfo,
  setStudentUnauthorizedHandler,
} from "@/utils/api";
import type { Student, StudentLoginResult } from "@/types";

interface StudentState {
  student: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (studentNo: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  setStudent: (student: Student) => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useStudentStore = create<StudentState>((set) => {
  const initialToken = getStudentToken();
  const initialStudent = getStudentInfo();

  setStudentUnauthorizedHandler(() => {
    set({ isAuthenticated: false, student: null, token: null });
  });

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "examhub-student-token" || e.key === null) {
        const token = getStudentToken();
        if (!token) {
          set({ isAuthenticated: false, student: null, token: null });
        } else {
          set({ isAuthenticated: true, student: getStudentInfo(), token });
        }
      }
    });

    try {
      const channel = new BroadcastChannel("examhub-student-auth");
      channel.onmessage = (event) => {
        if (event.data === "logout") {
          set({ isAuthenticated: false, student: null, token: null });
        } else if (event.data === "login") {
          set({
            isAuthenticated: true,
            student: getStudentInfo(),
            token: getStudentToken(),
          });
        }
      };
    } catch {
    }
  }

  return {
    student: initialStudent,
    token: initialToken,
    isAuthenticated: !!initialToken,
    loading: false,
    error: null,

    login: async (studentNo: string, password: string, rememberMe: boolean = true) => {
      set({ loading: true, error: null });
      try {
        const response = await studentAuthApi.login(studentNo, password);
        const { token, student, isFirstLogin } = response.data;
        setStudentToken(token, rememberMe);
        setStudentInfo(student, rememberMe);
        set({
          student,
          token,
          isAuthenticated: true,
          loading: false,
        });

        try {
          const channel = new BroadcastChannel("examhub-student-auth");
          channel.postMessage("login");
          channel.close();
        } catch {}

        return true;
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : "登录失败",
        });
        return false;
      }
    },

    logout: () => {
      removeStudentToken();
      removeStudentInfo();
      set({ isAuthenticated: false, student: null, token: null, error: null });

      try {
        const channel = new BroadcastChannel("examhub-student-auth");
        channel.postMessage("logout");
        channel.close();
      } catch {}
    },

    setStudent: (student: Student) => {
      setStudentInfo(student);
      set({ student });
    },

    checkAuth: async () => {
      const token = getStudentToken();
      if (!token) {
        set({ isAuthenticated: false, student: null, token: null });
        return;
      }

      try {
        const response = await studentAuthApi.getMe();
        set({ isAuthenticated: true, student: response.data });
      } catch {
        removeStudentToken();
        set({ isAuthenticated: false, student: null, token: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});

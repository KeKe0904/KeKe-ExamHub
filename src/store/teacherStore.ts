import { create } from "zustand";
import {
  teacherAuthApi,
  setTeacherToken,
  removeTeacherToken,
  getTeacherToken,
  setTeacherInfo,
  removeTeacherInfo,
  getTeacherInfo,
  setTeacherUnauthorizedHandler,
} from "@/utils/api";
import type { TeacherInfo } from "@/types";

interface TeacherState {
  teacher: TeacherInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (account: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTeacher: (teacher: TeacherInfo) => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useTeacherStore = create<TeacherState>((set) => {
  const initialToken = getTeacherToken();
  const initialTeacher = getTeacherInfo();

  setTeacherUnauthorizedHandler(() => {
    set({ isAuthenticated: false, teacher: null, token: null });
  });

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "examhub-teacher-token" || e.key === null) {
        const token = getTeacherToken();
        if (!token) {
          set({ isAuthenticated: false, teacher: null, token: null });
        } else {
          set({ isAuthenticated: true, teacher: getTeacherInfo(), token });
        }
      }
    });

    try {
      const channel = new BroadcastChannel("examhub-teacher-auth");
      channel.onmessage = (event) => {
        if (event.data === "logout") {
          set({ isAuthenticated: false, teacher: null, token: null });
        } else if (event.data === "login") {
          set({
            isAuthenticated: true,
            teacher: getTeacherInfo(),
            token: getTeacherToken(),
          });
        }
      };
    } catch {
    }
  }

  return {
    teacher: initialTeacher,
    token: initialToken,
    isAuthenticated: !!initialToken,
    loading: false,
    error: null,

    login: async (account: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const response = await teacherAuthApi.login(account, password);
        const { token, teacher } = response.data;
        setTeacherToken(token);
        setTeacherInfo(teacher);
        set({
          teacher,
          token,
          isAuthenticated: true,
          loading: false,
        });

        try {
          const channel = new BroadcastChannel("examhub-teacher-auth");
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
      removeTeacherToken();
      removeTeacherInfo();
      set({ isAuthenticated: false, teacher: null, token: null, error: null });

      try {
        const channel = new BroadcastChannel("examhub-teacher-auth");
        channel.postMessage("logout");
        channel.close();
      } catch {}
    },

    setTeacher: (teacher: TeacherInfo) => {
      setTeacherInfo(teacher);
      set({ teacher });
    },

    checkAuth: async () => {
      const token = getTeacherToken();
      if (!token) {
        set({ isAuthenticated: false, teacher: null, token: null });
        return;
      }

      try {
        const response = await teacherAuthApi.getMe();
        set({ isAuthenticated: true, teacher: response.data });
      } catch {
        removeTeacherToken();
        set({ isAuthenticated: false, teacher: null, token: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});

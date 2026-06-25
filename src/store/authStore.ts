import { create } from "zustand";
import { authApi, setToken, removeToken, getToken } from "@/utils/api";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  error: string | null;
  // 登录
  login: (username: string, password: string) => Promise<boolean>;
  // 退出登录
  logout: () => void;
  // 检查登录状态
  checkAuth: () => Promise<void>;
  // 清除错误
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始化时检查是否有token
  isAuthenticated: !!getToken(),
  username: null,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      setToken(response.data.token);
      set({
        isAuthenticated: true,
        username: response.data.username,
        loading: false,
      });
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
    removeToken();
    set({ isAuthenticated: false, username: null });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, username: null });
      return;
    }

    try {
      const response = await authApi.verify();
      set({ isAuthenticated: true, username: response.data.username });
    } catch (error) {
      removeToken();
      set({ isAuthenticated: false, username: null });
    }
  },

  clearError: () => set({ error: null }),
}));

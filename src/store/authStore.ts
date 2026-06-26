/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { create } from "zustand";
import {
  authApi,
  setToken,
  removeToken,
  getToken,
  setUsername,
  getUsername,
  setUnauthorizedHandler,
} from "@/utils/api";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  error: string | null;
  // 登录（rememberMe 控制是否持久化到 Cookie）
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  // 退出登录
  logout: () => void;
  // 检查登录状态（向后端验证 Token）
  checkAuth: () => Promise<void>;
  // 清除错误
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 初始化：从 Cookie 读取 Token 和用户名
  const initialToken = getToken();
  const initialUsername = getUsername();

  // 注册 401 全局处理器
  setUnauthorizedHandler(() => {
    set({ isAuthenticated: false, username: null });
  });

  // 多标签页同步：监听 Cookie 变化
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "examhub-token" || e.key === null) {
        const token = getToken();
        if (!token) {
          set({ isAuthenticated: false, username: null });
        } else {
          set({ isAuthenticated: true, username: getUsername() });
        }
      }
    });

    // 广播通道：跨标签页同步登出事件
    try {
      const channel = new BroadcastChannel("examhub-auth");
      channel.onmessage = (event) => {
        if (event.data === "logout") {
          set({ isAuthenticated: false, username: null });
        } else if (event.data === "login") {
          set({ isAuthenticated: true, username: getUsername() });
        }
      };
    } catch {
      // BroadcastChannel 不可用时静默降级
    }
  }

  return {
    // 初始化时检查是否有 token
    isAuthenticated: !!initialToken,
    username: initialUsername,
    loading: false,
    error: null,

    login: async (username: string, password: string, rememberMe: boolean = true) => {
      set({ loading: true, error: null });
      try {
        const response = await authApi.login(username, password);
        // 始终存入 sessionStorage，rememberMe 时额外存入 Cookie
        setToken(response.data.token, rememberMe);
        if (rememberMe) {
          setUsername(response.data.username, true);
        } else {
          sessionStorage.setItem("examhub-username", response.data.username);
        }
        set({
          isAuthenticated: true,
          username: response.data.username,
          loading: false,
        });

        // 通知其他标签页
        try {
          const channel = new BroadcastChannel("examhub-auth");
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
      removeToken();
      sessionStorage.removeItem("examhub-username");
      set({ isAuthenticated: false, username: null });

      // 通知其他标签页
      try {
        const channel = new BroadcastChannel("examhub-auth");
        channel.postMessage("logout");
        channel.close();
      } catch {}
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
      } catch {
        removeToken();
        set({ isAuthenticated: false, username: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});

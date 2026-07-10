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

    // 登录
    // rememberMe=true（默认）：token 持久化到 localStorage + Cookie（7 天），7 天内访问免密登录
    // rememberMe=false：token 只存 sessionStorage，关闭浏览器后失效
    // 用户主动 logout 会清除 token；JWT 7 天过期后 ProtectedRoute 也会自动 logout
    login: async (username: string, password: string, rememberMe: boolean = true) => {
      set({ loading: true, error: null });
      try {
        const response = await authApi.login(username, password);
        // 始终存入 sessionStorage，rememberMe 时额外存入 Cookie
        setToken(response.data.token, rememberMe);
        // 根据 rememberMe 决定用户名存储策略：
        // - rememberMe=true: 写 Cookie 30 天（同时备份到 localStorage）
        // - rememberMe=false: 写 sessionStorage（关闭浏览器后清除）
        setUsername(response.data.username, rememberMe);
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
      // 主动退出登录：清除 token（localStorage/Cookie/sessionStorage 全清），
      // 但保留 username Cookie，方便下次访问登录页预填用户名。
      // 7 天内免密登录的"7 天"由 JWT 后端过期时间控制，
      // JWT 过期时 ProtectedRoute 也会调用此方法，用户需重新输密码。
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
      } catch (err: any) {
        // 区分 401（token 无效）和网络错误（保留 token，避免网络波动导致被踢出）
        const msg = String(err?.message || "");
        const isNetworkError =
          msg.includes("网络请求失败") ||
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("服务器返回了非 JSON");

        if (isNetworkError) {
          // 网络错误：保留 token，假设 token 仍然有效（避免网络波动导致被踢出）
          // 但 isAuthenticated 仍然设置为 true（基于本地 token 存在）
          set({ isAuthenticated: true });
        } else {
          // 401 或其他错误：token 无效，清除并踢出
          removeToken();
          set({ isAuthenticated: false, username: null });
        }
      }
    },

    clearError: () => set({ error: null }),
  };
});

import { create } from "zustand";
import {
  classroomAuthApi,
  setClassroomToken,
  removeClassroomToken,
  getClassroomToken,
  setClassroomInfo,
  removeClassroomInfo,
  getClassroomInfo,
  setClassroomUnauthorizedHandler,
} from "@/utils/api";
import type { ClassroomInfo } from "@/types";

type ClassroomAuthStatus = "idle" | "approved" | "pending" | "rejected";

interface ClassroomAuthState {
  isAuthenticated: boolean;
  status: ClassroomAuthStatus;
  info: ClassroomInfo | null;
  rejectReason: string;
  loading: boolean;
  error: string | null;
  // 登录（返回登录状态信息）
  login: (
    buildingId: string,
    roomNumber: string,
    password: string
  ) => Promise<{ status: ClassroomAuthStatus; reason?: string }>;
  // 退出登录
  logout: () => void;
  // 检查登录状态（向后端验证 Token）
  checkAuth: () => Promise<void>;
  // 清除错误
  clearError: () => void;
}

export const useClassroomAuthStore = create<ClassroomAuthState>((set) => {
  const initialToken = getClassroomToken();
  const initialInfo = getClassroomInfo();

  // 注册 401 全局处理器
  setClassroomUnauthorizedHandler(() => {
    set({
      isAuthenticated: false,
      status: "idle",
      info: null,
    });
  });

  // 多标签页同步
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "examhub-classroom-token" || e.key === null) {
        const token = getClassroomToken();
        if (!token) {
          set({ isAuthenticated: false, status: "idle", info: null });
        } else {
          set({ isAuthenticated: true, info: getClassroomInfo() });
        }
      }
    });

    try {
      const channel = new BroadcastChannel("examhub-classroom-auth");
      channel.onmessage = (event) => {
        if (event.data === "logout") {
          set({ isAuthenticated: false, status: "idle", info: null });
        } else if (event.data === "login") {
          set({ isAuthenticated: true, info: getClassroomInfo() });
        }
      };
    } catch {
      // BroadcastChannel 不可用时静默降级
    }
  }

  return {
    isAuthenticated: !!initialToken,
    status: initialToken ? "approved" : "idle",
    info: initialInfo,
    rejectReason: "",
    loading: false,
    error: null,

    login: async (buildingId, roomNumber, password) => {
      set({ loading: true, error: null });
      try {
        const response = await classroomAuthApi.login({
          buildingId,
          roomNumber,
          password,
        });
        const result = response.data;

        // 审核中
        if (result.status === "pending") {
          set({
            loading: false,
            isAuthenticated: false,
            status: "pending",
          });
          return { status: "pending" };
        }

        // 已驳回
        if (result.status === "rejected") {
          set({
            loading: false,
            isAuthenticated: false,
            status: "rejected",
            rejectReason: result.reason || "注册申请未通过审核",
          });
          return {
            status: "rejected",
            reason: result.reason,
          };
        }

        // 审核通过,保存 token
        if (result.token && result.status === "approved") {
          setClassroomToken(result.token, true);
          const info: ClassroomInfo = {
            classroomId: result.classroomId || "",
            buildingName: result.buildingName || "",
            roomNumber: result.roomNumber || "",
          };
          setClassroomInfo(info, true);
          set({
            isAuthenticated: true,
            status: "approved",
            info,
            loading: false,
          });

          // 通知其他标签页
          try {
            const channel = new BroadcastChannel("examhub-classroom-auth");
            channel.postMessage("login");
            channel.close();
          } catch {}

          return { status: "approved" };
        }

        set({ loading: false });
        return { status: "idle" };
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : "登录失败",
        });
        return { status: "idle" };
      }
    },

    logout: () => {
      removeClassroomToken();
      removeClassroomInfo();
      set({
        isAuthenticated: false,
        status: "idle",
        info: null,
        rejectReason: "",
      });

      // 通知其他标签页
      try {
        const channel = new BroadcastChannel("examhub-classroom-auth");
        channel.postMessage("logout");
        channel.close();
      } catch {}
    },

    checkAuth: async () => {
      const token = getClassroomToken();
      if (!token) {
        set({ isAuthenticated: false, status: "idle", info: null });
        return;
      }

      try {
        const response = await classroomAuthApi.verify();
        setClassroomInfo(response.data, true);
        set({
          isAuthenticated: true,
          status: "approved",
          info: response.data,
        });
      } catch {
        removeClassroomToken();
        removeClassroomInfo();
        set({ isAuthenticated: false, status: "idle", info: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});

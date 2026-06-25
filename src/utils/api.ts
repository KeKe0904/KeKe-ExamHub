// API 基础配置
// 开发环境通过 Vite dev server 代理 /api → http://localhost:3000
// 生产环境通过 Nginx 反向代理 /api → http://127.0.0.1:3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Cookie 工具导入
import { getCookie, setCookie, removeCookie, COOKIE_KEYS, COOKIE_EXPIRES } from "./cookie";

// 401 未授权处理器（由 authStore 注册）
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

// 获取存储的 token（优先从 Cookie 读取，兼容旧版 sessionStorage）
export function getToken(): string | null {
  return getCookie(COOKIE_KEYS.TOKEN) || sessionStorage.getItem("examhub-token");
}

// 保存 token（persistent=true 时持久化到 Cookie）
export function setToken(token: string, persistent: boolean = true): void {
  if (persistent) {
    setCookie(COOKIE_KEYS.TOKEN, token, {
      expires: COOKIE_EXPIRES.TOKEN,
      sameSite: "Lax",
    });
  }
  sessionStorage.setItem("examhub-token", token);
}

// 移除 token（同时清除 Cookie 和 sessionStorage）
export function removeToken(): void {
  removeCookie(COOKIE_KEYS.TOKEN);
  sessionStorage.removeItem("examhub-token");
}

// 获取用户名（优先从 Cookie 读取，兼容旧版 sessionStorage）
export function getUsername(): string | null {
  return getCookie(COOKIE_KEYS.USERNAME) || sessionStorage.getItem("examhub-username");
}

// 保存用户名（persistent=true 时持久化到 Cookie）
export function setUsername(username: string, persistent: boolean = true): void {
  if (persistent) {
    setCookie(COOKIE_KEYS.USERNAME, username, {
      expires: COOKIE_EXPIRES.TOKEN,
      sameSite: "Lax",
    });
  }
  sessionStorage.setItem("examhub-username", username);
}

// 统一请求封装
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // 合并自定义 headers
  if (options.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.keys(customHeaders).forEach((key) => {
      headers[key] = customHeaders[key];
    });
  }

  // 添加认证 token
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // 401 未授权：清除 Token 并触发全局处理器
    if (response.status === 401) {
      removeToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    if (!response.ok) {
      throw new Error(data.message || "请求失败");
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("网络请求失败,请检查网络连接");
  }
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// 认证相关 API
export const authApi = {
  login: (username: string, password: string) =>
    request<ApiResponse<{ token: string; username: string }>>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  verify: () =>
    request<ApiResponse<{ username: string }>>("/auth/verify", {
      method: "GET",
    }),
};

// 考试相关 API
export const examApi = {
  // 获取所有考试
  getAll: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return request<ApiResponse<any[]>>(
      `/exams${queryString ? `?${queryString}` : ""}`
    );
  },

  // 获取单个考试
  getById: (id: string) =>
    request<ApiResponse<any>>(`/exams/${id}`),

  // 创建考试
  create: (data: {
    subject: string;
    examDate: string;
    duration: number;
    location: string;
    invigilator: string;
    notes: string;
  }) =>
    request<ApiResponse<any>>("/exams", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新考试
  update: (id: string, data: {
    subject: string;
    examDate: string;
    duration: number;
    location: string;
    invigilator: string;
    notes: string;
  }) =>
    request<ApiResponse<any>>(`/exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除考试
  delete: (id: string) =>
    request<ApiResponse<null>>(`/exams/${id}`, {
      method: "DELETE",
    }),

  // 获取统计数据
  getStats: () =>
    request<ApiResponse<{
      total: number;
      upcoming: number;
      ongoing: number;
      ended: number;
    }>>("/exams/stats/overview"),
};

// 服务器监控 API
export const monitorApi = {
  getData: () =>
    request<ApiResponse<{
      system: {
        hostname: string;
        platform: string;
        arch: string;
        osVersion: string;
        osName: string;
        uptime: string;
        uptimeSeconds: number;
        time: string;
      };
      cpu: {
        usage: number;
        cores: number;
        model: string;
        speed: string;
        loadAvg: { "1min": number; "5min": number; "15min": number };
      };
      memory: {
        total: { value: number; unit: string };
        used: { value: number; unit: string };
        free: { value: number; unit: string };
        usage: number;
      };
      process: {
        pid: number;
        uptime: string;
        uptimeSeconds: number;
        memory: {
          rss: { value: number; unit: string };
          heapTotal: { value: number; unit: string };
          heapUsed: { value: number; unit: string };
          external: { value: number; unit: string };
        };
        nodeVersion: string;
      };
      disks: Array<{
        filesystem: string;
        mount: string;
        total: string;
        used: string;
        available: string;
        usage: number;
      }>;
      networks: Array<{ name: string; address: string; family: string }>;
    }>>("/monitor", { method: "GET" }),
};

// 服务器环境管理 API
export const environmentApi = {
  // 获取环境信息
  getData: () =>
    request<ApiResponse<{
      system: {
        hostname: string;
        platform: string;
        distro: string;
        release: string;
        kernel: string;
        arch: string;
        uptime: string;
      };
      node: { version: string; path: string };
      npm: { version: string; path: string };
      pm2: {
        version: string;
        path: string;
        processes: Array<{ name: string; status: string; uptime: string; memory: string }>;
      };
      nginx: { version: string; path: string; status: string; configFile: string };
      mysql: { version: string; type: string; status: string };
      git: { version: string; branch: string; commit: string; remoteUrl: string };
      project: {
        name: string;
        displayName: string;
        version: string;
        description: string;
        author: string;
        license: string;
        homepage: string;
        repository: string;
        nodeVersion: string;
        dependencies: number;
        devDependencies: number;
        apiVersion: string;
        apiDependencies: number;
        apiDevDependencies: number;
        frontendFramework: string;
        backendFramework: string;
        techStack: { frontend: string[]; backend: string[]; deploy: string[] };
      };
      disk: { total: string; used: string; available: string; usage: number };
      paths: {
        projectRoot: string;
        frontendDist: boolean;
        backendDist: boolean;
        envFile: boolean;
        nodeModules: boolean;
        apiNodeModules: boolean;
      };
      timestamp: string;
    }>>("/environment", { method: "GET" }),

  // 更新组件
  update: (component: "npm-packages" | "pm2" | "system-packages" | "nginx" | "git-pull") =>
    request<ApiResponse<{ component: string; log: string }>>("/environment/update", {
      method: "POST",
      body: JSON.stringify({ component }),
    }),

  // 重装环境（保留数据）
  reinstall: (type: "frontend" | "backend" | "all") =>
    request<ApiResponse<{ type: string; log: string }>>("/environment/reinstall", {
      method: "POST",
      body: JSON.stringify({ type }),
    }),

  // 检查可用更新（自动检查最新稳定版本）
  checkUpdates: () =>
    request<ApiResponse<{
      updates: Array<{
        name: string;
        displayName: string;
        current: string;
        latest: string;
        updateAvailable: boolean;
        type: "npm" | "system" | "runtime";
        description: string;
      }>;
      updateCount: number;
      lastCheck: string;
    }>>("/environment/check-updates", { method: "GET" }),

  // 一键更新（可指定组件列表，不指定则更新所有推荐组件）
  updateAll: (components?: string[]) =>
    request<ApiResponse<{ taskId: string; components: string[] }>>("/environment/update-all", {
      method: "POST",
      body: JSON.stringify(components && components.length > 0 ? { components } : {}),
    }),

  // 查询一键更新任务状态
  getUpdateStatus: (taskId: string) =>
    request<ApiResponse<{
      taskId: string;
      status: "running" | "done" | "error";
      log: string;
      updatedCount: number;
      updatedComponents: string[];
      startTime: string;
      endTime?: string;
    }>>(`/environment/update-all/status/${taskId}`, { method: "GET" }),
};

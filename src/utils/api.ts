// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// 获取存储的 token
export function getToken(): string | null {
  return sessionStorage.getItem("examhub-token");
}

// 保存 token
export function setToken(token: string): void {
  sessionStorage.setItem("examhub-token", token);
}

// 移除 token
export function removeToken(): void {
  sessionStorage.removeItem("examhub-token");
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

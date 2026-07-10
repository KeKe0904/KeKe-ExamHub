// API 基础配置
// 开发环境通过 Vite dev server 代理 /api → http://localhost:3000
// 生产环境通过 Nginx 反向代理 /api → http://127.0.0.1:3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Cookie 工具导入
import {
  getCookie,
  setCookie,
  deleteCookie,
  setCookieJSON,
  getCookieJSON,
  COOKIE_KEYS,
  COOKIE_EXPIRES,
} from "./cookie";
// 类型导入
import type { Building, RegistrationCode, Classroom, ClassroomLoginResult, ClassroomInfo, ExamConflict, Announcement, DashboardStats, Domain, DomainAccessCheck, Class, Student, StudentExam, StudentLoginResult, ExamStudent, TeacherInfo, TeacherClass, TeacherStudent, TeacherExam, TeacherLoginResult } from "@/types";

export type { Class, Student, TeacherInfo };

// 401 未授权处理器（由 authStore 注册）
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

// 获取存储的 token（优先从 localStorage 读取，Cookie 作为备份）
export function getToken(): string | null {
  try {
    return localStorage.getItem("examhub-token") || getCookie(COOKIE_KEYS.TOKEN);
  } catch {
    return getCookie(COOKIE_KEYS.TOKEN) || sessionStorage.getItem("examhub-token");
  }
}

// 保存 token（persistent=true 时持久化到 localStorage + Cookie 双重存储）
// 注意：Cookie 主要作为跨标签页/会话恢复的备份，localStorage 是主存储。
// 不显式传 secure，让 cookie.ts 根据 protocol/hostname 自动判断（HTTPS 自动启用 Secure），
// 避免 HTTP 环境下 Cookie 被浏览器拒绝写入。
export function setToken(token: string, persistent: boolean = true): void {
  if (persistent) {
    try {
      localStorage.setItem("examhub-token", token);
    } catch {}
    setCookie(COOKIE_KEYS.TOKEN, token, {
      days: 7,
      sameSite: "lax",
    });
  } else {
    sessionStorage.setItem("examhub-token", token);
  }
}

// 移除 token（同时清除所有存储）
export function removeToken(): void {
  deleteCookie(COOKIE_KEYS.TOKEN);
  try {
    localStorage.removeItem("examhub-token");
  } catch {}
  sessionStorage.removeItem("examhub-token");
}

// 获取用户名（优先从 Cookie 读取，兼容旧版 sessionStorage）
export function getUsername(): string | null {
  return getCookie(COOKIE_KEYS.USERNAME) || localStorage.getItem("examhub-username") || sessionStorage.getItem("examhub-username");
}

// 保存用户名（persistent=true 时持久化到 Cookie）
export function setUsername(username: string, persistent: boolean = true): void {
  if (persistent) {
    setCookie(COOKIE_KEYS.USERNAME, username, {
      days: 30,
      sameSite: "lax",
    });
    try {
      localStorage.setItem("examhub-username", username);
    } catch {}
  } else {
    sessionStorage.setItem("examhub-username", username);
  }
}

// 统一请求封装
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  // 只有带 body 的请求才设置 Content-Type
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

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

    // 检查响应类型，防止非 JSON 响应导致解析错误
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `服务器返回了非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`
      );
    }

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

  // 批量删除考试
  batchDelete: (ids: string[]) =>
    request<ApiResponse<{ count: number }>>("/exams/batch", {
      method: "DELETE",
      body: JSON.stringify({ ids: ids.map(Number) }),
    }),

  // 批量修改考试
  batchUpdate: (ids: string[], updates: {
    examDate?: string;
    duration?: number;
    location?: string;
    invigilator?: string;
  }) =>
    request<ApiResponse<{ count: number }>>("/exams/batch", {
      method: "PUT",
      body: JSON.stringify({ ids: ids.map(Number), updates }),
    }),

  // 获取统计数据
  getStats: () =>
    request<ApiResponse<{
      total: number;
      upcoming: number;
      ongoing: number;
      ended: number;
    }>>("/exams/stats/overview"),

  // 获取大屏数据
  getDashboardStats: () =>
    request<ApiResponse<DashboardStats>>("/exams/stats/dashboard"),
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

// ==================== 教室端 Token 管理 ====================

// 401 未授权处理器（由 classroomAuthStore 注册）
let classroomUnauthorizedHandler: (() => void) | null = null;

export function setClassroomUnauthorizedHandler(handler: () => void): void {
  classroomUnauthorizedHandler = handler;
}

export function getClassroomToken(): string | null {
  try {
    return localStorage.getItem("examhub-classroom-token") || getCookie(COOKIE_KEYS.CLASSROOM_TOKEN);
  } catch {
    return getCookie(COOKIE_KEYS.CLASSROOM_TOKEN) || sessionStorage.getItem("examhub-classroom-token");
  }
}

export function setClassroomToken(token: string, persistent: boolean = true): void {
  if (persistent) {
    try {
      localStorage.setItem("examhub-classroom-token", token);
    } catch {}
    setCookie(COOKIE_KEYS.CLASSROOM_TOKEN, token, {
      days: 7,
      sameSite: "lax",
      secure: true,
    });
  } else {
    sessionStorage.setItem("examhub-classroom-token", token);
  }
}

export function removeClassroomToken(): void {
  deleteCookie(COOKIE_KEYS.CLASSROOM_TOKEN);
  try {
    localStorage.removeItem("examhub-classroom-token");
  } catch {}
  sessionStorage.removeItem("examhub-classroom-token");
}

export function getClassroomInfo(): ClassroomInfo | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("examhub-classroom-info");
  } catch {}
  if (!raw) {
    raw = getCookieJSON<string>(COOKIE_KEYS.CLASSROOM_INFO) || sessionStorage.getItem("examhub-classroom-info");
  }
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw as ClassroomInfo;
  } catch {
    return null;
  }
}

export function setClassroomInfo(info: ClassroomInfo, persistent: boolean = true): void {
  const str = JSON.stringify(info);
  if (persistent) {
    try {
      localStorage.setItem("examhub-classroom-info", str);
    } catch {}
    setCookieJSON(COOKIE_KEYS.CLASSROOM_INFO, info, {
      days: 7,
      sameSite: "lax",
      secure: true,
    });
  } else {
    sessionStorage.setItem("examhub-classroom-info", str);
  }
}

export function removeClassroomInfo(): void {
  deleteCookie(COOKIE_KEYS.CLASSROOM_INFO);
  try {
    localStorage.removeItem("examhub-classroom-info");
  } catch {}
  sessionStorage.removeItem("examhub-classroom-info");
}

// 教室端专用请求封装（使用教室端 token）
async function classroomRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  // 只有带 body 的请求才设置 Content-Type
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.keys(customHeaders).forEach((key) => {
      headers[key] = customHeaders[key];
    });
  }

  const token = getClassroomToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // 检查响应类型
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `服务器返回了非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`
      );
    }

    const data = await response.json();

    if (response.status === 401) {
      removeClassroomToken();
      removeClassroomInfo();
      if (classroomUnauthorizedHandler) {
        classroomUnauthorizedHandler();
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

// ==================== 教室端认证 API ====================

export const classroomAuthApi = {
  // 注册
  register: (data: {
    registrationCode: string;
    buildingId: string;
    roomNumber: string;
    password: string;
  }) =>
    request<ApiResponse<{ classroomId: string; status: string }>>(
      "/classroom/register",
      { method: "POST", body: JSON.stringify(data) }
    ),

  // 登录
  login: (data: {
    buildingId: string;
    roomNumber: string;
    password: string;
  }) =>
    request<ApiResponse<ClassroomLoginResult>>("/classroom/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 验证 token
  verify: () =>
    classroomRequest<ApiResponse<ClassroomInfo>>("/classroom/verify", {
      method: "GET",
    }),
};

// ==================== 教室端业务 API ====================

export const classroomApi = {
  // 获取该教室的考试信息
  getExams: () =>
    classroomRequest<ApiResponse<any[]>>("/classroom/exams", { method: "GET" }),

  // 获取教室端自身信息
  getProfile: () =>
    classroomRequest<ApiResponse<{
      classroomId: string;
      buildingName: string;
      roomNumber: string;
      status: string;
    }>>("/classroom/profile", { method: "GET" }),
};

// ==================== 教学楼管理 API（管理员） ====================

export const buildingApi = {
  getAll: () =>
    request<ApiResponse<Building[]>>("/buildings", { method: "GET" }),

  create: (name: string) =>
    request<ApiResponse<Building>>("/buildings", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  update: (id: string, name: string) =>
    request<ApiResponse<Building>>(`/buildings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    request<ApiResponse<null>>(`/buildings/${id}`, { method: "DELETE" }),
};

// ==================== 注册码管理 API（管理员） ====================

export const registrationCodeApi = {
  getAll: (params?: { used?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.used !== undefined) {
      query.set("used", String(params.used));
    }
    const queryString = query.toString();
    return request<ApiResponse<RegistrationCode[]>>(
      `/registration-codes${queryString ? `?${queryString}` : ""}`
    );
  },

  create: (count: number = 1) =>
    request<ApiResponse<{ codes: string[]; count: number }>>(
      "/registration-codes",
      { method: "POST", body: JSON.stringify({ count }) }
    ),

  delete: (id: string) =>
    request<ApiResponse<null>>(`/registration-codes/${id}`, {
      method: "DELETE",
    }),
};

// ==================== 教室管理 API（管理员） ====================

export const classroomAdminApi = {
  getAll: (params?: { status?: string; buildingId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.buildingId) query.set("buildingId", params.buildingId);
    const queryString = query.toString();
    return request<ApiResponse<Classroom[]>>(
      `/classrooms${queryString ? `?${queryString}` : ""}`
    );
  },

  approve: (id: string) =>
    request<ApiResponse<Classroom>>(`/classrooms/${id}/approve`, {
      method: "PUT",
    }),

  reject: (id: string, reason?: string) =>
    request<ApiResponse<Classroom>>(`/classrooms/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  delete: (id: string) =>
    request<ApiResponse<null>>(`/classrooms/${id}`, { method: "DELETE" }),

  getPendingCount: () =>
    request<ApiResponse<{ count: number }>>("/classrooms/pending/count", {
      method: "GET",
    }),
};

// ==================== 考试-教室分配 API（管理员） ====================

export const examClassroomApi = {
  // 获取某场考试已分配的教室
  getAssigned: (examId: string) =>
    request<ApiResponse<Classroom[]>>(`/exams/${examId}/classrooms`, {
      method: "GET",
    }),

  // 分配教室（批量）
  assign: (examId: string, classroomIds: string[], checkConflicts: boolean = false) =>
    request<ApiResponse<null>>(`/exams/${examId}/classrooms`, {
      method: "POST",
      body: JSON.stringify({ classroomIds, checkConflicts }),
    }),

  // 取消分配
  unassign: (examId: string, classroomId: string) =>
    request<ApiResponse<null>>(
      `/exams/${examId}/classrooms/${classroomId}`,
      { method: "DELETE" }
    ),

  // 获取所有可分配的教室（已审核通过）
  getAvailable: () =>
    request<ApiResponse<Classroom[]>>("/exams/classrooms/available", {
      method: "GET",
    }),

  // 检测考试教室分配冲突
  checkConflicts: (examId: string, classroomIds?: string[]) => {
    const query = new URLSearchParams();
    if (classroomIds && classroomIds.length > 0) {
      query.set("classroomIds", classroomIds.join(","));
    }
    const queryString = query.toString();
    return request<ApiResponse<{ conflicts: ExamConflict[] }>>(
      `/exams/${examId}/conflicts${queryString ? `?${queryString}` : ""}`
    );
  },
};

// ==================== 考试-学生分配 API（管理员） ====================

export const examStudentApi = {
  // 获取某场考试已分配的学生
  getAssigned: (examId: string) =>
    request<ApiResponse<ExamStudent[]>>(`/exams/${examId}/students`, {
      method: "GET",
    }),

  // 批量分配学生到考试
  assign: (
    examId: string,
    data: {
      students: Array<{ studentId: string; seatNumber?: string; classroomId?: string }>;
      classroomId?: string;
      autoAssignSeats?: boolean;
    }
  ) =>
    request<ApiResponse<{ count: number }>>(`/exams/${examId}/students`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 按班级批量分配学生
  assignByClass: (
    examId: string,
    data: {
      classIds: string[];
      classroomId?: string;
      autoAssignSeats?: boolean;
    }
  ) =>
    request<ApiResponse<{ count: number }>>(`/exams/${examId}/students/batch-by-class`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新学生座位号或教室
  update: (
    examId: string,
    studentId: string,
    data: { seatNumber?: string; classroomId?: string }
  ) =>
    request<ApiResponse<null>>(`/exams/${examId}/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 移除学生
  remove: (examId: string, studentId: string) =>
    request<ApiResponse<null>>(`/exams/${examId}/students/${studentId}`, {
      method: "DELETE",
    }),
};

// ==================== 仓库更新检查 API ====================
export interface RepoCheckResult {
  ok: boolean;
  reason?: string;
  localCommit: string;
  localMessage: string;
  remoteCommit: string;
  remoteMessage: string;
  branch: string;
  remoteUrl: string;
  hasUpdate: boolean;
  commitsBehind: number;
  localChanges: boolean;
  changedFiles: string[];
  changelog: string[];
  lastCheck: string;
}

export const repoCheckApi = {
  check: () =>
    request<ApiResponse<RepoCheckResult>>("/environment/repo-check", {
      method: "GET",
    }),
};

// ==================== 操作日志 API（管理员） ====================

export interface AuditLog {
  id: number;
  adminId: number;
  adminUsername: string;
  action: string;
  details: Record<string, any> | null;
  ipAddress: string;
  createdAt: string;
}

export interface AuditLogListResponse {
  list: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  actionLabels: Record<string, string>;
}

export const auditLogApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.action) query.set("action", params.action);
    if (params?.adminId) query.set("adminId", params.adminId);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    const queryString = query.toString();
    return request<ApiResponse<AuditLogListResponse>>(
      `/audit-logs${queryString ? `?${queryString}` : ""}`
    );
  },
};

// ==================== 公告管理 API ====================

export const announcementApi = {
  // 获取公开公告列表
  getPublic: () =>
    request<ApiResponse<Announcement[]>>("/announcements", { method: "GET" }),

  // 获取单个公告
  getById: (id: string) =>
    request<ApiResponse<Announcement>>(`/announcements/${id}`, { method: "GET" }),

  // 获取所有公告（管理后台）
  getAll: () =>
    request<ApiResponse<Announcement[]>>("/announcements/admin/all", { method: "GET" }),

  // 创建公告
  create: (data: {
    title: string;
    content: string;
    isPinned?: boolean;
    isActive?: boolean;
    publishAt?: string | null;
    expireAt?: string | null;
  }) =>
    request<ApiResponse<Announcement>>("/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新公告
  update: (id: string, data: {
    title: string;
    content: string;
    isPinned?: boolean;
    isActive?: boolean;
    publishAt?: string | null;
    expireAt?: string | null;
  }) =>
    request<ApiResponse<Announcement>>(`/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除公告
  delete: (id: string) =>
    request<ApiResponse<null>>(`/announcements/${id}`, { method: "DELETE" }),
};

// ==================== IP 黑名单管理 API ====================

export interface IpBlacklistItem {
  id: string;
  ipAddress: string;
  reason: string;
  bannedBy: string;
  expiresAt: string | null;
  isPermanent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IpBlacklistListResponse {
  list: IpBlacklistItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AbnormalLoginItem {
  id: string;
  classroomId: string;
  classroomName: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  status: string;
  isAbnormal: boolean;
  abnormalReason: string;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AbnormalLoginListResponse {
  list: AbnormalLoginItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ipBlacklistApi = {
  // 获取 IP 黑名单列表
  getList: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: "active" | "expired";
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return request<ApiResponse<IpBlacklistListResponse>>(
      `/ip-blacklist${queryString ? `?${queryString}` : ""}`
    );
  },

  // 添加 IP 到黑名单
  add: (data: {
    ipAddress: string;
    reason?: string;
    expiresAt?: string | null;
  }) =>
    request<ApiResponse<{ id: string }>>("/ip-blacklist", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新黑名单 IP
  update: (
    id: string,
    data: {
      reason?: string;
      expiresAt?: string | null;
    }
  ) =>
    request<ApiResponse<null>>(`/ip-blacklist/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除（解封）IP
  remove: (id: string) =>
    request<ApiResponse<null>>(`/ip-blacklist/${id}`, { method: "DELETE" }),

  // 获取待审核异常登录数量
  getAbnormalCount: () =>
    request<ApiResponse<{ count: number }>>(
      "/ip-blacklist/abnormal-login/count",
      { method: "GET" }
    ),

  // 获取异常登录列表
  getAbnormalList: (params?: {
    page?: number;
    pageSize?: number;
    classroomId?: string;
    reviewStatus?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.classroomId) query.set("classroomId", params.classroomId);
    if (params?.reviewStatus) query.set("reviewStatus", params.reviewStatus);
    const queryString = query.toString();
    return request<ApiResponse<AbnormalLoginListResponse>>(
      `/ip-blacklist/abnormal-login${queryString ? `?${queryString}` : ""}`
    );
  },

  // 审核异常登录
  reviewAbnormal: (
    id: string,
    data: {
      action: "approve" | "reject";
      banIp?: boolean;
    }
  ) =>
    request<ApiResponse<null>>(`/ip-blacklist/abnormal-login/${id}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ==================== 教师管理 API ====================

export interface Teacher {
  id: string;
  teacherNo: string;
  name: string;
  roleId: string | null;
  roleName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  isFirstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherRole {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherListResponse {
  list: Teacher[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const teacherApi = {
  // 获取教师身份列表
  getRoles: () =>
    request<ApiResponse<TeacherRole[]>>("/teachers/roles"),

  // 添加教师身份
  addRole: (data: { name: string; sortOrder?: number }) =>
    request<ApiResponse<{ id: string }>>("/teachers/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新教师身份
  updateRole: (id: string, data: { name?: string; sortOrder?: number }) =>
    request<ApiResponse<null>>(`/teachers/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除教师身份
  deleteRole: (id: string) =>
    request<ApiResponse<null>>(`/teachers/roles/${id}`, { method: "DELETE" }),

  // 获取教师列表
  getList: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    roleId?: string;
    all?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.search) query.set("search", params.search);
    if (params?.roleId) query.set("roleId", params.roleId);
    if (params?.all) query.set("all", "true");
    const queryString = query.toString();
    return request<ApiResponse<TeacherListResponse | Teacher[]>>(
      `/teachers${queryString ? `?${queryString}` : ""}`
    );
  },

  // 获取教师详情
  getDetail: (id: string) =>
    request<ApiResponse<Teacher>>(`/teachers/${id}`),

  // 添加教师
  add: (data: {
    name: string;
    teacherNo?: string;
    roleId?: string;
    phone?: string;
    email?: string;
    password?: string;
    notes?: string;
  }) =>
    request<ApiResponse<{ id: string }>>("/teachers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新教师
  update: (
    id: string,
    data: {
      name?: string;
      teacherNo?: string;
      roleId?: string | null;
      phone?: string;
      email?: string;
      notes?: string;
      isActive?: boolean;
    }
  ) =>
    request<ApiResponse<null>>(`/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 重置教师密码
  resetPassword: (id: string, newPassword?: string) =>
    request<ApiResponse<{ newPassword: string }>>(`/teachers/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    }),

  // 删除教师
  remove: (id: string) =>
    request<ApiResponse<null>>(`/teachers/${id}`, { method: "DELETE" }),

  // 获取考试的监考老师
  getExamInvigilators: (examId: string) =>
    request<ApiResponse<Teacher[]>>(`/teachers/exam/${examId}/invigilators`),

  // 设置考试监考老师
  setExamInvigilators: (examId: string, teacherIds: string[]) =>
    request<ApiResponse<null>>(`/teachers/exam/${examId}/invigilators`, {
      method: "PUT",
      body: JSON.stringify({ teacherIds }),
    }),
};

// ==================== 教室倒计时 API ====================

export interface ClassroomCountdown {
  id: string;
  classroomId: string;
  title: string;
  targetDate: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const classroomCountdownApi = {
  // 获取教室的启用的倒计时（公开接口）
  getPublic: (classroomId: string) =>
    request<ApiResponse<ClassroomCountdown[]>>(
      `/classroom-countdowns/public/${classroomId}`
    ),

  // 获取教室的所有倒计时（管理员）
  getByClassroom: (classroomId: string) =>
    request<ApiResponse<ClassroomCountdown[]>>(
      `/classroom-countdowns/classroom/${classroomId}`
    ),

  // 添加倒计时（管理员）
  add: (
    classroomId: string,
    data: {
      title: string;
      targetDate: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) =>
    request<ApiResponse<{ id: string }>>(
      `/classroom-countdowns/classroom/${classroomId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  // 更新倒计时（管理员）
  update: (
    id: string,
    data: {
      title?: string;
      targetDate?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) =>
    request<ApiResponse<null>>(`/classroom-countdowns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除倒计时（管理员）
  remove: (id: string) =>
    request<ApiResponse<null>>(`/classroom-countdowns/${id}`, {
      method: "DELETE",
    }),

  // 教室端获取自己的倒计时
  getMine: () =>
    request<ApiResponse<ClassroomCountdown[]>>(
      "/classroom-countdowns/mine"
    ),
};

// ==================== 天气 API ====================

export interface WeatherForecast {
  date: string;
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  windDirection: string;
  windSpeed: number;
  airQuality: string;
  aqi: number;
  updatedAt: string;
  forecast: WeatherForecast[];
}

export const weatherApi = {
  // 获取当前天气（根据 IP 自动定位）
  getCurrent: (city?: string) => {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    return request<ApiResponse<WeatherData>>(`/weather/current${query}`);
  },

  // 获取指定城市天气
  getByCity: (city: string) =>
    request<ApiResponse<WeatherData>>(`/weather/${encodeURIComponent(city)}`),
};

// ==================== 域名管理 API ====================

export const domainApi = {
  // 获取所有域名
  getAll: () =>
    request<ApiResponse<Domain[]>>("/domains", { method: "GET" }),

  // 获取单个域名
  getById: (id: string) =>
    request<ApiResponse<Domain>>(`/domains/${id}`, { method: "GET" }),

  // 添加域名
  create: (data: { domainName: string; isPrimary?: boolean }) =>
    request<ApiResponse<Domain>>("/domains", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 更新域名
  update: (id: string, data: { isPrimary?: boolean }) =>
    request<ApiResponse<null>>(`/domains/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 删除域名
  delete: (id: string) =>
    request<ApiResponse<null>>(`/domains/${id}`, { method: "DELETE" }),

  // 申请证书
  issueCert: (id: string) =>
    request<ApiResponse<null>>(`/domains/${id}/issue-cert`, {
      method: "POST",
    }),

  // 上传 SSL 证书（PEM 格式）
  uploadCert: (id: string, data: { cert: string; key: string }) =>
    request<ApiResponse<null>>(`/domains/${id}/upload-cert`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 检测服务器内是否已有该域名的 SSL 证书
  detectCert: (id: string) =>
    request<ApiResponse<{
      found: boolean;
      source?: string;
      message?: string;
      certPath?: string;
    }>>(`/domains/${id}/detect-cert`, {
      method: "POST",
    }),

  // 检查访问权限
  checkAccess: () =>
    request<ApiResponse<DomainAccessCheck>>("/domains/check-access", {
      method: "POST",
    }),
};

// ==================== 学生端 Token 管理 ====================

// 401 未授权处理器（由 studentStore 注册）
let studentUnauthorizedHandler: (() => void) | null = null;

export function setStudentUnauthorizedHandler(handler: () => void): void {
  studentUnauthorizedHandler = handler;
}

export function getStudentToken(): string | null {
  try {
    return localStorage.getItem("examhub-student-token") || getCookie(COOKIE_KEYS.STUDENT_TOKEN);
  } catch {
    return getCookie(COOKIE_KEYS.STUDENT_TOKEN);
  }
}

export function setStudentToken(token: string, persistent: boolean = true): void {
  if (persistent) {
    try {
      localStorage.setItem("examhub-student-token", token);
    } catch {}
    setCookie(COOKIE_KEYS.STUDENT_TOKEN, token, {
      days: 7,
      sameSite: "lax",
      secure: true,
    });
  } else {
    sessionStorage.setItem("examhub-student-token", token);
  }
}

export function removeStudentToken(): void {
  deleteCookie(COOKIE_KEYS.STUDENT_TOKEN);
  try {
    localStorage.removeItem("examhub-student-token");
  } catch {}
  sessionStorage.removeItem("examhub-student-token");
}

export function getStudentInfo(): Student | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("examhub-student-info");
  } catch {}
  if (!raw) {
    raw = getCookieJSON<string>(COOKIE_KEYS.STUDENT_INFO) as string | null;
  }
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw as Student;
  } catch {
    return null;
  }
}

export function setStudentInfo(student: Student, persistent: boolean = true): void {
  const str = JSON.stringify(student);
  if (persistent) {
    try {
      localStorage.setItem("examhub-student-info", str);
    } catch {}
    setCookieJSON(COOKIE_KEYS.STUDENT_INFO, student, {
      days: 7,
      sameSite: "lax",
      secure: true,
    });
  } else {
    sessionStorage.setItem("examhub-student-info", str);
  }
}

export function removeStudentInfo(): void {
  deleteCookie(COOKIE_KEYS.STUDENT_INFO);
  try {
    localStorage.removeItem("examhub-student-info");
  } catch {}
  sessionStorage.removeItem("examhub-student-info");
}

// 学生端专用请求封装（使用学生端 token）
async function studentRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.keys(customHeaders).forEach((key) => {
      headers[key] = customHeaders[key];
    });
  }

  const token = getStudentToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `服务器返回了非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`
      );
    }

    const data = await response.json();

    if (response.status === 401) {
      removeStudentToken();
      removeStudentInfo();
      if (studentUnauthorizedHandler) {
        studentUnauthorizedHandler();
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

// ==================== 班级管理 API（管理员） ====================

export interface ClassListResponse {
  list: Class[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const classApi = {
  getList: (params?: { page?: number; pageSize?: number; keyword?: string; grade?: string; search?: string; all?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.search) query.set("search", params.search);
    if (params?.grade) query.set("grade", params.grade);
    if (params?.all) query.set("all", "true");
    const queryString = query.toString();
    return request<ApiResponse<ClassListResponse | Class[]>>(
      `/classes${queryString ? `?${queryString}` : ""}`
    );
  },
  getById: (id: string) =>
    request<ApiResponse<Class>>(`/classes/${id}`),
  getDetail: (id: string) =>
    request<ApiResponse<Class>>(`/classes/${id}`),
  create: (data: Partial<Class>) =>
    request<ApiResponse<Class | { id: string }>>("/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Class>) =>
    request<ApiResponse<Class | null>>(`/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<ApiResponse<null>>(`/classes/${id}`, { method: "DELETE" }),
  remove: (id: string) =>
    request<ApiResponse<null>>(`/classes/${id}`, { method: "DELETE" }),
};

// ==================== 学生管理 API（管理员） ====================

export interface StudentListResponse {
  list: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const studentApi = {
  getList: (params?: { page?: number; pageSize?: number; keyword?: string; classId?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.search) query.set("search", params.search);
    if (params?.classId) query.set("classId", params.classId);
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return request<ApiResponse<StudentListResponse | Student[]>>(
      `/students${queryString ? `?${queryString}` : ""}`
    );
  },
  getById: (id: string) =>
    request<ApiResponse<Student>>(`/students/${id}`),
  getDetail: (id: string) =>
    request<ApiResponse<Student>>(`/students/${id}`),
  create: (data: Partial<Student>) =>
    request<ApiResponse<Student | { id: string }>>("/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Student>) =>
    request<ApiResponse<Student | null>>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<ApiResponse<null>>(`/students/${id}`, { method: "DELETE" }),
  remove: (id: string) =>
    request<ApiResponse<null>>(`/students/${id}`, { method: "DELETE" }),
  batchCreate: (students: Partial<Student>[]) =>
    request<ApiResponse<{ count: number; students: Student[] } | { success: number; failed: number; results: Array<{ id: string; studentNo: string; name: string }>; errors: string[] }>>("/students/batch", {
      method: "POST",
      body: JSON.stringify({ students }),
    }),
  resetPassword: (id: string) =>
    request<ApiResponse<null>>(`/students/${id}/reset-password`, {
      method: "PUT",
    }),
};

// ==================== 学生端认证 API ====================

export const studentAuthApi = {
  login: (studentNo: string, password: string) =>
    request<ApiResponse<StudentLoginResult>>("/student/login", {
      method: "POST",
      body: JSON.stringify({ studentNo, password }),
    }),
  changePassword: (oldPassword: string, newPassword: string) =>
    studentRequest<ApiResponse<null>>("/student/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
  getMe: () =>
    studentRequest<ApiResponse<Student>>("/student/me", {
      method: "GET",
    }),
  getMyExams: () =>
    studentRequest<ApiResponse<StudentExam[]>>("/student/exams", {
      method: "GET",
    }),
};

// ==================== 教师端 Token 管理 ====================

let teacherUnauthorizedHandler: (() => void) | null = null;

export function setTeacherUnauthorizedHandler(handler: () => void): void {
  teacherUnauthorizedHandler = handler;
}

const TEACHER_TOKEN_KEY = "examhub-teacher-token";
const TEACHER_INFO_KEY = "examhub-teacher-info";

export function getTeacherToken(): string | null {
  try {
    const token = localStorage.getItem(TEACHER_TOKEN_KEY);
    if (token) return token;
    // Cookie 兜底
    const cookieMatch = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${TEACHER_TOKEN_KEY}=([^;]+)`)
    );
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  } catch {
    return null;
  }
}

export function setTeacherToken(token: string): void {
  try {
    localStorage.setItem(TEACHER_TOKEN_KEY, token);
  } catch {}
  // 同步写入 Cookie 兜底
  setCookie(TEACHER_TOKEN_KEY, token, {
    days: 7,
    sameSite: "lax",
    secure: true,
  });
}

export function removeTeacherToken(): void {
  try {
    localStorage.removeItem(TEACHER_TOKEN_KEY);
  } catch {}
  // 同步删除 Cookie
  deleteCookie(TEACHER_TOKEN_KEY);
}

export function getTeacherInfo(): TeacherInfo | null {
  const raw = localStorage.getItem(TEACHER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeacherInfo;
  } catch {
    return null;
  }
}

export function setTeacherInfo(teacher: TeacherInfo): void {
  localStorage.setItem(TEACHER_INFO_KEY, JSON.stringify(teacher));
}

export function removeTeacherInfo(): void {
  localStorage.removeItem(TEACHER_INFO_KEY);
}

// 教师端专用请求封装
async function teacherRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    const customHeaders = options.headers as Record<string, string>;
    Object.keys(customHeaders).forEach((key) => {
      headers[key] = customHeaders[key];
    });
  }

  const token = getTeacherToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `服务器返回了非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`
      );
    }

    const data = await response.json();

    if (response.status === 401) {
      removeTeacherToken();
      removeTeacherInfo();
      if (teacherUnauthorizedHandler) {
        teacherUnauthorizedHandler();
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

// 教师端认证 API
export const teacherAuthApi = {
  login: (account: string, password: string) =>
    request<ApiResponse<TeacherLoginResult>>("/teacher/login", {
      method: "POST",
      body: JSON.stringify({ account, password }),
    }),
  changePassword: (oldPassword: string, newPassword: string) =>
    teacherRequest<ApiResponse<null>>("/teacher/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
  getMe: () =>
    teacherRequest<ApiResponse<TeacherInfo>>("/teacher/me", {
      method: "GET",
    }),
  getClasses: () =>
    teacherRequest<ApiResponse<TeacherClass[]>>("/teacher/classes", {
      method: "GET",
    }),
  getStudents: (params?: { classId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.classId) query.set("classId", params.classId);
    if (params?.search) query.set("search", params.search);
    const queryString = query.toString();
    return teacherRequest<ApiResponse<TeacherStudent[]>>(
      `/teacher/students${queryString ? `?${queryString}` : ""}`
    );
  },
  updateStudent: (id: string, data: { phone?: string; notes?: string }) =>
    teacherRequest<ApiResponse<null>>(`/teacher/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getExams: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return teacherRequest<ApiResponse<TeacherExam[]>>(
      `/teacher/exams${queryString ? `?${queryString}` : ""}`
    );
  },
};

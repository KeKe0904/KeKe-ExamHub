/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Server,
  Database,
  Globe,
  Terminal,
  Package,
  GitBranch,
  Code,
  Shield,
  Download,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Cpu,
  HardDrive,
  Box,
  Copy,
  X,
  User,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { environmentApi } from "@/utils/api";

interface EnvData {
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
}

interface UpdateItem {
  name: string;
  displayName: string;
  current: string;
  latest: string;
  updateAvailable: boolean;
  type: "npm" | "system" | "runtime";
  description: string;
}

interface UpdateCheckData {
  updates: UpdateItem[];
  updateCount: number;
  lastCheck: string;
}

type OperationType =
  | { kind: "update"; component: "npm-packages" | "pm2" | "system-packages" | "nginx" | "git-pull" }
  | { kind: "reinstall"; type: "frontend" | "backend" | "all" };

export default function Environment() {
  const [data, setData] = useState<EnvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operating, setOperating] = useState(false);
  const [operationLog, setOperationLog] = useState<{ title: string; content: string; success: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<OperationType | null>(null);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckData | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateAllConfirm, setUpdateAllConfirm] = useState(false);

  // UpdateItem.name → 后端组件名映射（只包含一键更新支持的组件）
  const UPDATEABLE_COMPONENT_MAP: Record<string, { key: string; label: string }> = {
    npm: { key: "npm-packages", label: "项目 npm 依赖 + npm 命令行工具" },
    pm2: { key: "pm2", label: "PM2 进程管理器" },
    nginx: { key: "nginx", label: "Nginx 配置重载" },
  };

  // 从 updateCheck 中提取实际需要更新的组件列表
  const getPendingComponents = useCallback((): string[] => {
    if (!updateCheck) return [];
    return updateCheck.updates
      .filter((u) => u.updateAvailable && UPDATEABLE_COMPONENT_MAP[u.name])
      .map((u) => UPDATEABLE_COMPONENT_MAP[u.name].key);
  }, [updateCheck]);

  // 获取待更新组件的显示标签列表
  const getPendingLabels = useCallback((): string[] => {
    if (!updateCheck) return [];
    return updateCheck.updates
      .filter((u) => u.updateAvailable && UPDATEABLE_COMPONENT_MAP[u.name])
      .map((u) => UPDATEABLE_COMPONENT_MAP[u.name].label);
  }, [updateCheck]);

  // 轮询清理引用：跟踪 interval 和 timeout，确保组件卸载时能正确清理
  const pollCleanupRef = useRef<{
    interval: ReturnType<typeof setInterval> | null;
    timeout: ReturnType<typeof setTimeout> | null;
  }>({ interval: null, timeout: null });

  // 组件卸载时清理所有轮询
  useEffect(() => {
    return () => {
      const { interval, timeout } = pollCleanupRef.current;
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await environmentApi.getData();
      setData(res.data);
    } catch (err: any) {
      setError(err.message || "获取环境信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpdateCheck = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setCheckingUpdates(true);
      setUpdateError("");
      const res = await environmentApi.checkUpdates();
      setUpdateCheck(res.data);
      // 记录本次检查时间
      localStorage.setItem("examhub_check_version_last", new Date().toISOString());
    } catch (err: any) {
      if (!silent) setUpdateError(err.message || "检查更新失败");
    } finally {
      if (!silent) setCheckingUpdates(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 进入页面自动检查更新
  useEffect(() => {
    if (!data) return;
    fetchUpdateCheck(true);
  }, [data, fetchUpdateCheck]);

  // 每天凌晨4:00-4:02 自动刷新版本检查
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 4 && now.getMinutes() <= 2) {
        const lastCheckStr = localStorage.getItem("examhub_check_version_last");
        const today4AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0);
        if (lastCheckStr && new Date(lastCheckStr) >= today4AM) return;
        fetchUpdateCheck(true);
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [fetchUpdateCheck]);

  // 获取版本更新提示（根据组件名查找）
  const getUpdateInfo = (name: string): UpdateItem | undefined => {
    if (!updateCheck) return undefined;
    return updateCheck.updates.find((u) => u.name === name);
  };

  const handleOperation = async (op: OperationType) => {
    setConfirmModal(null);
    setOperating(true);
    setOperationLog(null);

    try {
      let res;
      let title = "";

      if (op.kind === "update") {
        title = {
          "npm-packages": "更新项目依赖",
          "pm2": "更新 PM2",
          "system-packages": "更新系统软件包",
          "nginx": "重载 Nginx 配置",
          "git-pull": "拉取最新代码",
        }[op.component];
        res = await environmentApi.update(op.component);
      } else {
        title = {
          frontend: "重装前端环境",
          backend: "重装后端环境",
          all: "完整重装环境",
        }[op.type];
        res = await environmentApi.reinstall(op.type);
      }

      setOperationLog({
        title,
        content: res.data.log || "操作完成（无输出）",
        success: true,
      });

      // 操作完成后刷新数据
      await fetchData();
    } catch (err: any) {
      setOperationLog({
        title: op.kind === "update" ? "更新操作" : "重装操作",
        content: err.message || "操作失败",
        success: false,
      });
    } finally {
      setOperating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  // 一键更新所有可安全更新的组件
  const handleUpdateAll = async () => {
    setUpdateAllConfirm(false);

    const pendingComponents = getPendingComponents();
    if (pendingComponents.length === 0) {
      // 没有需要更新的组件
      setOperationLog({
        title: "一键更新",
        content: "所有组件均为最新版本，无需更新",
        success: true,
      });
      return;
    }

    setOperating(true);
    setOperationLog(null);

    // 清理之前的轮询（防止重复启动）
    const prev = pollCleanupRef.current;
    if (prev.interval) { clearInterval(prev.interval); prev.interval = null; }
    if (prev.timeout) { clearTimeout(prev.timeout); prev.timeout = null; }

    try {
      // 启动更新任务，只传入有更新的组件
      const res = await environmentApi.updateAll(pendingComponents);
      const taskId = res.data.taskId;

      setOperationLog({
        title: "一键更新（执行中...）",
        content: `正在后台执行 ${pendingComponents.length} 个组件的更新，请稍候...`,
        success: true,
      });

      // 终止轮询的公共逻辑
      const finishPolling = (success: boolean, logContent: string) => {
        const { interval, timeout } = pollCleanupRef.current;
        if (interval) { clearInterval(interval); pollCleanupRef.current.interval = null; }
        if (timeout) { clearTimeout(timeout); pollCleanupRef.current.timeout = null; }
        setOperationLog({
          title: success ? "一键更新完成" : "一键更新",
          content: logContent,
          success,
        });
        setOperating(false);
      };

      // 轮询任务状态
      let failCount = 0;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await environmentApi.getUpdateStatus(taskId);
          const { status, log } = statusRes.data;

          failCount = 0; // 成功获取，重置失败计数
          if (status === "running") {
            // 更新进度日志
            setOperationLog({
              title: "一键更新（执行中...）",
              content: log || "正在执行...",
              success: true,
            });
          } else if (status === "done") {
            finishPolling(true, log || "操作完成（无输出）");
            await fetchData();
            await fetchUpdateCheck(true);
          }
        } catch {
          failCount++;
          // 连续失败 10 次（30秒），可能是 PM2 重启导致 API 不可用
          // 继续等待服务恢复，最多再等 20 次（60秒）
          if (failCount > 30) {
            finishPolling(false, "服务重启中，请手动刷新页面查看状态。如服务未恢复请检查服务器。");
          }
        }
      }, 3000);

      pollCleanupRef.current.interval = pollInterval;

      // 安全清理：最多轮询 5 分钟
      const pollTimeout = setTimeout(() => {
        finishPolling(false, "操作超时（超过 5 分钟），请在服务器上手动检查更新进度。");
      }, 300000);

      pollCleanupRef.current.timeout = pollTimeout;
    } catch (err: any) {
      pollCleanupRef.current.interval = null;
      pollCleanupRef.current.timeout = null;
      setOperationLog({
        title: "一键更新",
        content: err.message || "启动更新失败",
        success: false,
      });
      setOperating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">
              服务器环境
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">
              查看服务器环境信息，更新或重装环境组件
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white rounded-lg hover:border-black dark:hover:border-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>

        {/* 加载中 */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-zinc-500 dark:text-zinc-300 animate-spin" />
            <span className="ml-2 text-zinc-500 dark:text-zinc-300">加载环境信息...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500 dark:text-red-400">获取环境信息失败</p>
              <p className="text-xs text-red-400 dark:text-red-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* 系统信息 */}
            <Section title="系统信息" icon={<Server className="w-5 h-5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard label="主机名" value={data.system.hostname} icon={<Server className="w-4 h-4" />} />
                <InfoCard label="操作系统" value={data.system.distro} icon={<Globe className="w-4 h-4" />} />
                <InfoCard label="版本号" value={data.system.release} icon={<Info className="w-4 h-4" />} />
                <InfoCard label="内核版本" value={data.system.kernel} icon={<Cpu className="w-4 h-4" />} />
                <InfoCard label="架构" value={data.system.arch} icon={<Box className="w-4 h-4" />} />
                <InfoCard label="运行时间" value={data.system.uptime} icon={<RefreshCw className="w-4 h-4" />} />
              </div>
            </Section>

            {/* 运行环境 */}
            <Section title="运行环境" icon={<Package className="w-5 h-5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ComponentCard
                  title="Node.js"
                  version={data.node.version}
                  path={data.node.path}
                  icon={<Code className="w-5 h-5" />}
                  updateInfo={getUpdateInfo("node")}
                />
                <ComponentCard
                  title="npm"
                  version={data.npm.version}
                  path={data.npm.path}
                  icon={<Package className="w-5 h-5" />}
                  updateInfo={getUpdateInfo("npm")}
                />
                <ComponentCard
                  title="PM2"
                  version={data.pm2.version}
                  path={data.pm2.path}
                  icon={<Server className="w-5 h-5" />}
                  updateInfo={getUpdateInfo("pm2")}
                  extra={
                    data.pm2.processes.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {data.pm2.processes.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-600 dark:text-zinc-300 truncate">{p.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={p.status} />
                              <span className="text-zinc-400 dark:text-zinc-400">{p.memory}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                />
                <ComponentCard
                  title="Nginx"
                  version={data.nginx.version}
                  path={data.nginx.path}
                  icon={<Globe className="w-5 h-5" />}
                  status={data.nginx.status}
                  updateInfo={getUpdateInfo("nginx")}
                  extra={
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={data.nginx.status} />
                    </div>
                  }
                />
                <ComponentCard
                  title={data.mysql.type}
                  version={data.mysql.version}
                  icon={<Database className="w-5 h-5" />}
                  status={data.mysql.status}
                  updateInfo={getUpdateInfo("mariadb")}
                  extra={
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={data.mysql.status} />
                    </div>
                  }
                />
                <ComponentCard
                  title="Git"
                  version={data.git.version}
                  icon={<GitBranch className="w-5 h-5" />}
                  extra={
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 dark:text-zinc-400">分支</span>
                        <span className="text-zinc-600 dark:text-zinc-300 font-mono">{data.git.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 dark:text-zinc-400">提交</span>
                        <span className="text-zinc-600 dark:text-zinc-300 font-mono">{data.git.commit}</span>
                      </div>
                    </div>
                  }
                />
              </div>
            </Section>

            {/* 项目信息 */}
            <Section title="项目信息" icon={<Box className="w-5 h-5" />}>
              {/* 项目基本信息 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard label="项目名称" value={data.project.displayName} icon={<Box className="w-4 h-4" />} />
                <InfoCard label="项目版本" value={`v${data.project.version}`} icon={<Code className="w-4 h-4" />} />
                <InfoCard label="作者" value={data.project.author} icon={<User className="w-4 h-4" />} />
                <InfoCard label="许可证" value={data.project.license} icon={<Shield className="w-4 h-4" />} />
                <InfoCard
                  label="前端版本"
                  value={`v${data.project.version}（${data.project.dependencies} 生产 + ${data.project.devDependencies} 开发）`}
                  icon={<Code className="w-4 h-4" />}
                />
                <InfoCard
                  label="后端版本"
                  value={`v${data.project.apiVersion}（${data.project.apiDependencies} 生产 + ${data.project.apiDevDependencies} 开发）`}
                  icon={<Code className="w-4 h-4" />}
                />
                <InfoCard label="前端框架" value={data.project.frontendFramework} icon={<Package className="w-4 h-4" />} />
                <InfoCard label="后端框架" value={data.project.backendFramework} icon={<Server className="w-4 h-4" />} />
                <InfoCard label="Node 引擎" value={data.project.nodeVersion} icon={<Cpu className="w-4 h-4" />} />
                <InfoCard
                  label="项目路径"
                  value={data.paths.projectRoot}
                  icon={<Terminal className="w-4 h-4" />}
                  copyable
                  onCopy={() => copyToClipboard(data.paths.projectRoot)}
                />
                <InfoCard
                  label="仓库地址"
                  value={data.project.repository}
                  icon={<GitBranch className="w-4 h-4" />}
                  copyable
                  onCopy={() => copyToClipboard(data.project.repository)}
                />
                <InfoCard
                  label="磁盘使用"
                  value={`${data.disk.used} / ${data.disk.total}（${data.disk.usage}%）`}
                  icon={<HardDrive className="w-4 h-4" />}
                />
              </div>

              {/* 项目描述 */}
              {data.project.description && (
                <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-600">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-300">项目描述</span>
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{data.project.description}</p>
                </div>
              )}

              {/* 技术栈 */}
              {(data.project.techStack.frontend.length > 0 ||
                data.project.techStack.backend.length > 0 ||
                data.project.techStack.deploy.length > 0) && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.project.techStack.frontend.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">前端技术栈</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.project.techStack.frontend.map((tech, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-white dark:bg-black border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.project.techStack.backend.length > 0 && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">后端技术栈</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.project.techStack.backend.map((tech, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-white dark:bg-black border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.project.techStack.deploy.length > 0 && (
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">部署技术栈</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.project.techStack.deploy.map((tech, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-white dark:bg-black border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 构建状态 */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <PathStatus label="前端构建产物" exists={data.paths.frontendDist} />
                <PathStatus label="后端编译产物" exists={data.paths.backendDist} />
                <PathStatus label=".env 配置" exists={data.paths.envFile} />
                <PathStatus label="前端 node_modules" exists={data.paths.nodeModules} />
                <PathStatus label="后端 node_modules" exists={data.paths.apiNodeModules} />
              </div>
            </Section>

            {/* 版本检查 */}
            <Section title="版本检查" icon={<Download className="w-5 h-5" />}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-300">
                    自动检查各组件最新稳定版本，对比当前版本并推荐更新
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    每天凌晨 4:00 自动刷新，也可手动
                  </p>
                </div>
                <button
                  onClick={() => fetchUpdateCheck()}
                  disabled={checkingUpdates}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white rounded-lg hover:border-black dark:hover:border-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? "animate-spin" : ""}`} />
                  {checkingUpdates ? "检查中..." : "检查更新"}
                </button>
              </div>

              {/* 更新检查错误 */}
              {updateError && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-500 dark:text-red-400">检查更新失败</p>
                    <p className="text-xs text-red-400 dark:text-red-500 mt-1">{updateError}</p>
                  </div>
                </div>
              )}

              {/* 检查中 */}
              {checkingUpdates && !updateCheck && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-500 dark:text-zinc-300 animate-spin" />
                  <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-300">正在检查最新版本...</span>
                </div>
              )}

              {/* 更新检查结果 */}
              {updateCheck && (
                <>
                  {/* 统计概览 */}
                  <div className={`px-4 py-3 rounded-lg border mb-4 flex items-center gap-3 ${
                    updateCheck.updateCount > 0
                      ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                  }`}>
                    {updateCheck.updateCount > 0 ? (
                      <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        updateCheck.updateCount > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}>
                        {updateCheck.updateCount > 0
                          ? `发现 ${updateCheck.updateCount} 个可更新组件`
                          : "所有组件均为最新版本"}
                        {updateCheck.updateCount > 0 && getPendingComponents().length > 0 && (
                          <span className="font-normal">
                            {" "}（{getPendingComponents().length} 个可一键更新）
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-0.5">
                        最后检查: {new Date(updateCheck.lastCheck).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    {updateCheck.updateCount > 0 && getPendingComponents().length > 0 && (
                      <button
                        onClick={() => setUpdateAllConfirm(true)}
                        disabled={operating}
                        className="shrink-0 px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        一键更新
                      </button>
                    )}
                  </div>

                  {/* 组件版本列表 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {updateCheck.updates.map((item) => (
                      <UpdateCheckCard key={item.name} item={item} />
                    ))}
                  </div>
                </>
              )}

              {/* 未检查提示 */}
              {!updateCheck && !checkingUpdates && !updateError && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Download className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-300">点击"检查更新"按钮检查最新版本</p>
                </div>
              )}
            </Section>

            {/* 更新操作 */}
            <Section title="环境更新" icon={<Download className="w-5 h-5" />}>
              <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
                更新环境组件到最新版本，不会影响现有数据
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ActionButton
                  title="拉取最新代码"
                  description="从 Git 远程仓库拉取最新代码"
                  icon={<GitBranch className="w-5 h-5" />}
                  loading={operating}
                  onClick={() => setConfirmModal({ kind: "update", component: "git-pull" })}
                />
                <ActionButton
                  title="更新项目依赖"
                  description="更新前端和后端的 npm 依赖包"
                  icon={<Package className="w-5 h-5" />}
                  loading={operating}
                  onClick={() => setConfirmModal({ kind: "update", component: "npm-packages" })}
                />
                <ActionButton
                  title="更新 PM2"
                  description="升级 PM2 到最新版本并重载进程"
                  icon={<Server className="w-5 h-5" />}
                  loading={operating}
                  onClick={() => setConfirmModal({ kind: "update", component: "pm2" })}
                />
                <ActionButton
                  title="重载 Nginx"
                  description="检查配置并重载 Nginx 服务"
                  icon={<Globe className="w-5 h-5" />}
                  loading={operating}
                  onClick={() => setConfirmModal({ kind: "update", component: "nginx" })}
                />
                <ActionButton
                  title="更新系统软件包"
                  description="执行 apt update && apt upgrade"
                  icon={<Shield className="w-5 h-5" />}
                  loading={operating}
                  onClick={() => setConfirmModal({ kind: "update", component: "system-packages" })}
                />
              </div>
            </Section>

            {/* 重装操作 */}
            <Section title="环境重装" icon={<RotateCcw className="w-5 h-5" />}>
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">重装说明</p>
                  <p className="text-xs text-amber-500 dark:text-amber-500 mt-1">
                    重装会清除 node_modules 并重新安装依赖，但会保留数据库数据、.env 配置文件和上传的文件。
                    重装过程中服务会短暂中断，请确保没有用户正在使用系统。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ActionButton
                  title="重装前端"
                  description="清除前端 node_modules，重新安装依赖并构建"
                  icon={<Code className="w-5 h-5" />}
                  loading={operating}
                  danger
                  onClick={() => setConfirmModal({ kind: "reinstall", type: "frontend" })}
                />
                <ActionButton
                  title="重装后端"
                  description="清除后端 node_modules，重新安装依赖并编译，会重启 API 服务"
                  icon={<Server className="w-5 h-5" />}
                  loading={operating}
                  danger
                  onClick={() => setConfirmModal({ kind: "reinstall", type: "backend" })}
                />
                <ActionButton
                  title="完整重装"
                  description="清除所有 node_modules，重新安装并构建前后端，保留数据"
                  icon={<RotateCcw className="w-5 h-5" />}
                  loading={operating}
                  danger
                  onClick={() => setConfirmModal({ kind: "reinstall", type: "all" })}
                />
              </div>
            </Section>

            {/* 最后更新时间 */}
            <div className="text-center text-xs text-zinc-400 dark:text-zinc-400 pb-4">
              最后更新: {new Date(data.timestamp).toLocaleString("zh-CN")}
            </div>
          </>
        )}

        {/* 操作中遮罩 */}
        {operating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-8 flex flex-col items-center gap-4 max-w-md">
              <Loader2 className="w-12 h-12 text-black dark:text-white animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-black dark:text-white">正在执行操作</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-1">
                  请耐心等待，大型操作可能需要几分钟...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 操作日志弹窗 */}
        {operationLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-600">
                <div className="flex items-center gap-2">
                  {operationLog.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <h3 className="font-medium text-black dark:text-white">{operationLog.title}</h3>
                </div>
                <button
                  onClick={() => setOperationLog(null)}
                  className="text-zinc-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all bg-black dark:bg-zinc-950 p-3 rounded-lg max-h-[50vh] overflow-auto border border-zinc-800">
                  {operationLog.content}
                </pre>
              </div>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-600 flex justify-end gap-2">
                <button
                  onClick={() => copyToClipboard(operationLog.content)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white rounded-lg hover:border-black dark:hover:border-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  复制日志
                </button>
                <button
                  onClick={() => setOperationLog(null)}
                  disabled={operationLog.title?.includes("执行中")}
                  className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 一键更新确认弹窗 */}
        {updateAllConfirm && (() => {
          const pendingLabels = getPendingLabels();
          const hasNpmUpdate = pendingLabels.some((l) => l.includes("npm"));
          const hasPm2Update = pendingLabels.some((l) => l.includes("PM2"));

          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Download className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <h3 className="font-serif text-lg font-bold text-black dark:text-white">一键更新</h3>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                将自动更新以下 {pendingLabels.length} 个有更新的组件：
              </p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 space-y-1 list-disc list-inside">
                {pendingLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>

              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Node.js、MariaDB 等系统级组件请通过 apt 或对应工具手动更新
                </span>
              </div>

              {(hasPm2Update || hasNpmUpdate) && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {hasPm2Update && hasNpmUpdate
                      ? "更新期间服务可能会短暂中断，请确认后执行"
                      : hasPm2Update
                      ? "PM2 更新会重载所有进程，服务会短暂中断"
                      : "更新后服务会自动重载"}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setUpdateAllConfirm(false)}
                  className="px-4 py-2 text-sm bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white rounded-lg hover:border-black dark:hover:border-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateAll}
                  className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  确认一键更新
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* 确认弹窗 */}
        {confirmModal && (
          <ConfirmModal
            operation={confirmModal}
            onCancel={() => setConfirmModal(null)}
            onConfirm={() => handleOperation(confirmModal)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ========== 子组件 ==========

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center text-zinc-700 dark:text-zinc-300">
          {icon}
        </div>
        <h2 className="font-serif text-lg font-bold text-black dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-600">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-zinc-500 dark:text-zinc-300">{icon}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-300">{label}</span>
        {copyable && onCopy && (
          <button onClick={onCopy} className="ml-auto text-zinc-400 hover:text-black dark:hover:text-white">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-all">{value}</p>
    </div>
  );
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  neutral: { bg: "bg-white dark:bg-black", text: "text-zinc-600 dark:text-zinc-300", border: "border-zinc-200 dark:border-zinc-600" },
  green: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  red: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
};

function ComponentCard({
  title,
  version,
  path,
  icon,
  extra,
  updateInfo,
  status,
}: {
  title: string;
  version: string;
  path?: string;
  icon: React.ReactNode;
  extra?: React.ReactNode;
  updateInfo?: UpdateItem;
  status?: string;
}) {
  // 根据运行状态决定颜色: 运行正常=绿色, 已停止/异常=红色, 无状态=中性
  const isRunning = status === "运行中";
  const isBad = status === "已停止" || status === "stopped" || status === "errored";
  const statusColor = isRunning ? "green" : isBad ? "red" : "neutral";
  const c = colorMap[statusColor];

  // 版本更新提示: 有更新=红色(需要关注)
  const hasUpdate = updateInfo?.updateAvailable;

  return (
    <div className={`p-4 rounded-lg border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-zinc-500 dark:text-zinc-300">{icon}</span>
        <span className="font-medium text-black dark:text-white text-sm">{title}</span>
        {hasUpdate && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded">
            <AlertTriangle className="w-3 h-3" />
            有更新
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 break-all">{version}</p>
        {hasUpdate && (
          <span className="text-[10px] text-red-500 dark:text-red-400">
            → {updateInfo!.latest}
          </span>
        )}
      </div>
      {path && <p className="text-[10px] text-zinc-400 dark:text-zinc-400 break-all font-mono">{path}</p>}
      {extra}
    </div>
  );
}

// 版本检查卡片
function UpdateCheckCard({ item }: { item: UpdateItem }) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-black">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-zinc-500 dark:text-zinc-300">
          {item.type === "runtime" && <Code className="w-5 h-5" />}
          {item.type === "npm" && <Package className="w-5 h-5" />}
          {item.type === "system" && <Server className="w-5 h-5" />}
        </span>
        <span className="font-medium text-black dark:text-white text-sm">{item.displayName}</span>
        <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600">
          {item.type === "runtime" ? "运行时" : item.type === "npm" ? "npm 包" : "系统包"}
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-300 mb-2">{item.description}</p>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1">
          <span className="text-zinc-400 dark:text-zinc-400">当前: </span>
          <span className="font-mono text-zinc-600 dark:text-zinc-300">{item.current}</span>
        </div>
        <div className="flex-1">
          <span className="text-zinc-400 dark:text-zinc-400">最新: </span>
          <span className={`font-mono ${item.updateAvailable ? "text-red-500 dark:text-red-400 font-medium" : "text-green-500 dark:text-green-400"}`}>
            {item.latest}
          </span>
        </div>
      </div>

      {item.updateAvailable ? (
        <div className="mt-2 px-2 py-1 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <span className="text-[10px] text-red-600 dark:text-red-400">有新版本可用，建议更新</span>
        </div>
      ) : (
        <div className="mt-2 px-2 py-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
          <span className="text-[10px] text-green-600 dark:text-green-400">已是最新版本</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "运行中" || status === "online";
  const isStopped = status === "已停止" || status === "stopped" || status === "errored";

  let className = "px-1.5 py-0.5 rounded text-[10px] font-medium ";
  if (isActive) {
    className += "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400";
  } else if (isStopped) {
    className += "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400";
  } else {
    className += "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300";
  }

  return <span className={className}>{status}</span>;
}

function PathStatus({ label, exists }: { label: string; exists: boolean }) {
  return (
    <div className={`p-2 rounded-lg border flex items-center gap-2 ${
      exists
        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
        : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
    }`}>
      {exists ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{label}</span>
    </div>
  );
}

function ActionButton({
  title,
  description,
  icon,
  loading,
  danger,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`p-4 rounded-lg border text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-black border-zinc-200 dark:border-zinc-600 ${
        danger
          ? "hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          : "hover:border-black dark:hover:border-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 text-zinc-600 dark:text-zinc-300">
        {icon}
        <span className="font-medium text-black dark:text-white text-sm">{title}</span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-300">{description}</p>
    </button>
  );
}

function ConfirmModal({
  operation,
  onCancel,
  onConfirm,
}: {
  operation: OperationType;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isReinstall = operation.kind === "reinstall";
  const isAll = operation.kind === "reinstall" && operation.type === "all";

  const title = operation.kind === "update"
    ? {
        "npm-packages": "更新项目依赖",
        "pm2": "更新 PM2",
        "system-packages": "更新系统软件包",
        "nginx": "重载 Nginx 配置",
        "git-pull": "拉取最新代码",
      }[operation.component]
    : {
        frontend: "重装前端环境",
        backend: "重装后端环境",
        all: "完整重装环境",
      }[operation.type];

  const description = operation.kind === "update"
    ? "此操作将更新组件，可能会短暂影响服务。"
    : operation.type === "all"
    ? "此操作将清除所有 node_modules 并重新安装，服务会中断几分钟。数据库和配置文件会保留。"
    : operation.type === "backend"
    ? "此操作将清除后端 node_modules 并重新安装，API 服务会中断。数据库和 .env 配置会保留。"
    : "此操作将清除前端 node_modules 并重新构建，前端会短暂不可用。";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isReinstall ? "bg-red-50 dark:bg-red-950" : "bg-zinc-100 dark:bg-zinc-800"
          }`}>
            {isReinstall ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Info className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-black dark:text-white">{title}</h3>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{description}</p>

        {isReinstall && (
          <div className="px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xs text-green-600 dark:text-green-400">
              数据库数据、.env 配置文件和上传的文件将被保留
            </span>
          </div>
        )}

        {isAll && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-500 dark:text-red-400">
              完整重装耗时较长（可能 5-10 分钟），请确保有足够时间
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-600 text-black dark:text-white rounded-lg hover:border-black dark:hover:border-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isReinstall
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
            }`}
          >
            {isReinstall ? "确认重装" : "确认执行"}
          </button>
        </div>
      </div>
    </div>
  );
}

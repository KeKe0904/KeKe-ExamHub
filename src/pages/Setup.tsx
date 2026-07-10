﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  X,
  Loader2,
  Database,
  User,
  Server,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Terminal,
  Globe,
  RefreshCw,
} from "@/components/MathIcon";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

type Step = "welcome" | "env" | "database" | "admin" | "installing" | "done";

interface EnvResult {
  node: { version: string; ok: boolean; label: string };
  mysql: { available: boolean; version: string; ok: boolean; label: string };
  nginx: { available: boolean; version: string; ok: boolean; label: string };
  pm2: { available: boolean; version: string; ok: boolean; label: string };
}

export default function Setup() {
  const [step, setStep] = useState<Step>("welcome");
  const [installed, setInstalled] = useState<boolean | null>(null);

  // 环境检测
  const [envResult, setEnvResult] = useState<EnvResult | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  // 数据库配置
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: 3306,
    user: "examhub",
    password: "",
    database: "examhub",
  });
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 管理员账号
  const [admin, setAdmin] = useState({
    username: "admin",
    password: "",
    confirmPassword: "",
  });

  // 安装
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 后端自动重启状态
  const [restartStatus, setRestartStatus] = useState<"restarting" | "done" | "timeout">("restarting");

  // 检查安装状态
  useEffect(() => {
    fetch(`${API_BASE}/setup/status`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setInstalled(data.installed);
      })
      .catch(() => setInstalled(false));
  }, []);

  // 环境检测
  const checkEnv = useCallback(async () => {
    setEnvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/setup/env`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          res.status === 403
            ? "系统已安装，环境检测接口已禁用"
            : `环境检测失败 (HTTP ${res.status})：${text.slice(0, 200)}`
        );
      }
      const data = await res.json();
      setEnvResult(data);
    } catch (error: any) {
      setEnvResult(null);
      setEnvError(error?.message || "环境检测失败，请检查后端服务是否正常运行");
    } finally {
      setEnvLoading(false);
    }
  }, []);

  // 安装完成后轮询后端健康检查,检测自动重启是否完成
  useEffect(() => {
    if (step !== "done") return;

    let attempts = 0;
    const maxAttempts = 20; // 最多尝试 20 次,每次 2 秒,共 40 秒
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pollHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          setRestartStatus("done");
          if (intervalId) clearInterval(intervalId);
          return;
        }
      } catch {
        // 后端正在重启,连接失败是正常的
      }
      attempts++;
      if (attempts >= maxAttempts) {
        setRestartStatus("timeout");
        if (intervalId) clearInterval(intervalId);
      }
    };

    // 等待 3 秒后开始轮询(给后端 1.5 秒重启 + 缓冲时间,避免检测到旧进程)
    const startDelay = setTimeout(() => {
      pollHealth(); // 立即执行一次
      intervalId = setInterval(pollHealth, 2000);
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [step]);

  // 测试数据库连接
  const testDatabase = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/setup/database/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const data = await res.json().catch(() => ({
        success: false,
        message: `服务器返回了非 JSON 响应 (HTTP ${res.status})`,
      }));
      if (!res.ok && !data.message) {
        data.message = `数据库测试失败 (HTTP ${res.status})`;
      }
      setDbTestResult(data);
    } catch (error: any) {
      setDbTestResult({
        success: false,
        message:
          error?.message ||
          "数据库测试请求失败，请检查后端服务是否正常运行",
      });
    } finally {
      setDbTesting(false);
    }
  };

  // 执行安装
  const doInstall = async () => {
    setInstalling(true);
    setInstallResult(null);
    try {
      const res = await fetch(`${API_BASE}/setup/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig, admin: { username: admin.username, password: admin.password } }),
      });
      const data = await res.json().catch(() => ({
        success: false,
        message: `服务器返回了非 JSON 响应 (HTTP ${res.status})`,
      }));
      setInstallResult(data);
      if (data.success) {
        setStep("done");
      }
    } catch (error: any) {
      setInstallResult({
        success: false,
        message:
          error?.message || "安装请求失败，请检查后端服务是否正常运行",
      });
    } finally {
      setInstalling(false);
    }
  };

  // 步骤配置
  const steps = [
    { key: "env", label: "环境检测", icon: Server },
    { key: "database", label: "数据库配置", icon: Database },
    { key: "admin", label: "管理员账号", icon: User },
    { key: "done", label: "完成", icon: CheckCircle2 },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // 已安装提示
  if (installed === true) {
    return (
      <div className="min-h-screen bg-black dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-black dark:text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">系统已安装</h1>
          <p className="text-zinc-500 dark:text-zinc-300 mb-6">KeKe ExamHub 已经完成安装配置</p>
          <div className="flex flex-col gap-3">
            <a
              href="/"
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              访问首页
            </a>
            <a
              href="/admin/login"
              className="border border-zinc-300 dark:border-zinc-600 text-black dark:text-white px-6 py-3 rounded-lg font-medium hover:border-black dark:hover:border-white transition-colors"
            >
              管理后台登录
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 欢迎页
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-black dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-black dark:bg-white flex items-center justify-center">
              <Terminal className="w-6 h-6 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">KeKe ExamHub 安装向导</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-300">考试信息展示平台</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <p className="text-zinc-600 dark:text-zinc-300">
              欢迎使用 KeKe ExamHub 安装向导。本向导将引导您完成以下配置：
            </p>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-black dark:text-white" />
                服务器环境检测
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-black dark:text-white" />
                数据库连接配置
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-black dark:text-white" />
                管理员账号创建
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-black dark:text-white" />
                自动生成配置文件
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              setStep("env");
              checkEnv();
            }}
            className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            开始安装
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 安装中
  if (step === "installing") {
    return (
      <div className="min-h-screen bg-black dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-8">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-black dark:text-white animate-spin mb-4" />
            <h2 className="text-xl font-bold text-black dark:text-white mb-2">正在安装...</h2>
            <p className="text-zinc-500 dark:text-zinc-300 text-sm mb-4">
              正在创建数据库、表结构和管理员账号
            </p>
            {installResult && !installResult.success && (
              <div className="w-full mt-4 p-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950">
                <p className="text-sm text-red-600 dark:text-red-400">{installResult.message}</p>
                <button
                  onClick={() => setStep("admin")}
                  className="mt-3 text-sm text-black dark:text-white underline"
                >
                  返回修改
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 完成
  if (step === "done") {
    const isRestarting = restartStatus === "restarting";
    const isRestartDone = restartStatus === "done";
    const isTimeout = restartStatus === "timeout";

    return (
      <div className="min-h-screen bg-black dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-8 text-center">
          {isRestarting ? (
            <Loader2 className="w-16 h-16 text-black dark:text-white mx-auto mb-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-16 h-16 text-black dark:text-white mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">安装成功！</h1>
          <p className="text-zinc-500 dark:text-zinc-300 mb-6">
            {isRestarting && "后端服务正在自动重启以加载新配置..."}
            {isRestartDone && "KeKe ExamHub 已成功安装配置，后端服务已自动重启。"}
            {isTimeout && "后端自动重启超时，请手动执行：pm2 restart examhub-api"}
          </p>

          {installResult && (
            <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black text-left">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{installResult.message}</p>
            </div>
          )}

          {isRestarting && (
            <div className="mb-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black">
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在等待后端重启完成...</span>
              </div>
            </div>
          )}

          {isRestartDone && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black p-4 mb-6 text-left">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-300 mb-2">下一步操作：</p>
              <ol className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300 list-decimal list-inside">
                <li>访问首页：点击下方按钮</li>
                <li>登录管理后台发布考试信息</li>
              </ol>
            </div>
          )}

          {isTimeout && (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-4 mb-6 text-left">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                自动重启超时。请在服务器上手动执行：<code className="px-1 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900">pm2 restart examhub-api</code>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <a
              href="/"
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRestarting
                  ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed pointer-events-none"
                  : "bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
              }`}
            >
              访问首页
            </a>
            <a
              href="/admin/login"
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRestarting
                  ? "border border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed pointer-events-none"
                  : "border border-zinc-300 dark:border-zinc-600 text-black dark:text-white hover:border-black dark:hover:border-white"
              }`}
            >
              管理后台登录
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 主安装流程
  return (
    <div className="min-h-screen bg-black dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-8">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : isDone
                        ? "border-black dark:border-white bg-white dark:bg-black text-black dark:text-white"
                        : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-black text-zinc-400 dark:text-zinc-400"
                    }`}
                  >
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-black dark:text-white" : isDone ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isDone ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-black"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 步骤1: 环境检测 */}
        {step === "env" && (
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-1">环境检测</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
              检测服务器环境是否满足运行要求
            </p>

            {envLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
              </div>
            ) : envResult ? (
              <div className="space-y-3 mb-6">
                <EnvItem
                  icon={Terminal}
                  name="Node.js"
                  status={envResult.node.ok ? "ok" : "fail"}
                  detail={envResult.node.label}
                />
                <EnvItem
                  icon={Database}
                  name="MySQL / MariaDB"
                  status={envResult.mysql.ok ? "ok" : "fail"}
                  detail={envResult.mysql.label}
                />
                <EnvItem
                  icon={Globe}
                  name="Nginx"
                  status={envResult.nginx.ok ? "ok" : "warn"}
                  detail={envResult.nginx.label}
                />
                <EnvItem
                  icon={Server}
                  name="PM2"
                  status={envResult.pm2.ok ? "ok" : "warn"}
                  detail={envResult.pm2.label}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 dark:text-zinc-300">
                <p className="mb-2 font-medium">环境检测失败</p>
                {envError ? (
                  <p className="text-sm text-red-600 dark:text-red-400 break-all px-4">{envError}</p>
                ) : (
                  <p className="text-sm">请检查后端服务是否正常运行</p>
                )}
                <p className="text-xs mt-4 text-zinc-400">
                  常见原因：后端进程未启动 / 端口被占用 / 防火墙拦截 / Nginx 反向代理配置错误
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("welcome")}
                className="text-sm text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={checkEnv}
                  className="text-sm text-black dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新检测
                </button>
                <button
                  onClick={() => setStep("database")}
                  disabled={!envResult}
                  className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤2: 数据库配置 */}
        {step === "database" && (
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-1">数据库配置</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
              请输入 MySQL/MariaDB 数据库连接信息
            </p>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    数据库主机
                  </label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    端口
                  </label>
                  <input
                    type="number"
                    value={dbConfig.port}
                    onChange={(e) =>
                      setDbConfig({ ...dbConfig, port: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                    placeholder="3306"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  数据库用户名
                </label>
                <input
                  type="text"
                  value={dbConfig.user}
                  onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="root"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  数据库密码
                </label>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) =>
                    setDbConfig({ ...dbConfig, password: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="输入数据库密码"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  数据库名称
                </label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) =>
                    setDbConfig({ ...dbConfig, database: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="examhub"
                />
                <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
                  如果数据库不存在，将自动创建
                </p>
              </div>

              {/* 测试结果 */}
              {dbTestResult && (
                <div
                  className={`p-3 rounded-lg border text-sm ${
                    dbTestResult.success
                      ? "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black text-black dark:text-white"
                      : "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {dbTestResult.success ? (
                      <Check className="w-4 h-4 text-black dark:text-white" />
                    ) : (
                      <X className="w-4 h-4 text-red-500 dark:text-red-400" />
                    )}
                    <span>{dbTestResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("env")}
                className="text-sm text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={testDatabase}
                  disabled={dbTesting}
                  className="border border-zinc-300 dark:border-zinc-600 text-black dark:text-white px-4 py-2.5 rounded-lg font-medium hover:border-black dark:hover:border-white transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {dbTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  测试连接
                </button>
                <button
                  onClick={() => setStep("admin")}
                  disabled={!dbTestResult?.success}
                  className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤3: 管理员账号 */}
        {step === "admin" && (
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-1">管理员账号</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
              创建管理后台登录账号
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  管理员用户名
                </label>
                <input
                  type="text"
                  value={admin.username}
                  onChange={(e) => setAdmin({ ...admin, username: e.target.value })}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  管理员密码
                </label>
                <input
                  type="password"
                  value={admin.password}
                  onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="输入密码（至少6位）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  确认密码
                </label>
                <input
                  type="password"
                  value={admin.confirmPassword}
                  onChange={(e) =>
                    setAdmin({ ...admin, confirmPassword: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  placeholder="再次输入密码"
                />
                {admin.confirmPassword && admin.password !== admin.confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">两次密码不一致</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("database")}
                className="text-sm text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
              <button
                onClick={() => {
                  setStep("installing");
                  doInstall();
                }}
                disabled={
                  !admin.username ||
                  admin.password.length < 6 ||
                  admin.password !== admin.confirmPassword
                }
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                开始安装
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 环境检测项组件
function EnvItem({
  icon: Icon,
  name,
  status,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  status: "ok" | "fail" | "warn";
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-600">
      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-black flex items-center justify-center">
        <Icon className="w-5 h-5 text-black dark:text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-black dark:text-white">{name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-300">{detail}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {status === "ok" ? (
          <>
            <Check className="w-4 h-4 text-black dark:text-white" />
            <span className="text-xs font-medium text-black dark:text-white">正常</span>
          </>
        ) : status === "warn" ? (
          <>
            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-black0" />
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-400">可选</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span className="text-xs font-medium text-red-500 dark:text-red-400">未安装</span>
          </>
        )}
      </div>
    </div>
  );
}

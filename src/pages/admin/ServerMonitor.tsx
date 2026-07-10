/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useCallback } from "react";
import {
  Server,
  RefreshCw,
  Cpu,
  Database,
  HardDrive,
  Network,
  Clock,
  Activity,
  Thermometer,
} from "@/components/MathIcon";
import AdminLayout from "@/components/Layout/AdminLayout";
import { monitorApi } from "@/utils/api";

// 环形进度条
function Gauge({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const strokeColor =
    value >= 90 ? "#ef4444" : value >= 70 ? "#a1a1aa" : "#000";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-zinc-100 dark:stroke-zinc-900"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="10"
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-black dark:text-white">
          {value}
          <span className="text-sm text-zinc-400 ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

// 信息行
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0">
      <span className="text-sm text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-black dark:text-white text-right">
        {value}
      </span>
    </div>
  );
}

// 小进度条
function MiniBar({ value }: { value: number }) {
  const color =
    value >= 90 ? "bg-red-500" : value >= 70 ? "bg-zinc-400 dark:bg-zinc-500" : "bg-black dark:bg-white";
  return (
    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// 大进度条
function Bar({ value }: { value: number }) {
  const color =
    value >= 90 ? "bg-red-500" : value >= 70 ? "bg-zinc-400 dark:bg-zinc-500" : "bg-black dark:bg-white";
  return (
    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// 盘符友好名称
function friendlyMount(mount: string): string {
  if (mount === "/") return "系统盘";
  if (mount === "/home") return "数据盘";
  if (mount.startsWith("/mnt/")) return mount.replace("/mnt/", "");
  return mount;
}

export default function ServerMonitor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await monitorApi.getData();
      setData(response.data);
      setError("");
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取监控数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  return (
    <AdminLayout>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
            服务器监控
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            实时查看服务器资源使用情况
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              autoRefresh
                ? "bg-black dark:bg-white text-white dark:text-black"
                : "bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Activity className="w-4 h-4" />
            {autoRefresh ? "自动刷新" : "已暂停"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            手动刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-500 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* 核心指标：CPU / 内存 / 系统 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CPU */}
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-semibold text-black dark:text-white">CPU 处理器</h3>
                {data.cpu.temperature !== null && (
                  <span className="inline-flex items-center gap-1 ml-auto text-xs text-zinc-400 dark:text-zinc-600">
                    <Thermometer className="w-3 h-3" />
                    {data.cpu.temperature}°C
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-3 truncate" title={data.cpu.model}>
                {data.cpu.model}
              </p>
              <div className="flex items-center gap-4 mb-3">
                <Gauge value={data.cpu.usage} />
                <div className="flex-1 min-w-0">
                  <Row label="核心数" value={`${data.cpu.cores} 核`} />
                  {data.cpu.speed !== "未知" && <Row label="主频" value={data.cpu.speed} />}
                  <Row label="1分钟负载" value={data.cpu.loadAvg["1min"]} />
                  <Row label="5分钟负载" value={data.cpu.loadAvg["5min"]} />
                  <Row label="15分钟负载" value={data.cpu.loadAvg["15min"]} />
                </div>
              </div>
              {/* 每核心使用率 */}
              {data.cpu.perCore && data.cpu.perCore.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-2">各核心使用率</p>
                  <div className="space-y-1.5">
                    {data.cpu.perCore.map((core: any) => (
                      <div key={core.core} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 dark:text-zinc-600 w-12 shrink-0">
                          核心 {core.core}
                        </span>
                        <div className="flex-1">
                          <MiniBar value={core.usage} />
                        </div>
                        <span className="text-xs font-medium text-black dark:text-white w-10 text-right shrink-0">
                          {core.usage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 内存 */}
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-semibold text-black dark:text-white">内存</h3>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-3">
                {data.memory.used.value}{data.memory.used.unit} / {data.memory.total.value}{data.memory.total.unit}
              </p>
              <div className="flex items-center gap-4 mb-3">
                <Gauge value={data.memory.usage} />
                <div className="flex-1 min-w-0">
                  <Row label="总容量" value={`${data.memory.total.value} ${data.memory.total.unit}`} />
                  <Row label="已使用" value={`${data.memory.used.value} ${data.memory.used.unit}`} />
                  <Row label="剩余可用" value={`${data.memory.free.value} ${data.memory.free.unit}`} />
                </div>
              </div>
              {/* Swap 信息 */}
              {data.memory.swap && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">交换分区 (Swap)</span>
                    <span className={`text-xs font-medium ${data.memory.swap.usage >= 80 ? "text-red-500" : data.memory.swap.usage >= 50 ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-600"}`}>
                      {data.memory.swap.usage}%
                    </span>
                  </div>
                  <MiniBar value={data.memory.swap.usage} />
                  <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-400 dark:text-zinc-600">
                    <span>已用 {data.memory.swap.used.value}{data.memory.swap.used.unit}</span>
                    <span>总量 {data.memory.swap.total.value}{data.memory.swap.total.unit}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 系统 */}
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-semibold text-black dark:text-white">系统信息</h3>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-3">
                {data.system.hostname}
              </p>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex flex-col items-center justify-center shrink-0" style={{ width: 120, height: 120 }}>
                  <Clock className="w-7 h-7 text-black dark:text-white mb-1.5" />
                  <span className="text-base font-bold text-black dark:text-white">
                    {Math.floor(data.system.uptimeSeconds / 3600)}
                    <span className="text-xs text-zinc-400 ml-1">小时</span>
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {Math.floor(data.system.uptimeSeconds / 86400)} 天
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Row label="操作系统" value={data.system.osFullName} />
                  <Row label="内核版本" value={data.system.kernel} />
                  <Row label="架构" value={data.system.arch} />
                  <Row label="已运行" value={data.system.uptime} />
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                <Row label="启动时间" value={new Date(data.system.bootTime).toLocaleString("zh-CN")} />
                <Row label="当前时间" value={new Date(data.system.time).toLocaleString("zh-CN")} />
              </div>
            </div>
          </div>

          {/* 磁盘使用 */}
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-black dark:text-white" />
              <h3 className="text-sm font-semibold text-black dark:text-white">磁盘使用</h3>
            </div>
            {data.disks.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-600 py-4 text-center">
                暂无磁盘信息
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.disks.map((disk: any, idx: number) => (
                  <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-black dark:text-white">
                        {friendlyMount(disk.mount)}
                      </span>
                      <span className={`text-xs font-medium ${disk.usage >= 90 ? "text-red-500" : disk.usage >= 70 ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-600"}`}>
                        {disk.usage}%
                      </span>
                    </div>
                    <Bar value={disk.usage} />
                    <div className="flex items-center justify-between mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                      <span>已用 {disk.used}</span>
                      <span>剩余 {disk.available}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-300 dark:text-zinc-700">
                      <span className="font-mono">{disk.filesystem}</span>
                      <span>{disk.fstype} · {disk.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 进程 & 网络 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 后端进程 */}
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-semibold text-black dark:text-white">后端进程</h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-600 ml-auto">
                  Node {data.process.nodeVersion}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <Row label="进程 PID" value={data.process.pid} />
                  <Row label="运行时长" value={data.process.uptime} />
                  <Row label="运行平台" value={data.process.platform} />
                </div>
                <div>
                  <Row label="常驻内存" value={`${data.process.memory.rss.value} ${data.process.memory.rss.unit}`} />
                  <Row label="堆内存" value={`${data.process.memory.heapUsed.value} / ${data.process.memory.heapTotal.value} ${data.process.memory.heapUsed.unit}`} />
                  <Row label="外部内存" value={`${data.process.memory.external.value} ${data.process.memory.external.unit}`} />
                  <Row label="数组缓冲" value={`${data.process.memory.arrayBuffers.value} ${data.process.memory.arrayBuffers.unit}`} />
                </div>
              </div>
            </div>

            {/* 网络接口 */}
            <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-4 h-4 text-black dark:text-white" />
                <h3 className="text-sm font-semibold text-black dark:text-white">网络接口</h3>
              </div>
              {data.networks.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-600 py-4 text-center">
                  未检测到网络接口
                </p>
              ) : (
                <div className="space-y-3">
                  {data.networks.map((net: any, idx: number) => (
                    <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-black dark:text-white">
                          {net.name}
                        </span>
                        <span className="text-sm font-mono text-black dark:text-white">
                          {net.address}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
                        <span className="font-mono">MAC: {net.mac}</span>
                        <span>掩码: {net.netmask}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 底部状态栏 */}
          {lastUpdate && (
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-600 pt-2">
              <Clock className="w-3 h-3" />
              最后更新于 {lastUpdate.toLocaleString("zh-CN")}
              {autoRefresh && " · 每 5 秒自动刷新"}
            </div>
          )}
        </div>
      ) : null}
    </AdminLayout>
  );
}

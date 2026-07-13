/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import os from "os";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { successResponse, errorResponse } from "../utils/response.js";
import { authMiddleware } from "../middleware/auth.js";

const execAsync = promisify(exec);

// 格式化字节大�?
function formatBytes(bytes: number): { value: number; unit: string } {
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;
  if (gb >= 1) return { value: Math.round(gb * 100) / 100, unit: "GB" };
  if (mb >= 1) return { value: Math.round(mb * 100) / 100, unit: "MB" };
  return { value: Math.round(kb * 100) / 100, unit: "KB" };
}

// 格式化运行时�?
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  parts.push(`${secs}秒`);
  return parts.join(" ");
}

// 计算 CPU 使用率（基于 os.cpus()�?
function calculateCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  const perCore = cpus.map((cpu, index) => {
    let idle = cpu.times.idle;
    let tick = 0;
    for (const type in cpu.times) {
      tick += (cpu.times as any)[type];
    }
    totalIdle += idle;
    totalTick += tick;
    const usage = Math.round(((tick - idle) / tick) * 1000) / 10;
    return { core: index, usage };
  });

  return {
    usage: Math.round(((totalTick - totalIdle) / totalTick) * 1000) / 10,
    cores: cpus.length,
    model: cpus[0]?.model || "未知",
    speed: cpus[0]?.speed ? `${(cpus[0].speed / 1000).toFixed(2)}GHz` : "未知",
    perCore,
  };
}

// 获取 CPU 温度
async function getCpuTemperature(): Promise<number | null> {
  try {
    // 尝试读取 thermal zone
    const temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf-8").trim();
    return Math.round(parseInt(temp) / 10) / 10;
  } catch {
    try {
      // 尝试 sensors 命令
      const { stdout } = await execAsync("sensors -j 2>/dev/null || echo '{}'");
      const data = JSON.parse(stdout);
      // 尝试常见的传感器路径
      for (const chip of Object.keys(data)) {
        for (const key of Object.keys(data[chip])) {
          if (key.toLowerCase().includes("temp") && key.toLowerCase().includes("input")) {
            const val = data[chip][key];
            if (typeof val === "number" && val > 0 && val < 200) {
              return Math.round(val * 10) / 10;
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }
}

// 获取 Swap 交换分区信息
async function getSwapInfo(): Promise<{
  total: { value: number; unit: string };
  used: { value: number; unit: string };
  free: { value: number; unit: string };
  usage: number;
} | null> {
  try {
    const { stdout } = await execAsync("free -b 2>/dev/null");
    const lines = stdout.trim().split("\n");
    const swapLine = lines.find((l) => l.startsWith("Swap:"));
    if (!swapLine) return null;
    const parts = swapLine.trim().split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const free = parseInt(parts[3]);
    if (total === 0) return null;
    return {
      total: formatBytes(total),
      used: formatBytes(used),
      free: formatBytes(free),
      usage: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return null;
  }
}

// 获取磁盘使用情况（仅显示真实磁盘，过滤临时文件系统）
async function getDiskUsage(): Promise<
  Array<{
    filesystem: string;
    fstype: string;
    mount: string;
    total: string;
    used: string;
    available: string;
    usage: number;
  }>
> {
  const fsBlacklist = /^(tmpfs|devtmpfs|udev|overlay|squashfs|none|loop|shm)$/i;
  try {
    const { stdout } = await execAsync(
      "df -h --output=fstype,source,size,used,avail,pcent,target 2>/dev/null || df -h"
    );
    const lines = stdout.trim().split("\n").slice(1);
    return lines
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 7) return null;
        const fstype = parts[0];
        if (fsBlacklist.test(fstype)) return null;
        const usageStr = parts[5].replace("%", "");
        return {
          filesystem: parts[1],
          fstype,
          mount: parts[6],
          total: parts[2],
          used: parts[3],
          available: parts[4],
          usage: parseInt(usageStr) || 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  } catch {
    return [];
  }
}

// 获取网络接口信息(包含 MAC 地址等)
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const result: Array<{
    name: string;
    address: string;
    family: string;
    mac: string;
    netmask: string;
  }> = [];
  const seen = new Set<string>();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        const key = `${name}-${addr.address}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          name,
          address: addr.address,
          family: addr.family,
          mac: addr.mac,
          netmask: addr.netmask,
        });
      }
    }
  }
  return result;
}

// 安全修复：不论环境，统一过滤 MAC 地址和 netmask 等敏感字段
// 之前的实现仅在 NODE_ENV=production 时过滤，若环境变量未设置则泄露网卡信息
function filterSensitiveNetworkInfo(networks: ReturnType<typeof getNetworkInterfaces>) {
  return networks.map((n) => ({
    name: n.name,
    address: n.address,
    family: n.family,
  }));
}

export default async function monitorRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const cpu = calculateCpuUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = Math.round((usedMem / totalMem) * 1000) / 10;

        const processMem = process.memoryUsage();
        const loadAvg = os.loadavg();

        const [disks, networks, temperature, swap] = await Promise.all([
          getDiskUsage(),
          getNetworkInterfaces(),
          getCpuTemperature(),
          getSwapInfo(),
        ]);

        // 生产环境下过滤敏感网络信息(MAC/netmask)
        const safeNetworks = filterSensitiveNetworkInfo(networks);

        const uptimeSec = os.uptime();
        const bootTime = new Date(Date.now() - uptimeSec * 1000);

        const data = {
          system: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            osVersion: os.release(),
            osName: os.type(),
            osFullName: `${os.type()} ${os.release()}`,
            kernel: os.release(),
            uptime: formatUptime(uptimeSec),
            uptimeSeconds: uptimeSec,
            bootTime: bootTime.toISOString(),
            time: new Date().toISOString(),
          },
          cpu: {
            usage: cpu.usage,
            cores: cpu.cores,
            model: cpu.model,
            speed: cpu.speed,
            temperature,
            loadAvg: {
              "1min": Math.round(loadAvg[0] * 100) / 100,
              "5min": Math.round(loadAvg[1] * 100) / 100,
              "15min": Math.round(loadAvg[2] * 100) / 100,
            },
            perCore: cpu.perCore,
          },
          memory: {
            total: formatBytes(totalMem),
            used: formatBytes(usedMem),
            free: formatBytes(freeMem),
            usage: memUsage,
            swap,
          },
          process: {
            pid: process.pid,
            uptime: formatUptime(process.uptime()),
            uptimeSeconds: process.uptime(),
            memory: {
              rss: formatBytes(processMem.rss),
              heapTotal: formatBytes(processMem.heapTotal),
              heapUsed: formatBytes(processMem.heapUsed),
              external: formatBytes(processMem.external),
              arrayBuffers: formatBytes(processMem.arrayBuffers),
            },
            nodeVersion: process.version,
            platform: `${process.platform}/${process.arch}`,
          },
          disks,
          networks: safeNetworks,
        };

        return reply.send(successResponse(data, "获取监控数据成功"));
      } catch (error: any) {
        console.error("获取监控数据失败:", error);
        return reply.status(500).send(errorResponse("获取监控数据失败"));
      }
    }
  );
}

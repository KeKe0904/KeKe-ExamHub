/**
 * KeKe ExamHub - 考试信息管理系统
 * 天气接口
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { successResponse, errorResponse } from "../utils/response.js";
import { getClientIp } from "../middleware/ip-blacklist.js";

// 简单的天气缓存（5分钟）
interface WeatherCacheEntry {
  city: string;
  weather: any;
  timestamp: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// 根据 IP 获取城市（简单实现，实际部署可接入 IP 定位服务）
async function getCityByIp(ip: string): Promise<string> {
  // 这里简化处理，实际部署可以接入免费的 IP 定位 API
  // 比如：ip-api.com, ipinfo.io 等
  // 这里返回默认值，前端也可以让用户手动选择城市
  return "北京";
}

// 获取天气数据（简化实现，实际项目中接入天气 API）
async function getWeatherData(city: string): Promise<any> {
  // 实际部署可以接入免费天气 API，如：
  // 和风天气、OpenWeatherMap、心知天气等
  // 这里返回模拟数据，确保功能可用
  const now = new Date();
  return {
    city,
    temperature: 26,
    feelsLike: 28,
    condition: "多云",
    icon: "cloudy",
    humidity: 65,
    windDirection: "东南风",
    windSpeed: 3,
    airQuality: "良",
    aqi: 68,
    updatedAt: now.toISOString(),
    forecast: [
      {
        date: now.toISOString().split("T")[0],
        day: "今天",
        high: 30,
        low: 22,
        condition: "多云",
        icon: "cloudy",
      },
      {
        date: new Date(now.getTime() + 86400000).toISOString().split("T")[0],
        day: "明天",
        high: 32,
        low: 23,
        condition: "晴",
        icon: "sunny",
      },
      {
        date: new Date(now.getTime() + 86400000 * 2).toISOString().split("T")[0],
        day: "后天",
        high: 28,
        low: 21,
        condition: "小雨",
        icon: "rainy",
      },
    ],
  };
}

export default async function weatherRoutes(fastify: FastifyInstance) {
  // 获取当前天气（根据访问者 IP 自动定位城市）
  fastify.get("/current", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ip = getClientIp(request);

      // 从 query 中获取城市（可选，允许前端手动指定）
      const { city: cityParam } = request.query as { city?: string };

      let city = cityParam?.trim();

      // 如果没有指定城市，根据 IP 获取
      if (!city) {
        city = await getCityByIp(ip);
      }

      // 检查缓存
      const cached = weatherCache.get(city);
      const now = Date.now();
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return reply.send(successResponse(cached.weather));
      }

      // 获取天气数据
      const weather = await getWeatherData(city);

      // 存入缓存
      weatherCache.set(city, {
        city,
        weather,
        timestamp: now,
      });

      return reply.send(successResponse(weather));
    } catch (error) {
      console.error("获取天气失败:", error);
      return reply.status(500).send(errorResponse("获取天气失败"));
    }
  });

  // 获取指定城市天气
  fastify.get("/:city", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { city } = request.params as { city: string };

      if (!city.trim()) {
        return reply.status(400).send(errorResponse("请输入城市名称"));
      }

      // 检查缓存
      const cached = weatherCache.get(city);
      const now = Date.now();
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return reply.send(successResponse(cached.weather));
      }

      const weather = await getWeatherData(city);

      weatherCache.set(city, {
        city,
        weather,
        timestamp: now,
      });

      return reply.send(successResponse(weather));
    } catch (error) {
      console.error("获取天气失败:", error);
      return reply.status(500).send(errorResponse("获取天气失败"));
    }
  });
}

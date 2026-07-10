/**
 * KeKe ExamHub - 考试信息管理系统
 * 公众端公告列表页
 * @author 落梦陳 (KeKe0904) | B站/抖音：落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Globe, MapPin, ChevronDown, ChevronUp, ArrowLeft } from "@/components/MathIcon";
import UserLayout from "@/components/Layout/UserLayout";
import type { Announcement } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/announcements`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAnnouncements(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <UserLayout>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </a>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            公告列表
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            查看学校发布的最新通知与考试安排
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <div className="skeleton h-6 w-1/3 rounded mb-4" />
                <div className="skeleton h-4 w-full rounded mb-2" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
              暂无公告
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              学校尚未发布任何公告
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const isExpanded = expanded.includes(a.id);
              const isLong = a.content.length > 120;
              return (
                <article
                  key={a.id}
                  className={`rounded-xl border p-6 transition-colors ${
                    a.isPinned
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        a.isPinned
                          ? "bg-white/10 dark:bg-zinc-900/10 text-white dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {a.isPinned ? (
                        <MapPin className="h-5 w-5" />
                      ) : (
                        <Globe className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {a.isPinned && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              a.isPinned
                                ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            置顶
                          </span>
                        )}
                        <h2 className="text-lg font-semibold break-words">
                          {a.title}
                        </h2>
                      </div>
                      <span
                        className={`text-xs ${
                          a.isPinned
                            ? "text-zinc-300 dark:text-zinc-700"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        发布于 {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`text-sm leading-relaxed announcement-content ${
                      a.isPinned
                        ? "text-zinc-200 dark:text-zinc-700"
                        : "text-zinc-600 dark:text-zinc-400"
                    } ${!isExpanded && isLong ? "line-clamp-3" : ""}`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(a.content),
                    }}
                  />

                  {isLong && (
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${
                        a.isPinned
                          ? "text-white/80 hover:text-white dark:text-zinc-900/80 dark:hover:text-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          展开全部
                        </>
                      )}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </UserLayout>
  );
}

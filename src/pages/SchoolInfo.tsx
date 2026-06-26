/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useEffect, useState } from "react";
import UserLayout from "@/components/Layout/UserLayout";
import { Building, Globe, MapPin, Phone, GraduationCap, Loader2 } from "@/components/MathIcon";
import { useSchoolName } from "@/hooks/useSchoolName";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

interface SchoolInfo {
  school_type: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  teaching_buildings: string;
  library: string;
  campus: string;
  features: string;
}

export default function SchoolInfo() {
  const schoolName = useSchoolName();
  const [info, setInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/school-info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setInfo(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName = schoolName || "KeKe ExamHub";

  return (
    <UserLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* 页面标题 */}
        <section className="bg-zinc-100 dark:bg-black border-b border-zinc-200 dark:border-zinc-600">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-black dark:text-white font-serif">学校信息</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-300">{displayName}</p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-400" />
            </div>
          ) : !info ? (
            <div className="text-center py-20 text-zinc-400 dark:text-zinc-400">暂无学校信息</div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10">
              {/* 学校简介 */}
              {(info.description || info.school_type) && (
                <section>
                  {info.school_type && (
                    <span className="inline-block px-3 py-1 rounded-full bg-zinc-100 dark:bg-black text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      {info.school_type}
                    </span>
                  )}
                  {info.description && (
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{info.description}</p>
                  )}
                </section>
              )}

              {/* 联系信息 */}
              {(info.address || info.phone || info.website) && (
                <section className="bg-zinc-100 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
                  <h2 className="text-lg font-semibold text-black dark:text-white mb-4">联系方式</h2>
                  <div className="space-y-3">
                    {info.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-300">{info.address}</span>
                      </div>
                    )}
                    {info.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-zinc-400 dark:text-zinc-400 shrink-0" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-300">{info.phone}</span>
                      </div>
                    )}
                    {info.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-zinc-400 dark:text-zinc-400 shrink-0" />
                        <a
                          href={info.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white underline-offset-4 hover:underline"
                        >
                          {info.website}
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 教学楼信息 */}
              {info.teaching_buildings && (
                <section>
                  <h2 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    教学楼信息
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {info.teaching_buildings}
                  </p>
                </section>
              )}

              {/* 图书馆信息 */}
              {info.library && (
                <section>
                  <h2 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    图书馆信息
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {info.library}
                  </p>
                </section>
              )}

              {/* 校园信息 */}
              {info.campus && (
                <section>
                  <h2 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    校园信息
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {info.campus}
                  </p>
                </section>
              )}

              {/* 校园特色 */}
              {info.features && (
                <section>
                  <h2 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    校园特色
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {info.features}
                  </p>
                </section>
              )}

              {/* 完全没有内容 */}
              {!info.description && !info.school_type && !info.address &&
                !info.phone && !info.website && !info.teaching_buildings &&
                !info.library && !info.campus && !info.features && (
                <div className="text-center py-20 text-zinc-400 dark:text-zinc-400">
                  暂无学校信息，请等待管理员添加
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}

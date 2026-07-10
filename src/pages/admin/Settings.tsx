﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSchoolStore } from "@/store/schoolStore";
import type { FooterLink } from "@/store/schoolStore";
import AdminLayout from "@/components/Layout/AdminLayout";
import AiConfigPanel from "@/components/admin/AiConfigPanel";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  Settings as SettingsIcon,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Building,
  Cookie,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "@/components/MathIcon";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
// 读取 token：localStorage（rememberMe=true 时存储）优先，sessionStorage 兜底
const getToken = () => {
  try {
    return localStorage.getItem("examhub-token") || sessionStorage.getItem("examhub-token") || "";
  } catch {
    return sessionStorage.getItem("examhub-token") || "";
  }
};

export default function Settings() {
  const username = useAuthStore((state) => state.username);
  const setGlobalSchoolName = useSchoolStore((state) => state.setSchoolName);
  const setGlobalSiteTitle = useSchoolStore((state) => state.setSiteTitle);
  const setGlobalSiteFavicon = useSchoolStore((state) => state.setSiteFavicon);
  const setGlobalHomeConfig = useSchoolStore((state) => state.setHomeConfig);
  const setGlobalFooterConfig = useSchoolStore((state) => state.setFooterConfig);

  // 密码相关
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 头像相关
  const [avatar, setAvatar] = useState<string>("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 学校名字
  const [schoolName, setSchoolName] = useState("");
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolMsg, setSchoolMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 站点信息
  const [siteTitle, setSiteTitle] = useState("");
  const [siteFavicon, setSiteFavicon] = useState<string>("");
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteMsg, setSiteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // 首页文案
  const [homeBadgeText, setHomeBadgeText] = useState("");
  const [homeTitle, setHomeTitle] = useState("");
  const [homeSubtitle, setHomeSubtitle] = useState("");
  const [homeStatLabels, setHomeStatLabels] = useState("");
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeMsg, setHomeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 尾栏配置
  const [footerText, setFooterText] = useState("");
  const [footerIcp, setFooterIcp] = useState("");
  const [footerPublicSecurity, setFooterPublicSecurity] = useState("");
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [footerLoading, setFooterLoading] = useState(false);
  const [footerMsg, setFooterMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 学校信息
  const [schoolType, setSchoolType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [teachingBuildings, setTeachingBuildings] = useState("");
  const [library, setLibrary] = useState("");
  const [campus, setCampus] = useState("");
  const [features, setFeatures] = useState("");
  const [schoolInfoLoading, setSchoolInfoLoading] = useState(false);
  const [schoolInfoMsg, setSchoolInfoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(true);
  const [cookieConsentLoading, setCookieConsentLoading] = useState(false);
  const [cookieConsentMsg, setCookieConsentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // 加载管理员信息和系统设置
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 获取管理员信息
      const profileRes = await fetch(`${API_BASE}/settings/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const profileData = await profileRes.json();
      if (profileData.success && profileData.data.avatar) {
        setAvatar(profileData.data.avatar);
      }

      // 获取系统设置
      const settingsRes = await fetch(`${API_BASE}/settings`);
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data) {
        const d = settingsData.data;
        if (d.school_name) {
          setSchoolName(d.school_name);
          setGlobalSchoolName(d.school_name);
        }
        if (d.site_title) {
          setSiteTitle(d.site_title);
          setGlobalSiteTitle(d.site_title);
        }
        if (d.site_favicon) {
          setSiteFavicon(d.site_favicon);
          setGlobalSiteFavicon(d.site_favicon);
        }
        // Cookie 弹窗开关（默认开启）
        setCookieConsentEnabled(d.cookie_consent_enabled !== "false");

        // 首页文案
        setHomeBadgeText(d.home_badge_text || "");
        setHomeTitle(d.home_title || "");
        setHomeSubtitle(d.home_subtitle || "");
        setHomeStatLabels(d.home_stat_labels || "");

        // 尾栏配置
        setFooterText(d.footer_text || "");
        setFooterIcp(d.footer_icp || "");
        setFooterPublicSecurity(d.footer_public_security || "");
        if (d.footer_links) {
          try {
            const parsed = JSON.parse(d.footer_links);
            if (Array.isArray(parsed)) {
              setFooterLinks(
                parsed.filter(
                  (item: any) =>
                    item && typeof item.name === "string" && typeof item.url === "string"
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }

      // 获取学校信息
      const schoolInfoRes = await fetch(`${API_BASE}/school-info`);
      const schoolInfoData = await schoolInfoRes.json();
      if (schoolInfoData.success && schoolInfoData.data) {
        const si = schoolInfoData.data;
        setSchoolType(si.school_type || "");
        setDescription(si.description || "");
        setAddress(si.address || "");
        setPhone(si.phone || "");
        setWebsite(si.website || "");
        setTeachingBuildings(si.teaching_buildings || "");
        setLibrary(si.library || "");
        setCampus(si.campus || "");
        setFeatures(si.features || "");
      }
    } catch {
      // 忽略错误
    }
  };

  // 修改密码
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "请填写所有字段" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "新密码至少6位" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: "success", text: "密码修改成功" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.message || "修改失败" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "网络错误" });
    } finally {
      setPasswordLoading(false);
    }
  };

  // 头像上传
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "图片大小不能超过2MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatar(base64);
      setAvatarLoading(true);
      setAvatarMsg(null);
      try {
        const res = await fetch(`${API_BASE}/settings/avatar`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ avatar: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setAvatarMsg({ type: "success", text: "头像更新成功" });
        } else {
          setAvatarMsg({ type: "error", text: data.message || "更新失败" });
        }
      } catch {
        setAvatarMsg({ type: "error", text: "网络错误" });
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 保存学校名字
  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolLoading(true);
    setSchoolMsg(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ schoolName }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalSchoolName(schoolName);
        setSchoolMsg({ type: "success", text: "学校名字保存成功" });
      } else {
        setSchoolMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setSchoolMsg({ type: "error", text: "网络错误" });
    } finally {
      setSchoolLoading(false);
    }
  };

  // 保存站点信息（标题 + 图标）
  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteLoading(true);
    setSiteMsg(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ siteTitle, siteFavicon }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalSiteTitle(siteTitle);
        setGlobalSiteFavicon(siteFavicon);
        setSiteMsg({ type: "success", text: "站点信息保存成功" });
      } else {
        setSiteMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setSiteMsg({ type: "error", text: "网络错误" });
    } finally {
      setSiteLoading(false);
    }
  };

  // 站点图标上传
  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      setSiteMsg({ type: "error", text: "图标文件大小不能超过1MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSiteFavicon(base64);
      setSiteMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // 清除站点图标
  const handleClearFavicon = () => {
    setSiteFavicon("");
    setSiteMsg(null);
  };

  // 保存 Cookie 弹窗开关
  const handleCookieConsentToggle = async () => {
    const newVal = !cookieConsentEnabled;
    setCookieConsentEnabled(newVal);
    setCookieConsentLoading(true);
    setCookieConsentMsg(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ cookieConsentEnabled: newVal ? "true" : "false" }),
      });
      const data = await res.json();
      if (data.success) {
        setCookieConsentMsg({ type: "success", text: newVal ? "Cookie 弹窗已开启" : "Cookie 弹窗已关闭" });
      } else {
        setCookieConsentEnabled(!newVal); // 回滚
        setCookieConsentMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setCookieConsentEnabled(!newVal);
      setCookieConsentMsg({ type: "error", text: "网络错误" });
    } finally {
      setCookieConsentLoading(false);
    }
  };

  // 保存学校信息
  const handleSchoolInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolInfoLoading(true);
    setSchoolInfoMsg(null);
    try {
      const res = await fetch(`${API_BASE}/school-info`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          school_type: schoolType,
          description,
          address,
          phone,
          website,
          teaching_buildings: teachingBuildings,
          library,
          campus,
          features,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSchoolInfoMsg({ type: "success", text: "学校信息保存成功" });
      } else {
        setSchoolInfoMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setSchoolInfoMsg({ type: "error", text: "网络错误" });
    } finally {
      setSchoolInfoLoading(false);
    }
  };

  // 保存首页文案
  const handleHomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHomeLoading(true);
    setHomeMsg(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          homeBadgeText,
          homeTitle,
          homeSubtitle,
          homeStatLabels,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalHomeConfig({
          badgeText: homeBadgeText,
          title: homeTitle,
          subtitle: homeSubtitle,
          statLabels: homeStatLabels,
        });
        setHomeMsg({ type: "success", text: "首页文案保存成功" });
      } else {
        setHomeMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setHomeMsg({ type: "error", text: "网络错误" });
    } finally {
      setHomeLoading(false);
    }
  };

  // 添加友情链接
  const handleAddFooterLink = () => {
    setFooterLinks([...footerLinks, { name: "", url: "" }]);
  };

  // 修改友情链接
  const handleFooterLinkChange = (
    idx: number,
    field: keyof FooterLink,
    value: string
  ) => {
    setFooterLinks(
      footerLinks.map((link, i) => (i === idx ? { ...link, [field]: value } : link))
    );
  };

  // 删除友情链接
  const handleRemoveFooterLink = (idx: number) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== idx));
  };

  // 保存尾栏配置
  const handleFooterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFooterLoading(true);
    setFooterMsg(null);
    // 过滤掉空链接
    const cleanLinks = footerLinks.filter(
      (l) => l.name.trim() && l.url.trim()
    );
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          footerText,
          footerIcp,
          footerPublicSecurity,
          footerLinks: cleanLinks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalFooterConfig({
          text: footerText,
          icp: footerIcp,
          publicSecurity: footerPublicSecurity,
          links: cleanLinks,
        });
        setFooterLinks(cleanLinks);
        setFooterMsg({ type: "success", text: "尾栏配置保存成功" });
      } else {
        setFooterMsg({ type: "error", text: data.message || "保存失败" });
      }
    } catch {
      setFooterMsg({ type: "error", text: "网络错误" });
    } finally {
      setFooterLoading(false);
    }
  };

  return (
    <AdminLayout>
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-white dark:text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">系统设置</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">管理管理员账号和系统配置</p>
        </div>
      </div>

      {/* 管理员头像 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          管理员头像
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt="头像"
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-600"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-black border-2 border-zinc-200 dark:border-zinc-600 flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-400 dark:text-zinc-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm font-medium text-black dark:text-white hover:border-black dark:hover:border-white transition-colors disabled:opacity-50"
            >
              {avatarLoading ? "上传中..." : "选择图片"}
            </button>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-400">
              支持 JPG、PNG 格式，文件大小不超过 2MB
            </p>
            {avatarMsg && (
              <p className={`mt-2 text-xs ${avatarMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
                {avatarMsg.text}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 修改密码 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          修改密码
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">当前账号</label>
            <input
              type="text"
              value={username || ""}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-black text-sm text-zinc-500 dark:text-zinc-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">旧密码</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入旧密码"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">新密码</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少6位"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">确认新密码</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {passwordMsg && (
            <p className={`text-xs ${passwordMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {passwordMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {passwordLoading ? "保存中..." : "保存密码"}
          </button>
        </form>
      </section>

      {/* 学校名字 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          学校名字
        </h2>
        <form onSubmit={handleSchoolSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">学校名称</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="请输入学校名称（如：XX大学）"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              将显示在前台首页和管理后台标题中
            </p>
          </div>
          {schoolMsg && (
            <p className={`text-xs ${schoolMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {schoolMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={schoolLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {schoolLoading ? "保存中..." : "保存设置"}
          </button>
        </form>
      </section>

      {/* 站点信息 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          站点信息
        </h2>
        <form onSubmit={handleSiteSubmit} className="space-y-4">
          {/* 站点标题 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">站点标题</label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="留空则使用学校名字作为标题"
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              显示在浏览器标签页标题中（优先级高于学校名字）
            </p>
          </div>

          {/* 站点图标 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">站点图标 (Favicon)</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-zinc-200 dark:border-zinc-600 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-black">
                {siteFavicon ? (
                  <img
                    src={siteFavicon}
                    alt="站点图标"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-400" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-xs font-medium text-black dark:text-white hover:border-black dark:hover:border-white transition-colors"
                  >
                    选择图片
                  </button>
                  {siteFavicon && (
                    <button
                      type="button"
                      onClick={handleClearFavicon}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-xs font-medium text-zinc-500 dark:text-zinc-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
                  支持 JPG、PNG、SVG、ICO 格式，建议 32x32 或 64x64，不超过 1MB
                </p>
              </div>
            </div>
          </div>

          {siteMsg && (
            <p className={`text-xs ${siteMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {siteMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={siteLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {siteLoading ? "保存中..." : "保存站点信息"}
          </button>
        </form>
      </section>

      {/* 首页文案 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          首页文案
        </h2>
        <form onSubmit={handleHomeSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              徽章文案
            </label>
            <input
              type="text"
              value={homeBadgeText}
              onChange={(e) => setHomeBadgeText(e.target.value)}
              placeholder="留空则使用默认：数字化考试信息管理平台"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              首页标题上方的圆角小徽章文字，简短一句话
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              主标题
            </label>
            <textarea
              value={homeTitle}
              onChange={(e) => setHomeTitle(e.target.value)}
              placeholder="留空则使用默认：让考试信息 / 一目了然"
              rows={2}
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              支持换行（每行一句），按行显示在首页主标题位置
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              副标题
            </label>
            <textarea
              value={homeSubtitle}
              onChange={(e) => setHomeSubtitle(e.target.value)}
              placeholder="留空则使用默认副标题（含学校名称）"
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              首页主标题下方的描述文案，留空时自动拼接学校名称
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              统计卡片标签
            </label>
            <input
              type="text"
              value={homeStatLabels}
              onChange={(e) => setHomeStatLabels(e.target.value)}
              placeholder="如：考试总数,即将开始,进行中（用逗号分隔，留空使用默认）"
              maxLength={60}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              首页底部 3 个统计卡片下方的标签文字，按英文/中文逗号分隔
            </p>
          </div>
          {homeMsg && (
            <p className={`text-xs ${homeMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {homeMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={homeLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {homeLoading ? "保存中..." : "保存首页文案"}
          </button>
        </form>
      </section>

      {/* Cookie 弹窗设置 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Cookie className="w-4 h-4" />
          Cookie 弹窗设置
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-black dark:text-white">全站 Cookie 同意弹窗</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1">
              在页面底部显示 Cookie 偏好同意横幅，允许访问者自定义接受或拒绝非必需 Cookie。
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCookieConsentToggle}
              disabled={cookieConsentLoading}
              aria-pressed={cookieConsentEnabled}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors shrink-0",
                cookieConsentEnabled
                  ? "bg-black dark:bg-white"
                  : "bg-zinc-200 dark:bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-black shadow-sm transition-transform",
                  cookieConsentEnabled ? "left-[20px]" : "left-[2px]"
                )}
              />
            </button>
            <span className="text-sm font-medium text-black dark:text-white">
              {cookieConsentEnabled ? "已开启" : "已关闭"}
            </span>
            {cookieConsentLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500 dark:text-zinc-400" />
            )}
          </div>
        </div>
        {cookieConsentMsg && (
          <p className={`text-xs mt-3 ${cookieConsentMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
            {cookieConsentMsg.text}
          </p>
        )}
      </section>

      {/* 学校信息 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Building className="w-4 h-4" />
          学校信息
        </h2>
        <form onSubmit={handleSchoolInfoSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">学校类型</label>
              <input
                type="text"
                value={schoolType}
                onChange={(e) => setSchoolType(e.target.value)}
                placeholder="如：综合性大学、理工类..."
                maxLength={50}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">联系电话</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="学校联系电话"
                maxLength={30}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">学校地址</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="学校地址"
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">学校官网</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.example.edu.cn"
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">学校简介</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="学校简介..."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">教学楼信息</label>
            <textarea
              value={teachingBuildings}
              onChange={(e) => setTeachingBuildings(e.target.value)}
              placeholder="如：主教学楼、理科楼、文科楼等..."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">图书馆信息</label>
              <textarea
                value={library}
                onChange={(e) => setLibrary(e.target.value)}
                placeholder="图书馆相关信息..."
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">校园信息</label>
              <textarea
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="校园环境、设施等..."
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">校园特色</label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="如：社团活动、校园文化..."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none resize-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-400">
            所有字段均可留空，留空的内容不会在前台展示
          </p>
          {schoolInfoMsg && (
            <p className={`text-xs ${schoolInfoMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {schoolInfoMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={schoolInfoLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {schoolInfoLoading ? "保存中..." : "保存学校信息"}
          </button>
        </form>
      </section>

      {/* 尾栏配置 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          尾栏配置
        </h2>
        <form onSubmit={handleFooterSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              尾栏文字
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="如：让考试信息展示更高效"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
              显示在尾栏版权信息后面，作为站点口号/描述
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                ICP 备案号
              </label>
              <input
                type="text"
                value={footerIcp}
                onChange={(e) => setFooterIcp(e.target.value)}
                placeholder="如：京ICP备XXXXXXX号-X"
                maxLength={50}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
                工信部备案号，会自动链接到 beian.miit.gov.cn
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                公安备案号
              </label>
              <input
                type="text"
                value={footerPublicSecurity}
                onChange={(e) => setFooterPublicSecurity(e.target.value)}
                placeholder="如：京公网安备 XXXXXXXXXXXXX号"
                maxLength={50}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-400">
                公安备案号，纯文本展示
              </p>
            </div>
          </div>

          {/* 友情链接管理 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                友情链接
              </label>
              <button
                type="button"
                onClick={handleAddFooterLink}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-600 text-xs font-medium text-black dark:text-white hover:border-black dark:hover:border-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加链接
              </button>
            </div>
            <div className="space-y-2">
              {footerLinks.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-3 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                  暂无友情链接，点击「添加链接」开始添加
                </p>
              ) : (
                footerLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 animate-slide-down"
                  >
                    <input
                      type="text"
                      value={link.name}
                      onChange={(e) => handleFooterLinkChange(idx, "name", e.target.value)}
                      placeholder="链接名称"
                      maxLength={50}
                      className="flex-shrink-0 w-32 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => handleFooterLinkChange(idx, "url", e.target.value)}
                      placeholder="https://example.com"
                      maxLength={200}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-sm focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-black text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFooterLink(idx)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                      aria-label="删除链接"
                      title="删除链接"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-400">
              友情链接会在尾栏顶部以横向列表形式展示
            </p>
          </div>

          {footerMsg && (
            <p className={`text-xs ${footerMsg.type === "success" ? "text-zinc-900 dark:text-zinc-100" : "text-red-500 dark:text-red-400"}`}>
              {footerMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={footerLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {footerLoading ? "保存中..." : "保存尾栏配置"}
          </button>
        </form>
      </section>

      {/* AI 助手配置 */}
      <AiConfigPanel />
    </div>
    </AdminLayout>
  );
}

﻿﻿﻿﻿/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSchoolStore } from "@/store/schoolStore";
import AdminLayout from "@/components/Layout/AdminLayout";
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
} from "@/components/MathIcon";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const getToken = () => sessionStorage.getItem("examhub-token") || "";

export default function Settings() {
  const username = useAuthStore((state) => state.username);
  const setGlobalSchoolName = useSchoolStore((state) => state.setSchoolName);
  const setGlobalSiteTitle = useSchoolStore((state) => state.setSiteTitle);
  const setGlobalSiteFavicon = useSchoolStore((state) => state.setSiteFavicon);

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
              <p className={`mt-2 text-xs ${avatarMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
            <p className={`text-xs ${passwordMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
            <p className={`text-xs ${schoolMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
            <p className={`text-xs ${siteMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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

      {/* Cookie 弹窗设置 */}
      <section className="bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-600 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
          <Cookie className="w-4 h-4" />
          Cookie 弹窗设置
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">全站 Cookie 同意弹窗</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1">
              在页面底部显示 Cookie 偏好同意横幅，允许访问者自定义接受或拒绝非必需 Cookie。
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCookieConsentToggle}
              disabled={cookieConsentLoading}
              className={cn(
                "relative w-10 h-6 rounded-full transition-colors",
                cookieConsentEnabled
                  ? "bg-black dark:bg-white"
                  : "bg-zinc-200 dark:bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-black shadow-sm transition-transform",
                  cookieConsentEnabled ? "left-[18px]" : "left-[2px]"
                )}
              />
            </button>
            <span className="text-sm font-medium text-black dark:text-white ml-3">
              {cookieConsentEnabled ? "已开启" : "已关闭"}
            </span>
            {cookieConsentLoading && (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            )}
          </div>
        </div>
        {cookieConsentMsg && (
          <p className={`text-xs mt-2 ${cookieConsentMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
            <p className={`text-xs ${schoolInfoMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
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
    </div>
    </AdminLayout>
  );
}

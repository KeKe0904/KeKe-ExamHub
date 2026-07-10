/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Shield,
} from "@/components/MathIcon";
import { classroomAuthApi, buildingApi } from "@/utils/api";
import type { Building as BuildingType } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function ClassroomRegister() {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [formData, setFormData] = useState({
    registrationCode: "",
    buildingId: "",
    roomNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [buildingsLoading, setBuildingsLoading] = useState(true);

  useEffect(() => {
    buildingApi
      .getAll()
      .then((res) => {
        setBuildings(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, buildingId: res.data[0].id }));
        }
      })
      .catch(() => {
        setError("无法加载教学楼列表,请检查网络");
      })
      .finally(() => setBuildingsLoading(false));
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (!formData.registrationCode.trim()) {
      setError("请输入注册码");
      return false;
    }
    if (!formData.buildingId) {
      setError("请选择教学楼");
      return false;
    }
    if (!formData.roomNumber.trim()) {
      setError("请输入教室号");
      return false;
    }
    if (formData.password.length < 6) {
      setError("密码至少 6 位");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await classroomAuthApi.register({
        registrationCode: formData.registrationCode.trim(),
        buildingId: formData.buildingId,
        roomNumber: formData.roomNumber.trim(),
        password: formData.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "注册失败,请重试"
      );
    } finally {
      setLoading(false);
    }
  };

  // 注册成功页面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="relative w-full max-w-md">
          <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg p-8 text-center animate-scale-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-black dark:bg-white mb-4">
              <CheckCircle2 className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-2">
              注册成功
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-6">
              您的教室端账号已创建,请等待管理员审核通过后即可登录使用。
            </p>
            <button
              onClick={() => navigate("/classroom/login")}
              className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-zinc-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-zinc-700/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/classroom/login"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回登录
        </Link>

        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-black dark:bg-white mb-4">
              <Building className="w-8 h-8 text-white dark:text-black" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-black dark:text-white mb-1">
              教室端注册
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">
              注册后需管理员审核通过方可使用
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                注册码
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={formData.registrationCode}
                  onChange={(e) =>
                    handleInputChange("registrationCode", e.target.value)
                  }
                  placeholder="例如:ABCD-EFGH"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50 uppercase tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                教学楼
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select
                  value={formData.buildingId}
                  onChange={(e) =>
                    handleInputChange("buildingId", e.target.value)
                  }
                  disabled={loading || buildingsLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                >
                  {buildingsLoading && <option>加载中...</option>}
                  {!buildingsLoading && buildings.length === 0 && (
                    <option value="">暂无教学楼</option>
                  )}
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                教室号
              </label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) =>
                  handleInputChange("roomNumber", e.target.value)
                }
                placeholder="例如:301"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="至少 6 位"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label="显示/隐藏密码"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="再次输入密码"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-500 dark:text-red-400 animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  注册中...
                </>
              ) : (
                "注册"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

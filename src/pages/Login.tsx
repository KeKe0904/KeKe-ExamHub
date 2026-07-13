/**
 * KeKe ExamHub - 考试信息管理系统
 * 统一登录入口：管理员 / 教师 / 学生 / 教室端 在同一页面切换
 * 仅教室端提供注册功能，其他端账号由后台配置
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Hourglass,
  Building,
  Shield,
  CheckCircle2,
  BookOpen,
  Monitor,
} from "@/components/MathIcon";
import { useAuthStore } from "@/store/authStore";
import { useTeacherStore } from "@/store/teacherStore";
import { useStudentStore } from "@/store/studentStore";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { useSchoolName } from "@/hooks/useSchoolName";
import { classroomAuthApi, buildingApi } from "@/utils/api";
import { getCookie, setCookie, deleteCookie, COOKIE_KEYS } from "@/utils/cookie";
import type { Building as BuildingType } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type Role = "admin" | "teacher" | "student" | "classroom";
type Mode = "login" | "register";

const ROLE_TABS: {
  key: Role;
  label: string;
  icon: typeof User;
  desc: string;
}[] = [
  { key: "admin", label: "管理员", icon: Shield, desc: "登录后管理考试信息" },
  { key: "teacher", label: "教师", icon: BookOpen, desc: "教学管理系统" },
  { key: "student", label: "学生", icon: User, desc: "考试信息查询" },
  { key: "classroom", label: "教室端", icon: Monitor, desc: "查看本教室的考试信息" },
];

const VALID_ROLES: Role[] = ["admin", "teacher", "student", "classroom"];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolName = useSchoolName();
  const displayName = schoolName || "KeKe ExamHub";

  // 从 URL 读取 role / mode，默认 admin / login
  const initialRole = (() => {
    const r = searchParams.get("role") as Role | null;
    return r && VALID_ROLES.includes(r) ? r : "admin";
  })();
  const initialMode: Mode =
    initialRole === "classroom" && searchParams.get("mode") === "register"
      ? "register"
      : "login";

  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>(initialMode);

  // 切换 role 时同步 URL（不触发历史栈堆积）
  const switchRole = (next: Role) => {
    setRole(next);
    setMode("login");
    setSearchParams(
      next === "classroom" ? { role: next, mode: "login" } : { role: next },
      { replace: true }
    );
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSearchParams(
      role === "classroom" ? { role, mode: next } : { role },
      { replace: true }
    );
  };

  const currentTab = useMemo(
    () => ROLE_TABS.find((t) => t.key === role)!,
    [role]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6 sm:p-8 animate-scale-in transition-colors">
          {/* 头部 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-zinc-900 dark:bg-white mb-4 transition-colors">
              <GraduationCap className="w-8 h-8 text-white dark:text-zinc-900" />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-1">
              {mode === "register" ? "教室端注册" : `${currentTab.label}登录`}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mode === "register"
                ? "注册后需管理员审核通过方可使用"
                : `${displayName} · ${currentTab.desc}`}
            </p>
          </div>

          {/* 端切换 Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-6">
            {ROLE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.key === role;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchRole(tab.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs font-medium transition-all",
                    active
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  )}
                  aria-pressed={active}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 表单区域 */}
          {mode === "register" && role === "classroom" ? (
            <ClassroomRegisterForm
              onSuccess={() => switchMode("login")}
              onSwitchLogin={() => switchMode("login")}
            />
          ) : (
            <>
              {role === "admin" && <AdminLoginForm navigate={navigate} />}
              {role === "teacher" && <TeacherLoginForm navigate={navigate} />}
              {role === "student" && <StudentLoginForm navigate={navigate} />}
              {role === "classroom" && (
                <ClassroomLoginForm
                  navigate={navigate}
                  onSwitchRegister={() => switchMode("register")}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ 管理员登录表单 ============================ */
function AdminLoginForm({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { login, loading } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    const savedUsername = getCookie(COOKIE_KEYS.USERNAME);
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.setupMode === true) setSetupMode(true);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("请输入账号和密码");
      return;
    }
    if (rememberMe) {
      setCookie(COOKIE_KEYS.USERNAME, username, { days: 30, sameSite: "lax" });
    } else {
      deleteCookie(COOKIE_KEYS.USERNAME);
    }
    const success = await login(username, password, rememberMe);
    if (success) {
      navigate("/admin");
    } else {
      setError(useAuthStore.getState().error || "账号或密码错误");
    }
  };

  return (
    <>
      {setupMode && (
        <div className="mb-4 p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">系统尚未完成安装</p>
              <p className="mb-3">后端处于"仅安装模式"，登录功能暂不可用。请先完成安装向导。</p>
              <a
                href="/setup"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
              >
                前往安装向导
              </a>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="账号"
          icon={<User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />}
          value={username}
          onChange={setUsername}
          placeholder="请输入管理员账号"
          disabled={loading}
        />
        <FieldPassword
          label="密码"
          value={password}
          onChange={setPassword}
          placeholder="请输入密码"
          show={showPassword}
          toggle={() => setShowPassword(!showPassword)}
          disabled={loading}
        />
        <RememberMe
          checked={rememberMe}
          onChange={setRememberMe}
          label="7 天内自动登录"
          hint="关闭浏览器后需重新登录"
        />
        {error && <ErrorBox text={error} />}
        <SubmitButton loading={loading} text="登录" />
      </form>
    </>
  );
}

/* ============================ 教师登录表单 ============================ */
function TeacherLoginForm({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { login, loading, error, clearError } = useTeacherStore();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();
    if (!account || !password) {
      setLocalError("请填写账号和密码");
      return;
    }
    const success = await login(account, password);
    if (success) navigate("/teacher");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldInput
        label="工号/手机号"
        icon={<User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />}
        value={account}
        onChange={setAccount}
        placeholder="请输入工号或手机号"
        disabled={loading}
      />
      <FieldPassword
        label="密码"
        value={password}
        onChange={setPassword}
        placeholder="请输入密码"
        show={showPassword}
        toggle={() => setShowPassword(!showPassword)}
        disabled={loading}
      />
      {(localError || error) && <ErrorBox text={localError || error || ""} />}
      <SubmitButton loading={loading} text="登录" />
    </form>
  );
}

/* ============================ 学生登录表单 ============================ */
function StudentLoginForm({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { login, loading, error, clearError } = useStudentStore();
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const saved = getCookie(COOKIE_KEYS.STUDENT_NO);
    if (saved) {
      setStudentNo(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();
    if (!studentNo || !password) {
      setLocalError("请填写学号和密码");
      return;
    }
    if (rememberMe) {
      setCookie(COOKIE_KEYS.STUDENT_NO, studentNo, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
    } else {
      deleteCookie(COOKIE_KEYS.STUDENT_NO);
    }
    const success = await login(studentNo, password, rememberMe);
    if (success) navigate("/student");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldInput
        label="学号"
        icon={<User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />}
        value={studentNo}
        onChange={setStudentNo}
        placeholder="请输入学号"
        disabled={loading}
      />
      <FieldPassword
        label="密码"
        value={password}
        onChange={setPassword}
        placeholder="请输入密码"
        show={showPassword}
        toggle={() => setShowPassword(!showPassword)}
        disabled={loading}
      />
      <RememberMe
        checked={rememberMe}
        onChange={setRememberMe}
        label="记住学号"
      />
      {(localError || error) && <ErrorBox text={localError || error || ""} />}
      <SubmitButton loading={loading} text="登录" />
    </form>
  );
}

/* ============================ 教室端登录表单 ============================ */
function ClassroomLoginForm({
  navigate,
  onSwitchRegister,
}: {
  navigate: ReturnType<typeof useNavigate>;
  onSwitchRegister: () => void;
}) {
  const { login, loading, status, rejectReason, pendingReviewMessage, pendingReviewIp, clearError } =
    useClassroomAuthStore();
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [buildingsLoading, setBuildingsLoading] = useState(true);

  useEffect(() => {
    buildingApi
      .getAll()
      .then((res) => {
        setBuildings(res.data);
        const savedRoomNumber = getCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER);
        const savedBuildingId = getCookie("examhub-classroom-building-id");
        if (savedRoomNumber) {
          setRoomNumber(savedRoomNumber);
          setRememberMe(true);
        }
        if (savedBuildingId && res.data.find((b) => b.id === savedBuildingId)) {
          setBuildingId(savedBuildingId);
        } else if (res.data.length > 0) {
          setBuildingId(res.data[0].id);
        }
      })
      .catch(() => setError("无法加载教学楼列表,请检查网络"))
      .finally(() => setBuildingsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError();
    if (!buildingId || !roomNumber || !password) {
      setError("请填写所有必填字段");
      return;
    }
    if (rememberMe) {
      setCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER, roomNumber, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
      setCookie("examhub-classroom-building-id", buildingId, {
        days: 30,
        sameSite: "lax",
        secure: true,
      });
    } else {
      deleteCookie(COOKIE_KEYS.CLASSROOM_ROOM_NUMBER);
      deleteCookie("examhub-classroom-building-id");
    }
    const result = await login(buildingId, roomNumber, password);
    if (result.status === "approved") {
      navigate("/classroom");
    } else if (result.status !== "pending" && result.status !== "rejected" && result.status !== "pending_review") {
      setError("登录失败,请重试");
    }
  };

  return (
    <>
      {status === "pending" && (
        <StatusBox
          tone="yellow"
          icon={<Hourglass className="w-5 h-5" />}
          title="账号正在审核中"
          desc="请等待管理员通过您的注册申请后再次登录"
        />
      )}
      {status === "rejected" && (
        <StatusBox
          tone="red"
          icon={<AlertCircle className="w-5 h-5" />}
          title="注册申请已被驳回"
          desc={rejectReason || "请联系管理员了解详情"}
        />
      )}
      {status === "pending_review" && (
        <StatusBox
          tone="orange"
          icon={<AlertTriangle className="w-5 h-5" />}
          title="登录待审核"
          desc={
            pendingReviewMessage || "检测到非常用登录地址，请联系管理员批准后再试"
          }
          extra={
            pendingReviewIp ? (
              <p className="text-xs text-orange-500 dark:text-orange-500 mt-1 font-mono">
                当前 IP: {pendingReviewIp}
              </p>
            ) : null
          }
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            教学楼
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              disabled={loading || buildingsLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all disabled:opacity-50"
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

        <FieldInput
          label="教室号"
          value={roomNumber}
          onChange={setRoomNumber}
          placeholder="例如:301"
          disabled={loading}
        />

        <FieldPassword
          label="密码"
          value={password}
          onChange={setPassword}
          placeholder="请输入密码"
          show={showPassword}
          toggle={() => setShowPassword(!showPassword)}
          disabled={loading}
        />

        <RememberMe
          checked={rememberMe}
          onChange={setRememberMe}
          label="记住教室号"
        />
        {error && <ErrorBox text={error} />}
        <SubmitButton loading={loading} text="登录" />
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        还没有账号?
        <button
          type="button"
          onClick={onSwitchRegister}
          className="ml-1 text-zinc-900 dark:text-white font-medium hover:underline"
        >
          注册教室端
        </button>
      </div>
    </>
  );
}

/* ============================ 教室端注册表单 ============================ */
function ClassroomRegisterForm({
  onSuccess,
  onSwitchLogin,
}: {
  onSuccess: () => void;
  onSwitchLogin: () => void;
}) {
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
      .catch(() => setError("无法加载教学楼列表,请检查网络"))
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
      setError(err instanceof Error ? err.message : "注册失败,请重试");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4 animate-scale-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-zinc-900 dark:bg-white mb-4">
          <CheckCircle2 className="w-8 h-8 text-white dark:text-zinc-900" />
        </div>
        <h2 className="font-serif text-xl font-bold text-zinc-900 dark:text-white mb-2">
          注册成功
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          您的教室端账号已创建,请等待管理员审核通过后即可登录使用。
        </p>
        <button
          onClick={onSuccess}
          className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          前往登录
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput
          label="注册码"
          icon={<Shield className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />}
          value={formData.registrationCode}
          onChange={(v) => handleInputChange("registrationCode", v)}
          placeholder="例如:ABCD-EFGH"
          disabled={loading}
          uppercase
        />

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            教学楼
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <select
              value={formData.buildingId}
              onChange={(e) => handleInputChange("buildingId", e.target.value)}
              disabled={loading || buildingsLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all disabled:opacity-50"
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

        <FieldInput
          label="教室号"
          value={formData.roomNumber}
          onChange={(v) => handleInputChange("roomNumber", v)}
          placeholder="例如:301"
          disabled={loading}
        />

        <FieldPassword
          label="密码"
          value={formData.password}
          onChange={(v) => handleInputChange("password", v)}
          placeholder="至少 6 位"
          show={showPassword}
          toggle={() => setShowPassword(!showPassword)}
          disabled={loading}
        />

        <FieldPassword
          label="确认密码"
          value={formData.confirmPassword}
          onChange={(v) => handleInputChange("confirmPassword", v)}
          placeholder="再次输入密码"
          show={showPassword}
          toggle={() => setShowPassword(!showPassword)}
          disabled={loading}
        />

        {error && <ErrorBox text={error} />}
        <SubmitButton loading={loading} text="注册" />
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        已有账号?
        <button
          type="button"
          onClick={onSwitchLogin}
          className="ml-1 text-zinc-900 dark:text-white font-medium hover:underline"
        >
          返回登录
        </button>
      </div>
    </>
  );
}

/* ============================ 通用表单组件 ============================ */
function FieldInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  disabled,
  uppercase = false,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  uppercase?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">{icon}</span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all disabled:opacity-50",
            icon ? "pl-11 pr-4" : "px-4",
            uppercase && "uppercase tracking-wider"
          )}
        />
      </div>
    </div>
  );
}

function FieldPassword({
  label,
  value,
  onChange,
  placeholder,
  show,
  toggle,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  toggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-11 pr-11 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          aria-label="显示/隐藏密码"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function RememberMe({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              "w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center",
              checked
                ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white"
                : "border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
            )}
          >
            {checked && (
              <svg
                className="w-3 h-3 text-white dark:text-zinc-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
          {label}
        </span>
      </label>
      {hint && !checked && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</span>
      )}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-600 dark:text-red-400 animate-slide-down">
      {text}
    </div>
  );
}

function SubmitButton({ loading, text }: { loading: boolean; text: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {text}中...
        </>
      ) : (
        text
      )}
    </button>
  );
}

function StatusBox({
  tone,
  icon,
  title,
  desc,
  extra,
}: {
  tone: "yellow" | "red" | "orange";
  icon: React.ReactNode;
  title: string;
  desc: string;
  extra?: React.ReactNode;
}) {
  const toneMap = {
    yellow: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
    red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    orange: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
  } as const;
  return (
    <div
      className={cn(
        "mb-4 px-4 py-3 border rounded-lg flex items-start gap-2 animate-slide-down",
        toneMap[tone]
      )}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs mt-0.5 opacity-90">{desc}</p>
        {extra}
      </div>
    </div>
  );
}

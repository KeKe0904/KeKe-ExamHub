/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";
import { getClassroomToken, removeClassroomToken } from "@/utils/api";
import { Loader2 } from "@/components/MathIcon";

interface ClassroomProtectedRouteProps {
  children: React.ReactNode;
}

export default function ClassroomProtectedRoute({
  children,
}: ClassroomProtectedRouteProps) {
  const isAuthenticated = useClassroomAuthStore(
    (state) => state.isAuthenticated
  );
  const logout = useClassroomAuthStore((state) => state.logout);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getClassroomToken();
    if (!token) {
      setChecking(false);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // token 已过期
        removeClassroomToken();
        logout();
      }
      setChecking(false);
    } catch {
      setChecking(false);
    }
  }, [logout]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/classroom/login" replace />;
  }

  return <>{children}</>;
}

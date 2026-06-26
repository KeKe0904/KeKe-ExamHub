/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { Navigate } from "react-router-dom";
import { useClassroomAuthStore } from "@/store/classroomAuthStore";

interface ClassroomProtectedRouteProps {
  children: React.ReactNode;
}

export default function ClassroomProtectedRoute({
  children,
}: ClassroomProtectedRouteProps) {
  const isAuthenticated = useClassroomAuthStore(
    (state) => state.isAuthenticated
  );

  if (!isAuthenticated) {
    return <Navigate to="/classroom/login" replace />;
  }

  return <>{children}</>;
}

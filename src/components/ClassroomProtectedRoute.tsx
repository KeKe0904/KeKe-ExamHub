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

/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * 本项目使用 Trae IDE 开发
 * @license MIT
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// 公共端页面
import Home from "@/pages/Home";
import ExamDetail from "@/pages/ExamDetail";
import Monitor from "@/pages/Monitor";
import SchoolInfo from "@/pages/SchoolInfo";
import Setup from "@/pages/Setup";
// 统一登录入口（管理员 / 教师 / 学生 / 教室端 同一页面切换）
import Login from "@/pages/Login";
// 学生端页面
import StudentHome from "@/pages/student/Home";
// 教师端页面
import TeacherHome from "@/pages/teacher/Home";
import TeacherStudents from "@/pages/teacher/Students";
import TeacherExams from "@/pages/teacher/Exams";
// 教室端页面
import ClassroomHome from "@/pages/classroom/Home";
import ClassroomInvigilation from "@/pages/classroom/Invigilation";
// 管理后台页面
import Dashboard from "@/pages/admin/Dashboard";
import DataDashboard from "@/pages/admin/DataDashboard";
import ExamList from "@/pages/admin/ExamList";
import ExamForm from "@/pages/admin/ExamForm";
import Settings from "@/pages/admin/Settings";
import AnnouncementList from "@/pages/admin/AnnouncementList";
import AnnouncementForm from "@/pages/admin/AnnouncementForm";
import ServerMonitor from "@/pages/admin/ServerMonitor";
import Environment from "@/pages/admin/Environment";
import Buildings from "@/pages/admin/Buildings";
import RegistrationCodes from "@/pages/admin/RegistrationCodes";
import Classrooms from "@/pages/admin/Classrooms";
import AuditLogs from "@/pages/admin/AuditLogs";
import Domains from "@/pages/admin/Domains";
import IpBlacklist from "@/pages/admin/IpBlacklist";
import AbnormalLogin from "@/pages/admin/AbnormalLogin";
import Teachers from "@/pages/admin/Teachers";
import Classes from "@/pages/admin/Classes";
import Students from "@/pages/admin/Students";
import AiChat from "@/pages/admin/AiChat";
// 路由守卫
import ProtectedRoute from "@/components/ProtectedRoute";
import ClassroomProtectedRoute from "@/components/ClassroomProtectedRoute";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import TeacherProtectedRoute from "@/components/TeacherProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* ============ 安装向导 ============ */}
        <Route path="/setup" element={<Setup />} />

        {/* ============ 公共端（无需登录） ============ */}
        <Route path="/" element={<Home />} />
        <Route path="/exam/:id" element={<ExamDetail />} />
        <Route path="/exam/:id/monitor" element={<Monitor />} />
        <Route path="/school-info" element={<SchoolInfo />} />

        {/* ============ 统一登录入口 ============ */}
        {/* 所有端共用一个登录页面，通过 ?role=admin|teacher|student|classroom 切换 */}
        <Route path="/login" element={<Login />} />

        {/* 旧的分散入口重定向到统一入口（保持外部链接兼容） */}
        <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />
        <Route path="/teacher/login" element={<Navigate to="/login?role=teacher" replace />} />
        <Route path="/student/login" element={<Navigate to="/login?role=student" replace />} />
        <Route path="/classroom/login" element={<Navigate to="/login?role=classroom" replace />} />
        <Route path="/classroom/register" element={<Navigate to="/login?role=classroom&mode=register" replace />} />

        {/* ============ 学生端 ============ */}
        <Route
          path="/student"
          element={
            <StudentProtectedRoute>
              <StudentHome />
            </StudentProtectedRoute>
          }
        />

        {/* ============ 教师端 ============ */}
        <Route
          path="/teacher"
          element={
            <TeacherProtectedRoute>
              <TeacherHome />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <TeacherProtectedRoute>
              <TeacherStudents />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/exams"
          element={
            <TeacherProtectedRoute>
              <TeacherExams />
            </TeacherProtectedRoute>
          }
        />

        {/* ============ 教室端 ============ */}
        <Route
          path="/classroom"
          element={
            <ClassroomProtectedRoute>
              <ClassroomHome />
            </ClassroomProtectedRoute>
          }
        />
        <Route
          path="/classroom/invigilation"
          element={
            <ClassroomProtectedRoute>
              <ClassroomInvigilation />
            </ClassroomProtectedRoute>
          }
        />

        {/* ============ 管理后台 ============ */}
        {/* 概览 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/data-dashboard"
          element={
            <ProtectedRoute>
              <DataDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-chat"
          element={
            <ProtectedRoute>
              <AiChat />
            </ProtectedRoute>
          }
        />

        {/* 考试与教学 */}
        <Route
          path="/admin/exams"
          element={
            <ProtectedRoute>
              <ExamList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/new"
          element={
            <ProtectedRoute>
              <ExamForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:id/edit"
          element={
            <ProtectedRoute>
              <ExamForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements/new"
          element={
            <ProtectedRoute>
              <AnnouncementForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements/:id/edit"
          element={
            <ProtectedRoute>
              <AnnouncementForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute>
              <Classes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute>
              <Teachers />
            </ProtectedRoute>
          }
        />

        {/* 教室端管理 */}
        <Route
          path="/admin/buildings"
          element={
            <ProtectedRoute>
              <Buildings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classrooms"
          element={
            <ProtectedRoute>
              <Classrooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/registration-codes"
          element={
            <ProtectedRoute>
              <RegistrationCodes />
            </ProtectedRoute>
          }
        />

        {/* 安全中心 */}
        <Route
          path="/admin/abnormal-login"
          element={
            <ProtectedRoute>
              <AbnormalLogin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ip-blacklist"
          element={
            <ProtectedRoute>
              <IpBlacklist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/domains"
          element={
            <ProtectedRoute>
              <Domains />
            </ProtectedRoute>
          }
        />

        {/* 系统设置 */}
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute>
              <ServerMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/environment"
          element={
            <ProtectedRoute>
              <Environment />
            </ProtectedRoute>
          }
        />

        {/* ============ 404 兜底 ============ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

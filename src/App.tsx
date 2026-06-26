/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ExamDetail from "@/pages/ExamDetail";
import Monitor from "@/pages/Monitor";
import SchoolInfo from "@/pages/SchoolInfo";
import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
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
import ClassroomLogin from "@/pages/classroom/Login";
import ClassroomRegister from "@/pages/classroom/Register";
import ClassroomHome from "@/pages/classroom/Home";
import ClassroomInvigilation from "@/pages/classroom/Invigilation";
import Setup from "@/pages/Setup";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClassroomProtectedRoute from "@/components/ClassroomProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 安装向导路由 */}
        <Route path="/setup" element={<Setup />} />

        {/* 用户端路由 */}
        <Route path="/" element={<Home />} />
        <Route path="/exam/:id" element={<ExamDetail />} />
        <Route path="/exam/:id/monitor" element={<Monitor />} />
        <Route path="/school-info" element={<SchoolInfo />} />

        {/* 教室端登录/注册(公开) */}
        <Route path="/classroom/login" element={<ClassroomLogin />} />
        <Route path="/classroom/register" element={<ClassroomRegister />} />

        {/* 管理员登录路由 */}
        <Route path="/admin/login" element={<Login />} />

        {/* 受保护的管理后台路由 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
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
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* 公告管理路由 */}
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
        {/* 服务器监控路由 */}
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute>
              <ServerMonitor />
            </ProtectedRoute>
          }
        />
        {/* 服务器环境路由 */}
        <Route
          path="/admin/environment"
          element={
            <ProtectedRoute>
              <Environment />
            </ProtectedRoute>
          }
        />
        {/* 教室端管理路由 */}
        <Route
          path="/admin/buildings"
          element={
            <ProtectedRoute>
              <Buildings />
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
        <Route
          path="/admin/classrooms"
          element={
            <ProtectedRoute>
              <Classrooms />
            </ProtectedRoute>
          }
        />

        {/* 教室端首页(受保护) */}
        <Route
          path="/classroom"
          element={
            <ClassroomProtectedRoute>
              <ClassroomHome />
            </ClassroomProtectedRoute>
          }
        />

        {/* 教室端监考模式(受保护) */}
        <Route
          path="/classroom/invigilation"
          element={
            <ClassroomProtectedRoute>
              <ClassroomInvigilation />
            </ClassroomProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

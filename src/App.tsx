import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmployeeLayout from "@/components/layout/EmployeeLayout";
import AdminLayout from "@/components/layout/AdminLayout";

const EmployeeHome = lazy(() => import("@/pages/EmployeeHome"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Staff = lazy(() => import("@/pages/Staff"));
const Health = lazy(() => import("@/pages/Health"));
const TaskDetails = lazy(() => import("@/pages/TaskDetails"));
const Scan = lazy(() => import("@/pages/Scan"));
const AnimalList = lazy(() => import("@/pages/AnimalList"));
const AnimalDetail = lazy(() => import("@/pages/AnimalDetail"));
const LogObservation = lazy(() => import("@/pages/LogObservation"));
const Checklists = lazy(() => import("@/pages/Checklists"));
const SOPs = lazy(() => import("@/pages/SOPs"));
const AdminAnimals = lazy(() => import("@/pages/admin/Animals"));
const DropPlanner = lazy(() => import("@/pages/admin/DropPlanner"));
const SOPManager = lazy(() => import("@/pages/admin/SOPManager"));
const Integrations = lazy(() => import("@/pages/admin/Integrations"));
const AdminSchedule = lazy(() => import("@/pages/admin/Schedule"));
const ChecklistReview = lazy(() => import("@/pages/admin/ChecklistReview"));
const EmployeeSchedule = lazy(() => import("@/pages/EmployeeSchedule"));
const GroupChat = lazy(() => import("@/pages/GroupChat"));
const SystemSettings = lazy(() => import("@/pages/admin/SystemSettings"));
const SharedEvent = lazy(() => import("@/pages/SharedEvent"));
const EmployeeSettings = lazy(() => import("@/pages/EmployeeSettings"));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-sundown-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/schedule/event/:slug" element={<SharedEvent />} />

          {/* Employee Routes — any authenticated user */}
          <Route path="/employee" element={
            <ProtectedRoute>
              <EmployeeLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeHome />} />
            <Route path="tasks" element={<EmployeeDashboard />} />
            <Route path="tasks/:taskId" element={<TaskDetails />} />
            <Route path="scan" element={<Scan />} />
            <Route path="animals" element={<AnimalList />} />
            <Route path="animals/:id" element={<AnimalDetail />} />
            <Route path="observe" element={<LogObservation />} />
            <Route path="checklists" element={<Checklists />} />
            <Route path="schedule" element={<EmployeeSchedule />} />
            <Route path="messages" element={<GroupChat />} />
            <Route path="sops" element={<SOPs />} />
            <Route path="settings" element={<EmployeeSettings />} />
          </Route>

          {/* Admin Routes — admin or super_admin only */}
          <Route path="/admin" element={
            <ProtectedRoute requireRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="quick-add" element={<Scan />} />
            <Route path="animals" element={<AdminAnimals />} />
            <Route path="animals/:id" element={<AnimalDetail />} />
            <Route path="drops" element={<DropPlanner />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="checklists" element={<ChecklistReview />} />
            <Route path="messages" element={<GroupChat />} />
            <Route path="sops" element={<SOPManager />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="staff" element={<Staff />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="health" element={<Health />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

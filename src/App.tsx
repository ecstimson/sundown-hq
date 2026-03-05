import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmployeeLayout from "@/components/layout/EmployeeLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import EmployeeHome from "@/pages/EmployeeHome";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Inventory from "@/pages/Inventory";
import Staff from "@/pages/Staff";
import Health from "@/pages/Health";
import TaskDetails from "@/pages/TaskDetails";
import Scan from "@/pages/Scan";
import AnimalList from "@/pages/AnimalList";
import AnimalDetail from "@/pages/AnimalDetail";
import LogObservation from "@/pages/LogObservation";
import Checklists from "@/pages/Checklists";
import SOPs from "@/pages/SOPs";
import AdminAnimals from "@/pages/admin/Animals";
import DropPlanner from "@/pages/admin/DropPlanner";
import SOPManager from "@/pages/admin/SOPManager";
import Integrations from "@/pages/admin/Integrations";
import AdminSchedule from "@/pages/admin/Schedule";
import EmployeeSchedule from "@/pages/EmployeeSchedule";
import GroupChat from "@/pages/GroupChat";
import SystemSettings from "@/pages/admin/SystemSettings";
import SharedEvent from "@/pages/SharedEvent";

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
    <div className="w-16 h-16 rounded-full bg-sundown-card border border-sundown-border flex items-center justify-center text-sundown-muted text-2xl">
      🚧
    </div>
    <h2 className="text-xl font-semibold text-sundown-text">{title}</h2>
    <p className="text-sundown-muted">This feature is coming soon.</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="settings" element={<Placeholder title="Settings" />} />
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
          <Route path="messages" element={<GroupChat />} />
          <Route path="sops" element={<SOPManager />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="staff" element={<Staff />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

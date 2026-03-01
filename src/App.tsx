/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
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
import ChecklistReview from "@/pages/admin/ChecklistReview";
import SOPManager from "@/pages/admin/SOPManager";
import Integrations from "@/pages/admin/Integrations";

// Placeholder components for demo
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
        
        {/* Employee Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeHome />} />
          <Route path="tasks" element={<EmployeeDashboard />} />
          <Route path="tasks/:taskId" element={<TaskDetails />} />
          <Route path="scan" element={<Scan />} />
          <Route path="animals" element={<AnimalList />} />
          <Route path="animals/:id" element={<AnimalDetail />} />
          <Route path="observe" element={<LogObservation />} />
          <Route path="checklists" element={<Checklists />} />
          <Route path="sops" element={<SOPs />} />
          <Route path="settings" element={<Placeholder title="Settings" />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="animals" element={<AdminAnimals />} />
          <Route path="drops" element={<DropPlanner />} />
          <Route path="checklists" element={<ChecklistReview />} />
          <Route path="sops" element={<SOPManager />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="staff" element={<Staff />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<Placeholder title="System Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

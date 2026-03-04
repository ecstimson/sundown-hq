import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function EmployeeDashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sundown-text">Today's Tasks</h2>
        <span className="text-sm text-sundown-muted">{today}</span>
      </div>

      <EmptyState
        icon={ClipboardList}
        title="No Tasks Assigned"
        description="Tasks will appear here when assigned by an admin. Check back later."
      />
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TaskDetails() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-bold text-sundown-text">Task Details</h2>
      </div>

      <EmptyState
        icon={ClipboardList}
        title="No Task Found"
        description="This task doesn't exist or hasn't been created yet."
        actionLabel="Back"
        onAction={() => navigate(-1)}
      />
    </div>
  );
}

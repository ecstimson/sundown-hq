import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tasks = [
  { id: 1, type: "Feeding", location: "Warehouse A - Row 3", status: "pending", priority: "high", time: "08:00 AM" },
  { id: 2, type: "Cleaning", location: "Warehouse B - Row 1", status: "pending", priority: "medium", time: "09:30 AM" },
  { id: 3, type: "Health Check", location: "Quarantine - Q2", status: "urgent", priority: "critical", time: "10:00 AM" },
  { id: 4, type: "Water Change", location: "Warehouse A - Row 2", status: "completed", priority: "low", time: "07:00 AM" },
];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sundown-text">Today's Tasks</h2>
        <span className="text-sm text-sundown-muted">March 1, 2026</span>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card 
            key={task.id} 
            className="border-l-4 border-l-sundown-gold overflow-hidden active:scale-[0.98] transition-transform touch-manipulation cursor-pointer"
            onClick={() => navigate(`/employee/tasks/${task.id}`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    task.priority === 'critical' ? 'bg-sundown-red/20 text-sundown-red' :
                    task.priority === 'high' ? 'bg-sundown-orange/20 text-sundown-orange' :
                    'bg-sundown-green/20 text-sundown-green'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-xs text-sundown-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.time}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-sundown-text">{task.type}</h3>
                <p className="text-sm text-sundown-muted">{task.location}</p>
              </div>
              
              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-full bg-sundown-bg/50">
                {task.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-sundown-green" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-sundown-muted" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full h-14 text-lg font-semibold shadow-lg shadow-sundown-gold/10" size="lg">
        Start Next Task
      </Button>
    </div>
  );
}

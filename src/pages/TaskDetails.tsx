import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle, AlertTriangle, MapPin, Clock, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  // Mock data - in a real app, fetch based on ID
  const task = {
    id: taskId,
    type: "Feeding",
    location: "Warehouse A - Row 3",
    description: "Feed 50g rats to adult Ball Pythons in rack 3. Check for refusals.",
    priority: "high",
    time: "08:00 AM",
    status: "pending",
    notes: "Watch out for the aggressive female in bin 12."
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-bold text-sundown-text">Task Details</h2>
      </div>

      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
            task.priority === 'high' ? 'bg-sundown-orange/20 text-sundown-orange' : 'bg-sundown-green/20 text-sundown-green'
          }`}>
            {task.priority} Priority
          </span>
          <span className="text-sundown-muted flex items-center gap-1">
            <Clock className="w-4 h-4" /> {task.time}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-sundown-text">{task.type}</h1>

        <Card className="border-l-4 border-l-sundown-gold">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-sundown-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sundown-text">Location</h4>
                <p className="text-sundown-muted">{task.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-sundown-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sundown-text">Instructions</h4>
                <p className="text-sundown-muted">{task.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {task.notes && (
          <div className="bg-sundown-card/50 p-4 rounded-lg border border-sundown-border">
            <h4 className="font-semibold text-sundown-text mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-sundown-orange" />
              Notes
            </h4>
            <p className="text-sm text-sundown-muted italic">"{task.notes}"</p>
          </div>
        )}
      </div>

      <div className="space-y-3 mt-auto">
        <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-sundown-gold/20" size="lg">
          <CheckCircle className="w-6 h-6 mr-2" />
          Mark Complete
        </Button>
        <Button variant="danger" className="w-full h-12 text-base font-medium bg-sundown-bg border border-sundown-red text-sundown-red hover:bg-sundown-red hover:text-white">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Report Issue
        </Button>
      </div>
    </div>
  );
}

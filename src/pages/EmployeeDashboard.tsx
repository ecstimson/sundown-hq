import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ClipboardList,
  Scale,
  Eye,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [checklistCount, setChecklistCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [needsWeightCount, setNeedsWeightCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const building = employee?.assigned_buildings?.[0] || "A";

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

      const [checklists, urgent, animals] = await Promise.all([
        supabase
          .from("daily_checklists")
          .select("id, completed_at")
          .eq("date", today)
          .eq("building", building),
        supabase
          .from("observations")
          .select("id", { count: "exact", head: true })
          .eq("urgency", "Urgent")
          .gte("created_at", `${today}T00:00:00`),
        supabase
          .from("animals")
          .select("id, last_weighed")
          .in("status", ["Breeder", "Available"]),
      ]);

      const cls = (checklists.data || []) as { id: string; completed_at: string | null }[];
      setChecklistCount(cls.length);
      setPendingCount(cls.filter((c) => !c.completed_at).length);
      setUrgentCount(urgent.count || 0);

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const animalData = (animals.data || []) as { id: string; last_weighed: string | null }[];
      setNeedsWeightCount(
        animalData.filter(
          (a) => !a.last_weighed || new Date(a.last_weighed).getTime() < thirtyDaysAgo
        ).length
      );

      setLoading(false);
    }
    fetchStats();
  }, [today, building]);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sundown-text">Today's Tasks</h2>
        <span className="text-sm text-sundown-muted">{todayFormatted}</span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`cursor-pointer hover:border-sundown-gold/50 transition-colors ${urgentCount > 0 ? "border-sundown-red/50" : ""}`}
          onClick={() => navigate("/employee/dashboard")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${urgentCount > 0 ? "bg-sundown-red/10" : "bg-sundown-muted/10"}`}>
              <AlertTriangle className={`w-5 h-5 ${urgentCount > 0 ? "text-sundown-red" : "text-sundown-muted"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-sundown-text">{urgentCount}</p>
              <p className="text-xs text-sundown-muted">Urgent Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-sundown-gold/50 transition-colors" onClick={() => navigate("/employee/checklists")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sundown-gold/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-sundown-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sundown-text">
                {pendingCount}<span className="text-sm text-sundown-muted font-normal">/{checklistCount}</span>
              </p>
              <p className="text-xs text-sundown-muted">Pending Checklists</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider">Quick Actions</h3>
        {[
          { label: "Log Observation", icon: Eye, path: "/employee/observe", desc: "Record feeding, health, behavior" },
          { label: "Start Checklist", icon: ClipboardList, path: "/employee/checklists", desc: `Building ${building} · ${pendingCount} pending` },
          { label: "Weight Checks Due", icon: Scale, path: "/employee/animals", desc: `${needsWeightCount} animals need weighing` },
          { label: "View Schedule", icon: Calendar, path: "/employee/schedule", desc: "Shifts and feeding times" },
        ].map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="w-full p-4 rounded-xl border border-sundown-border bg-sundown-card hover:border-sundown-gold/50 transition-colors flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-sundown-gold/10 flex items-center justify-center">
              <action.icon className="w-5 h-5 text-sundown-gold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sundown-text text-sm">{action.label}</p>
              <p className="text-xs text-sundown-muted">{action.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sundown-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, Loader2, HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Observation } from "@/types/database";

export default function Health() {
  const [healthObs, setHealthObs] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      setLoading(true);
      const { data } = await supabase
        .from("observations")
        .select("*")
        .eq("observation_type", "Health Concern")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setHealthObs(data);
      setLoading(false);
    }
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  const urgentCount = healthObs.filter((o) => o.urgency === "Urgent").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-sundown-text">Health Records</h2>
      </div>

      {healthObs.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No Health Concerns"
          description="No health concern observations have been logged yet. That's great news!"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Active Cases List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Health Concern Observations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthObs.map((obs) => (
                  <div
                    key={obs.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-sundown-border bg-sundown-bg/30 hover:bg-sundown-bg/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          obs.urgency === "Urgent"
                            ? "bg-sundown-red/20 text-sundown-red"
                            : obs.urgency === "Needs Attention"
                              ? "bg-sundown-orange/20 text-sundown-orange"
                              : "bg-sundown-gold/20 text-sundown-gold"
                        }`}
                      >
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                              obs.urgency === "Urgent"
                                ? "bg-sundown-red/10 text-sundown-red"
                                : obs.urgency === "Needs Attention"
                                  ? "bg-sundown-orange/10 text-sundown-orange"
                                  : "bg-sundown-gold/10 text-sundown-gold"
                            }`}
                          >
                            {obs.urgency}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-sundown-text mt-1">
                          {obs.details}
                        </p>
                        <p className="text-xs text-sundown-muted mt-1">
                          {obs.employee_name} · {timeAgo(obs.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Health Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-sundown-bg rounded-md">
                  <span className="text-sm text-sundown-muted">Total Concerns</span>
                  <span className="text-xl font-bold text-sundown-text">
                    {healthObs.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-sundown-bg rounded-md border-l-2 border-l-sundown-red">
                  <span className="text-sm text-sundown-muted">Urgent</span>
                  <span className="text-xl font-bold text-sundown-red">
                    {urgentCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

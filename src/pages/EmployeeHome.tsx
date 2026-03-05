import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ClipboardList, Scale, List, AlertTriangle, Calendar, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Observation } from "@/types/database";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EmployeeHome() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [building, setBuilding] = useState<"A" | "B">("A");
  const [urgentObs, setUrgentObs] = useState<Observation[]>([]);
  const [recentActivity, setRecentActivity] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setFetchError(null);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: urgent, error: urgentErr } = await supabase
        .from("observations")
        .select("*")
        .eq("urgency", "Urgent")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);

      if (urgentErr) setFetchError(`Failed to load alerts: ${urgentErr.message}`);
      if (urgent) setUrgentObs(urgent);

      const { data: recent, error: recentErr } = await supabase
        .from("observations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (recentErr) {
        setFetchError((prev) =>
          prev ? `${prev}; Activity: ${recentErr.message}` : `Failed to load activity: ${recentErr.message}`
        );
      }
      if (recent) setRecentActivity(recent);
      setLoading(false);
    }
    fetchData();
  }, []);

  const firstName = employee?.name?.split(" ")[0] || "Team";

  return (
    <div className="space-y-5 pb-24">
      {fetchError && (
        <div className="rounded-md bg-sundown-card border-l-4 border-l-sundown-red p-3 text-sm text-sundown-red font-bold">
          {fetchError}
        </div>
      )}

      <div className="border border-sundown-border bg-sundown-card p-4 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-sundown-text">{getGreeting()}, {firstName}</h1>
          <p className="text-sundown-muted text-sm">{formatDate(new Date())}</p>
        </div>
        <div className="bg-sundown-bg p-1 flex border border-sundown-border w-full max-w-xs">
          <button
            onClick={() => setBuilding("A")}
            className={`flex-1 py-1.5 text-sm font-bold transition-all ${
              building === "A"
                ? "bg-sundown-gold text-black shadow-sm"
                : "text-sundown-muted hover:text-sundown-text"
            }`}
          >
            Building A
          </button>
          <button
            onClick={() => setBuilding("B")}
            className={`flex-1 py-1.5 text-sm font-bold transition-all ${
              building === "B"
                ? "bg-sundown-gold text-black shadow-sm"
                : "text-sundown-muted hover:text-sundown-text"
            }`}
          >
            Building B
          </button>
        </div>
      </div>

      {/* Urgent Alerts */}
      {urgentObs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
            Urgent
          </h2>
          {urgentObs.map((obs) => (
            <Card key={obs.id} className="rounded-none border border-sundown-red/40 bg-sundown-card mb-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-sundown-red shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-sundown-red">
                        {obs.observation_type}
                      </span>
                      <span className="text-xs text-sundown-muted font-medium">
                        {timeAgo(obs.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-sundown-muted">
                      {obs.employee_name}: "{obs.details}"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="space-y-2">
          <QuickActionButton
            icon={ClipboardList}
            label="Log Observation"
            description="Record feeding, health, and behavior notes"
            onClick={() => navigate("/employee/scan")}
          />
          <QuickActionButton
            icon={Scale}
            label="Weight Check"
            description={`Building ${building} weight updates`}
            onClick={() => navigate("/employee/scan")}
          />
          <QuickActionButton
            icon={List}
            label="Animals"
            description="Browse records and open animal detail"
            onClick={() => navigate("/employee/animals")}
          />
        </div>
      </section>

      {/* Weekly Schedule - empty state since no schedule table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider">
            Weekly Schedule
          </h2>
        </div>
        <Card className="rounded-none">
          <CardContent className="p-6">
            <EmptyState
              icon={Calendar}
              title="No Schedule Set"
              description="Weekly schedules will appear here once configured by an admin."
            />
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        {recentActivity.length > 0 ? (
          <Card className="rounded-none">
            <CardContent className="p-0 divide-y divide-sundown-border">
              {recentActivity.map((obs) => (
                <div key={obs.id} className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sundown-card border border-sundown-border flex items-center justify-center text-xs font-bold text-sundown-muted">
                    {obs.employee_name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sundown-text truncate">
                      <span className="font-bold text-sundown-gold">
                        {obs.employee_name}
                      </span>{" "}
                      logged {obs.observation_type.toLowerCase()}
                    </p>
                    <p className="text-xs text-sundown-muted truncate font-medium">{obs.details}</p>
                  </div>
                  <span className="text-xs text-sundown-muted whitespace-nowrap font-medium">
                    {timeAgo(obs.created_at)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-none">
            <CardContent className="p-6">
              <EmptyState
                icon={User}
                title="No Recent Activity"
                description="Observations and updates will appear here."
              />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: any;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full border border-sundown-border bg-sundown-card hover:border-sundown-gold/40 hover:translate-x-0.5 transition-all p-4 flex items-center gap-3 text-left"
    >
      <div className="w-10 h-10 bg-sundown-bg border border-sundown-border flex items-center justify-center text-sundown-gold">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-sundown-text">{label}</p>
        <p className="text-xs text-sundown-muted truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-sundown-muted" />
    </button>
  );
}

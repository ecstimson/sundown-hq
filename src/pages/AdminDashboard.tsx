import { useState, useEffect } from "react";
import {
  Box,
  Calendar,
  CalendarDays,
  AlertTriangle,
  Loader2,
  List,
  ClipboardList,
  Book,
  Users,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import type { Observation } from "@/types/database";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

function isAuthLockError(message: string) {
  const text = message.toLowerCase();
  return text.includes("lock broken") || (text.includes("lock") && text.includes("state"));
}

async function withAuthLockRetry<T extends { error: { message: string } | null }>(
  run: () => Promise<T>
): Promise<T> {
  const first = await run();
  if (!first.error || !isAuthLockError(first.error.message)) {
    return first;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  return run();
}

const QUICK_LINKS = [
  { label: "Animals", icon: List, route: "/admin/animals" },
  { label: "Schedule", icon: CalendarDays, route: "/admin/schedule" },
  { label: "Drop Planner", icon: Calendar, route: "/admin/drops" },
  { label: "SOPs", icon: Book, route: "/admin/sops" },
  { label: "Employees", icon: Users, route: "/admin/staff" },
  { label: "Messages", icon: MessageSquare, route: "/admin/messages" },
] as const;

export default function AdminDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState(0);
  const [recentObs, setRecentObs] = useState<Observation[]>([]);
  const [nextDrop, setNextDrop] = useState<{ drop_date: string; drop_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setFetchError(null);
      const errors: string[] = [];

      const { count: animalCount, error: animalErr } = await withAuthLockRetry(() =>
        supabase
          .from("animals")
          .select("*", { count: "exact", head: true }) as unknown as Promise<{
          data: null;
          error: { message: string } | null;
          count: number | null;
        }>
      );
      if (animalErr) errors.push(`Animals: ${animalErr.message}`);
      if (animalCount !== null) setTotalAnimals(animalCount);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: urgCount, error: urgErr } = await withAuthLockRetry(() =>
        supabase
          .from("observations")
          .select("*", { count: "exact", head: true })
          .eq("urgency", "Urgent")
          .gte("created_at", since) as unknown as Promise<{
          data: null;
          error: { message: string } | null;
          count: number | null;
        }>
      );
      if (urgErr) errors.push(`Urgent obs: ${urgErr.message}`);
      if (urgCount !== null) setUrgentCount(urgCount);

      const { data: obs, error: obsErr } = await withAuthLockRetry(() =>
        supabase
          .from("observations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5) as unknown as Promise<{
          data: Observation[] | null;
          error: { message: string } | null;
        }>
      );
      if (obsErr) errors.push(`Recent obs: ${obsErr.message}`);
      if (obs) setRecentObs(obs);

      const { data: drops, error: dropsErr } = await withAuthLockRetry(() =>
        supabase
          .from("drops")
          .select("drop_date, drop_id")
          .gte("drop_date", new Date().toISOString().split("T")[0])
          .order("drop_date")
          .limit(1) as unknown as Promise<{
          data: { drop_date: string; drop_id: string }[] | null;
          error: { message: string } | null;
        }>
      );
      if (dropsErr) errors.push(`Drops: ${dropsErr.message}`);
      if (drops && drops.length > 0) setNextDrop(drops[0]);

      const today = new Date().toISOString().split("T")[0];
      const { count: evtCount, error: evtErr } = await withAuthLockRetry(() =>
        supabase
          .from("calendar_events")
          .select("*", { count: "exact", head: true })
          .lte("start_at", `${today}T23:59:59`)
          .gte("end_at", `${today}T00:00:00`) as unknown as Promise<{
          data: null;
          error: { message: string } | null;
          count: number | null;
        }>
      );
      if (evtErr) errors.push(`Events: ${evtErr.message}`);
      if (evtCount !== null) setTodayEvents(evtCount);

      if (errors.length) setFetchError(errors.join("; "));
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  const nextDropLabel = nextDrop
    ? new Date(nextDrop.drop_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-sundown-text">
          {employee?.name ? `Welcome back, ${employee.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-sundown-muted mt-1">Overview for today</p>
      </div>

      {fetchError && (
        <div className="border-l-4 border-l-sundown-red bg-sundown-card p-4 text-sm text-sundown-red">
          <p className="font-bold">Some data failed to load</p>
          <p className="text-xs mt-1 text-sundown-muted">{fetchError}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-sundown-border divide-x divide-y lg:divide-y-0 divide-sundown-border bg-sundown-card">
        <StatCell icon={Box} label="Total Animals" value={String(totalAnimals)} />
        <StatCell icon={Calendar} label="Next Drop" value={nextDropLabel} sub={nextDrop?.drop_id} />
        <StatCell icon={CalendarDays} label="Today's Events" value={String(todayEvents)} />
        <StatCell
          icon={AlertTriangle}
          label="Urgent Alerts"
          value={urgentCount > 0 ? String(urgentCount) : "0"}
          alert={urgentCount > 0}
        />
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <div className="border border-sundown-border divide-y divide-sundown-border bg-sundown-card">
          {recentObs.length > 0 ? (
            recentObs.map((obs) => (
              <div key={obs.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    obs.urgency === "Urgent" ? "bg-sundown-red" : "bg-sundown-gold"
                  }`}
                />
                <p className="text-sm text-sundown-muted flex-1">
                  <span className="text-sundown-text font-medium">{obs.employee_name}</span>{" "}
                  logged {obs.observation_type.toLowerCase()}
                </p>
                <span className="text-xs text-sundown-muted whitespace-nowrap">
                  {timeAgo(obs.created_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-sundown-muted text-center">No recent activity.</p>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 border border-sundown-border divide-x divide-y divide-sundown-border bg-sundown-card">
          {QUICK_LINKS.map(({ label, icon: Icon, route }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className="flex items-center gap-3 px-4 py-4 text-left hover:bg-sundown-bg transition-colors group"
            >
              <Icon className="w-4 h-4 text-sundown-gold shrink-0" />
              <span className="text-sm font-medium text-sundown-text flex-1">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-sundown-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${alert ? "text-sundown-red" : "text-sundown-muted"}`} />
        <span className="text-xs font-medium text-sundown-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold ${alert ? "text-sundown-red" : "text-sundown-text"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-sundown-muted mt-0.5">{sub}</p>}
    </div>
  );
}

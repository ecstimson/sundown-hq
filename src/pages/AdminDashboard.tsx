import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Box, Calendar, CheckSquare, AlertTriangle, Loader2, SlidersHorizontal, ChevronUp, ChevronDown, X, List, CalendarDays, ClipboardList, Book, Users, MessageSquare, Plug, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import type { Observation } from "@/types/database";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [recentObs, setRecentObs] = useState<Observation[]>([]);
  const [nextDrop, setNextDrop] = useState<{ drop_date: string; drop_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    "totalAnimals",
    "nextDrop",
    "checklistStatus",
    "urgentAlerts",
    "recentActivity",
  ]);
  const [addWidgetId, setAddWidgetId] = useState("animalsWidget");

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setFetchError(null);
      const errors: string[] = [];

      const { count: animalCount, error: animalErr } = await supabase
        .from("animals")
        .select("*", { count: "exact", head: true });
      if (animalErr) errors.push(`Animals: ${animalErr.message}`);
      if (animalCount !== null) setTotalAnimals(animalCount);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: urgCount, error: urgErr } = await supabase
        .from("observations")
        .select("*", { count: "exact", head: true })
        .eq("urgency", "Urgent")
        .gte("created_at", since);
      if (urgErr) errors.push(`Urgent obs: ${urgErr.message}`);
      if (urgCount !== null) setUrgentCount(urgCount);

      const { data: obs, error: obsErr } = await supabase
        .from("observations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (obsErr) errors.push(`Recent obs: ${obsErr.message}`);
      if (obs) setRecentObs(obs);

      const { data: drops, error: dropsErr } = await supabase
        .from("drops")
        .select("drop_date, drop_id")
        .gte("drop_date", new Date().toISOString().split("T")[0])
        .order("drop_date")
        .limit(1);
      if (dropsErr) errors.push(`Drops: ${dropsErr.message}`);
      if (drops && drops.length > 0) setNextDrop(drops[0]);

      if (errors.length) setFetchError(errors.join("; "));
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  useEffect(() => {
    async function fetchPrefs() {
      if (!employee) return;
      const { data } = await (supabase
        .from("dashboard_preferences") as any)
        .select("*")
        .eq("user_id", employee.id)
        .single();
      if (data) {
        setHiddenWidgets((data.hidden_widgets as string[]) || []);
        if (Array.isArray(data.widget_order) && data.widget_order.length > 0) {
          setWidgetOrder(data.widget_order as string[]);
        }
        return;
      }

      const local = localStorage.getItem(`dashboard-prefs:${employee.id}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setHiddenWidgets(parsed.hiddenWidgets || []);
          setWidgetOrder(parsed.widgetOrder || widgetOrder);
        } catch {
          // ignore local parse errors
        }
      }
    }
    fetchPrefs();
  }, [employee]);

  async function savePrefs(nextHidden: string[], nextOrder: string[]) {
    if (!employee) return;
    localStorage.setItem(
      `dashboard-prefs:${employee.id}`,
      JSON.stringify({ hiddenWidgets: nextHidden, widgetOrder: nextOrder })
    );
    await supabase.from("dashboard_preferences").upsert({
      user_id: employee.id,
      hidden_widgets: nextHidden,
      widget_order: nextOrder,
    } as any);
  }

  function toggleWidget(widgetId: string) {
    const next = hiddenWidgets.includes(widgetId)
      ? hiddenWidgets.filter((id) => id !== widgetId)
      : [...hiddenWidgets, widgetId];
    setHiddenWidgets(next);
    savePrefs(next, widgetOrder);
  }

  function moveWidget(widgetId: string, direction: "up" | "down") {
    const idx = widgetOrder.indexOf(widgetId);
    if (idx < 0) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= widgetOrder.length) return;
    const next = [...widgetOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    setWidgetOrder(next);
    savePrefs(hiddenWidgets, next);
  }

  const statWidgetMap = {
    totalAnimals: (
      <StatsCard
        title="Total Animals"
        value={totalAnimals.toLocaleString()}
        subtext="In inventory"
        icon={Box}
      />
    ),
    nextDrop: (
      <StatsCard
        title="Next Drop"
        value={
          nextDrop
            ? new Date(nextDrop.drop_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "None scheduled"
        }
        subtext={nextDrop ? nextDrop.drop_id : ""}
        icon={Calendar}
      />
    ),
    checklistStatus: (
      <StatsCard
        title="Checklist Status"
        value="—"
        subtext="No checklists today"
        icon={CheckSquare}
      />
    ),
    urgentAlerts: (
      <StatsCard
        title="Urgent Alerts"
        value={urgentCount > 0 ? `${urgentCount} Flagged` : "None"}
        subtext={urgentCount > 0 ? "Requires attention" : "All clear"}
        icon={AlertTriangle}
        alert={urgentCount > 0}
      />
    ),
  } as const;

  const navWidgetMap = {
    animalsWidget: { title: "Animals", description: "Manage inventory records and statuses.", route: "/admin/animals", icon: List },
    scheduleWidget: { title: "Schedule", description: "Manage employee and feeding schedules.", route: "/admin/schedule", icon: CalendarDays },
    dropPlannerWidget: { title: "Drop Planner", description: "Plan release stages and drop prep.", route: "/admin/drops", icon: Calendar },
    checklistsWidget: { title: "Checklists", description: "Create and review daily checklist execution.", route: "/admin/checklists", icon: ClipboardList },
    sopsWidget: { title: "SOPs", description: "Manage SOP templates and versions.", route: "/admin/sops", icon: Book },
    employeesWidget: { title: "Employees", description: "Add and manage staff access.", route: "/admin/staff", icon: Users },
    messagesWidget: { title: "Messages", description: "Open realtime group chat.", route: "/admin/messages", icon: MessageSquare },
    integrationsWidget: { title: "Integrations", description: "Review API/system integrations.", route: "/admin/integrations", icon: Plug },
    settingsWidget: { title: "System Settings", description: "Configure global app defaults.", route: "/admin/settings", icon: Settings },
  } as const;

  const allWidgetIds = [
    "totalAnimals",
    "nextDrop",
    "checklistStatus",
    "urgentAlerts",
    "recentActivity",
    "animalsWidget",
    "scheduleWidget",
    "dropPlannerWidget",
    "checklistsWidget",
    "sopsWidget",
    "employeesWidget",
    "messagesWidget",
    "integrationsWidget",
    "settingsWidget",
  ];

  const availableToAdd = allWidgetIds.filter((id) => !widgetOrder.includes(id));

  function getWidgetLabel(widgetId: string) {
    if (widgetId === "totalAnimals") return "Total Animals";
    if (widgetId === "nextDrop") return "Next Drop";
    if (widgetId === "checklistStatus") return "Checklist Status";
    if (widgetId === "urgentAlerts") return "Urgent Alerts";
    if (widgetId === "recentActivity") return "Recent Activity";
    return navWidgetMap[widgetId as keyof typeof navWidgetMap]?.title || widgetId;
  }

  function addWidget() {
    if (!availableToAdd.includes(addWidgetId)) return;
    const nextOrder = [...widgetOrder, addWidgetId];
    setWidgetOrder(nextOrder);
    savePrefs(hiddenWidgets, nextOrder);
  }

  function removeWidget(widgetId: string) {
    const nextOrder = widgetOrder.filter((id) => id !== widgetId);
    const nextHidden = hiddenWidgets.filter((id) => id !== widgetId);
    setWidgetOrder(nextOrder);
    setHiddenWidgets(nextHidden);
    savePrefs(nextHidden, nextOrder);
  }

  function renderRecentActivity() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest observations logged by staff.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentObs.length > 0 ? (
            <div className="space-y-4">
              {recentObs.map((obs) => (
                <div key={obs.id} className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      obs.urgency === "Urgent"
                        ? "bg-sundown-red"
                        : "bg-sundown-gold"
                    }`}
                  />
                  <p className="text-sm text-sundown-muted flex-1">
                    <span className="text-sundown-text font-medium">
                      {obs.employee_name}
                    </span>{" "}
                    logged {obs.observation_type.toLowerCase()}
                  </p>
                  <span className="text-xs text-sundown-muted whitespace-nowrap">
                    {timeAgo(obs.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-sundown-muted">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderNavWidget(widgetId: keyof typeof navWidgetMap) {
    const widget = navWidgetMap[widgetId];
    const Icon = widget.icon;
    return (
      <Card key={widgetId}>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sundown-card border border-sundown-border flex items-center justify-center">
              <Icon className="w-5 h-5 text-sundown-gold" />
            </div>
            <div>
              <p className="font-bold text-sundown-text">{widget.title}</p>
              <p className="text-xs text-sundown-muted">{widget.description}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate(widget.route)}>
            Open {widget.title}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-md bg-sundown-card border-l-4 border-l-sundown-red p-4 text-sm text-sundown-red">
          <p className="font-bold">Some dashboard data failed to load</p>
          <p className="text-xs mt-1 text-sundown-muted">{fetchError}</p>
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" onClick={() => setShowCustomize(true)}>
          <SlidersHorizontal className="w-4 h-4" />
          Customize Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgetOrder
          .filter((id) => !hiddenWidgets.includes(id))
          .map((widgetId) => {
            if (widgetId in statWidgetMap) {
              return <div key={widgetId}>{statWidgetMap[widgetId as keyof typeof statWidgetMap]}</div>;
            }
            if (widgetId === "recentActivity") {
              return <div key={widgetId} className="md:col-span-2 lg:col-span-4">{renderRecentActivity()}</div>;
            }
            if (widgetId in navWidgetMap) {
              return <div key={widgetId}>{renderNavWidget(widgetId as keyof typeof navWidgetMap)}</div>;
            }
            return null;
          })}
      </div>

      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Customize Dashboard</h3>
              <button onClick={() => setShowCustomize(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {availableToAdd.length > 0 && (
                <div className="rounded-md border border-sundown-border bg-sundown-bg p-3 space-y-2">
                  <p className="text-xs font-bold text-sundown-muted uppercase tracking-wide">Add Widget</p>
                  <div className="flex gap-2">
                    <select
                      value={addWidgetId}
                      onChange={(e) => setAddWidgetId(e.target.value)}
                      className="flex-1 h-9 px-2 rounded-md border border-sundown-border bg-sundown-card text-sundown-text"
                    >
                      {availableToAdd.map((id) => (
                        <option key={id} value={id}>{getWidgetLabel(id)}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={addWidget}>Add</Button>
                  </div>
                </div>
              )}
              {widgetOrder.map((widgetId, idx) => (
                <div key={widgetId} className="flex items-center justify-between border border-sundown-border rounded-md px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-sundown-text">
                    <input
                      type="checkbox"
                      checked={!hiddenWidgets.includes(widgetId)}
                      onChange={() => toggleWidget(widgetId)}
                    />
                    {getWidgetLabel(widgetId)}
                  </label>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => moveWidget(widgetId, "up")}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={idx === widgetOrder.length - 1} onClick={() => moveWidget(widgetId, "down")}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeWidget(widgetId)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end">
              <Button onClick={() => setShowCustomize(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtext,
  icon: Icon,
  alert,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-bold text-sundown-muted">{title}</p>
          <Icon
            className={`h-4 w-4 ${alert ? "text-sundown-red" : "text-sundown-gold"}`}
          />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-sundown-text tracking-tight">{value}</div>
          <p className="text-xs text-sundown-muted">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

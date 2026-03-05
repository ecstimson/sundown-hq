import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle, Circle, Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DailyChecklist } from "@/types/database";

interface ChecklistItem {
  id: number;
  label: string;
  completed: boolean;
  time?: string;
  user?: string;
  value?: string;
}

export default function Checklists() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const building = employee?.assigned_buildings?.[0] || "A";

  useEffect(() => {
    async function fetchChecklist() {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from("daily_checklists")
        .select("*")
        .eq("date", today)
        .eq("building", building)
        .order("created_at", { ascending: true });

      if (fetchErr) setError(fetchErr.message);
      setChecklists((data as DailyChecklist[]) || []);
      setLoading(false);
    }
    fetchChecklist();

    const channel = supabase
      .channel(`checklists-employee-${building}-${today}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_checklists", filter: `date=eq.${today}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as DailyChecklist;
            if (row.building === building) {
              setChecklists((prev) => [...prev, row]);
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as DailyChecklist;
            setChecklists((prev) => prev.map((c) => (c.id === row.id ? row : c)));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [today, building]);

  async function toggleItem(checklistId: string, id: number) {
    setSavingId(checklistId);
    setError(null);

    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const parsed = Array.isArray(checklist.items)
      ? (checklist.items as unknown as ChecklistItem[])
      : [];

    const updated = parsed.map((item) =>
      item.id === id
        ? {
            ...item,
            completed: !item.completed,
            time: !item.completed ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            user: !item.completed ? employee?.name : "",
          }
        : item
    );

    const { error: updateErr } = await (supabase
      .from("daily_checklists") as any)
      .update({ items: updated as any })
      .eq("id", checklistId);

    if (updateErr) {
      setError(updateErr.message);
      setSavingId(null);
      return;
    }

    setChecklists((prev) =>
      prev.map((c) => (c.id === checklistId ? { ...c, items: updated as any } : c))
    );
    setSavingId(null);
  }

  async function completeChecklist(checklistId: string) {
    setSavingId(checklistId);
    setError(null);
    const { error: updateErr } = await (supabase
      .from("daily_checklists") as any)
      .update({ completed_at: new Date().toISOString() })
      .eq("id", checklistId);
    if (updateErr) {
      setError(updateErr.message);
      setSavingId(null);
      return;
    }
    setChecklists((prev) =>
      prev.map((c) => (c.id === checklistId ? { ...c, completed_at: new Date().toISOString() } : c))
    );
    setSavingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="flex flex-col h-full pb-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-sundown-text">Checklists</h1>
            <p className="text-sundown-muted text-sm font-medium">
              Building {building} · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No Checklists Today"
          description="No checklists have been created for today yet. An admin can set them up."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-24">
      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red mb-3">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-sundown-text">Daily Checklists</h1>
            <p className="text-sundown-muted text-sm font-medium">
              Building {building} · {new Date(today).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklists.map((checklist) => {
          const customTitle = checklist.notes?.startsWith("title:")
            ? checklist.notes.replace("title:", "").trim()
            : "";
          const title = customTitle || `${checklist.checklist_type} Checklist`;
          const items = Array.isArray(checklist.items)
            ? (checklist.items as unknown as ChecklistItem[])
            : [];
          const completedCount = items.filter((i) => i.completed).length;
          const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

          return (
            <Card key={checklist.id} className="border border-sundown-border bg-sundown-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-sundown-text">{title}</h2>
                    <p className="text-xs text-sundown-muted">
                      {completedCount} of {items.length} complete
                    </p>
                  </div>
                  {checklist.completed_at ? (
                    <span className="text-xs font-bold text-sundown-green">Completed</span>
                  ) : (
                    <span className="text-xs font-bold text-sundown-gold">In Progress</span>
                  )}
                </div>

                <div className="h-2 w-full bg-sundown-bg border border-sundown-border rounded-full overflow-hidden">
                  <div className="h-full bg-sundown-gold transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm text-sundown-muted">No items added yet.</p>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(checklist.id, item.id)}
                        className={`w-full text-left p-3 rounded-md border transition-all ${
                          item.completed
                            ? "bg-sundown-bg border-sundown-border opacity-70"
                            : "bg-sundown-card border-sundown-border hover:border-sundown-gold"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${item.completed ? "text-sundown-green" : "text-sundown-muted"}`}>
                            {item.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-bold ${item.completed ? "line-through text-sundown-muted" : "text-sundown-text"}`}>
                              {item.label}
                            </p>
                            {item.completed && item.time && (
                              <p className="text-xs text-sundown-green">{item.time}{item.user ? ` · ${item.user}` : ""}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <Button
                  disabled={progress < 100 || checklist.completed_at !== null || savingId === checklist.id}
                  className="w-full"
                  onClick={() => completeChecklist(checklist.id)}
                >
                  {savingId === checklist.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {checklist.completed_at ? "Checklist Completed" : "Complete Checklist"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

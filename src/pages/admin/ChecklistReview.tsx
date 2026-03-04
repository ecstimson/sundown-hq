import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Calendar as CalendarIcon,
  Loader2,
  ClipboardList,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DailyChecklist } from "@/types/database";
import { useAuth } from "@/lib/auth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function ChecklistReview() {
  const { employee } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now.getDate());
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [dayChecklists, setDayChecklists] = useState<DailyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "Opening Checklist",
    checklist_type: "Opening" as "Opening" | "Feeding-AM" | "Feeding-PM" | "Closing" | "Weekly",
    building: "A" as "A" | "B",
    itemsText: "",
  });

  const TEMPLATE_TITLES = [
    { title: "Opening Checklist", checklist_type: "Opening" as const },
    { title: "Feeding AM Checklist", checklist_type: "Feeding-AM" as const },
    { title: "Feeding PM Checklist", checklist_type: "Feeding-PM" as const },
    { title: "Closing Checklist", checklist_type: "Closing" as const },
    { title: "Weekly Checklist", checklist_type: "Weekly" as const },
  ];

  // Status map for calendar dots: date -> has data
  const [statusMap, setStatusMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function fetchMonth() {
      setLoading(true);
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

      const { data } = await supabase
        .from("daily_checklists")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("created_at");

      if (data) {
        const typedData = data as DailyChecklist[];
        setChecklists(typedData);
        const sm: Record<number, boolean> = {};
        typedData.forEach((c) => {
          const day = parseInt(c.date.split("-")[2]);
          sm[day] = true;
        });
        setStatusMap(sm);
      }
      setLoading(false);
    }
    fetchMonth();
  }, [year, month]);

  // Filter checklists for selected date
  useEffect(() => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    setDayChecklists(checklists.filter((c) => c.date === dateStr));
  }, [selectedDate, checklists, year, month]);

  const weeks = getMonthData(year, month);
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(1);
  };

  function exportDayReport() {
    const dateLabel = new Date(year, month, selectedDate).toISOString().split("T")[0];
    const rows = [["Building", "Checklist Type", "Title", "Completed At", "Items"]];
    for (const checklist of dayChecklists) {
      const title = checklist.notes?.startsWith("title:")
        ? checklist.notes.replace("title:", "").trim()
        : checklist.checklist_type;
      const items = Array.isArray(checklist.items)
        ? (checklist.items as any[]).map((item) => `${item.label}:${item.completed ? "done" : "open"}`).join(" | ")
        : "";
      rows.push([
        checklist.building,
        checklist.checklist_type,
        title,
        checklist.completed_at || "",
        items,
      ]);
    }

    const csv = rows.map((r) => r.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `checklist-report-${dateLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function createChecklistForSelectedDate() {
    setCreateError(null);
    if (!employee) {
      setCreateError("You must be logged in to create checklists.");
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    const labels = createForm.itemsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const items = labels.map((label, idx) => ({
      id: idx + 1,
      label,
      completed: false,
      time: "",
      user: "",
      value: "",
    }));

    const { error } = await supabase.from("daily_checklists").insert({
      date: dateStr,
      building: createForm.building,
      checklist_type: createForm.checklist_type,
      employee_id: employee.id,
      employee_name: employee.name,
      completed_at: null,
      notes: `title: ${createForm.title.trim() || createForm.checklist_type}`,
      items: items as any,
    } as any);

    if (error) {
      setCreateError(error.message);
      return;
    }
    setShowCreateModal(false);
    setCreateForm({
      title: "Opening Checklist",
      checklist_type: "Opening",
      building: "A",
      itemsText: "",
    });
    setSelectedDate(selectedDate); // trigger selected-day refresh via month data refresh below

    // refresh month data
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
    const { data } = await supabase
      .from("daily_checklists")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("created_at");
    if (data) {
      const typedData = data as DailyChecklist[];
      setChecklists(typedData);
      const sm: Record<number, boolean> = {};
      typedData.forEach((c) => {
        const day = parseInt(c.date.split("-")[2]);
        sm[day] = true;
      });
      setStatusMap(sm);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Calendar Section */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">{monthName}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-xs font-medium text-sundown-muted py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map((week, i) =>
                week.map((day, j) => (
                  <div key={`${i}-${j}`} className="aspect-square">
                    {day && (
                      <button
                        onClick={() => setSelectedDate(day)}
                        className={`w-full h-full rounded-md flex flex-col items-center justify-center text-sm transition-all border ${
                          selectedDate === day
                            ? "bg-sundown-gold text-black border-sundown-gold font-bold"
                            : "bg-sundown-card border-sundown-border hover:border-sundown-gold/50 text-sundown-text"
                        }`}
                      >
                        <span>{day}</span>
                        <div className="mt-1">
                          {statusMap[day] ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-sundown-green" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-sundown-muted/30" />
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-sundown-muted">
                <div className="w-2 h-2 rounded-full bg-sundown-green" /> Has Checklists
              </div>
              <div className="flex items-center gap-2 text-xs text-sundown-muted">
                <div className="w-2 h-2 rounded-full bg-sundown-muted/30" /> No Data
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Section */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sundown-text">
              {new Date(year, month, selectedDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            <p className="text-sundown-muted">Daily Operations Report</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportDayReport}>
              <CalendarIcon className="w-4 h-4" /> Export Report
            </Button>
            <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" /> Add Checklist
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
          </div>
        ) : dayChecklists.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No Checklists"
            description="No checklists were logged for this date."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-6">
            {dayChecklists.map((cl) => {
              const items = Array.isArray(cl.items)
                ? (cl.items as unknown as { label: string; completed: boolean; user?: string; time?: string }[])
                : [];
              return (
                <Card key={cl.id}>
                  <CardHeader className="pb-3 border-b border-sundown-border">
                    <div className="flex items-center justify-between">
                      {(() => {
                        const customTitle = cl.notes?.startsWith("title:")
                          ? cl.notes.replace("title:", "").trim()
                          : "";
                        return (
                      <CardTitle>
                        Building {cl.building} - {customTitle || cl.checklist_type}
                      </CardTitle>
                        );
                      })()}
                      {cl.completed_at ? (
                        <span className="px-2 py-1 rounded-full bg-sundown-green/10 text-sundown-green text-xs font-bold uppercase">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-sundown-muted/10 text-sundown-muted text-xs font-bold uppercase">
                          In Progress
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-sundown-border">
                      {items.map((item, i) => (
                        <div key={i} className="p-4 flex items-start gap-3">
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5 text-sundown-green mt-0.5" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-sundown-muted/30 mt-0.5" />
                          )}
                          <div>
                            <p className={`text-sm font-medium ${item.completed ? "text-sundown-text" : "text-sundown-muted"}`}>
                              {item.label}
                            </p>
                            {item.user && (
                              <p className="text-xs text-sundown-muted">
                                {item.user}{item.time ? ` · ${item.time}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="p-4 text-sm text-sundown-muted">No items in this checklist.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border">
              <h3 className="text-lg font-bold text-sundown-text">Create Checklist</h3>
              <p className="text-sm text-sundown-muted">Titles are editable. Add item labels (one per line).</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={createForm.checklist_type}
                  onChange={(e) => {
                    const selected = TEMPLATE_TITLES.find((t) => t.checklist_type === e.target.value);
                    setCreateForm((prev) => ({
                      ...prev,
                      checklist_type: e.target.value as typeof prev.checklist_type,
                      title: selected?.title || prev.title,
                    }));
                  }}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  {TEMPLATE_TITLES.map((tpl) => (
                    <option key={tpl.checklist_type} value={tpl.checklist_type}>{tpl.checklist_type}</option>
                  ))}
                </select>
                <select
                  value={createForm.building}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, building: e.target.value as "A" | "B" }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  <option value="A">Building A</option>
                  <option value="B">Building B</option>
                </select>
              </div>
              <input
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Checklist title"
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <textarea
                value={createForm.itemsText}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, itemsText: e.target.value }))}
                placeholder={"Add checklist items, one per line.\nExample:\nConfirm room temp\nClean water bowls"}
                className="w-full min-h-40 px-3 py-2 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              {createError && (
                <p className="text-sm text-sundown-red">{createError}</p>
              )}
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createChecklistForSelectedDate}>Create Checklist</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
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
  Pencil,
  Trash2,
  X,
  LayoutTemplate,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DailyChecklist, ChecklistTemplate } from "@/types/database";
import { useAuth } from "@/lib/auth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CHECKLIST_TYPES = [
  { title: "Opening Checklist", checklist_type: "Opening" as const },
  { title: "Feeding AM Checklist", checklist_type: "Feeding-AM" as const },
  { title: "Feeding PM Checklist", checklist_type: "Feeding-PM" as const },
  { title: "Closing Checklist", checklist_type: "Closing" as const },
  { title: "Weekly Checklist", checklist_type: "Weekly" as const },
];

interface ChecklistItem {
  id: number;
  label: string;
  completed: boolean;
  time?: string;
  user?: string;
  value?: string;
}

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

function repeatLabel(tpl: ChecklistTemplate): string {
  if (tpl.repeat_rule === "daily") return "Every day";
  if (tpl.repeat_weekdays && tpl.repeat_weekdays.length > 0) {
    return tpl.repeat_weekdays.map((d) => DAYS[d]).join(", ");
  }
  return "Custom";
}

// ─── Inline-editable item row ────────────────────────────────────────────────

function EditableItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: ChecklistItem;
  onSave: (newLabel: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.label) onSave(trimmed);
    else setDraft(item.label);
    setEditing(false);
  }

  return (
    <div className="p-3 flex items-center gap-2 group">
      {item.completed ? (
        <CheckCircle className="w-4 h-4 text-sundown-green shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-sundown-muted/30 shrink-0" />
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(item.label); setEditing(false); }
          }}
          className="flex-1 text-sm bg-sundown-bg border border-sundown-border rounded px-2 py-1 text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm text-sundown-text hover:text-sundown-gold transition-colors cursor-text"
          title="Click to edit"
        >
          {item.label}
        </button>
      )}

      {item.user && !editing && (
        <span className="text-xs text-sundown-muted whitespace-nowrap">
          {item.user}{item.time ? ` · ${item.time}` : ""}
        </span>
      )}

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-sundown-muted hover:text-sundown-red"
        title="Remove item"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChecklistReview() {
  const { employee } = useAuth();
  const now = new Date();

  // Tab state
  const [activeTab, setActiveTab] = useState<"review" | "templates">("review");

  // ── Daily Review state ────────────────────────────────────────
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
  const [statusMap, setStatusMap] = useState<Record<number, boolean>>({});
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState("");
  const newItemRef = useRef<HTMLInputElement>(null);

  // ── Templates state ───────────────────────────────────────────
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: "Opening Checklist",
    checklist_type: "Opening",
    building: "A" as "A" | "B",
    itemsText: "",
    repeat_rule: "daily" as "daily" | "custom_weekdays",
    repeat_weekdays: [] as number[],
    is_active: true,
  });
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  // ── Daily Review data fetch ───────────────────────────────────
  useEffect(() => {
    if (activeTab !== "review") return;
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

    async function fetchMonth() {
      setLoading(true);
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

    const channel = supabase
      .channel(`checklists-admin-${year}-${month}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_checklists" },
        (payload) => {
          const row = payload.new as DailyChecklist;
          if (!row.date || row.date < startDate || row.date > endDate) return;

          if (payload.eventType === "INSERT") {
            setChecklists((prev) => [...prev, row]);
            const day = parseInt(row.date.split("-")[2]);
            setStatusMap((prev) => ({ ...prev, [day]: true }));
          } else if (payload.eventType === "UPDATE") {
            setChecklists((prev) => prev.map((c) => (c.id === row.id ? row : c)));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [year, month, activeTab]);

  useEffect(() => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    setDayChecklists(checklists.filter((c) => c.date === dateStr));
  }, [selectedDate, checklists, year, month]);

  // ── Templates data fetch ──────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "templates") return;
    async function fetchTemplates() {
      setTemplatesLoading(true);
      const { data } = await supabase
        .from("checklist_templates")
        .select("*")
        .order("building")
        .order("checklist_type");
      setTemplates((data as ChecklistTemplate[]) || []);
      setTemplatesLoading(false);
    }
    fetchTemplates();
  }, [activeTab]);

  // ── Calendar helpers ──────────────────────────────────────────
  const weeks = getMonthData(year, month);
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(1);
  };

  // ── Daily Review actions ──────────────────────────────────────

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
      rows.push([checklist.building, checklist.checklist_type, title, checklist.completed_at || "", items]);
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
    if (!employee) { setCreateError("You must be logged in to create checklists."); return; }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    const labels = createForm.itemsText.split("\n").map((l) => l.trim()).filter(Boolean);
    const items = labels.map((label, idx) => ({
      id: idx + 1, label, completed: false, time: "", user: "", value: "",
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

    if (error) { setCreateError(error.message); return; }
    setShowCreateModal(false);
    setCreateForm({ title: "Opening Checklist", checklist_type: "Opening", building: "A", itemsText: "" });
  }

  // ── Inline item editing for daily checklists ──────────────────

  async function updateChecklistItems(checklistId: string, items: ChecklistItem[]) {
    const renumbered = items.map((it, i) => ({ ...it, id: i + 1 }));
    const { error } = await (supabase.from("daily_checklists") as any)
      .update({ items: renumbered as any })
      .eq("id", checklistId);
    if (!error) {
      setChecklists((prev) => prev.map((c) => (c.id === checklistId ? { ...c, items: renumbered as any } : c)));
    }
  }

  function handleItemLabelSave(checklistId: string, items: ChecklistItem[], itemId: number, newLabel: string) {
    const updated = items.map((it) => (it.id === itemId ? { ...it, label: newLabel } : it));
    updateChecklistItems(checklistId, updated);
  }

  function handleItemRemove(checklistId: string, items: ChecklistItem[], itemId: number) {
    const updated = items.filter((it) => it.id !== itemId);
    updateChecklistItems(checklistId, updated);
  }

  function handleItemAdd(checklistId: string, items: ChecklistItem[], label: string) {
    const next: ChecklistItem = { id: items.length + 1, label, completed: false, time: "", user: "", value: "" };
    updateChecklistItems(checklistId, [...items, next]);
    setAddingItemTo(null);
    setNewItemLabel("");
  }

  // ── Template CRUD ─────────────────────────────────────────────

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({
      title: "Opening Checklist", checklist_type: "Opening", building: "A",
      itemsText: "", repeat_rule: "daily", repeat_weekdays: [], is_active: true,
    });
    setTemplateError(null);
    setShowTemplateModal(true);
  }

  function openEditTemplate(tpl: ChecklistTemplate) {
    const items = Array.isArray(tpl.items)
      ? (tpl.items as any[]).map((it: any) => it.label as string)
      : [];
    setEditingTemplate(tpl);
    setTemplateForm({
      title: tpl.title,
      checklist_type: tpl.checklist_type,
      building: tpl.building,
      itemsText: items.join("\n"),
      repeat_rule: tpl.repeat_rule,
      repeat_weekdays: tpl.repeat_weekdays || [],
      is_active: tpl.is_active,
    });
    setTemplateError(null);
    setShowTemplateModal(true);
  }

  async function saveTemplate() {
    setTemplateError(null);
    if (!employee) { setTemplateError("You must be logged in."); return; }

    const labels = templateForm.itemsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (labels.length === 0) { setTemplateError("Add at least one item."); return; }
    if (templateForm.repeat_rule === "custom_weekdays" && templateForm.repeat_weekdays.length === 0) {
      setTemplateError("Select at least one weekday."); return;
    }

    const items = labels.map((label, idx) => ({ id: idx + 1, label }));
    const payload = {
      title: templateForm.title.trim() || templateForm.checklist_type,
      checklist_type: templateForm.checklist_type,
      building: templateForm.building,
      items: items as any,
      repeat_rule: templateForm.repeat_rule,
      repeat_weekdays: templateForm.repeat_rule === "custom_weekdays" ? templateForm.repeat_weekdays : null,
      is_active: templateForm.is_active,
      ...(editingTemplate ? {} : { created_by: employee.id }),
    };

    if (editingTemplate) {
      const { data, error } = await (supabase.from("checklist_templates") as any)
        .update(payload).eq("id", editingTemplate.id).select().single();
      if (error) { setTemplateError(error.message); return; }
      setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? (data as ChecklistTemplate) : t)));
    } else {
      const { data, error } = await (supabase.from("checklist_templates") as any)
        .insert(payload).select().single();
      if (error) { setTemplateError(error.message); return; }
      setTemplates((prev) => [...prev, data as ChecklistTemplate]);
    }

    setShowTemplateModal(false);
  }

  async function toggleTemplateActive(tpl: ChecklistTemplate) {
    const { data, error } = await (supabase.from("checklist_templates") as any)
      .update({ is_active: !tpl.is_active }).eq("id", tpl.id).select().single();
    if (!error && data) {
      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? (data as ChecklistTemplate) : t)));
    }
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
    if (!error) setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeletingTemplate(null);
  }

  function toggleWeekday(day: number) {
    setTemplateForm((prev) => {
      const has = prev.repeat_weekdays.includes(day);
      return {
        ...prev,
        repeat_weekdays: has
          ? prev.repeat_weekdays.filter((d) => d !== day)
          : [...prev.repeat_weekdays, day].sort((a, b) => a - b),
      };
    });
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-sundown-border">
        <button
          onClick={() => setActiveTab("review")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "review"
              ? "border-sundown-gold text-sundown-gold"
              : "border-transparent text-sundown-muted hover:text-sundown-text"
          }`}
        >
          <CalendarIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Daily Review
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-sundown-gold text-sundown-gold"
              : "border-transparent text-sundown-muted hover:text-sundown-text"
          }`}
        >
          <LayoutTemplate className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Templates
        </button>
      </div>

      {/* ═══ DAILY REVIEW TAB ═══ */}
      {activeTab === "review" && (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
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
                    <div key={d} className="text-xs font-medium text-sundown-muted py-1">{d}</div>
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
                    month: "long", day: "numeric", year: "numeric",
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
                  const items: ChecklistItem[] = Array.isArray(cl.items)
                    ? (cl.items as unknown as ChecklistItem[])
                    : [];
                  const customTitle = cl.notes?.startsWith("title:")
                    ? cl.notes.replace("title:", "").trim()
                    : "";
                  return (
                    <Card key={cl.id}>
                      <CardHeader className="pb-3 border-b border-sundown-border">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Building {cl.building} - {customTitle || cl.checklist_type}
                          </CardTitle>
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
                          {items.map((item) => (
                            <EditableItemRow
                              key={item.id}
                              item={item}
                              onSave={(newLabel) => handleItemLabelSave(cl.id, items, item.id, newLabel)}
                              onRemove={() => handleItemRemove(cl.id, items, item.id)}
                            />
                          ))}
                          {items.length === 0 && (
                            <p className="p-4 text-sm text-sundown-muted">No items in this checklist.</p>
                          )}
                        </div>
                        {/* Add new item */}
                        {addingItemTo === cl.id ? (
                          <div className="p-3 flex items-center gap-2 border-t border-sundown-border">
                            <input
                              ref={newItemRef}
                              value={newItemLabel}
                              onChange={(e) => setNewItemLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newItemLabel.trim()) handleItemAdd(cl.id, items, newItemLabel.trim());
                                if (e.key === "Escape") { setAddingItemTo(null); setNewItemLabel(""); }
                              }}
                              placeholder="New item label"
                              autoFocus
                              className="flex-1 text-sm bg-sundown-bg border border-sundown-border rounded px-2 py-1 text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { if (newItemLabel.trim()) handleItemAdd(cl.id, items, newItemLabel.trim()); }}
                            >
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setAddingItemTo(null); setNewItemLabel(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingItemTo(cl.id); setNewItemLabel(""); }}
                            className="w-full p-2 text-xs text-sundown-muted hover:text-sundown-gold border-t border-sundown-border flex items-center justify-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add item
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Checklist Modal */}
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
                        const selected = CHECKLIST_TYPES.find((t) => t.checklist_type === e.target.value);
                        setCreateForm((prev) => ({
                          ...prev,
                          checklist_type: e.target.value as typeof prev.checklist_type,
                          title: selected?.title || prev.title,
                        }));
                      }}
                      className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                    >
                      {CHECKLIST_TYPES.map((tpl) => (
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
                  {createError && <p className="text-sm text-sundown-red">{createError}</p>}
                </div>
                <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button onClick={createChecklistForSelectedDate}>Create Checklist</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-sundown-text">Checklist Templates</h2>
              <p className="text-sundown-muted">Auto-generate daily checklists from recurring templates.</p>
            </div>
            <Button className="gap-2" onClick={openCreateTemplate}>
              <Plus className="w-4 h-4" /> Create Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="No Templates"
              description="Create a template to auto-generate daily checklists for your team."
            />
          ) : (
            <>
              {(["A", "B"] as const).map((bldg) => {
                const group = templates.filter((t) => t.building === bldg);
                if (group.length === 0) return null;
                return (
                  <div key={bldg} className="mb-8">
                    <h3 className="text-lg font-semibold text-sundown-text mb-3">Building {bldg}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.map((tpl) => {
                        const items = Array.isArray(tpl.items) ? (tpl.items as any[]) : [];
                        return (
                          <Card key={tpl.id} className={!tpl.is_active ? "opacity-50" : ""}>
                            <CardHeader className="pb-3 border-b border-sundown-border">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <CardTitle className="text-base truncate">{tpl.title}</CardTitle>
                                  <p className="text-xs text-sundown-muted mt-0.5">
                                    {tpl.checklist_type} &middot; {repeatLabel(tpl)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => toggleTemplateActive(tpl)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                      tpl.is_active
                                        ? "bg-sundown-green/10 text-sundown-green hover:bg-sundown-green/20"
                                        : "bg-sundown-muted/10 text-sundown-muted hover:bg-sundown-muted/20"
                                    }`}
                                  >
                                    {tpl.is_active ? "Active" : "Paused"}
                                  </button>
                                  <button
                                    onClick={() => openEditTemplate(tpl)}
                                    className="p-1 text-sundown-muted hover:text-sundown-gold transition-colors"
                                    title="Edit template"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingTemplate(tpl.id)}
                                    className="p-1 text-sundown-muted hover:text-sundown-red transition-colors"
                                    title="Delete template"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="divide-y divide-sundown-border">
                                {items.map((item: any, i: number) => (
                                  <div key={i} className="px-3 py-2 text-sm text-sundown-text">
                                    {item.label}
                                  </div>
                                ))}
                                {items.length === 0 && (
                                  <p className="p-3 text-sm text-sundown-muted">No items.</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Template Create/Edit Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-xl border border-sundown-border bg-sundown-card max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-sundown-border">
                  <h3 className="text-lg font-bold text-sundown-text">
                    {editingTemplate ? "Edit Template" : "Create Template"}
                  </h3>
                  <p className="text-sm text-sundown-muted">
                    Define items and a repeat schedule. Active templates auto-create daily checklists.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={templateForm.checklist_type}
                      onChange={(e) => {
                        const selected = CHECKLIST_TYPES.find((t) => t.checklist_type === e.target.value);
                        setTemplateForm((prev) => ({
                          ...prev,
                          checklist_type: e.target.value,
                          title: selected?.title || prev.title,
                        }));
                      }}
                      className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                    >
                      {CHECKLIST_TYPES.map((ct) => (
                        <option key={ct.checklist_type} value={ct.checklist_type}>{ct.checklist_type}</option>
                      ))}
                    </select>
                    <select
                      value={templateForm.building}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, building: e.target.value as "A" | "B" }))}
                      className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                    >
                      <option value="A">Building A</option>
                      <option value="B">Building B</option>
                    </select>
                  </div>

                  <input
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Template title"
                    className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                  />

                  <textarea
                    value={templateForm.itemsText}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, itemsText: e.target.value }))}
                    placeholder={"Checklist items, one per line.\nExample:\nConfirm room temp\nClean water bowls"}
                    className="w-full min-h-32 px-3 py-2 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                  />

                  {/* Repeat schedule */}
                  <div>
                    <label className="block text-sm font-medium text-sundown-text mb-2">Repeat Schedule</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-sm text-sundown-text cursor-pointer">
                        <input
                          type="radio"
                          name="repeat_rule"
                          checked={templateForm.repeat_rule === "daily"}
                          onChange={() => setTemplateForm((prev) => ({ ...prev, repeat_rule: "daily", repeat_weekdays: [] }))}
                          className="accent-sundown-gold"
                        />
                        Every day
                      </label>
                      <label className="flex items-center gap-2 text-sm text-sundown-text cursor-pointer">
                        <input
                          type="radio"
                          name="repeat_rule"
                          checked={templateForm.repeat_rule === "custom_weekdays"}
                          onChange={() => setTemplateForm((prev) => ({ ...prev, repeat_rule: "custom_weekdays" }))}
                          className="accent-sundown-gold"
                        />
                        Specific days
                      </label>
                    </div>

                    {templateForm.repeat_rule === "custom_weekdays" && (
                      <div className="flex gap-1.5 mt-3">
                        {DAYS.map((label, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleWeekday(idx)}
                            className={`w-9 h-9 rounded-md text-xs font-medium border transition-colors ${
                              templateForm.repeat_weekdays.includes(idx)
                                ? "bg-sundown-gold text-black border-sundown-gold"
                                : "bg-sundown-bg text-sundown-muted border-sundown-border hover:border-sundown-gold/50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active toggle */}
                  <label className="flex items-center gap-2 text-sm text-sundown-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.is_active}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="accent-sundown-gold"
                    />
                    Active (generates checklists automatically)
                  </label>

                  {templateError && <p className="text-sm text-sundown-red">{templateError}</p>}
                </div>
                <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
                  <Button onClick={saveTemplate}>
                    {editingTemplate ? "Save Changes" : "Create Template"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {deletingTemplate && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-xl border border-sundown-border bg-sundown-card p-6 text-center space-y-4">
                <h3 className="text-lg font-bold text-sundown-text">Delete Template?</h3>
                <p className="text-sm text-sundown-muted">
                  This won't affect checklists already generated from this template.
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => deleteTemplate(deletingTemplate)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

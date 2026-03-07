import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Loader2, Plus, CheckCircle, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import EventModal from "@/components/EventModal";
import type { ChecklistItemData } from "@/components/EventModal";
import {
  WEEKDAYS,
  toDateKey,
  getMonthGrid,
  eventOccursOnDate,
  formatEventTime,
  formatRepeatRule,
} from "@/lib/calendarHelpers";
import type { Calendar, CalendarEvent } from "@/types/database";

export default function EmployeeSchedule() {
  const { employee } = useAuth();
  const todayKey = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayKey);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const selected = new Date(`${date}T00:00:00`);
  const [calYear, setCalYear] = useState(selected.getFullYear());
  const [calMonth, setCalMonth] = useState(selected.getMonth());

  const monthStart = useMemo(() => toDateKey(calYear, calMonth, 1), [calYear, calMonth]);
  const monthEnd = useMemo(
    () => toDateKey(calYear, calMonth, new Date(calYear, calMonth + 1, 0).getDate()),
    [calYear, calMonth]
  );
  const monthGrid = useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth]);
  const monthLabel = useMemo(
    () => new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    [calYear, calMonth]
  );

  useEffect(() => {
    const d = new Date(`${date}T00:00:00`);
    if (d.getFullYear() !== calYear || d.getMonth() !== calMonth) {
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
  }, [date, calYear, calMonth]);

  useEffect(() => {
    fetchData();
  }, [monthStart, monthEnd]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    const [{ data: cals, error: calErr }, { data: evts, error: evtErr }] = await Promise.all([
      supabase.from("calendars").select("*").order("name"),
      supabase
        .from("calendar_events")
        .select("*")
        .or(
          // Non-recurring or multi-day: overlap the visible month window
          `and(start_at.lte.${monthEnd}T23:59:59,end_at.gte.${monthStart}T00:00:00),` +
          // Recurring templates: started on or before month end and not yet expired
          `and(repeat_rule.neq.none,start_at.lte.${monthEnd}T23:59:59,or(repeat_until.is.null,repeat_until.gte.${monthStart}))`
        )
        .order("start_at"),
    ]);

    if (calErr || evtErr) {
      setError(calErr?.message || evtErr?.message || "Failed to load calendar data.");
    }
    setCalendars((cals as Calendar[]) || []);
    setEvents((evts as CalendarEvent[]) || []);
    setLoading(false);
  }

  const monthActivity = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const map: Record<string, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(calYear, calMonth, day);
      const count = events.filter((e) => eventOccursOnDate(e, key)).length;
      if (count > 0) map[key] = count;
    }
    return map;
  }, [events, calYear, calMonth]);

  const selectedEvents = useMemo(
    () =>
      events
        .filter((e) => eventOccursOnDate(e, date))
        .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [events, date]
  );

  const calendarColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of calendars) m[c.id] = c.color;
    return m;
  }, [calendars]);

  function move(dir: "prev" | "next") {
    if (dir === "prev") {
      if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
      else setCalMonth((m) => m - 1);
    } else {
      if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
      else setCalMonth((m) => m + 1);
    }
  }

  function handleDateClick(dayKey: string) {
    if (dayKey === date) {
      setEditingEvent(null);
      setShowEventModal(true);
    } else {
      setDate(dayKey);
    }
  }

  function openEditEvent(event: CalendarEvent) {
    setEditingEvent(event);
    setShowEventModal(true);
  }

  const selectedDateObj = new Date(`${date}T00:00:00`);
  const dayNum = selectedDateObj.getDate();
  const dayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const defaultCalId = calendars[0]?.id || "";

  return (
    <div className="space-y-4 pb-36">
      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {error}
        </div>
      )}

      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-bold tracking-wide text-sundown-text uppercase">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => move("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => move("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-xs text-sundown-muted px-1">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center font-semibold py-1">{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="space-y-1 px-1">
        {monthGrid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (!day) return <div key={`${wi}-${di}`} className="h-14" />;
              const dayKey = toDateKey(calYear, calMonth, day);
              const isSelected = dayKey === date;
              const isToday = dayKey === todayKey;
              const count = monthActivity[dayKey] || 0;
              return (
                <button
                  key={dayKey}
                  onClick={() => handleDateClick(dayKey)}
                  className="h-14 flex flex-col items-center justify-center relative"
                >
                  <span
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors ${
                      isSelected
                        ? "bg-sundown-gold/20 text-sundown-text font-bold"
                        : isToday
                          ? "ring-1 ring-sundown-gold/50 text-sundown-text font-semibold"
                          : "text-sundown-muted"
                    }`}
                  >
                    {day}
                  </span>
                  {count > 0 && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                        <span key={j} className="w-1 h-1 rounded-full bg-sundown-gold" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <div className="border-t border-sundown-border pt-4 px-1 space-y-3">
        <h3 className="text-2xl font-bold text-sundown-text">
          {dayNum}
          <span className="text-sm font-semibold text-sundown-muted ml-2">{dayName}</span>
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-sundown-gold" />
          </div>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-sundown-muted">No events for this day. Tap + to create one.</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((event) => {
              const color = calendarColorMap[event.calendar_id] || "#D4A843";
              const checklistItems = Array.isArray(event.checklist_items)
                ? (event.checklist_items as unknown as ChecklistItemData[])
                : [];
              const hasChecklist = checklistItems.length > 0;
              const completedCount = checklistItems.filter((i) => i.completed).length;

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-sundown-border bg-sundown-bg overflow-hidden"
                >
                  <button
                    onClick={() => openEditEvent(event)}
                    className="w-full text-left px-3 py-2 hover:bg-sundown-card/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sundown-text font-semibold truncate">{event.title}</p>
                        <p className="text-xs text-sundown-muted">
                          {formatEventTime(event)}
                          {event.location ? ` · ${event.location}` : ""}
                          {hasChecklist ? ` · ${completedCount}/${checklistItems.length} done` : ""}
                        </p>
                      </div>
                    </div>
                  </button>

                  {hasChecklist && (
                    <div className="border-t border-sundown-border px-3 py-2 space-y-1">
                      {checklistItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={async () => {
                            const updated = checklistItems.map((ci) =>
                              ci.id === item.id
                                ? {
                                    ...ci,
                                    completed: !ci.completed,
                                    completed_by: !ci.completed ? employee?.name || "" : "",
                                    completed_at: !ci.completed ? new Date().toISOString() : "",
                                  }
                                : ci
                            );
                            await (supabase.from("calendar_events") as any)
                              .update({ checklist_items: updated })
                              .eq("id", event.id);
                            setEvents((prev) =>
                              prev.map((e) =>
                                e.id === event.id
                                  ? { ...e, checklist_items: updated as any }
                                  : e
                              )
                            );
                          }}
                          className="w-full text-left flex items-center gap-2 py-1 group"
                        >
                          <div className={item.completed ? "text-sundown-green" : "text-sundown-muted"}>
                            {item.completed ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </div>
                          <span
                            className={`text-sm flex-1 ${
                              item.completed
                                ? "line-through text-sundown-muted"
                                : "text-sundown-text"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.completed && item.completed_by && (
                            <span className="text-[10px] text-sundown-green">
                              {item.completed_by}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingEvent(null);
          setShowEventModal(true);
        }}
        className="allow-circle fixed bottom-28 right-5 h-16 w-16 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-colors flex items-center justify-center z-40"
        aria-label="Add event"
      >
        <Plus className="w-8 h-8" strokeWidth={2.6} />
      </button>

      {/* Event modal */}
      <EventModal
        open={showEventModal}
        onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
        onSaved={fetchData}
        calendars={calendars}
        defaultDate={date}
        defaultCalendarId={defaultCalId}
        editEvent={editingEvent}
      />
    </div>
  );
}

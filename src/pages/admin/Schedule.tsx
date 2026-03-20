import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Loader2, CirclePlus, ClipboardList, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import EventModal from "@/components/EventModal";
import {
  WEEKDAYS,
  toDateKey,
  getMonthGrid,
  eventOccursOnDate,
  formatEventTime,
  formatRepeatRule,
} from "@/lib/calendarHelpers";
import type { Calendar, CalendarEvent, DailyChecklist } from "@/types/database";

export default function AdminSchedule() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const todayKey = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayKey);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState("all");

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
    const [{ data: cals, error: calErr }, { data: evts, error: evtErr }, { data: cls }] = await Promise.all([
      supabase.from("calendars").select("*").order("name"),
      supabase
        .from("calendar_events")
        .select("*")
        .or(
          `and(start_at.lte.${monthEnd}T23:59:59,end_at.gte.${monthStart}T00:00:00),` +
          `and(repeat_rule.neq.none,start_at.lte.${monthEnd}T23:59:59,or(repeat_until.is.null,repeat_until.gte.${monthStart}))`
        )
        .order("start_at"),
      supabase
        .from("daily_checklists")
        .select("id, date, checklist_type, building, completed_at, items, notes")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("created_at"),
    ]);

    if (calErr || evtErr) {
      setError(calErr?.message || evtErr?.message || "Failed to load calendar data.");
    }
    setCalendars((cals as Calendar[]) || []);
    setEvents((evts as CalendarEvent[]) || []);
    setChecklists((cls as DailyChecklist[]) || []);
    if (selectedCalendarId !== "all" && cals && !(cals as Calendar[]).some((c) => c.id === selectedCalendarId)) {
      setSelectedCalendarId("all");
    }
    setLoading(false);
  }

  const filteredEvents = useMemo(
    () => selectedCalendarId === "all" ? events : events.filter((e) => e.calendar_id === selectedCalendarId),
    [events, selectedCalendarId]
  );

  const monthActivity = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const map: Record<string, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(calYear, calMonth, day);
      const count = filteredEvents.filter((e) => eventOccursOnDate(e, key)).length;
      if (count > 0) map[key] = count;
    }
    return map;
  }, [filteredEvents, calYear, calMonth]);

  const selectedEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => eventOccursOnDate(e, date))
        .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [filteredEvents, date]
  );

  const checklistActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cl of checklists) {
      map[cl.date] = (map[cl.date] || 0) + 1;
    }
    return map;
  }, [checklists]);

  const selectedChecklists = useMemo(
    () => checklists.filter((cl) => cl.date === date),
    [checklists, date]
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
  const defaultCalId = selectedCalendarId !== "all" ? selectedCalendarId : calendars[0]?.id || "";

  return (
    <div className="space-y-4 pb-24">
      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {error}
        </div>
      )}

      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-wide text-sundown-text uppercase">{monthLabel}</h2>
          {calendars.length > 0 && (
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="h-8 px-2 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text"
            >
              <option value="all">All Calendars</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>{cal.name}</option>
              ))}
            </select>
          )}
        </div>
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
              const evtCount = monthActivity[dayKey] || 0;
              const clCount = checklistActivity[dayKey] || 0;
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
                  {(evtCount > 0 || clCount > 0) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {Array.from({ length: Math.min(evtCount, 3) }).map((_, j) => (
                        <span key={`e${j}`} className="w-1 h-1 rounded-full bg-sundown-gold" />
                      ))}
                      {clCount > 0 && (
                        <span className="w-1 h-1 rounded-full bg-sundown-green" />
                      )}
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
        ) : selectedEvents.length === 0 && selectedChecklists.length === 0 ? (
          <p className="text-sm text-sundown-muted">No events for this day. Tap + to create one.</p>
        ) : (
          <>
            {selectedEvents.length > 0 && (
              <div className="space-y-2">
                {selectedEvents.map((event) => {
                  const color = calendarColorMap[event.calendar_id] || "#D4A843";
                  return (
                    <button
                      key={event.id}
                      onClick={() => openEditEvent(event)}
                      className="w-full text-left rounded-xl border border-sundown-border bg-sundown-bg px-3 py-2 hover:border-sundown-gold/40 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sundown-text font-semibold truncate">{event.title}</p>
                          <p className="text-xs text-sundown-muted">
                            {formatEventTime(event)}
                            {event.location ? ` · ${event.location}` : ""}
                          </p>
                          {event.repeat_rule && event.repeat_rule !== "none" && (
                            <p className="text-xs text-sundown-muted">
                              {formatRepeatRule(event)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedChecklists.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-sundown-muted uppercase tracking-wide flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Checklists
                </h4>
                {selectedChecklists.map((cl) => {
                  const rawItems = Array.isArray(cl.items) ? (cl.items as any[]) : [];
                  const items = rawItems.filter((i): i is { completed?: boolean } => i != null && typeof i === "object");
                  const done = items.filter((i) => i.completed).length;
                  const total = items.length;
                  const notes = typeof cl.notes === "string" ? cl.notes : "";
                  const title = notes.startsWith("title:")
                    ? notes.replace("title:", "").trim()
                    : cl.checklist_type;
                  return (
                    <button
                      key={cl.id}
                      onClick={() => navigate("/admin/checklists")}
                      className="w-full text-left rounded-xl border border-sundown-border bg-sundown-bg px-3 py-2 hover:border-sundown-green/40 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5 bg-sundown-green" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sundown-text font-semibold truncate">
                            Bldg {cl.building} — {title}
                          </p>
                          <p className="text-xs text-sundown-muted flex items-center gap-1">
                            {cl.completed_at ? (
                              <><CheckCircle className="w-3 h-3 text-sundown-green" /> Complete</>
                            ) : (
                              <>{done}/{total} items done</>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingEvent(null);
          setShowEventModal(true);
        }}
        className="fixed bottom-28 right-5 lg:bottom-8 lg:right-8 h-14 w-14 rounded-full bg-sundown-gold text-black shadow-lg shadow-sundown-gold/30 hover:bg-sundown-gold-hover transition-colors flex items-center justify-center z-30"
        aria-label="Add event"
      >
        <CirclePlus className="w-6 h-6" />
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

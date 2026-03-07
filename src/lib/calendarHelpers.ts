import type { CalendarEvent } from "@/types/database";

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEKDAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const REPEAT_RULES = ["none", "daily", "weekly", "monthly", "yearly", "custom_weekdays"] as const;
export type RepeatRule = (typeof REPEAT_RULES)[number];

export const REMINDER_OPTIONS = [
  { label: "None", value: 0 },
  { label: "At time of event", value: 0 },
  { label: "5 minutes before", value: 5 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
] as const;

export function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function getMonthGrid(year: number, month: number) {
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

function getDayDiff(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function getMonthDiff(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function eventOccursOnDate(event: CalendarEvent, dateKey: string): boolean {
  const eventStart = new Date(event.start_at);
  const eventEnd = new Date(event.end_at);
  const target = toDate(dateKey);

  const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

  if (event.all_day || getDayDiff(eventStartDate, eventEndDate) > 0) {
    if (target >= eventStartDate && target <= eventEndDate) return true;
  }

  const rule = (event.repeat_rule || "none") as RepeatRule;
  const interval = Math.max(event.repeat_interval || 1, 1);

  if (rule === "none") {
    return target >= eventStartDate && target <= eventEndDate;
  }

  if (event.repeat_until && target > toDate(event.repeat_until)) return false;
  if (target < eventStartDate) return false;

  const diff = getDayDiff(eventStartDate, target);

  if (rule === "daily") return diff % interval === 0;
  if (rule === "weekly") return diff % (7 * interval) === 0;

  if (rule === "custom_weekdays") {
    const weekdays: number[] = (event.repeat_weekdays as number[] | null) ?? [];
    if (weekdays.length === 0) return false;
    return weekdays.includes(target.getDay());
  }

  if (rule === "yearly") {
    return (
      eventStartDate.getMonth() === target.getMonth() &&
      eventStartDate.getDate() === target.getDate()
    );
  }

  const mDiff = getMonthDiff(eventStartDate, target);
  return mDiff >= 0 && mDiff % interval === 0 && eventStartDate.getDate() === target.getDate();
}

export function generateShareSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 10; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.all_day) return "All day";
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatRepeatRule(event: CalendarEvent): string {
  const rule = (event.repeat_rule || "none") as RepeatRule;
  if (rule === "none") return "";
  if (rule === "custom_weekdays") {
    const weekdays: number[] = (event.repeat_weekdays as number[] | null) ?? [];
    if (weekdays.length === 0) return "Custom days";
    const sorted = [...weekdays].sort((a, b) => a - b);
    const names = sorted.map((d) => WEEKDAY_LABELS_SHORT[d]).join(", ");
    return `Every ${names}`;
  }
  const interval = event.repeat_interval || 1;
  if (interval > 1) {
    const unitMap: Record<string, string> = {
      daily: "days",
      weekly: "weeks",
      monthly: "months",
      yearly: "years",
    };
    return `Every ${interval} ${unitMap[rule] ?? rule}`;
  }
  const labelMap: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  };
  return labelMap[rule] ?? rule;
}

export function formatDateRange(event: CalendarEvent): string {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const dateFmt = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (sameDay) return dateFmt(start);
  return `${dateFmt(start)} – ${dateFmt(end)}`;
}

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, X, Link2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { REPEAT_RULES, REMINDER_OPTIONS, generateShareSlug } from "@/lib/calendarHelpers";
import type { RepeatRule } from "@/lib/calendarHelpers";
import type { Calendar, CalendarEvent, EventAttachment } from "@/types/database";

export type EventFormData = {
  id?: string;
  calendar_id: string;
  title: string;
  description: string;
  location: string;
  all_day: boolean;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  repeat_rule: RepeatRule;
  repeat_interval: number;
  repeat_until: string;
  reminder_minutes: number;
  share_slug: string;
};

function emptyForm(dateKey: string, defaultCalendarId: string): EventFormData {
  return {
    calendar_id: defaultCalendarId,
    title: "",
    description: "",
    location: "",
    all_day: false,
    start_date: dateKey,
    start_time: "09:00",
    end_date: dateKey,
    end_time: "10:00",
    repeat_rule: "none",
    repeat_interval: 1,
    repeat_until: "",
    reminder_minutes: 0,
    share_slug: "",
  };
}

function eventToForm(event: CalendarEvent): EventFormData {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return {
    id: event.id,
    calendar_id: event.calendar_id,
    title: event.title,
    description: event.description || "",
    location: event.location || "",
    all_day: event.all_day,
    start_date: startDate,
    start_time: event.all_day ? "00:00" : `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    end_date: endDate,
    end_time: event.all_day ? "23:59" : `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    repeat_rule: (event.repeat_rule || "none") as RepeatRule,
    repeat_interval: event.repeat_interval || 1,
    repeat_until: event.repeat_until || "",
    reminder_minutes: event.reminder_minutes?.length ? event.reminder_minutes[0] : 0,
    share_slug: event.share_slug || "",
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  calendars: Calendar[];
  defaultDate: string;
  defaultCalendarId: string;
  editEvent?: CalendarEvent | null;
};

export default function EventModal({
  open,
  onClose,
  onSaved,
  calendars,
  defaultDate,
  defaultCalendarId,
  editEvent,
}: Props) {
  const { employee } = useAuth();
  const [form, setForm] = useState<EventFormData>(emptyForm(defaultDate, defaultCalendarId));
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setForm(eventToForm(editEvent));
      loadAttachments(editEvent.id);
    } else {
      setForm(emptyForm(defaultDate, defaultCalendarId));
      setAttachments([]);
    }
    setError(null);
    setCopied(false);
  }, [open, editEvent, defaultDate, defaultCalendarId]);

  async function loadAttachments(eventId: string) {
    const { data } = await supabase
      .from("event_attachments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at");
    setAttachments((data as EventAttachment[]) || []);
  }

  function buildTimestamp(date: string, time: string) {
    return `${date}T${time}:00`;
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      calendar_id: form.calendar_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      all_day: form.all_day,
      start_at: form.all_day
        ? buildTimestamp(form.start_date, "00:00")
        : buildTimestamp(form.start_date, form.start_time),
      end_at: form.all_day
        ? buildTimestamp(form.end_date, "23:59")
        : buildTimestamp(form.end_date, form.end_time),
      repeat_rule: form.repeat_rule,
      repeat_interval: form.repeat_interval,
      repeat_until: form.repeat_until || null,
      reminder_minutes: form.reminder_minutes > 0 ? [form.reminder_minutes] : [],
      share_slug: form.share_slug || null,
      created_by: employee?.id ?? null,
    };

    let insertError: { message: string } | null = null;
    if (form.id) {
      const result = await (supabase
        .from("calendar_events") as any)
        .update(payload)
        .eq("id", form.id);
      insertError = result.error;
    } else {
      const result = await (supabase
        .from("calendar_events") as any)
        .insert(payload);
      insertError = result.error;
    }

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!form.id) return;
    setSaving(true);
    const { error: err } = await supabase.from("calendar_events").delete().eq("id", form.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  }

  function handleGenerateLink() {
    const slug = generateShareSlug();
    setForm((prev) => ({ ...prev, share_slug: slug }));
  }

  function handleCopyLink() {
    if (!form.share_slug) return;
    const url = `${window.location.origin}/schedule/event/${form.share_slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!form.id || !e.target.files?.length) return;
    const file = e.target.files[0];
    setError(null);

    const path = `event-attachments/${form.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("calendar-files")
      .upload(path, file);

    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("calendar-files").getPublicUrl(path);
    const fileUrl = urlData?.publicUrl || path;

    const { error: attachErr } = await supabase.from("event_attachments").insert({
      event_id: form.id,
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: employee?.id ?? null,
    } as any);

    if (attachErr) {
      setError(`Attachment save failed: ${attachErr.message}`);
      return;
    }
    await loadAttachments(form.id);
  }

  if (!open) return null;

  const isEditing = Boolean(form.id);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-sundown-border bg-sundown-card max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-sundown-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-sundown-text">
            {isEditing ? "Edit Event" : "New Event"}
          </h3>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={saving}>
                <Trash2 className="w-4 h-4 text-sundown-red" />
              </Button>
            )}
            <button onClick={onClose} className="text-sundown-muted hover:text-sundown-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
              {error}
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="Add title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="h-12 w-full px-3 rounded-md border-b border-sundown-border bg-transparent text-lg text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold"
          />

          {/* Calendar selector */}
          {calendars.length > 1 && (
            <div>
              <label className="text-xs text-sundown-muted block mb-1">Calendar</label>
              <select
                value={form.calendar_id}
                onChange={(e) => setForm((p) => ({ ...p, calendar_id: e.target.value }))}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* All day toggle */}
          <label className="flex items-center gap-3 text-sm text-sundown-text cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full relative transition-colors ${
                form.all_day ? "bg-sundown-gold" : "bg-sundown-border"
              }`}
              onClick={() => setForm((p) => ({ ...p, all_day: !p.all_day }))}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  form.all_day ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </div>
            All day
          </label>

          {/* Start / End dates and times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-sundown-muted block mb-1">Start</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((p) => ({
                    ...p,
                    start_date: v,
                    end_date: v > p.end_date ? v : p.end_date,
                  }));
                }}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
            </div>
            <div>
              <label className="text-xs text-sundown-muted block mb-1">End</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                min={form.start_date}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
            </div>
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sundown-muted block mb-1">Start time</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
              <div>
                <label className="text-xs text-sundown-muted block mb-1">End time</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="text-xs text-sundown-muted block mb-1">Location</label>
            <input
              type="text"
              placeholder="Add location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
            />
          </div>

          {/* Repeat */}
          <div>
            <label className="text-xs text-sundown-muted block mb-1">Repeat</label>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={form.repeat_rule}
                onChange={(e) => setForm((p) => ({ ...p, repeat_rule: e.target.value as RepeatRule }))}
                className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              >
                <option value="none">Don't repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              {form.repeat_rule !== "none" && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={form.repeat_interval}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, repeat_interval: Math.max(1, Number(e.target.value || 1)) }))
                    }
                    placeholder="Every"
                    className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                  />
                  <input
                    type="date"
                    value={form.repeat_until}
                    onChange={(e) => setForm((p) => ({ ...p, repeat_until: e.target.value }))}
                    placeholder="Until"
                    className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                  />
                </>
              )}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="text-xs text-sundown-muted block mb-1">Reminder</label>
            <select
              value={form.reminder_minutes}
              onChange={(e) => setForm((p) => ({ ...p, reminder_minutes: Number(e.target.value) }))}
              className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
            >
              {REMINDER_OPTIONS.map((opt, i) => (
                <option key={i} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes / description */}
          <div>
            <label className="text-xs text-sundown-muted block mb-1">Notes</label>
            <textarea
              placeholder="Add notes"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text resize-none"
            />
          </div>

          {/* Attachments (only available after first save) */}
          {isEditing && (
            <div>
              <label className="text-xs text-sundown-muted block mb-1">Attachments</label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="text-xs text-sundown-muted file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-sundown-gold/20 file:text-sundown-text"
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-sundown-gold hover:underline truncate"
                    >
                      {att.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Share link */}
          <div>
            <label className="text-xs text-sundown-muted block mb-1">Share</label>
            <div className="flex gap-2 items-center">
              {form.share_slug ? (
                <>
                  <span className="text-xs text-sundown-muted truncate flex-1">
                    {window.location.origin}/schedule/event/{form.share_slug}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0">
                    <Link2 className="w-3 h-3" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleGenerateLink} className="gap-1">
                  <Link2 className="w-3 h-3" />
                  Generate link
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-sundown-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEditing ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

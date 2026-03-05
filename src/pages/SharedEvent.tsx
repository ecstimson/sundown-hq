import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, CalendarDays, MapPin, Clock, Repeat, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatEventTime, formatDateRange } from "@/lib/calendarHelpers";
import type { CalendarEvent, Calendar } from "@/types/database";

export default function SharedEvent() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!slug) {
        setError("Invalid event link.");
        setLoading(false);
        return;
      }
      const { data, error: fetchErr } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("share_slug", slug)
        .single();

      if (fetchErr || !data) {
        setError("Event not found or link has expired.");
        setLoading(false);
        return;
      }

      const evt = data as CalendarEvent;
      setEvent(evt);

      const { data: cal } = await supabase
        .from("calendars")
        .select("*")
        .eq("id", evt.calendar_id)
        .single();
      if (cal) setCalendar(cal as Calendar);
      setLoading(false);
    }

    fetchEvent();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sundown-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-sundown-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-sundown-border bg-sundown-card p-6 text-center space-y-4">
          <CalendarDays className="w-12 h-12 text-sundown-muted mx-auto" />
          <h1 className="text-xl font-bold text-sundown-text">Event not found</h1>
          <p className="text-sm text-sundown-muted">{error}</p>
          <Link to="/" className="text-sm text-sundown-gold hover:underline">
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  const color = calendar?.color || "#D4A843";

  return (
    <div className="min-h-screen bg-sundown-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-sundown-border bg-sundown-card p-6 space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-sundown-muted hover:text-sundown-text">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex items-start gap-3">
          <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="space-y-2 flex-1">
            <h1 className="text-2xl font-bold text-sundown-text">{event.title}</h1>
            {calendar && (
              <p className="text-xs text-sundown-muted">{calendar.name}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-sundown-muted">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sundown-gold" />
            <span>{formatDateRange(event)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sundown-gold" />
            <span>{formatEventTime(event)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sundown-gold" />
              <span>{event.location}</span>
            </div>
          )}
          {event.repeat_rule && event.repeat_rule !== "none" && (
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-sundown-gold" />
              <span>
                Repeats {event.repeat_rule}
                {(event.repeat_interval || 1) > 1 ? ` every ${event.repeat_interval}` : ""}
              </span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="border-t border-sundown-border pt-3">
            <p className="text-sm text-sundown-text whitespace-pre-wrap">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

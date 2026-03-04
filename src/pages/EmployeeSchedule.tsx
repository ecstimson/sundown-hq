import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { EmployeeShift, FeedingSchedule } from "@/types/database";

export default function EmployeeSchedule() {
  const { employee } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [feeding, setFeeding] = useState<FeedingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchedule() {
      if (!employee) return;
      setLoading(true);
      setError(null);

      const [{ data: shiftRows, error: shiftErr }, { data: feedRows, error: feedErr }] =
        await Promise.all([
          supabase
            .from("employee_shifts")
            .select("*")
            .eq("employee_id", employee.id)
            .gte("shift_date", today)
            .order("shift_date")
            .limit(14),
          supabase
            .from("feeding_schedule")
            .select("*")
            .eq("schedule_date", today)
            .order("created_at"),
        ]);

      if (shiftErr || feedErr) {
        setError(shiftErr?.message || feedErr?.message || "Failed to load schedule.");
      }
      setShifts((shiftRows as EmployeeShift[]) || []);
      setFeeding((feedRows as FeedingSchedule[]) || []);
      setLoading(false);
    }
    fetchSchedule();
  }, [employee, today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-sundown-text">My Schedule</h1>
        <p className="text-sm text-sundown-muted">Shifts and feeding plan with calcium rotation</p>
      </div>

      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sundown-gold" />
            Upcoming Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shifts.length === 0 ? (
            <p className="text-sm text-sundown-muted">No upcoming shifts assigned yet.</p>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="rounded-md border border-sundown-border bg-sundown-bg p-3">
                <p className="font-bold text-sundown-text">{new Date(shift.shift_date).toLocaleDateString()}</p>
                <p className="text-sm text-sundown-muted">
                  {shift.shift_type}
                  {(shift.start_time || shift.end_time) ? ` · ${shift.start_time || "--"}-${shift.end_time || "--"}` : ""}
                </p>
                {shift.notes && <p className="text-xs text-sundown-muted mt-1">{shift.notes}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Feeding + Calcium Rotation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {feeding.length === 0 ? (
            <p className="text-sm text-sundown-muted">No feeding tasks for today.</p>
          ) : (
            feeding.map((event) => (
              <div key={event.id} className="rounded-md border border-sundown-border bg-sundown-bg p-3">
                <p className="font-bold text-sundown-text">{event.group_name || "Group task"}</p>
                <p className="text-sm text-sundown-muted">
                  {event.feeding_type} · Calcium: <span className="text-sundown-gold font-bold">{event.calcium_rotation}</span>
                </p>
                {event.notes && <p className="text-xs text-sundown-muted mt-1">{event.notes}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


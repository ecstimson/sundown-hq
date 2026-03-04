import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, EmployeeShift, FeedingSchedule } from "@/types/database";

export default function AdminSchedule() {
  const { employee } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [feeding, setFeeding] = useState<FeedingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shiftForm, setShiftForm] = useState({
    employee_id: "",
    shift_type: "General",
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [feedingForm, setFeedingForm] = useState({
    group_name: "",
    feeding_type: "Regular",
    calcium_rotation: "None",
    notes: "",
  });

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [{ data: staff, error: staffErr }, { data: shiftRows, error: shiftErr }, { data: feedRows, error: feedErr }] =
      await Promise.all([
        supabase.from("employees").select("*").eq("is_active", true).order("name"),
        supabase.from("employee_shifts").select("*").eq("shift_date", date).order("start_time"),
        supabase.from("feeding_schedule").select("*").eq("schedule_date", date).order("created_at"),
      ]);

    if (staffErr || shiftErr || feedErr) {
      setError(staffErr?.message || shiftErr?.message || feedErr?.message || "Failed to load schedule data.");
    }
    setEmployees((staff as Employee[]) || []);
    setShifts((shiftRows as EmployeeShift[]) || []);
    setFeeding((feedRows as FeedingSchedule[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [date]);

  async function addShift() {
    if (!shiftForm.employee_id) {
      setError("Select an employee before adding a shift.");
      return;
    }
    const { error: insertErr } = await supabase.from("employee_shifts").insert({
      shift_date: date,
      employee_id: shiftForm.employee_id,
      shift_type: shiftForm.shift_type,
      start_time: shiftForm.start_time || null,
      end_time: shiftForm.end_time || null,
      notes: shiftForm.notes || null,
      created_by: employee?.id ?? null,
    } as any);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setShiftForm({ employee_id: "", shift_type: "General", start_time: "", end_time: "", notes: "" });
    await fetchData();
  }

  async function addFeedingEvent() {
    if (!feedingForm.group_name.trim()) {
      setError("Group/animal reference is required.");
      return;
    }
    const { error: insertErr } = await supabase.from("feeding_schedule").insert({
      schedule_date: date,
      group_name: feedingForm.group_name.trim(),
      feeding_type: feedingForm.feeding_type,
      calcium_rotation: feedingForm.calcium_rotation,
      notes: feedingForm.notes || null,
      created_by: employee?.id ?? null,
    } as any);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setFeedingForm({ group_name: "", feeding_type: "Regular", calcium_rotation: "None", notes: "" });
    await fetchData();
  }

  async function removeShift(id: string) {
    const { error: deleteErr } = await supabase.from("employee_shifts").delete().eq("id", id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    await fetchData();
  }

  async function removeFeedingEvent(id: string) {
    const { error: deleteErr } = await supabase.from("feeding_schedule").delete().eq("id", id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    await fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-sundown-text">Operations Schedule</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sundown-text"
        />
      </div>

      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-56">
          <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Shifts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={shiftForm.employee_id}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  <option value="">Select employee</option>
                  {employees.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Shift type (Feeding AM, Cleaning...)"
                  value={shiftForm.shift_type}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, shift_type: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
                <input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
                <input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
              <input
                type="text"
                placeholder="Notes"
                value={shiftForm.notes}
                onChange={(e) => setShiftForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <Button onClick={addShift} className="gap-2"><Plus className="w-4 h-4" /> Add Shift</Button>

              <div className="pt-3 space-y-2">
                {shifts.length === 0 ? (
                  <p className="text-sm text-sundown-muted">No shifts scheduled for this date.</p>
                ) : (
                  shifts.map((shift) => {
                    const staff = employees.find((s) => s.id === shift.employee_id);
                    return (
                      <div key={shift.id} className="flex items-center justify-between rounded-md border border-sundown-border bg-sundown-bg px-3 py-2">
                        <div className="text-sm">
                          <p className="font-bold text-sundown-text">{staff?.name || "Unknown employee"}</p>
                          <p className="text-sundown-muted">
                            {shift.shift_type}
                            {(shift.start_time || shift.end_time) ? ` · ${shift.start_time || "--"}-${shift.end_time || "--"}` : ""}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeShift(shift.id)}>
                          <Trash2 className="w-4 h-4 text-sundown-red" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feeding Schedule + Calcium Rotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="text"
                placeholder="Animal or group name"
                value={feedingForm.group_name}
                onChange={(e) => setFeedingForm((prev) => ({ ...prev, group_name: e.target.value }))}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={feedingForm.feeding_type}
                  onChange={(e) => setFeedingForm((prev) => ({ ...prev, feeding_type: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  <option>Regular</option>
                  <option>Heavy</option>
                  <option>Light</option>
                  <option>Fasting</option>
                </select>
                <select
                  value={feedingForm.calcium_rotation}
                  onChange={(e) => setFeedingForm((prev) => ({ ...prev, calcium_rotation: e.target.value }))}
                  className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  <option>None</option>
                  <option>Light Dust</option>
                  <option>Full Dust</option>
                  <option>Rotation A</option>
                  <option>Rotation B</option>
                  <option>Rotation C</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Notes"
                value={feedingForm.notes}
                onChange={(e) => setFeedingForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <Button onClick={addFeedingEvent} className="gap-2"><Plus className="w-4 h-4" /> Add Feeding Event</Button>

              <div className="pt-3 space-y-2">
                {feeding.length === 0 ? (
                  <p className="text-sm text-sundown-muted">No feeding events for this date.</p>
                ) : (
                  feeding.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-md border border-sundown-border bg-sundown-bg px-3 py-2">
                      <div className="text-sm">
                        <p className="font-bold text-sundown-text">{event.group_name || "Group"}</p>
                        <p className="text-sundown-muted">{event.feeding_type} · Calcium: {event.calcium_rotation}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFeedingEvent(event.id)}>
                        <Trash2 className="w-4 h-4 text-sundown-red" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


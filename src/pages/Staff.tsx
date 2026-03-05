import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserPlus, Loader2, Users, X, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pinToAuthPassword } from "@/lib/pinAuth";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import EventModal from "@/components/EventModal";
import type { Employee, Calendar, EmployeeTimeEntry } from "@/types/database";

type StaffMember = Employee & { auth_email?: string | null };

export default function Staff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "employee" as "super_admin" | "admin" | "employee",
    pin: "",
    assigned_buildings: ["A"] as string[],
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "employee" as "super_admin" | "admin" | "employee",
    pin: "",
    assigned_buildings: ["A"] as string[],
    is_active: true,
  });

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [scheduleEmployee, setScheduleEmployee] = useState<StaffMember | null>(null);
  const [timeEntries, setTimeEntries] = useState<EmployeeTimeEntry[]>([]);
  const [timecardsError, setTimecardsError] = useState<string | null>(null);
  const todayKey = new Date().toISOString().split("T")[0];

  useEffect(() => {
    void loadStaff(true);
    void loadCalendars();
    void loadTimecards();
  }, []);

  async function loadCalendars() {
    const { data } = await supabase.from("calendars").select("*").order("name");
    setCalendars((data as Calendar[]) || []);
  }

  async function loadTimecards() {
    setTimecardsError(null);
    const { data, error } = await (supabase
      .from("employee_time_entries") as any)
      .select("*")
      .order("clock_in_at", { ascending: false })
      .limit(50);
    if (error) {
      setTimecardsError(error.message);
      return;
    }
    setTimeEntries((data as EmployeeTimeEntry[]) || []);
  }

  async function loadStaff(withLoading = false) {
    if (withLoading) setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase.from("employees").select("*").order("name");
    if (error) {
      setFetchError(`Failed to load staff: ${error.message}`);
      if (withLoading) setLoading(false);
      return;
    }

    const baseStaff = (data as StaffMember[]) || [];
    const { data: emailRows, error: emailError } = await (supabase.rpc as any)(
      "get_staff_auth_emails"
    );
    if (emailError) {
      const message = (emailError.message || "").toLowerCase();
      const missingRpc =
        message.includes("could not find the function") ||
        message.includes("schema cache");
      if (!missingRpc) {
        setFetchError(`Failed to load staff emails: ${emailError.message}`);
      }
      setStaff(baseStaff);
      if (withLoading) setLoading(false);
      return;
    }

    const emails = new Map<string, string | null>(
      (((emailRows as { id: string; auth_email: string | null }[] | null) || []).map((row) => [
        row.id,
        row.auth_email,
      ]))
    );

    setStaff(baseStaff.map((member) => ({ ...member, auth_email: emails.get(member.id) || null })));
    if (withLoading) setLoading(false);
  }

  async function refreshStaff() {
    await loadStaff(false);
    await loadTimecards();
  }

  async function handleAddEmployee() {
    if (!addForm.name.trim() || !addForm.pin.trim() || !addForm.email.trim()) {
      setFetchError("Name, email, and PIN are required.");
      return;
    }
    if (!/^\d{4,6}$/.test(addForm.pin.trim())) {
      setFetchError("PIN must be 4 to 6 digits.");
      return;
    }
    setSaving(true);
    setFetchError(null);

    const authEmail = addForm.email.trim().toLowerCase();
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: authEmail,
      password: pinToAuthPassword(addForm.pin.trim()),
    });
    if (authErr || !authData.user?.id) {
      setFetchError(authErr?.message || "Auth account creation failed. Check Supabase auth settings.");
      setSaving(false);
      return;
    }

    const { error: insertErr } = await supabase.from("employees").insert({
      id: authData.user.id,
      name: addForm.name.trim(),
      pin: addForm.pin.trim(),
      role: addForm.role,
      assigned_buildings: addForm.assigned_buildings,
      is_active: true,
    } as any);
    if (insertErr) {
      setFetchError(insertErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowAddModal(false);
    setAddForm({ name: "", email: "", role: "employee", pin: "", assigned_buildings: ["A"] });
    await refreshStaff();
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setEditForm({
      name: member.name,
      email: member.auth_email || "",
      role: member.role,
      pin: member.pin,
      assigned_buildings: member.assigned_buildings || [],
      is_active: member.is_active,
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const nextPin = editForm.pin.trim();
    if (!/^\d{4,6}$/.test(nextPin)) {
      setFetchError("PIN must be 4 to 6 digits.");
      return;
    }
    setSaving(true);
    setFetchError(null);
    const { error } = await (supabase
      .from("employees") as any)
      .update({
        name: editForm.name,
        role: editForm.role,
        pin: nextPin,
        assigned_buildings: editForm.assigned_buildings,
        is_active: editForm.is_active,
      } as any)
      .eq("id", editing.id);
    if (error) {
      setFetchError(error.message);
      setSaving(false);
      return;
    }

    if (user?.id === editing.id) {
      const { error: authUpdateErr } = await supabase.auth.updateUser({
        password: pinToAuthPassword(nextPin),
      });
      if (authUpdateErr) {
        setFetchError(
          `Profile saved, but auth password sync failed: ${authUpdateErr.message}. Use Admin Login password until this is fixed.`
        );
      }
    }

    setSaving(false);
    setShowEditModal(false);
    setEditing(null);
    await refreshStaff();
  }

  function openScheduleForEmployee(member: StaffMember) {
    setScheduleEmployee(member);
    setShowEventModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  const defaultCalId = calendars[0]?.id || "";
  const nameById = new Map(staff.map((s) => [s.id, s.name]));

  function formatClockTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDuration(entry: EmployeeTimeEntry) {
    if (!entry.clock_out_at) return "Open";
    const diffMs = new Date(entry.clock_out_at).getTime() - new Date(entry.clock_in_at).getTime();
    const mins = Math.max(0, Math.round(diffMs / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {fetchError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-sundown-text">Staff Management</h2>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Staff Members"
          description="Add your first employee to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <Card key={member.id} className="hover:border-sundown-gold/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="h-12 w-12 rounded-full bg-sundown-bg border border-sundown-border flex items-center justify-center text-lg font-bold text-sundown-muted">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <p className="text-sm text-sundown-muted capitalize">
                    {member.role.replace("_", " ")}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sundown-muted">Status</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.is_active
                          ? "bg-sundown-green/10 text-sundown-green"
                          : "bg-sundown-muted/10 text-sundown-muted"
                      }`}
                    >
                      {member.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {member.assigned_buildings && member.assigned_buildings.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-sundown-muted">Buildings</span>
                      <span className="text-sm text-sundown-text">
                        {member.assigned_buildings.map((b) => `Building ${b}`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(member)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => openScheduleForEmployee(member)}>
                    <CalendarDays className="h-3 w-3" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-sundown-text">Recent Timecards</h3>
          <Button variant="outline" size="sm" onClick={() => void loadTimecards()}>
            Refresh
          </Button>
        </div>
        {timecardsError ? (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            Failed to load timecards: {timecardsError}
          </div>
        ) : timeEntries.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-sundown-muted">
              No clock in/out entries yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-sundown-border">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-4 gap-3 px-4 py-3 text-sm">
                    <div className="font-semibold text-sundown-text">
                      {nameById.get(entry.employee_id) || "Unknown"}
                    </div>
                    <div className="text-sundown-muted">{formatClockTime(entry.clock_in_at)}</div>
                    <div className="text-sundown-muted">{formatClockTime(entry.clock_out_at)}</div>
                    <div className={entry.clock_out_at ? "text-sundown-text" : "text-sundown-gold font-semibold"}>
                      {formatDuration(entry)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Add employee modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Add Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                placeholder="Full name"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                type="email"
                placeholder="Email address"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                placeholder="PIN (used as password)"
                value={addForm.pin}
                onChange={(e) => setAddForm((prev) => ({ ...prev, pin: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <p className="text-xs text-sundown-muted -mt-1">
                Enter a 4-6 digit PIN.
              </p>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((prev) => ({ ...prev, role: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <div className="flex items-center gap-4">
                {["A", "B"].map((building) => (
                  <label key={building} className="flex items-center gap-2 text-sm text-sundown-text">
                    <input
                      type="checkbox"
                      checked={addForm.assigned_buildings.includes(building)}
                      onChange={(e) => {
                        setAddForm((prev) => ({
                          ...prev,
                          assigned_buildings: e.target.checked
                            ? [...prev.assigned_buildings, building]
                            : prev.assigned_buildings.filter((b) => b !== building),
                        }));
                      }}
                    />
                    Building {building}
                  </label>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddEmployee} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Employee
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit employee modal */}
      {showEditModal && editing && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Edit Employee</h3>
              <button onClick={() => setShowEditModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                type="email"
                value={editForm.email}
                disabled
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-muted cursor-not-allowed"
              />
              <p className="text-xs text-sundown-muted -mt-1">
                Email is managed on account creation. Update in Supabase Auth if needed.
              </p>
              <input
                value={editForm.pin}
                onChange={(e) => setEditForm((prev) => ({ ...prev, pin: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <p className="text-xs text-sundown-muted -mt-1">
                Enter a 4-6 digit PIN.
              </p>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <div className="flex items-center gap-4">
                {["A", "B"].map((building) => (
                  <label key={building} className="flex items-center gap-2 text-sm text-sundown-text">
                    <input
                      type="checkbox"
                      checked={editForm.assigned_buildings.includes(building)}
                      onChange={(e) => {
                        setEditForm((prev) => ({
                          ...prev,
                          assigned_buildings: e.target.checked
                            ? [...prev.assigned_buildings, building]
                            : prev.assigned_buildings.filter((b) => b !== building),
                        }));
                      }}
                    />
                    Building {building}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-sundown-text">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule event for employee */}
      <EventModal
        open={showEventModal}
        onClose={() => { setShowEventModal(false); setScheduleEmployee(null); }}
        onSaved={() => {}}
        calendars={calendars}
        defaultDate={todayKey}
        defaultCalendarId={defaultCalId}
        editEvent={null}
      />
    </div>
  );
}

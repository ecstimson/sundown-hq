import { useEffect, useState } from "react";
import { Loader2, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type SettingsForm = {
  avatar_url: string;
  email: string;
  phone: string;
  address: string;
  w2_email: string;
};

export default function EmployeeSettings() {
  const { user, employee } = useAuth();
  const [form, setForm] = useState<SettingsForm>({
    avatar_url: "",
    email: "",
    phone: "",
    address: "",
    w2_email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!employee) return;
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data, error: profileError } = await (supabase
        .from("employee_profiles") as any)
        .select("*")
        .eq("employee_id", employee.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      let avatarUrl = "";
      let phone = "";
      let address = "";
      let w2Email = user?.email || "";
      if (data) {
        avatarUrl = data.avatar_url || "";
        phone = data.phone || "";
        address = data.address || "";
        w2Email = data.w2_email || w2Email;
      }
      setForm({
        avatar_url: avatarUrl,
        email: user?.email || "",
        phone,
        address,
        w2_email: w2Email,
      });
      setLoading(false);
    }

    void loadProfile();
  }, [employee, user?.email]);

  async function handleAvatarUpload(file: File) {
    if (!employee) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    const safeName = file.name.replace(/\s+/g, "-");
    const path = `${employee.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("employee-avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      setError(`Avatar upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("employee-avatars").getPublicUrl(path);
    setForm((prev) => ({ ...prev, avatar_url: urlData?.publicUrl || prev.avatar_url }));
    setUploading(false);
    setSuccess("Avatar uploaded. Save settings to persist.");
  }

  async function handleSave() {
    if (!employee || !user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const nextEmail = form.email.trim().toLowerCase();
    const authEmailChanged = nextEmail && nextEmail !== (user.email || "").toLowerCase();
    if (authEmailChanged) {
      const { error: authErr } = await supabase.auth.updateUser({ email: nextEmail });
      if (authErr) {
        setError(`Email update failed: ${authErr.message}`);
        setSaving(false);
        return;
      }
    }

    const { error: upsertErr } = await (supabase
      .from("employee_profiles") as any)
      .upsert({
        employee_id: employee.id,
        avatar_url: form.avatar_url.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        w2_email: form.w2_email.trim().toLowerCase() || null,
      });

    if (upsertErr) {
      setError(upsertErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(
      authEmailChanged
        ? "Settings saved. Check your inbox to confirm new login email."
        : "Settings updated."
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56">
        <Loader2 className="w-7 h-7 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-sundown-red/40 bg-sundown-red/10 text-sundown-red text-sm px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-sundown-gold/40 bg-sundown-gold/10 text-sundown-gold text-sm px-3 py-2">
          {success}
        </div>
      )}

      <section className="border border-sundown-border bg-sundown-card">
        <div className="px-4 py-3 border-b border-sundown-border">
          <h2 className="text-sm font-bold uppercase tracking-wide text-sundown-muted">Profile</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 border border-sundown-border bg-sundown-bg flex items-center justify-center overflow-hidden">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-sundown-muted" />
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                }}
                className="text-xs text-sundown-muted file:mr-2 file:py-1 file:px-3 file:border-0 file:bg-sundown-gold/20 file:text-sundown-text"
              />
              {uploading && (
                <div className="inline-flex items-center gap-1 text-xs text-sundown-muted">
                  <Upload className="w-3 h-3 animate-pulse" />
                  Uploading avatar...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-sundown-muted">Login Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text"
              type="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-sundown-muted">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text"
              type="tel"
              placeholder="(555) 555-5555"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-sundown-muted">W-2 Email</label>
            <input
              value={form.w2_email}
              onChange={(e) => setForm((prev) => ({ ...prev, w2_email: e.target.value }))}
              className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text"
              type="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-sundown-muted">Address (W-2)</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full min-h-24 px-3 py-2 border border-sundown-border bg-sundown-bg text-sundown-text"
              placeholder="Street, city, state, ZIP"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

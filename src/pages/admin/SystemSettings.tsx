import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save, Settings2 } from "lucide-react";

type SettingsState = {
  companyName: string;
  timezone: string;
  defaultBuilding: "A" | "B";
  remindersEnabled: boolean;
  urgentAlertsEnabled: boolean;
  dailySummaryEnabled: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  companyName: "Sundown Reptiles",
  timezone: "America/New_York",
  defaultBuilding: "A",
  remindersEnabled: true,
  urgentAlertsEnabled: true,
  dailySummaryEnabled: false,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("sundown-system-settings");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SettingsState;
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    } catch {
      // ignore invalid local storage state
    }
  }, []);

  function saveSettings() {
    localStorage.setItem("sundown-system-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">System Settings</h1>
          <p className="text-sm text-sundown-muted">Configure app-wide operational defaults and notifications.</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={saveSettings}>
          <Save className="w-4 h-4" />
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-sundown-gold" />
            General
          </CardTitle>
          <CardDescription>Core business defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-sundown-muted mb-1">Company Name</label>
              <input
                value={settings.companyName}
                onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sundown-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sundown-muted mb-1">Timezone</label>
              <input
                value={settings.timezone}
                onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sundown-text"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-sundown-muted mb-1">Default Building</label>
            <select
              value={settings.defaultBuilding}
              onChange={(e) => setSettings((prev) => ({ ...prev, defaultBuilding: e.target.value as "A" | "B" }))}
              className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sundown-text"
            >
              <option value="A">Building A</option>
              <option value="B">Building B</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Toggle operational and alert notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sundown-text">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, remindersEnabled: e.target.checked }))}
            />
            Task reminders
          </label>
          <label className="flex items-center gap-2 text-sundown-text">
            <input
              type="checkbox"
              checked={settings.urgentAlertsEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, urgentAlertsEnabled: e.target.checked }))}
            />
            Urgent alert notifications
          </label>
          <label className="flex items-center gap-2 text-sundown-text">
            <input
              type="checkbox"
              checked={settings.dailySummaryEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, dailySummaryEnabled: e.target.checked }))}
            />
            Daily summary digest
          </label>
        </CardContent>
      </Card>
    </div>
  );
}


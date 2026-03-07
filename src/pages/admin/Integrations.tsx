import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle, ExternalLink, AlertCircle, Loader2, Send } from "lucide-react";

const INTEGRATIONS = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Primary database, auth, storage, and realtime subscriptions.",
    status: "connected" as const,
    icon: "⚡",
    configUrl: "https://supabase.com/dashboard",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Product listings via CSV export from Drop Planner. Manual import to Shopify Admin.",
    status: "manual" as const,
    icon: "🛒",
    configUrl: null,
  },
  {
    id: "morphmarket",
    name: "MorphMarket",
    description: "Listing sync via TSV export from Drop Planner. Upload via MorphMarket Seller Tools.",
    status: "manual" as const,
    icon: "🦎",
    configUrl: null,
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Backup sync from Supabase via n8n. Bryan retains direct spreadsheet access.",
    status: "not_configured" as const,
    icon: "📊",
    configUrl: null,
  },
  {
    id: "n8n",
    name: "n8n (Railway)",
    description: "Automation workflows: Sheets sync, CSV generation, Shopify webhooks, urgent alerts.",
    status: "not_configured" as const,
    icon: "🔄",
    configUrl: null,
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Hosting and auto-deploy from GitHub main branch.",
    status: "connected" as const,
    icon: "▲",
    configUrl: "https://vercel.com/dashboard",
  },
];

const STATUS_BADGE = {
  connected: { label: "Connected", icon: CheckCircle, classes: "bg-sundown-green/10 text-sundown-green" },
  manual: { label: "Manual", icon: AlertCircle, classes: "bg-sundown-gold/10 text-sundown-gold" },
  not_configured: { label: "Not Configured", icon: AlertCircle, classes: "bg-sundown-muted/10 text-sundown-muted" },
  ready: { label: "Ready to Connect", icon: AlertCircle, classes: "bg-sundown-gold/10 text-sundown-gold" },
};

// Slack Incoming Webhook URL is stored in VITE_SLACK_WEBHOOK_URL.
// This is safe for Incoming Webhooks (single-channel, rate-limited by Slack).
// Future alert automation will be routed through the n8n Slack node instead.
const slackWebhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL as string | undefined;

function SlackCard() {
  const isConfigured = Boolean(slackWebhookUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sendTestMessage() {
    if (!slackWebhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ Sundown HQ → Slack connection test successful." }),
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "Test message sent! Check your Slack channel." });
      } else {
        setTestResult({ ok: false, message: `Slack returned status ${res.status}. Check the webhook URL.` });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error. Check VITE_SLACK_WEBHOOK_URL and try again." });
    } finally {
      setTesting(false);
    }
  }

  const badge = isConfigured ? STATUS_BADGE.ready : STATUS_BADGE.not_configured;

  return (
    <Card className={isConfigured ? "border-sundown-gold/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="text-3xl">💬</div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.classes}`}>
            <badge.icon className="w-3 h-3" /> {badge.label}
          </span>
        </div>
        <CardTitle>Slack</CardTitle>
        <CardDescription>
          Incoming Webhook for manual connection testing and future urgent-alert notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConfigured ? (
          <>
            <Button
              variant="outline"
              className="w-full gap-2 text-xs h-9"
              onClick={sendTestMessage}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {testing ? "Sending…" : "Send Test Message"}
            </Button>
            {testResult && (
              <p className={`text-xs text-center ${testResult.ok ? "text-sundown-green" : "text-sundown-red"}`}>
                {testResult.message}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-sundown-muted font-semibold uppercase tracking-wider">Setup Steps</p>
            <ol className="text-xs text-sundown-muted space-y-1.5 list-decimal list-inside">
              <li>
                Create a Slack app at{" "}
                <button
                  onClick={() => window.open("https://api.slack.com/apps", "_blank")}
                  className="text-sundown-gold underline-offset-2 hover:underline"
                >
                  api.slack.com/apps
                </button>
              </li>
              <li>Enable <span className="font-medium text-sundown-text">Incoming Webhooks</span> and add to a channel</li>
              <li>Copy the Webhook URL and add it to your <code className="bg-sundown-bg px-1 rounded">.env.local</code></li>
              <li>
                <code className="bg-sundown-bg px-1 rounded text-[11px]">VITE_SLACK_WEBHOOK_URL="https://hooks.slack.com/…"</code>
              </li>
              <li>Redeploy — a <span className="font-medium text-sundown-text">Send Test Message</span> button will appear here</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sundown-text">Integrations</h1>
        <p className="text-sundown-muted text-sm">External services and automation connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((tool) => {
          const badge = STATUS_BADGE[tool.status];
          return (
            <Card key={tool.id} className={tool.status === "connected" ? "border-sundown-green/30" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-3xl">{tool.icon}</div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.classes}`}>
                    <badge.icon className="w-3 h-3" /> {badge.label}
                  </span>
                </div>
                <CardTitle>{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.configUrl ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-xs h-9"
                    onClick={() => window.open(tool.configUrl!, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" /> Open Dashboard
                  </Button>
                ) : tool.status === "manual" ? (
                  <p className="text-xs text-sundown-muted text-center py-1">
                    CSV export available in Drop Planner
                  </p>
                ) : (
                  <p className="text-xs text-sundown-muted text-center py-1">
                    Configure after n8n deployment
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        <SlackCard />
      </div>

      <Card className="border-sundown-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-2">Integration Roadmap</h3>
          <ul className="text-sm text-sundown-muted space-y-1">
            <li>Phase 1 (current): Supabase direct, CSV export for Shopify/MorphMarket, Slack connection scaffolding</li>
            <li>Phase 2: n8n workflows for Google Sheets backup sync and Shopify order webhooks</li>
            <li>Phase 3: Automated urgent alert notifications via Slack + n8n</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

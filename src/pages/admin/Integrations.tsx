import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

const INTEGRATIONS = [
  {
    id: "morphmarket",
    name: "MorphMarket",
    description: "Sync inventory availability and pricing automatically.",
    status: "connected",
    icon: "🦎"
  },
  {
    id: "shipstation",
    name: "ShipStation",
    description: "Generate shipping labels and track packages.",
    status: "connected",
    icon: "📦"
  },
  {
    id: "square",
    name: "Square POS",
    description: "Sync in-person sales from expo events.",
    status: "disconnected",
    icon: "💳"
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Automate accounting and expense tracking.",
    status: "disconnected",
    icon: "📊"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send alerts and daily summaries to team channels.",
    status: "connected",
    icon: "💬"
  }
];

export default function Integrations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-sundown-text">Integrations</h1>
        <p className="text-sundown-muted text-sm">Connect external tools to streamline operations</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((tool) => (
          <Card key={tool.id} className={tool.status === "connected" ? "border-sundown-green/30" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{tool.icon}</div>
                {tool.status === "connected" ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sundown-green/10 text-sundown-green text-xs font-bold uppercase tracking-wider">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sundown-muted/10 text-sundown-muted text-xs font-bold uppercase tracking-wider">
                    Disconnected
                  </span>
                )}
              </div>
              <CardTitle>{tool.name}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {tool.status === "connected" ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs h-9">Configure</Button>
                  <Button variant="ghost" className="text-xs h-9 text-sundown-red hover:text-sundown-red hover:bg-sundown-red/10">Disconnect</Button>
                </div>
              ) : (
                <Button className="w-full gap-2 text-xs h-9">
                  <ExternalLink className="w-3 h-3" /> Connect
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

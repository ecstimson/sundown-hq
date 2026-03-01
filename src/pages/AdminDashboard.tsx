import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Activity, Users, Box, AlertTriangle, TrendingUp, Calendar, CheckSquare, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Animals" 
          value="1,060" 
          subtext="360 Breeders · 620 Available" 
          icon={Box} 
          trend="up"
        />
        <StatsCard 
          title="Next Drop" 
          value="March 7" 
          subtext="82 assigned · 64 photographed" 
          icon={Calendar} 
          trend="neutral"
        />
        <StatsCard 
          title="Checklist Status" 
          value="6/8 Done" 
          subtext="Building A ✅ · Building B ⏳" 
          icon={CheckSquare} 
          trend="up"
        />
        <StatsCard 
          title="Urgent Alerts" 
          value="2 Flagged" 
          subtext="Requires attention" 
          icon={AlertTriangle} 
          trend="down"
          alert
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drop Planner Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Drop Planner Preview</CardTitle>
            <CardDescription>Top animals by readiness score for March 7 drop.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "SR-GG-2025-0088", species: "Gargoyle", score: 94, status: "Ready" },
                { id: "SR-CH-2025-0019", species: "Chahoua", score: 91, status: "Ready" },
                { id: "SR-GG-2025-0147", species: "Gargoyle", score: 87, status: "Ready" },
                { id: "SR-CG-2025-0201", species: "Crested", score: 72, status: "Prep" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-sundown-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.score >= 90 ? "bg-sundown-green/20 text-sundown-green" : "bg-sundown-gold/20 text-sundown-gold"
                    }`}>
                      {item.score}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-sundown-text">{item.id}</p>
                      <p className="text-xs text-sundown-muted">{item.species}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === "Ready" ? "bg-sundown-green/10 text-sundown-green" : "bg-sundown-gold/10 text-sundown-gold"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 text-xs">View Full Planner</Button>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from the warehouse floor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: "John", action: "completed checklist", target: "Morning A", time: "10m ago" },
                { user: "Jane", action: "logged weight", target: "SR-GG-0147", time: "25m ago" },
                { user: "Mike", action: "flagged health", target: "SR-BTM-0014", time: "1h ago", alert: true },
                { user: "John", action: "updated SOP", target: "Feeding", time: "2h ago" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${activity.alert ? "bg-sundown-red" : "bg-sundown-gold"}`} />
                  <p className="text-sm text-sundown-muted flex-1">
                    <span className="text-sundown-text font-medium">{activity.user}</span> {activity.action} <span className="text-sundown-text">{activity.target}</span>
                  </p>
                  <span className="text-xs text-sundown-muted whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 text-xs">View All Activity</Button>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Sales Velocity */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Velocity</CardTitle>
          <CardDescription>Animals listed vs. sold over the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {[65, 59, 80, 81, 56, 55].map((h, i) => (
              <div key={i} className="w-full bg-sundown-card-hover rounded-t-sm relative group">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-sundown-gold/50 group-hover:bg-sundown-gold transition-colors rounded-t-sm"
                  style={{ height: `${h}%` }}
                />
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-sundown-green/50 group-hover:bg-sundown-green transition-colors rounded-t-sm"
                  style={{ height: `${h * 0.7}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-sundown-muted px-2">
            <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-sundown-gold rounded-sm" />
              <span className="text-sundown-muted">Listed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-sundown-green rounded-sm" />
              <span className="text-sundown-muted">Sold</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, subtext, icon: Icon, trend, alert }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-sundown-muted">{title}</p>
          <Icon className={`h-4 w-4 ${alert ? 'text-sundown-red' : 'text-sundown-gold'}`} />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-sundown-text">{value}</div>
          <p className="text-xs text-sundown-muted">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClipboardList, Scale, List, AlertTriangle, CheckCircle, Clock, ChevronRight, Calendar, Utensils, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WEEKLY_SCHEDULE = [
  { day: "Sun", date: "1", type: "Rest / Prep", supplement: null, staff: "All", isToday: true },
  { day: "Mon", date: "2", type: "Feeding", supplement: "Calc + D3", staff: "John", isToday: false },
  { day: "Tue", date: "3", type: "Cleaning", supplement: null, staff: "Jane", isToday: false },
  { day: "Wed", date: "4", type: "Feeding", supplement: "Calc No D3", staff: "Mike", isToday: false },
  { day: "Thu", date: "5", type: "Cleaning", supplement: null, staff: "John", isToday: false },
  { day: "Fri", date: "6", type: "Feeding", supplement: "Calc + D3", staff: "Jane", isToday: false },
  { day: "Sat", date: "7", type: "Spot Check", supplement: null, staff: "Mike", isToday: false },
];

export default function EmployeeHome() {
  const navigate = useNavigate();
  const [building, setBuilding] = useState<"A" | "B">("A");

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">Good morning, John</h1>
          <p className="text-sundown-muted text-sm">Sunday, March 1, 2026</p>
        </div>
        
        {/* Building Toggle */}
        <div className="bg-sundown-card p-1 rounded-lg flex border border-sundown-border w-full max-w-xs">
          <button
            onClick={() => setBuilding("A")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              building === "A" 
                ? "bg-sundown-gold text-black shadow-sm" 
                : "text-sundown-muted hover:text-sundown-text"
            }`}
          >
            Building A
          </button>
          <button
            onClick={() => setBuilding("B")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              building === "B" 
                ? "bg-sundown-gold text-black shadow-sm" 
                : "text-sundown-muted hover:text-sundown-text"
            }`}
          >
            Building B
          </button>
        </div>
      </div>

      {/* 1. Today's Checklists */}
      <section>
        <h2 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Priority</h2>
        <Card 
          className="border-l-4 border-l-sundown-gold active:scale-[0.99] transition-transform cursor-pointer"
          onClick={() => navigate("/employee/checklists")}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-sundown-text">Morning Checklist</h3>
              <p className="text-sundown-muted text-sm">Building {building}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-sundown-gold font-bold text-lg">3/8</span>
                <p className="text-xs text-sundown-muted">Complete</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-sundown-gold flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-sundown-gold/20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Urgent Alerts */}
      <section>
        <h2 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Urgent</h2>
        <Card className="border border-sundown-red/50 bg-sundown-red/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-sundown-red shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sundown-red">Health Concern</span>
                  <span className="text-xs text-sundown-red/80">10m ago</span>
                </div>
                <p className="text-sundown-text font-medium">SR-GG-2025-0147</p>
                <p className="text-sm text-sundown-muted">Flagged by Jane: "Refused food 3x, losing weight"</p>
              </div>
            </div>
            <Button 
              variant="danger" 
              size="sm" 
              className="w-full mt-4 bg-sundown-red/10 hover:bg-sundown-red text-sundown-red hover:text-white border-none"
            >
              View Details
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* 3. Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionButton icon={ClipboardList} label="Log Obs." onClick={() => navigate("/employee/scan")} />
          <QuickActionButton icon={Scale} label="Weigh" onClick={() => navigate("/employee/scan")} />
          <QuickActionButton icon={List} label="Animals" onClick={() => navigate("/employee/animals")} />
        </div>
      </section>

      {/* 4. Weekly Schedule */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider">Weekly Schedule</h2>
          <span className="text-xs text-sundown-gold flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Mar 1 - Mar 7
          </span>
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-sundown-border">
            {WEEKLY_SCHEDULE.map((day) => (
              <div 
                key={day.day} 
                className={`p-3 flex items-center gap-4 ${day.isToday ? 'bg-sundown-gold/5' : ''}`}
              >
                <div className="flex flex-col items-center w-10 shrink-0">
                  <span className={`text-xs font-bold uppercase ${day.isToday ? 'text-sundown-gold' : 'text-sundown-muted'}`}>
                    {day.day}
                  </span>
                  <span className={`text-lg font-bold ${day.isToday ? 'text-sundown-gold' : 'text-sundown-text'}`}>
                    {day.date}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sundown-text text-sm">{day.type}</span>
                    {day.supplement && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        day.supplement.includes('No D3') 
                          ? 'border-sundown-orange/30 text-sundown-orange bg-sundown-orange/5'
                          : 'border-sundown-green/30 text-sundown-green bg-sundown-green/5'
                      }`}>
                        {day.supplement}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-sundown-muted">
                    <User className="w-3 h-3" />
                    <span>{day.staff}</span>
                  </div>
                </div>

                {day.type === 'Feeding' && (
                  <div className="w-8 h-8 rounded-full bg-sundown-bg border border-sundown-border flex items-center justify-center shrink-0">
                    <Utensils className="w-4 h-4 text-sundown-muted" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 5. Recent Activity */}
      <section>
        <h2 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Recent Activity</h2>
        <Card>
          <CardContent className="p-0 divide-y divide-sundown-border">
            {[
              { user: "Jane", action: "logged weight", target: "SR-BTM-2025-0014", value: "342g", time: "15m ago" },
              { user: "Mike", action: "completed", target: "Incubator Check", value: "", time: "45m ago" },
              { user: "John", action: "fed", target: "Rack A-3", value: "Crickets", time: "1h ago" },
              { user: "Jane", action: "moved", target: "SR-CH-2025-0031", value: "to B-2-10", time: "2h ago" },
            ].map((activity, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sundown-card border border-sundown-border flex items-center justify-center text-xs font-bold text-sundown-muted">
                  {activity.user[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sundown-text truncate">
                    <span className="font-medium text-sundown-gold">{activity.user}</span> {activity.action} <span className="font-medium">{activity.target}</span>
                  </p>
                  {activity.value && <p className="text-xs text-sundown-muted">{activity.value}</p>}
                </div>
                <span className="text-xs text-sundown-muted whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-sundown-card border border-sundown-border rounded-xl active:bg-sundown-border transition-colors touch-manipulation"
    >
      <div className="w-10 h-10 rounded-full bg-sundown-bg flex items-center justify-center text-sundown-gold">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-sundown-text">{label}</span>
    </button>
  );
}

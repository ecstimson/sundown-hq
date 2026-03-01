import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS = [
  [null, null, null, null, null, 1, 2],
  [3, 4, 5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23],
  [24, 25, 26, 27, 28, 29, 30],
  [31, null, null, null, null, null, null],
];

// Mock status: 0=incomplete, 1=complete, 2=issue
const STATUS: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 1,
  8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 0,
  15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
  21: 0, 22: 0, 23: 0, 24: 0, 25: 0, 26: 0,
  27: 0, 28: 0, 29: 0, 30: 0, 31: 0
};

export default function ChecklistReview() {
  const [selectedDate, setSelectedDate] = useState<number>(14);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Calendar Section */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">March 2025</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS.map(d => <div key={d} className="text-xs font-medium text-sundown-muted py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKS.map((week, i) => (
                week.map((day, j) => (
                  <div key={`${i}-${j}`} className="aspect-square">
                    {day && (
                      <button
                        onClick={() => setSelectedDate(day)}
                        className={`w-full h-full rounded-md flex flex-col items-center justify-center text-sm transition-all border ${
                          selectedDate === day 
                            ? "bg-sundown-gold text-black border-sundown-gold font-bold" 
                            : "bg-sundown-card border-sundown-border hover:border-sundown-gold/50 text-sundown-text"
                        }`}
                      >
                        <span>{day}</span>
                        <div className="mt-1">
                          {STATUS[day] === 1 && <div className="w-1.5 h-1.5 rounded-full bg-sundown-green" />}
                          {STATUS[day] === 2 && <div className="w-1.5 h-1.5 rounded-full bg-sundown-red" />}
                          {STATUS[day] === 0 && <div className="w-1.5 h-1.5 rounded-full bg-sundown-muted/30" />}
                        </div>
                      </button>
                    )}
                  </div>
                ))
              ))}
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-sundown-muted">
                <div className="w-2 h-2 rounded-full bg-sundown-green" /> All Checklists Complete
              </div>
              <div className="flex items-center gap-2 text-xs text-sundown-muted">
                <div className="w-2 h-2 rounded-full bg-sundown-red" /> Issues Reported / Incomplete
              </div>
              <div className="flex items-center gap-2 text-xs text-sundown-muted">
                <div className="w-2 h-2 rounded-full bg-sundown-muted/30" /> No Data / Future
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Section */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sundown-text">March {selectedDate}, 2025</h2>
            <p className="text-sundown-muted">Daily Operations Report</p>
          </div>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="w-4 h-4" /> Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-6">
          {/* Building A */}
          <Card className="border-sundown-green/50">
            <CardHeader className="pb-3 border-b border-sundown-border">
              <div className="flex items-center justify-between">
                <CardTitle>Building A</CardTitle>
                <span className="px-2 py-1 rounded-full bg-sundown-green/10 text-sundown-green text-xs font-bold uppercase">
                  100% Complete
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-sundown-border">
                {[
                  { task: "Opening Procedures", user: "John", time: "7:02 AM", status: "ok" },
                  { task: "Incubator Checks", user: "John", time: "7:15 AM", status: "ok", note: "All temps normal" },
                  { task: "Feeding Round", user: "Mike", time: "9:30 AM", status: "ok" },
                  { task: "Cleaning", user: "Jane", time: "11:45 AM", status: "ok" },
                  { task: "Closing Procedures", user: "Mike", time: "5:00 PM", status: "ok" },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-sundown-green mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-sundown-text">{item.task}</p>
                      <p className="text-xs text-sundown-muted">{item.user} · {item.time}</p>
                      {item.note && <p className="text-xs text-sundown-text mt-1 italic">"{item.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Building B */}
          <Card className={STATUS[selectedDate] === 2 ? "border-sundown-red/50" : "border-sundown-border"}>
            <CardHeader className="pb-3 border-b border-sundown-border">
              <div className="flex items-center justify-between">
                <CardTitle>Building B</CardTitle>
                {STATUS[selectedDate] === 2 ? (
                  <span className="px-2 py-1 rounded-full bg-sundown-red/10 text-sundown-red text-xs font-bold uppercase">
                    Issues Flagged
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-sundown-muted/10 text-sundown-muted text-xs font-bold uppercase">
                    Pending
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-sundown-border">
                {[
                  { task: "Opening Procedures", user: "Jane", time: "7:10 AM", status: "ok" },
                  { task: "Incubator Checks", user: "Jane", time: "7:25 AM", status: "issue", note: "Incubator 3 humidity low (45%)" },
                  { task: "Feeding Round", user: "John", time: "10:00 AM", status: "ok" },
                  { task: "Cleaning", status: "pending" },
                  { task: "Closing Procedures", status: "pending" },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    {item.status === "ok" && <CheckCircle className="w-5 h-5 text-sundown-green mt-0.5" />}
                    {item.status === "issue" && <AlertTriangle className="w-5 h-5 text-sundown-red mt-0.5" />}
                    {item.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-sundown-muted/30 mt-0.5" />}
                    
                    <div>
                      <p className={`text-sm font-medium ${item.status === "pending" ? "text-sundown-muted" : "text-sundown-text"}`}>
                        {item.task}
                      </p>
                      {item.user && <p className="text-xs text-sundown-muted">{item.user} · {item.time}</p>}
                      {item.note && <p className={`text-xs mt-1 italic ${item.status === "issue" ? "text-sundown-red" : "text-sundown-text"}`}>"{item.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

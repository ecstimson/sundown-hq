import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

const CHECKLIST_ITEMS = [
  { id: 1, label: "Building unlocked, lights on, HVAC verified", time: "7:02 AM", user: "John", completed: true },
  { id: 2, label: "Incubator temp check", time: "7:05 AM", value: "82°F", completed: true },
  { id: 3, label: "Incubator humidity check", time: "7:05 AM", value: "78%", completed: true },
  { id: 4, label: "Misting system check", completed: false },
  { id: 5, label: "Water changes", completed: false },
  { id: 6, label: "AM feeding round", completed: false },
  { id: 7, label: "Calcium dusting", completed: false, hasToggle: true },
  { id: 8, label: "Visual health scan", completed: false, hasInput: true },
];

export default function Checklists() {
  const navigate = useNavigate();
  const [items, setItems] = useState(CHECKLIST_ITEMS);
  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;

  const toggleItem = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-sundown-text">Morning Checklist</h1>
            <p className="text-sundown-muted text-sm">Building A · March 1, 2026</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-sundown-muted">
            <span>Progress</span>
            <span className={progress === 100 ? "text-sundown-green" : "text-sundown-gold"}>
              {completedCount} of {items.length} complete
            </span>
          </div>
          <div className="h-2 w-full bg-sundown-card rounded-full overflow-hidden">
            <div 
              className="h-full bg-sundown-gold transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <Card 
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`border transition-all cursor-pointer active:scale-[0.99] ${
              item.completed 
                ? "bg-sundown-card/50 border-sundown-border opacity-75" 
                : "bg-sundown-card border-sundown-border hover:border-sundown-gold/50"
            }`}
          >
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`mt-0.5 shrink-0 transition-colors ${item.completed ? "text-sundown-green" : "text-sundown-muted"}`}>
                {item.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 space-y-1">
                <p className={`font-medium text-base ${item.completed ? "text-sundown-muted line-through" : "text-sundown-text"}`}>
                  {item.label}
                </p>
                
                {item.completed && (
                  <p className="text-xs text-sundown-green font-medium">
                    {item.value ? `${item.value} · ` : ""}
                    {item.time} {item.user ? `· ${item.user}` : ""}
                  </p>
                )}

                {!item.completed && item.hasToggle && (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <button className="px-3 py-1 rounded bg-sundown-bg border border-sundown-border text-xs font-medium text-sundown-text hover:border-sundown-gold">Yes</button>
                    <button className="px-3 py-1 rounded bg-sundown-bg border border-sundown-border text-xs font-medium text-sundown-text hover:border-sundown-gold">No</button>
                  </div>
                )}

                {!item.completed && item.hasInput && (
                  <input 
                    type="text" 
                    placeholder="Any concerns?" 
                    className="w-full mt-2 h-8 px-3 rounded bg-sundown-bg border border-sundown-border text-sm text-sundown-text focus:border-sundown-gold focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete Button */}
      <div className="fixed bottom-20 left-4 right-4 z-10">
        <Button 
          disabled={progress < 100}
          className="w-full h-14 text-lg font-bold shadow-lg"
        >
          Complete Checklist
        </Button>
      </div>
    </div>
  );
}

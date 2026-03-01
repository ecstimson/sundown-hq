import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, Plus, MoreVertical, GripVertical, CheckCircle, Clock, AlertCircle } from "lucide-react";

const DROPS = [
  { id: 1, date: "March 7, 2025", title: "Early Spring Drop", status: "Planning", count: 82, revenue: "$12,400 est" },
  { id: 2, date: "March 21, 2025", title: "High-End Release", status: "Draft", count: 14, revenue: "$8,500 est" },
];

const STAGES = [
  { id: "candidates", title: "Candidates", count: 42, color: "bg-sundown-card" },
  { id: "prep", title: "In Prep", count: 18, color: "bg-blue-500/10" },
  { id: "photo", title: "Photography", count: 12, color: "bg-purple-500/10" },
  { id: "ready", title: "Ready to List", count: 10, color: "bg-sundown-green/10" },
];

const ANIMALS = [
  { id: "SR-GG-0147", species: "Gargoyle", morph: "Red Stripe", price: "$450", stage: "ready", img: "🦎" },
  { id: "SR-CH-0019", species: "Chahoua", morph: "Mossy", price: "$600", stage: "ready", img: "🦎" },
  { id: "SR-GG-0088", species: "Gargoyle", morph: "Orange Blotch", price: "$350", stage: "photo", img: "🦎" },
  { id: "SR-CG-0201", species: "Crested", morph: "Dalmatian", price: "$200", stage: "prep", img: "🦎" },
  { id: "SR-BTM-0014", species: "Blue Tree", morph: "Normal", price: "$1200", stage: "candidates", img: "🦎" },
];

export default function DropPlanner() {
  const [activeDrop, setActiveDrop] = useState(DROPS[0]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">Drop Planner</h1>
          <p className="text-sundown-muted text-sm">Manage upcoming inventory releases</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" /> Schedule Drop
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Candidates
          </Button>
        </div>
      </div>

      {/* Drop Selector */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {DROPS.map((drop) => (
          <button
            key={drop.id}
            onClick={() => setActiveDrop(drop)}
            className={`flex flex-col items-start p-4 rounded-xl border min-w-[240px] transition-all ${
              activeDrop.id === drop.id
                ? "bg-sundown-gold/10 border-sundown-gold"
                : "bg-sundown-card border-sundown-border hover:border-sundown-gold/50"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                drop.status === "Planning" ? "bg-blue-500/20 text-blue-400" : "bg-sundown-muted/20 text-sundown-muted"
              }`}>
                {drop.status}
              </span>
              <MoreVertical className="w-4 h-4 text-sundown-muted" />
            </div>
            <h3 className="font-bold text-sundown-text">{drop.title}</h3>
            <p className="text-sm text-sundown-muted">{drop.date}</p>
            <div className="mt-3 flex items-center gap-4 text-xs font-medium">
              <span className="text-sundown-text">{drop.count} Animals</span>
              <span className="text-sundown-green">{drop.revenue}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-[1000px]">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex-1 flex flex-col min-w-[240px]">
              <div className={`flex items-center justify-between p-3 rounded-t-lg border-t border-x border-sundown-border ${stage.color}`}>
                <h3 className="font-semibold text-sundown-text text-sm">{stage.title}</h3>
                <span className="text-xs font-bold bg-sundown-bg px-2 py-0.5 rounded-full text-sundown-muted">
                  {ANIMALS.filter(a => a.stage === stage.id).length}
                </span>
              </div>
              <div className="flex-1 bg-sundown-bg/50 border border-sundown-border rounded-b-lg p-2 space-y-2 overflow-y-auto">
                {ANIMALS.filter(a => a.stage === stage.id).map((animal) => (
                  <Card key={animal.id} className="cursor-grab active:cursor-grabbing hover:border-sundown-gold/50 group">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-sundown-muted/50 group-hover:text-sundown-muted">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-sundown-text">{animal.id}</span>
                            <span className="text-xs font-medium text-sundown-green">{animal.price}</span>
                          </div>
                          <p className="text-xs text-sundown-muted">{animal.species}</p>
                          <p className="text-xs text-sundown-muted truncate">{animal.morph}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {stage.id === 'photo' && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] w-full">Upload</Button>
                            )}
                            {stage.id === 'prep' && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] w-full">Weigh</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="ghost" className="w-full border border-dashed border-sundown-border text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 h-10 text-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

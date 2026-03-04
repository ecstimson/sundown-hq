import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, Plus, MoreVertical, GripVertical, Loader2, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Drop } from "@/types/database";

const STAGES = [
  { id: "candidates", title: "Candidates", color: "bg-sundown-card" },
  { id: "prep", title: "In Prep", color: "bg-blue-500/10" },
  { id: "photo", title: "Photography", color: "bg-purple-500/10" },
  { id: "ready", title: "Ready to List", color: "bg-sundown-green/10" },
];

export default function DropPlanner() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [activeDrop, setActiveDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDrops() {
      setLoading(true);
      const { data } = await supabase
        .from("drops")
        .select("*")
        .order("drop_date", { ascending: false });
      if (data && data.length > 0) {
        setDrops(data);
        setActiveDrop(data[0]);
      }
      setLoading(false);
    }
    fetchDrops();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">Drop Planner</h1>
          <p className="text-sundown-muted text-sm">
            Manage upcoming inventory releases
          </p>
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

      {drops.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Drops Planned"
          description="Schedule your first drop to start organizing inventory for release."
        />
      ) : (
        <>
          {/* Drop Selector */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            {drops.map((drop) => (
              <button
                key={drop.id}
                onClick={() => setActiveDrop(drop)}
                className={`flex flex-col items-start p-4 rounded-xl border min-w-[240px] transition-all ${
                  activeDrop?.id === drop.id
                    ? "bg-sundown-gold/10 border-sundown-gold"
                    : "bg-sundown-card border-sundown-border hover:border-sundown-gold/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                      drop.status === "Planning"
                        ? "bg-blue-500/20 text-blue-400"
                        : drop.status === "Prep"
                          ? "bg-sundown-gold/20 text-sundown-gold"
                          : drop.status === "Listed"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-sundown-green/20 text-sundown-green"
                    }`}
                  >
                    {drop.status}
                  </span>
                  <MoreVertical className="w-4 h-4 text-sundown-muted" />
                </div>
                <h3 className="font-bold text-sundown-text">{drop.drop_id}</h3>
                <p className="text-sm text-sundown-muted">
                  {new Date(drop.drop_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs font-medium">
                  <span className="text-sundown-muted capitalize">
                    {drop.drop_type}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 h-full min-w-[1000px]">
              {STAGES.map((stage) => (
                <div key={stage.id} className="flex-1 flex flex-col min-w-[240px]">
                  <div
                    className={`flex items-center justify-between p-3 rounded-t-lg border-t border-x border-sundown-border ${stage.color}`}
                  >
                    <h3 className="font-semibold text-sundown-text text-sm">
                      {stage.title}
                    </h3>
                    <span className="text-xs font-bold bg-sundown-bg px-2 py-0.5 rounded-full text-sundown-muted">
                      0
                    </span>
                  </div>
                  <div className="flex-1 bg-sundown-bg/50 border border-sundown-border rounded-b-lg p-2 space-y-2 overflow-y-auto">
                    <p className="text-xs text-sundown-muted text-center py-4">
                      No animals in this stage
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full border border-dashed border-sundown-border text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 h-10 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

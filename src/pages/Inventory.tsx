import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SpeciesCount {
  common_name: string;
  code: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface BuildingCount {
  building: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-sundown-green",
  Breeder: "bg-sundown-gold",
  Hold: "bg-blue-500",
  Listed: "bg-purple-500",
  Sold: "bg-sundown-muted",
  Archived: "bg-gray-600",
};

export default function Inventory() {
  const [total, setTotal] = useState(0);
  const [bySpecies, setBySpecies] = useState<SpeciesCount[]>([]);
  const [byStatus, setByStatus] = useState<StatusCount[]>([]);
  const [byBuilding, setByBuilding] = useState<BuildingCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

      const { data: animals } = await supabase
        .from("animals")
        .select("status, building, species:species_id(common_name, code)");

      if (!animals) { setLoading(false); return; }
      const rows = animals as unknown as { status: string; building: string | null; species: { common_name: string; code: string } }[];

      setTotal(rows.length);

      const speciesMap = new Map<string, SpeciesCount>();
      const statusMap = new Map<string, number>();
      const buildingMap = new Map<string, number>();

      for (const r of rows) {
        const key = r.species?.code || "?";
        const existing = speciesMap.get(key);
        if (existing) existing.count++;
        else speciesMap.set(key, { common_name: r.species?.common_name || "Unknown", code: key, count: 1 });

        statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);

        const bld = r.building || "Unassigned";
        buildingMap.set(bld, (buildingMap.get(bld) || 0) + 1);
      }

      setBySpecies(Array.from(speciesMap.values()).sort((a, b) => b.count - a.count));
      setByStatus(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));
      setByBuilding(Array.from(buildingMap.entries()).map(([building, count]) => ({ building, count })).sort((a, b) => b.count - a.count));

      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  const maxSpeciesCount = bySpecies[0]?.count || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sundown-text">Inventory</h2>
        <p className="text-sundown-muted text-sm">{total} total animals</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {byStatus.map((s) => (
          <Card key={s.status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-sundown-text">{s.count}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[s.status] || "bg-sundown-muted"}`} />
                <p className="text-xs text-sundown-muted font-medium">{s.status}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Building Breakdown */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-4">By Building</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {byBuilding.map((b) => (
              <div key={b.building} className="text-center">
                <p className="text-3xl font-bold text-sundown-text">{b.count}</p>
                <p className="text-sm text-sundown-muted">
                  {b.building === "A" || b.building === "B" ? `Building ${b.building}` : b.building}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Species Breakdown */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-4">By Species</h3>
          <div className="space-y-3">
            {bySpecies.map((s) => (
              <div key={s.code}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-sundown-text">{s.common_name}</span>
                  <span className="text-sm font-bold text-sundown-text">{s.count}</span>
                </div>
                <div className="h-2 w-full bg-sundown-bg border border-sundown-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sundown-gold rounded-full transition-all"
                    style={{ width: `${(s.count / maxSpeciesCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

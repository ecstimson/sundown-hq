import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Filter, Plus, Download, Upload, MoreHorizontal } from "lucide-react";

const ANIMALS = [
  { id: "SR-GG-2025-0147", species: "Gargoyle Gecko", gender: "Female", morph: "Red Stripe", status: "Available", weight: "34g", lastWeighed: "2 days ago", location: "A-3-14", readiness: 87 },
  { id: "SR-BTM-2025-0014", species: "Blue Tree Monitor", gender: "Male", morph: "—", status: "Listed", weight: "342g", lastWeighed: "5 days ago", location: "B-1-03", readiness: null },
  { id: "SR-CH-2025-0031", species: "Chahoua Gecko", gender: "Female", morph: "Mossy", status: "Breeder", weight: "62g", lastWeighed: "1 week ago", location: "A-5-02", readiness: null },
  { id: "SR-CG-2025-0201", species: "Crested Gecko", gender: "Unsexed", morph: "Dalmatian", status: "Hold", weight: "22g", lastWeighed: "Yesterday", location: "A-1-08", readiness: 45 },
  { id: "SR-GG-2025-0148", species: "Gargoyle Gecko", gender: "Male", morph: "Orange Blotch", status: "Available", weight: "38g", lastWeighed: "3 days ago", location: "A-3-15", readiness: 92 },
];

export default function AdminAnimals() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(i => i !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-sundown-text">Animals</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Animal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input 
            type="text" 
            placeholder="Search animals..." 
            className="w-full h-10 pl-10 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          />
        </div>
        <div className="flex gap-2">
          <select className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold">
            <option>All Species</option>
            <option>Gargoyle Gecko</option>
            <option>Crested Gecko</option>
          </select>
          <select className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold">
            <option>All Status</option>
            <option>Available</option>
            <option>Breeder</option>
            <option>Hold</option>
          </select>
          <select className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold">
            <option>All Buildings</option>
            <option>Building A</option>
            <option>Building B</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-sundown-gold/10 border border-sundown-gold/20 rounded-md p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-sundown-gold">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs">Change Status</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs">Assign to Drop</Button>
            <Button size="sm" variant="danger" className="h-8 text-xs">Delete</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-sundown-muted border-b border-sundown-border bg-sundown-bg/50">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" className="rounded border-sundown-border bg-sundown-card" />
                  </th>
                  <th className="px-4 py-3 font-medium">Animal ID</th>
                  <th className="px-4 py-3 font-medium">Species</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Morph</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Readiness</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sundown-border">
                {ANIMALS.map((animal) => (
                  <tr key={animal.id} className="hover:bg-sundown-border/10 transition-colors">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selected.includes(animal.id)}
                        onChange={() => toggleSelect(animal.id)}
                        className="rounded border-sundown-border bg-sundown-card" 
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-sundown-text">{animal.id}</td>
                    <td className="px-4 py-3 text-sundown-muted">{animal.species}</td>
                    <td className="px-4 py-3 text-sundown-muted">{animal.gender}</td>
                    <td className="px-4 py-3 text-sundown-muted">{animal.morph}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        animal.status === 'Available' ? 'bg-sundown-green/10 text-sundown-green' :
                        animal.status === 'Breeder' ? 'bg-sundown-gold/10 text-sundown-gold' :
                        animal.status === 'Hold' ? 'bg-blue-500/10 text-blue-400' :
                        animal.status === 'Listed' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-sundown-muted/10 text-sundown-muted'
                      }`}>
                        {animal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sundown-text">
                      {animal.weight} <span className="text-xs text-sundown-muted block">{animal.lastWeighed}</span>
                    </td>
                    <td className="px-4 py-3 text-sundown-muted">{animal.location}</td>
                    <td className="px-4 py-3">
                      {animal.readiness ? (
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-sundown-border h-1.5 rounded-full w-16">
                            <div 
                              className={`h-1.5 rounded-full ${
                                animal.readiness >= 80 ? "bg-sundown-green" : 
                                animal.readiness >= 60 ? "bg-sundown-gold" : "bg-sundown-red"
                              }`} 
                              style={{ width: `${animal.readiness}%` }}
                            />
                          </div>
                          <span className="text-xs text-sundown-muted">{animal.readiness}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-sundown-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4 text-sundown-muted" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Pagination Mock */}
      <div className="flex items-center justify-between text-sm text-sundown-muted">
        <span>Showing 1-5 of 1,060 animals</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}

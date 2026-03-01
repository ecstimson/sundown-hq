import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

const ANIMALS = [
  { id: "SR-GG-2025-0147", species: "Gargoyle Gecko", gender: "Female", morph: "Red Stripe", location: "Building A · Rack 3 · Pos 14", weight: "34g", lastWeighed: "3 days ago", lastObs: "1 day ago", status: "Available", color: "#D4A853" },
  { id: "SR-BTM-2025-0014", species: "Blue Tree Monitor", gender: "Male", morph: "Normal", location: "Building B · Enclosure 4", weight: "342g", lastWeighed: "5 days ago", lastObs: "Today", status: "Listed", color: "#4A7C59" },
  { id: "SR-CH-2025-0031", species: "Chahoua Gecko", gender: "Female", morph: "Mossy", location: "Building A · Rack 5 · Pos 02", weight: "62g", lastWeighed: "1 week ago", lastObs: "2 days ago", status: "Breeder", color: "#D4853A" },
  { id: "SR-CG-2025-0201", species: "Crested Gecko", gender: "Unsexed", morph: "Dalmatian", location: "Building A · Rack 1 · Pos 08", weight: "12g", lastWeighed: "Yesterday", lastObs: "Yesterday", status: "Hold", color: "#888888" },
  { id: "SR-GG-2025-0148", species: "Gargoyle Gecko", gender: "Male", morph: "Orange Blotch", location: "Building A · Rack 3 · Pos 15", weight: "38g", lastWeighed: "3 days ago", lastObs: "3 days ago", status: "Available", color: "#D4A853" },
  { id: "SR-GG-2025-0149", species: "Gargoyle Gecko", gender: "Female", morph: "Reticulated", location: "Building A · Rack 3 · Pos 16", weight: "35g", lastWeighed: "3 days ago", lastObs: "Today", status: "Available", color: "#D4A853" },
];

const FILTERS = ["All Species", "Gargoyle Gecko", "Chahoua", "Crested Gecko", "Blue Tree Monitor"];
const BUILDINGS = ["All Buildings", "Building A", "Building B"];

export default function AnimalList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Species");
  const [activeBuilding, setActiveBuilding] = useState("All Buildings");

  const filteredAnimals = ANIMALS.filter(animal => {
    const matchesSearch = animal.id.toLowerCase().includes(search.toLowerCase()) || 
                          animal.species.toLowerCase().includes(search.toLowerCase()) ||
                          animal.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "All Species" || animal.species === activeFilter;
    const matchesBuilding = activeBuilding === "All Buildings" || animal.location.includes(activeBuilding);
    
    return matchesSearch && matchesFilter && matchesBuilding;
  });

  return (
    <div className="flex flex-col h-full bg-sundown-bg pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-sundown-bg pt-2 pb-4 space-y-3 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input 
            type="text" 
            placeholder="Search by ID, species, or location..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
          />
        </div>

        {/* Species Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-colors border ${
                activeFilter === filter
                  ? "bg-sundown-gold text-black border-sundown-gold"
                  : "bg-sundown-card text-sundown-muted border-sundown-border hover:border-sundown-gold/50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Building Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {BUILDINGS.map((building) => (
            <button
              key={building}
              onClick={() => setActiveBuilding(building)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-colors border ${
                activeBuilding === building
                  ? "bg-sundown-text text-black border-sundown-text"
                  : "bg-sundown-card text-sundown-muted border-sundown-border hover:border-sundown-text/50"
              }`}
            >
              {building}
            </button>
          ))}
        </div>
      </div>

      {/* Animal List */}
      <div className="space-y-3 mt-2">
        {filteredAnimals.map((animal) => (
          <Card 
            key={animal.id} 
            className="active:scale-[0.99] transition-transform cursor-pointer border-sundown-border hover:border-sundown-gold/50"
            onClick={() => navigate(`/employee/animals/${animal.id}`)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              {/* Species Indicator */}
              <div className="w-2 h-full self-stretch rounded-full bg-sundown-border shrink-0 overflow-hidden relative">
                 <div className="absolute inset-0 opacity-50" style={{ backgroundColor: animal.color }}></div>
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sundown-text text-base">{animal.id}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    animal.status === 'Available' ? 'bg-sundown-green/20 text-sundown-green' :
                    animal.status === 'Breeder' ? 'bg-sundown-gold/20 text-sundown-gold' :
                    animal.status === 'Hold' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {animal.status}
                  </span>
                </div>
                
                <p className="text-sm text-sundown-text truncate">
                  {animal.species} · {animal.gender} · {animal.morph}
                </p>
                
                <p className="text-xs text-sundown-muted flex items-center gap-1">
                  <span className="truncate">{animal.location}</span>
                </p>

                <div className="flex items-center justify-between pt-2 mt-1 border-t border-sundown-border/50">
                  <span className="text-xs text-sundown-text font-medium">
                    {animal.weight} <span className="text-sundown-muted font-normal">· {animal.lastWeighed}</span>
                  </span>
                  <span className="text-xs text-sundown-muted">
                    Last obs: {animal.lastObs}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredAnimals.length === 0 && (
          <div className="text-center py-12 text-sundown-muted">
            <p>No animals found matching your filters.</p>
            <button 
              onClick={() => {setSearch(""); setActiveFilter("All Species"); setActiveBuilding("All Buildings");}}
              className="mt-4 text-sundown-gold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

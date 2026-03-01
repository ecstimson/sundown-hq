import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, BookOpen, Thermometer, Utensils, Activity, Droplets, Bug, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

const SOP_CATEGORIES = [
  { id: 1, title: "Opening Procedures", count: 2, icon: BookOpen, color: "text-blue-400" },
  { id: 2, title: "Incubator Checks", count: 1, icon: Thermometer, color: "text-red-400" },
  { id: 3, title: "Feeding Schedule", count: 3, icon: Utensils, color: "text-green-400" },
  { id: 4, title: "Track Calcium", count: 1, icon: Activity, color: "text-yellow-400" },
  { id: 5, title: "Cleaning", count: 2, icon: Droplets, color: "text-cyan-400" },
  { id: 6, title: "Routine Checkups", count: 1, icon: Activity, color: "text-purple-400" },
  { id: 7, title: "Insect Maintenance", count: 1, icon: Bug, color: "text-orange-400" },
  { id: 8, title: "Closing Procedures", count: 2, icon: Lock, color: "text-gray-400" },
];

export default function SOPs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredCategories = SOP_CATEGORIES.filter(cat => 
    cat.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="space-y-4 mb-6 sticky top-0 bg-sundown-bg z-10 pt-2 pb-2">
        <h1 className="text-xl font-bold text-sundown-text">Standard Operating Procedures</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input 
            type="text" 
            placeholder="Search SOPs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredCategories.map((category) => (
          <Card 
            key={category.id}
            className="active:scale-[0.99] transition-transform cursor-pointer border-sundown-border hover:border-sundown-gold/50"
            onClick={() => {
              // In a real app, navigate to category details
              // navigate(`/employee/sops/${category.id}`)
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-sundown-bg border border-sundown-border flex items-center justify-center ${category.color}`}>
                <category.icon className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-sundown-text">{category.title}</h3>
                <p className="text-xs text-sundown-muted">{category.count} documents</p>
              </div>

              <ChevronRight className="w-5 h-5 text-sundown-muted" />
            </CardContent>
          </Card>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-sundown-muted">
            <p>No SOPs found matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Plus, FileText, Edit, Trash2, Eye } from "lucide-react";

const SOPS = [
  { id: 1, title: "Opening Procedures", category: "Daily Ops", lastUpdated: "2 days ago", author: "Bryan" },
  { id: 2, title: "Incubator Checks", category: "Daily Ops", lastUpdated: "1 week ago", author: "Bryan" },
  { id: 3, title: "Feeding Schedule - Geckos", category: "Feeding", lastUpdated: "3 weeks ago", author: "John" },
  { id: 4, title: "Feeding Schedule - Monitors", category: "Feeding", lastUpdated: "3 weeks ago", author: "John" },
  { id: 5, title: "Quarantine Protocol", category: "Health", lastUpdated: "1 month ago", author: "Bryan" },
  { id: 6, title: "Shipping Guidelines", category: "Logistics", lastUpdated: "2 months ago", author: "Jane" },
];

export default function SOPManager() {
  const [search, setSearch] = useState("");

  const filteredSOPs = SOPS.filter(sop => 
    sop.title.toLowerCase().includes(search.toLowerCase()) ||
    sop.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">SOP Library</h1>
          <p className="text-sundown-muted text-sm">Manage standard operating procedures</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Create New SOP
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input 
            type="text" 
            placeholder="Search SOPs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          />
        </div>
        <select className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold">
          <option>All Categories</option>
          <option>Daily Ops</option>
          <option>Feeding</option>
          <option>Health</option>
          <option>Logistics</option>
        </select>
      </div>

      {/* SOP Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSOPs.map((sop) => (
          <Card key={sop.id} className="group hover:border-sundown-gold/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-sundown-bg border border-sundown-border flex items-center justify-center text-sundown-muted group-hover:text-sundown-gold transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-sundown-muted hover:text-sundown-text">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-sundown-muted hover:text-sundown-text">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-3 text-lg">{sop.title}</CardTitle>
              <CardDescription>{sop.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-sundown-muted pt-3 border-t border-sundown-border">
                <span>Updated {sop.lastUpdated}</span>
                <span>By {sop.author}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

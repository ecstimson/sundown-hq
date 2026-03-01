import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft, ExternalLink, Plus, Scale, AlertTriangle, Utensils, Activity } from "lucide-react";

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data
  const animal = {
    id: id || "SR-GG-2025-0147",
    species: "Gargoyle Gecko",
    scientificName: "Rhacodactylus auriculatus",
    gender: "Female",
    morph: "Red Stripe, Blotched",
    hatchDate: "Aug 15, 2025",
    age: "6 months old",
    pairing: "P-GG-042",
    parents: "SR-GG-2020-0012 (Sire) · SR-GG-2020-0023 (Dam)",
    location: "Building A · Rack 3 · Pos 14",
    status: "Available",
    weight: "34g",
    lastWeighed: "3 days ago",
    notes: "Eating well, displaying great color fired up.",
    history: [
      { type: "Feeding", user: "John", date: "Feb 28, 2026 · 2:14 PM", note: "Ate CGD well, good appetite", icon: Utensils, color: "text-sundown-green" },
      { type: "Health Concern", user: "Jane", date: "Feb 25, 2026 · 9:30 AM", note: "Slight tail kink noticed, monitoring", icon: AlertTriangle, color: "text-sundown-red", hasPhoto: true },
      { type: "Weight", user: "Mike", date: "Feb 20, 2026 · 11:00 AM", note: "Updated to 34g (was 31g)", icon: Scale, color: "text-sundown-gold" },
      { type: "Observation", user: "John", date: "Feb 15, 2026 · 4:45 PM", note: "Shedding completely", icon: Activity, color: "text-sundown-muted" },
    ]
  };

  return (
    <div className="flex flex-col h-full pb-24 relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-sundown-text">{animal.id}</h1>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mt-1 ${
            animal.status === 'Available' ? 'bg-sundown-green/20 text-sundown-green' : 'bg-sundown-muted/20 text-sundown-muted'
          }`}>
            {animal.status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Info Section */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Species</h3>
              <p className="text-sundown-text font-medium">{animal.species}</p>
              <p className="text-xs text-sundown-muted italic">{animal.scientificName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Gender</h3>
                <p className="text-sundown-text">{animal.gender}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Age</h3>
                <p className="text-sundown-text">{animal.age}</p>
                <p className="text-xs text-sundown-muted">{animal.hatchDate}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Morph</h3>
              <p className="text-sundown-text">{animal.morph}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Lineage</h3>
              <p className="text-sm text-sundown-text">{animal.parents}</p>
              <p className="text-xs text-sundown-muted mt-0.5">Pairing: {animal.pairing}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Location</h3>
              <p className="text-sundown-text">{animal.location}</p>
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-9">
              <ExternalLink className="w-3 h-3" />
              View Photos in Drive
            </Button>
          </CardContent>
        </Card>

        {/* Editable Section */}
        <Card className="border-sundown-gold/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">Current Weight</h3>
                <p className="text-2xl font-bold text-sundown-text">{animal.weight}</p>
                <p className="text-xs text-sundown-muted">Last: {animal.lastWeighed}</p>
              </div>
              <Button size="sm" variant="secondary" className="h-9">Update</Button>
            </div>

            <div className="pt-4 border-t border-sundown-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider">Latest Note</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-sundown-gold hover:text-sundown-gold-hover p-0">Edit</Button>
              </div>
              <p className="text-sm text-sundown-text italic">"{animal.notes}"</p>
            </div>
          </CardContent>
        </Card>

        {/* Observation History */}
        <div>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3 px-1">History</h3>
          <div className="space-y-4 pl-4 border-l-2 border-sundown-border ml-2">
            {animal.history.map((item, i) => (
              <div key={i} className="relative pl-6 pb-2">
                <div className={`absolute -left-[29px] top-0 w-8 h-8 rounded-full bg-sundown-card border-2 border-sundown-bg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sundown-text text-sm">{item.type}</span>
                    <span className="text-xs text-sundown-muted">{item.date.split('·')[0]}</span>
                  </div>
                  <p className="text-xs text-sundown-muted">{item.user} · {item.date.split('·')[1]}</p>
                  <p className="text-sm text-sundown-text mt-1">{item.note}</p>
                  {item.hasPhoto && (
                    <div className="mt-2 w-16 h-16 rounded-md bg-sundown-card border border-sundown-border flex items-center justify-center">
                      <span className="text-[10px] text-sundown-muted">Photo</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <Button 
        className="fixed bottom-24 right-4 h-14 px-6 rounded-full shadow-lg shadow-sundown-gold/20 z-30 gap-2 font-bold text-base"
        onClick={() => navigate(`/employee/observe?id=${animal.id}`)}
      >
        <Plus className="w-5 h-5" />
        Log Observation
      </Button>
    </div>
  );
}

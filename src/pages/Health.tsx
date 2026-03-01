import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Activity, Thermometer, AlertTriangle, FileText, Plus } from "lucide-react";

const healthRecords = [
  { id: 1, animalId: "BP-2024-045", species: "Ball Python", issue: "Respiratory Infection", severity: "high", location: "Quarantine Q1", date: "2026-02-28", status: "treating" },
  { id: 2, animalId: "Leo-2023-112", species: "Leopard Gecko", issue: "Stuck Shed", severity: "low", location: "Rack B-12", date: "2026-03-01", status: "monitoring" },
  { id: 3, animalId: "Boa-2025-002", species: "Boa Constrictor", issue: "Refusing Food", severity: "medium", location: "Rack A-05", date: "2026-02-15", status: "investigating" },
];

export default function Health() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-sundown-text">Health Records</h2>
        <Button className="gap-2 bg-sundown-red hover:bg-red-700 text-white border-none">
          <Plus className="h-4 w-4" />
          Report Issue
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Cases List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthRecords.map((record) => (
                <div key={record.id} className="flex items-start justify-between p-4 rounded-lg border border-sundown-border bg-sundown-bg/30 hover:bg-sundown-bg/50 transition-colors">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      record.severity === 'high' ? 'bg-sundown-red/20 text-sundown-red' :
                      record.severity === 'medium' ? 'bg-sundown-orange/20 text-sundown-orange' :
                      'bg-sundown-gold/20 text-sundown-gold'
                    }`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sundown-text">{record.animalId}</h4>
                        <span className="text-xs text-sundown-muted">• {record.species}</span>
                      </div>
                      <p className="text-sm font-medium text-sundown-text mt-1">{record.issue}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-sundown-muted">
                        <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {record.location}</span>
                        <span>•</span>
                        <span>Reported: {record.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                      record.status === 'treating' ? 'bg-sundown-red/10 text-sundown-red' :
                      record.status === 'investigating' ? 'bg-sundown-orange/10 text-sundown-orange' :
                      'bg-sundown-gold/10 text-sundown-gold'
                    }`}>
                      {record.status}
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / Actions */}
        <div className="space-y-6">
          <Card className="bg-sundown-card border-sundown-border">
            <CardHeader>
              <CardTitle>Health Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-sundown-bg rounded-md">
                <span className="text-sm text-sundown-muted">Total Active Cases</span>
                <span className="text-xl font-bold text-sundown-text">3</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sundown-bg rounded-md border-l-2 border-l-sundown-red">
                <span className="text-sm text-sundown-muted">Critical / Urgent</span>
                <span className="text-xl font-bold text-sundown-red">1</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sundown-bg rounded-md">
                <span className="text-sm text-sundown-muted">Quarantine Occupancy</span>
                <span className="text-xl font-bold text-sundown-text">12%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-sundown-muted" />
                  <span className="text-sundown-text">Vet Visit Report - Feb 28</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-sundown-muted" />
                  <span className="text-sundown-text">Water Quality Test - Feb 25</span>
                </div>
                <Button variant="outline" className="w-full mt-2 text-xs">View All Logs</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Filter, Plus, AlertTriangle } from "lucide-react";

const inventoryItems = [
  { id: 1, name: "Frozen Mice (Pinkies)", category: "Food", stock: 1200, unit: "count", status: "good", location: "Freezer A" },
  { id: 2, name: "Frozen Mice (Fuzzies)", category: "Food", stock: 450, unit: "count", status: "low", location: "Freezer A" },
  { id: 3, name: "Aspen Bedding", category: "Substrate", stock: 12, unit: "bags", status: "critical", location: "Warehouse B" },
  { id: 4, name: "Heat Tape (12\")", category: "Equipment", stock: 300, unit: "ft", status: "good", location: "Warehouse A" },
  { id: 5, name: "Water Bowls (Small)", category: "Equipment", stock: 50, unit: "count", status: "good", location: "Warehouse A" },
  { id: 6, name: "Calcium Powder", category: "Supplements", stock: 5, unit: "jars", status: "warning", location: "Shelf C" },
];

export default function Inventory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              className="w-full h-10 pl-10 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-sundown-muted border-b border-sundown-border bg-sundown-bg/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Item Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Stock Level</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sundown-border">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-sundown-border/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-sundown-text">{item.name}</td>
                    <td className="px-6 py-4 text-sundown-muted">{item.category}</td>
                    <td className="px-6 py-4 text-sundown-text">
                      {item.stock} <span className="text-sundown-muted text-xs">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sundown-muted">{item.location}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'good' ? 'bg-sundown-green/10 text-sundown-green' :
                        item.status === 'low' ? 'bg-sundown-orange/10 text-sundown-orange' :
                        item.status === 'critical' ? 'bg-sundown-red/10 text-sundown-red' :
                        'bg-sundown-muted/10 text-sundown-muted'
                      }`}>
                        {item.status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Edit</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sundown-muted hover:text-sundown-text"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00178 12.709 2.14646 12.8536C2.29113 12.9982 2.50905 13.0401 2.69697 12.9596L6.10845 11.4975C6.2254 11.4474 6.33168 11.3754 6.42165 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM11.5 2.20711L12.7929 3.5L11.5 4.79289L10.2071 3.5L11.5 2.20711ZM10.7929 4.08579L12.0858 5.37868L5.37868 12.0858L4.08579 10.7929L10.7929 4.08579ZM3.18633 11.8136L3.81367 10.3502L4.64985 11.1863L3.18633 11.8136Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

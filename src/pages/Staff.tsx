import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, UserPlus, Phone, Mail, Clock } from "lucide-react";

const staffMembers = [
  { id: 1, name: "John Doe", role: "Warehouse Manager", status: "on-shift", phone: "555-0123", email: "john@sundown.com", lastActive: "2 mins ago" },
  { id: 2, name: "Jane Smith", role: "Breeding Specialist", status: "on-shift", phone: "555-0124", email: "jane@sundown.com", lastActive: "15 mins ago" },
  { id: 3, name: "Mike Johnson", role: "General Labor", status: "off-shift", phone: "555-0125", email: "mike@sundown.com", lastActive: "Yesterday" },
  { id: 4, name: "Sarah Connor", role: "Veterinary Tech", status: "on-call", phone: "555-0126", email: "sarah@sundown.com", lastActive: "4 hours ago" },
];

export default function Staff() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-sundown-text">Staff Management</h2>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffMembers.map((staff) => (
          <Card key={staff.id} className="hover:border-sundown-gold/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="h-12 w-12 rounded-full bg-sundown-bg border border-sundown-border flex items-center justify-center text-lg font-bold text-sundown-muted">
                {staff.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <CardTitle className="text-lg">{staff.name}</CardTitle>
                <p className="text-sm text-sundown-muted">{staff.role}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-sundown-muted">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    staff.status === 'on-shift' ? 'bg-sundown-green/10 text-sundown-green' :
                    staff.status === 'on-call' ? 'bg-sundown-orange/10 text-sundown-orange' :
                    'bg-sundown-muted/10 text-sundown-muted'
                  }`}>
                    {staff.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-sundown-muted">
                  <Phone className="h-3 w-3" /> {staff.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-sundown-muted">
                  <Mail className="h-3 w-3" /> {staff.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-sundown-muted border-t border-sundown-border pt-3 mt-3">
                  <Clock className="h-3 w-3" /> Last active: {staff.lastActive}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" size="sm" className="w-full">Profile</Button>
                <Button variant="ghost" size="sm" className="w-full text-sundown-muted hover:text-sundown-text">Schedule</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

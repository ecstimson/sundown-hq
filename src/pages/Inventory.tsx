import { Package } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Inventory() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-sundown-text">Supply Inventory</h2>
      <EmptyState
        icon={Package}
        title="Coming Soon"
        description="Supply inventory tracking is being built. You'll be able to manage food, substrates, supplements, and equipment here."
      />
    </div>
  );
}

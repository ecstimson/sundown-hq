import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Scale,
  AlertTriangle,
  Utensils,
  Activity,
  Loader2,
  FileQuestion,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Animal, Species, Observation } from "@/types/database";

type AnimalWithSpecies = Animal & {
  species: Pick<Species, "common_name" | "scientific_name" | "code">;
};

const OBS_ICONS: Record<string, { icon: typeof Activity; color: string }> = {
  Feeding: { icon: Utensils, color: "text-sundown-green" },
  "Health Concern": { icon: AlertTriangle, color: "text-sundown-red" },
  Weight: { icon: Scale, color: "text-sundown-gold" },
  Shedding: { icon: Activity, color: "text-purple-400" },
  "Egg-Breeding": { icon: Activity, color: "text-pink-400" },
  Behavior: { icon: Activity, color: "text-blue-400" },
  "General Note": { icon: Activity, color: "text-sundown-muted" },
};

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<AnimalWithSpecies | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnimal() {
      if (!id) return;
      setLoading(true);

      // Try matching by animal_id first
      const { data } = await supabase
        .from("animals")
        .select("*, species:species_id(common_name, scientific_name, code)")
        .eq("animal_id", id)
        .limit(1);

      const found = (data as unknown as AnimalWithSpecies[] | null)?.[0];

      if (found) {
        setAnimal(found);
        const { data: obs } = await supabase
          .from("observations")
          .select("*")
          .eq("animal_id", found.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (obs) setObservations(obs as Observation[]);
      } else {
        // Try by UUID
        const { data: byUuid } = await supabase
          .from("animals")
          .select("*, species:species_id(common_name, scientific_name, code)")
          .eq("id", id)
          .limit(1);

        const foundByUuid = (byUuid as unknown as AnimalWithSpecies[] | null)?.[0];
        if (foundByUuid) {
          setAnimal(foundByUuid);
          const { data: obs } = await supabase
            .from("observations")
            .select("*")
            .eq("animal_id", foundByUuid.id)
            .order("created_at", { ascending: false })
            .limit(20);
          if (obs) setObservations(obs as Observation[]);
        }
      }
      setLoading(false);
    }
    fetchAnimal();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="pb-24">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <EmptyState
          icon={FileQuestion}
          title="Animal Not Found"
          description={`No animal found with ID "${id}".`}
          actionLabel="Back to Animals"
          onAction={() => navigate("/employee/animals")}
        />
      </div>
    );
  }

  const ageText = animal.hatch_date
    ? (() => {
        const months = Math.floor(
          (Date.now() - new Date(animal.hatch_date).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        );
        return months < 12
          ? `${months} month${months !== 1 ? "s" : ""} old`
          : `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? "s" : ""} old`;
      })()
    : null;

  return (
    <div className="flex flex-col h-full pb-24 relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-sundown-text">
            {animal.animal_id}
          </h1>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mt-1 ${
              animal.status === "Available"
                ? "bg-sundown-green/20 text-sundown-green"
                : animal.status === "Hold"
                  ? "bg-blue-500/20 text-blue-400"
                  : animal.status === "Sold"
                    ? "bg-sundown-muted/20 text-sundown-muted"
                    : "bg-sundown-gold/20 text-sundown-gold"
            }`}
          >
            {animal.status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Info Section */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                Species
              </h3>
              <p className="text-sundown-text font-medium">
                {animal.species?.common_name}
              </p>
              {animal.species?.scientific_name && (
                <p className="text-xs text-sundown-muted italic">
                  {animal.species.scientific_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Gender
                </h3>
                <p className="text-sundown-text">{animal.gender}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Age
                </h3>
                {ageText ? (
                  <>
                    <p className="text-sundown-text">{ageText}</p>
                    <p className="text-xs text-sundown-muted">
                      Hatched{" "}
                      {new Date(animal.hatch_date!).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-sundown-muted">Unknown</p>
                )}
              </div>
            </div>

            {animal.morph_traits && (
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Morph / Lineage
                </h3>
                <p className="text-sundown-text">{animal.morph_traits}</p>
              </div>
            )}

            {(animal.building || animal.rack_enclosure) && (
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Location
                </h3>
                <p className="text-sundown-text">
                  {animal.building ? `Building ${animal.building}` : ""}
                  {animal.rack_enclosure ? ` · ${animal.rack_enclosure}` : ""}
                </p>
              </div>
            )}

            {animal.price && (
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Price
                </h3>
                <p className="text-sundown-text font-medium">
                  ${animal.price.toLocaleString()}
                </p>
              </div>
            )}

            {animal.image_folder_url && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs h-9"
                onClick={() => window.open(animal.image_folder_url!, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />
                View Photos
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Weight Section */}
        <Card className="border-sundown-gold/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-1">
                  Current Weight
                </h3>
                <p className="text-2xl font-bold text-sundown-text">
                  {animal.current_weight_g ? `${animal.current_weight_g}g` : "—"}
                </p>
                {animal.last_weighed && (
                  <p className="text-xs text-sundown-muted">
                    Last: {timeAgo(animal.last_weighed)}
                  </p>
                )}
              </div>
            </div>

            {animal.notes && (
              <div className="pt-4 border-t border-sundown-border">
                <h3 className="text-sm font-medium text-sundown-muted uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <p className="text-sm text-sundown-text italic">
                  "{animal.notes}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observation History */}
        <div>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3 px-1">
            History
          </h3>
          {observations.length > 0 ? (
            <div className="space-y-4 pl-4 border-l-2 border-sundown-border ml-2">
              {observations.map((obs) => {
                const config = OBS_ICONS[obs.observation_type] || OBS_ICONS["General Note"];
                const ObsIcon = config.icon;
                return (
                  <div key={obs.id} className="relative pl-6 pb-2">
                    <div
                      className={`absolute -left-[29px] top-0 w-8 h-8 rounded-full bg-sundown-card border-2 border-sundown-bg flex items-center justify-center ${config.color}`}
                    >
                      <ObsIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sundown-text text-sm">
                          {obs.observation_type}
                        </span>
                        <span className="text-xs text-sundown-muted">
                          {timeAgo(obs.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-sundown-muted">
                        {obs.employee_name}
                      </p>
                      <p className="text-sm text-sundown-text mt-1">
                        {obs.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No Observations Yet"
              description="Tap the button below to log the first observation for this animal."
            />
          )}
        </div>
      </div>

      {/* FAB */}
      <Button
        className="fixed bottom-24 right-4 h-14 px-6 rounded-full shadow-lg shadow-sundown-gold/20 z-30 gap-2 font-bold text-base"
        onClick={() => navigate(`/employee/observe?id=${animal.animal_id}`)}
      >
        <Plus className="w-5 h-5" />
        Log Observation
      </Button>
    </div>
  );
}

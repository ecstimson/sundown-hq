import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
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
  Calendar,
  MapPin,
  Tag,
  Heart,
  Dna,
  DollarSign,
  Clock,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Animal, Species, Observation, Drop } from "@/types/database";

type AnimalWithSpecies = Animal & {
  species: Pick<Species, "common_name" | "scientific_name" | "code">;
};

type StatusHistoryEntry = {
  status: string;
  changed_at: string;
  changed_by?: string | null;
};

type DropAssignment = {
  id: string;
  drop_id: string;
  stage: string;
  drop: { drop_id: string; drop_date: string; status: string };
};

const STATUS_BADGE: Record<string, string> = {
  Available: "bg-sundown-green/20 text-sundown-green",
  Unlisted: "bg-orange-500/20 text-orange-400",
  Breeder: "bg-sundown-gold/20 text-sundown-gold",
  Hold: "bg-blue-500/20 text-blue-400",
  Listed: "bg-purple-500/20 text-purple-400",
  Sold: "bg-gray-600/20 text-gray-400",
  Archived: "bg-gray-800/20 text-gray-500",
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAdmin = location.pathname.startsWith("/admin");
  const prefix = isAdmin ? "/admin" : "/employee";

  const [animal, setAnimal] = useState<AnimalWithSpecies | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  const [dropAssignments, setDropAssignments] = useState<DropAssignment[]>([]);
  const [availableDrops, setAvailableDrops] = useState<Drop[]>([]);
  const [showDropPicker, setShowDropPicker] = useState(false);
  const [addingToDrop, setAddingToDrop] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAnimal();
  }, [id]);

  useEffect(() => {
    if (animal && searchParams.get("action") === "drop") {
      openDropPicker();
    }
  }, [animal]);

  async function fetchAnimal() {
    setLoading(true);

    const { data } = await supabase
      .from("animals")
      .select("*, species:species_id(common_name, scientific_name, code)")
      .eq("animal_id", id)
      .limit(1);

    let found = (data as unknown as AnimalWithSpecies[] | null)?.[0];

    if (!found) {
      const { data: byUuid } = await supabase
        .from("animals")
        .select("*, species:species_id(common_name, scientific_name, code)")
        .eq("id", id)
        .limit(1);
      found = (byUuid as unknown as AnimalWithSpecies[] | null)?.[0] ?? null;
    }

    if (found) {
      setAnimal(found);

      const [{ data: obs }, { data: drops }] = await Promise.all([
        supabase
          .from("observations")
          .select("*")
          .eq("animal_id", found.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("drop_animals")
          .select("id, drop_id, stage, drop:drop_id(drop_id, drop_date, status)")
          .eq("animal_id", found.id) as any,
      ]);

      if (obs) setObservations(obs as Observation[]);
      if (drops) setDropAssignments(drops as DropAssignment[]);
    }

    setLoading(false);
  }

  async function openDropPicker() {
    setShowDropPicker(true);
    const assignedDropIds = new Set(dropAssignments.map((d) => d.drop_id));
    const { data } = await supabase
      .from("drops")
      .select("*")
      .in("status", ["Planning", "Prep"])
      .order("drop_date");
    if (data) {
      setAvailableDrops(
        (data as Drop[]).filter((d) => !assignedDropIds.has(d.id))
      );
    }
  }

  async function addToDrop(drop: Drop) {
    if (!animal) return;
    setAddingToDrop(true);
    await supabase.from("drop_animals").insert({
      drop_id: drop.id,
      animal_id: animal.id,
      stage: "candidates",
    } as any);
    setShowDropPicker(false);
    setAddingToDrop(false);

    const { data: drops } = await supabase
      .from("drop_animals")
      .select("id, drop_id, stage, drop:drop_id(drop_id, drop_date, status)")
      .eq("animal_id", animal.id) as any;
    if (drops) setDropAssignments(drops as DropAssignment[]);
  }

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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2 mb-4">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <EmptyState
          icon={FileQuestion}
          title="Animal Not Found"
          description={`No animal found with ID "${id}".`}
          actionLabel="Back to Animals"
          onAction={() => navigate(`${prefix}/animals`)}
        />
      </div>
    );
  }

  const statusHistory: StatusHistoryEntry[] = Array.isArray(animal.status_history)
    ? (animal.status_history as unknown as StatusHistoryEntry[])
    : [];

  const ageText = animal.hatch_date
    ? (() => {
        const months = Math.floor(
          (Date.now() - new Date(animal.hatch_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        return months < 12
          ? `${months}mo`
          : `${Math.floor(months / 12)}yr ${months % 12}mo`;
      })()
    : null;

  const observePath = isAdmin ? `/employee/observe` : `${prefix}/observe`;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-sundown-text truncate">{animal.animal_id}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[animal.status] || "bg-sundown-muted/20 text-sundown-muted"}`}>
              {animal.status}
            </span>
          </div>
          <p className="text-sm text-sundown-muted">
            {animal.species?.common_name}
            {animal.species?.scientific_name ? ` · ${animal.species.scientific_name}` : ""}
          </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => navigate(`${observePath}?id=${animal.animal_id}`)}
        >
          <Plus className="w-3.5 h-3.5" /> Log Observation
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => navigate(`${observePath}?id=${animal.animal_id}&type=Weight`)}
        >
          <Scale className="w-3.5 h-3.5" /> Update Weight
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => navigate(`${observePath}?id=${animal.animal_id}&type=photo`)}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Add Photo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={openDropPicker}
        >
          <Calendar className="w-3.5 h-3.5" /> Add to Drop
        </Button>
      </div>

      {/* Info Grid */}
      <div className="border border-sundown-border divide-y divide-sundown-border bg-sundown-card">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-sundown-border">
          <InfoCell icon={Heart} label="Gender" value={animal.gender || "Unknown"} />
          <InfoCell icon={Clock} label="Age" value={ageText || "Unknown"} sub={
            animal.hatch_date
              ? `Hatched ${new Date(animal.hatch_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : undefined
          } />
          <InfoCell
            icon={Scale}
            label="Weight"
            value={animal.current_weight_g ? `${animal.current_weight_g}g` : "—"}
            sub={animal.last_weighed ? `Last: ${timeAgo(animal.last_weighed)}` : undefined}
          />
          <InfoCell
            icon={DollarSign}
            label="Price"
            value={animal.price ? `$${animal.price.toLocaleString()}` : "—"}
          />
        </div>

        {animal.morph_traits && (
          <div className="px-5 py-3 flex items-center gap-3">
            <Dna className="w-4 h-4 text-sundown-muted shrink-0" />
            <div>
              <p className="text-xs text-sundown-muted uppercase font-medium">Morph / Lineage</p>
              <p className="text-sm text-sundown-text">{animal.morph_traits}</p>
            </div>
          </div>
        )}

        {(animal.building || animal.rack_enclosure) && (
          <div className="px-5 py-3 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-sundown-muted shrink-0" />
            <div>
              <p className="text-xs text-sundown-muted uppercase font-medium">Location</p>
              <p className="text-sm text-sundown-text">
                {animal.building ? `Building ${animal.building}` : ""}
                {animal.rack_enclosure ? ` · ${animal.rack_enclosure}` : ""}
              </p>
            </div>
          </div>
        )}

        {animal.notes && (
          <div className="px-5 py-3 flex items-center gap-3">
            <Tag className="w-4 h-4 text-sundown-muted shrink-0" />
            <div>
              <p className="text-xs text-sundown-muted uppercase font-medium">Notes</p>
              <p className="text-sm text-sundown-text">{animal.notes}</p>
            </div>
          </div>
        )}

        {animal.image_folder_url && (
          <div className="px-5 py-3">
            <button
              onClick={() => window.open(animal.image_folder_url!, "_blank")}
              className="flex items-center gap-2 text-sm text-sundown-gold hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Photos
            </button>
          </div>
        )}
      </div>

      {/* Drop Assignments */}
      {dropAssignments.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
            Drop Assignments
          </h2>
          <div className="border border-sundown-border divide-y divide-sundown-border bg-sundown-card">
            {dropAssignments.map((da) => (
              <div key={da.id} className="flex items-center gap-3 px-4 py-3">
                <Calendar className="w-4 h-4 text-sundown-gold shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-sundown-text font-medium">{da.drop?.drop_id}</p>
                  <p className="text-xs text-sundown-muted">
                    {new Date(da.drop?.drop_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    {da.drop?.status}
                  </p>
                </div>
                <span className="text-xs font-medium text-sundown-muted uppercase px-2 py-0.5 bg-sundown-bg rounded">
                  {da.stage}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status History */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Status History
        </h2>
        {statusHistory.length > 0 ? (
          <div className="border border-sundown-border divide-y divide-sundown-border bg-sundown-card">
            {[...statusHistory].reverse().map((entry, i) => {
              const statusColor = STATUS_BADGE[entry.status] || "bg-sundown-muted/20 text-sundown-muted";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusColor}`}>
                    {entry.status}
                  </span>
                  <span className="text-xs text-sundown-muted flex-1">
                    {new Date(entry.changed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" at "}
                    {new Date(entry.changed_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {entry.changed_by && (
                    <span className="text-xs text-sundown-muted">{entry.changed_by}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-sundown-border bg-sundown-card px-4 py-6 text-center">
            <p className="text-sm text-sundown-muted">No status changes recorded yet.</p>
          </div>
        )}
      </section>

      {/* Observation History */}
      <section>
        <h2 className="text-sm font-bold text-sundown-muted uppercase tracking-wider mb-3">
          Activity History ({observations.length})
        </h2>
        {observations.length > 0 ? (
          <div className="border border-sundown-border divide-y divide-sundown-border bg-sundown-card">
            {observations.map((obs) => {
              const config = OBS_ICONS[obs.observation_type] || OBS_ICONS["General Note"];
              const ObsIcon = config.icon;
              return (
                <div key={obs.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-1">
                    <ObsIcon className={`w-4 h-4 shrink-0 ${config.color}`} />
                    <span className="font-medium text-sundown-text text-sm flex-1">
                      {obs.observation_type}
                    </span>
                    <span className="text-xs text-sundown-muted">{timeAgo(obs.created_at)}</span>
                  </div>
                  <div className="ml-7">
                    <p className="text-xs text-sundown-muted mb-1">{obs.employee_name}</p>
                    <p className="text-sm text-sundown-text">{obs.details}</p>
                    {obs.photo_urls && obs.photo_urls.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {obs.photo_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Photo ${i + 1}`}
                              className="w-14 h-14 rounded object-cover border border-sundown-border hover:border-sundown-gold transition-colors"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-sundown-border bg-sundown-card px-4 py-8 text-center">
            <p className="text-sm text-sundown-muted">No observations yet.</p>
          </div>
        )}
      </section>

      {/* Drop Picker Modal */}
      {showDropPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-md border border-sundown-border bg-sundown-card max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Add to Drop</h3>
              <button onClick={() => setShowDropPicker(false)} className="text-sundown-muted hover:text-sundown-text">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-sundown-border">
              {availableDrops.length === 0 ? (
                <p className="px-4 py-8 text-sm text-sundown-muted text-center">
                  No upcoming drops available. Create one in the Drop Planner first.
                </p>
              ) : (
                availableDrops.map((drop) => (
                  <button
                    key={drop.id}
                    onClick={() => addToDrop(drop)}
                    disabled={addingToDrop}
                    className="w-full text-left px-4 py-3 hover:bg-sundown-bg transition-colors flex items-center gap-3"
                  >
                    <Calendar className="w-4 h-4 text-sundown-gold shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-sundown-text">{drop.drop_id}</p>
                      <p className="text-xs text-sundown-muted">
                        {new Date(drop.drop_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}
                        {drop.status}
                      </p>
                    </div>
                    {addingToDrop ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sundown-gold" />
                    ) : (
                      <Plus className="w-4 h-4 text-sundown-muted" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-sundown-muted" />
        <span className="text-xs text-sundown-muted uppercase font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-sundown-text">{value}</p>
      {sub && <p className="text-xs text-sundown-muted">{sub}</p>}
    </div>
  );
}


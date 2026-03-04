import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import type { Animal, Species } from "@/types/database";

type AnimalWithSpecies = Animal & { species: Pick<Species, "common_name" | "code"> };

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-sundown-green text-white",
  Breeder: "bg-sundown-gold text-black",
  Hold: "bg-blue-600 text-white",
  Listed: "bg-purple-600 text-white",
  Sold: "bg-gray-600 text-white",
  Archived: "bg-gray-800 text-gray-400",
};

export default function AnimalList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Species");
  const [animals, setAnimals] = useState<AnimalWithSpecies[]>([]);
  const [speciesFilters, setSpeciesFilters] = useState<string[]>(["All Species"]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setFetchError(null);

      const { data: speciesList, error: speciesErr } = await supabase
        .from("species")
        .select("common_name")
        .order("common_name");

      if (speciesErr) {
        setFetchError(`Failed to load species: ${speciesErr.message}`);
      }
      if (speciesList) {
        setSpeciesFilters([
          "All Species",
          ...(speciesList as { common_name: string }[]).map((s) => s.common_name),
        ]);
      }

      const { data, error: animalsErr } = await supabase
        .from("animals")
        .select("*, species:species_id(common_name, code)")
        .order("animal_id");

      if (animalsErr) {
        setFetchError((prev) =>
          prev ? `${prev}; Animals: ${animalsErr.message}` : `Failed to load animals: ${animalsErr.message}`
        );
      }
      if (data) setAnimals(data as unknown as AnimalWithSpecies[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredAnimals = animals.filter((animal) => {
    const speciesName = animal.species?.common_name || "";
    const matchesSearch =
      !search ||
      animal.animal_id.toLowerCase().includes(search.toLowerCase()) ||
      (animal.morph_traits || "").toLowerCase().includes(search.toLowerCase()) ||
      speciesName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "All Species" || speciesName === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sundown-bg pb-24">
      {fetchError && (
        <div className="rounded-md bg-sundown-card border-l-4 border-l-sundown-red p-3 mb-3 text-sm text-sundown-red font-bold">
          {fetchError}
        </div>
      )}
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-sundown-bg pt-2 pb-4 space-y-3 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input
            type="text"
            placeholder="Search by ID, species, or morph..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors font-medium"
          />
        </div>

        {/* Species Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {speciesFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors border ${
                activeFilter === filter
                  ? "bg-sundown-gold text-black border-sundown-gold"
                  : "bg-sundown-card text-sundown-muted border-sundown-border hover:border-sundown-gold hover:text-sundown-text"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-sundown-muted mb-2 font-medium">
        {filteredAnimals.length} animal{filteredAnimals.length !== 1 ? "s" : ""}
      </p>

      {/* Animal List */}
      <div className="space-y-3">
        {filteredAnimals.map((animal) => (
          <Card
            key={animal.id}
            className="active:scale-[0.99] transition-transform cursor-pointer border-sundown-border hover:border-sundown-gold"
            onClick={() => navigate(`/employee/animals/${animal.animal_id}`)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sundown-text text-base">
                    {animal.animal_id}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      STATUS_COLORS[animal.status] || STATUS_COLORS.Available
                    }`}
                  >
                    {animal.status}
                  </span>
                </div>

                <p className="text-sm text-sundown-text truncate font-medium">
                  {animal.species?.common_name} · {animal.gender}
                  {animal.morph_traits ? ` · ${animal.morph_traits}` : ""}
                </p>

                {(animal.building || animal.rack_enclosure) && (
                  <p className="text-xs text-sundown-muted">
                    {animal.building ? `Building ${animal.building}` : ""}
                    {animal.rack_enclosure ? ` · ${animal.rack_enclosure}` : ""}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 mt-1 border-t border-sundown-border">
                  <span className="text-xs text-sundown-text font-medium">
                    {animal.current_weight_g
                      ? `${animal.current_weight_g}g`
                      : "No weight"}
                    {animal.last_weighed && (
                      <span className="text-sundown-muted font-normal">
                        {" "}
                        · {timeAgo(animal.last_weighed)}
                      </span>
                    )}
                  </span>
                  {animal.last_observation_date && (
                    <span className="text-xs text-sundown-muted">
                      Last obs: {timeAgo(animal.last_observation_date)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAnimals.length === 0 && (
          <div className="text-center py-12 text-sundown-muted">
            <p>No animals found matching your filters.</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveFilter("All Species");
              }}
              className="mt-4 text-sundown-gold hover:underline font-bold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

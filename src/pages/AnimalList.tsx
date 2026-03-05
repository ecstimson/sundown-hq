import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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
  const { employee } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Species");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("id_asc");
  const [animals, setAnimals] = useState<AnimalWithSpecies[]>([]);
  const [speciesRows, setSpeciesRows] = useState<Pick<Species, "id" | "common_name" | "code">[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddSpeciesModal, setShowAddSpeciesModal] = useState(false);
  const [savingSpecies, setSavingSpecies] = useState(false);
  const [speciesError, setSpeciesError] = useState<string | null>(null);
  const [speciesForm, setSpeciesForm] = useState({
    common_name: "",
    scientific_name: "",
    code: "",
    is_new_caledonian: false,
  });

  const canManageSpecies = employee?.role === "admin" || employee?.role === "super_admin";

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
        const rows = speciesList as Pick<Species, "id" | "common_name" | "code">[];
        setSpeciesRows(rows);
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
    const matchesStatus =
      statusFilter === "All Status" || animal.status === statusFilter;
    return matchesSearch && matchesFilter && matchesStatus;
  });

  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    const aSpecies = a.species?.common_name || "";
    const bSpecies = b.species?.common_name || "";
    switch (sortBy) {
      case "id_desc":
        return b.animal_id.localeCompare(a.animal_id);
      case "species_asc":
        return aSpecies.localeCompare(bSpecies) || a.animal_id.localeCompare(b.animal_id);
      case "species_desc":
        return bSpecies.localeCompare(aSpecies) || a.animal_id.localeCompare(b.animal_id);
      case "status_asc":
        return a.status.localeCompare(b.status) || a.animal_id.localeCompare(b.animal_id);
      case "weight_desc":
        return (b.current_weight_g || 0) - (a.current_weight_g || 0);
      case "weight_asc":
        return (a.current_weight_g || 0) - (b.current_weight_g || 0);
      case "id_asc":
      default:
        return a.animal_id.localeCompare(b.animal_id);
    }
  });

  async function handleAddSpecies() {
    if (!canManageSpecies) return;
    if (!speciesForm.common_name.trim() || !speciesForm.scientific_name.trim() || !speciesForm.code.trim()) {
      setSpeciesError("Common name, scientific name, and code are required.");
      return;
    }
    setSavingSpecies(true);
    setSpeciesError(null);
    const { error } = await supabase.from("species").insert({
      common_name: speciesForm.common_name.trim(),
      scientific_name: speciesForm.scientific_name.trim(),
      code: speciesForm.code.trim().toUpperCase(),
      is_new_caledonian: speciesForm.is_new_caledonian,
    } as any);
    if (error) {
      setSpeciesError(error.message);
      setSavingSpecies(false);
      return;
    }
    setSavingSpecies(false);
    setShowAddSpeciesModal(false);
    setSpeciesForm({
      common_name: "",
      scientific_name: "",
      code: "",
      is_new_caledonian: false,
    });
    setLoading(true);
    const { data } = await supabase
      .from("species")
      .select("id, common_name, code")
      .order("common_name");
    if (data) {
      const rows = data as Pick<Species, "id" | "common_name" | "code">[];
      setSpeciesRows(rows);
    }
    setLoading(false);
  }

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
            className="w-full h-12 pl-10 pr-4 border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 border border-sundown-border bg-sundown-card text-xs text-sundown-text shrink-0"
          >
            <option value="id_asc">Sort: ID A-Z</option>
            <option value="id_desc">Sort: ID Z-A</option>
            <option value="species_asc">Sort: Species A-Z</option>
            <option value="species_desc">Sort: Species Z-A</option>
            <option value="status_asc">Sort: Status</option>
            <option value="weight_desc">Sort: Weight High-Low</option>
            <option value="weight_asc">Sort: Weight Low-High</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 border border-sundown-border bg-sundown-card text-xs text-sundown-text shrink-0"
          >
            <option>All Status</option>
            <option>Available</option>
            <option>Unlisted</option>
            <option>Breeder</option>
            <option>Hold</option>
            <option>Listed</option>
            <option>Sold</option>
            <option>Archived</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-9 px-3 border border-sundown-border bg-sundown-card text-xs text-sundown-text shrink-0"
          >
            <option>All Species</option>
            {speciesRows.map((species) => (
              <option key={species.id}>{species.common_name}</option>
            ))}
          </select>
          {canManageSpecies && (
            <Button
              size="sm"
              className="h-9 px-3 text-xs shrink-0 gap-1"
              onClick={() => setShowAddSpeciesModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Species
            </Button>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-sundown-muted mb-2 font-medium">
        {filteredAnimals.length} animal{filteredAnimals.length !== 1 ? "s" : ""}
      </p>

      {/* Animal Rows (admin-style table) */}
      {sortedAnimals.length === 0 ? (
        <div className="text-center py-12 text-sundown-muted">
          <p>No animals found matching your filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setActiveFilter("All Species");
              setStatusFilter("All Status");
            }}
            className="mt-4 text-sundown-gold hover:underline font-bold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <Card className="rounded-none">
          <CardContent className="p-0">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-sundown-text border-b border-sundown-border bg-sundown-card">
                  <tr>
                    <th className="px-4 py-3 font-bold">Animal ID</th>
                    <th className="px-4 py-3 font-bold">Species</th>
                    <th className="px-4 py-3 font-bold">Gender</th>
                    <th className="px-4 py-3 font-bold">Morph</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Weight</th>
                    <th className="px-4 py-3 font-bold">Last Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sundown-border">
                  {sortedAnimals.map((animal) => (
                    <tr
                      key={animal.id}
                      className="hover:bg-sundown-card transition-colors cursor-pointer"
                      onClick={() => navigate(`/employee/animals/${animal.animal_id}`)}
                    >
                      <td className="px-4 py-3 font-bold text-sundown-gold">{animal.animal_id}</td>
                      <td className="px-4 py-3 text-sundown-muted">{animal.species?.common_name || "—"}</td>
                      <td className="px-4 py-3 text-sundown-muted">{animal.gender}</td>
                      <td className="px-4 py-3 text-sundown-muted truncate max-w-[260px]">{animal.morph_traits || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            STATUS_COLORS[animal.status] || STATUS_COLORS.Available
                          }`}
                        >
                          {animal.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sundown-text">
                        {animal.current_weight_g ? `${animal.current_weight_g}g` : "—"}
                        {animal.last_weighed ? (
                          <span className="text-sundown-muted text-xs ml-2">({timeAgo(animal.last_weighed)})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sundown-muted">
                        {animal.last_observation_date ? timeAgo(animal.last_observation_date) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddSpeciesModal && canManageSpecies && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-md border border-sundown-border bg-sundown-card">
            <div className="p-4 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Add Species</h3>
              <button onClick={() => setShowAddSpeciesModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                placeholder="Common name"
                value={speciesForm.common_name}
                onChange={(e) => setSpeciesForm((prev) => ({ ...prev, common_name: e.target.value }))}
                className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                placeholder="Scientific name"
                value={speciesForm.scientific_name}
                onChange={(e) => setSpeciesForm((prev) => ({ ...prev, scientific_name: e.target.value }))}
                className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                placeholder="Species code (e.g. GG)"
                value={speciesForm.code}
                onChange={(e) => setSpeciesForm((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full h-10 px-3 border border-sundown-border bg-sundown-bg text-sundown-text uppercase"
              />
              <label className="flex items-center gap-2 text-sm text-sundown-text">
                <input
                  type="checkbox"
                  checked={speciesForm.is_new_caledonian}
                  onChange={(e) => setSpeciesForm((prev) => ({ ...prev, is_new_caledonian: e.target.checked }))}
                />
                New Caledonian species
              </label>
              {speciesError && (
                <p className="text-sm text-sundown-red">{speciesError}</p>
              )}
            </div>
            <div className="p-4 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddSpeciesModal(false)}>Cancel</Button>
              <Button onClick={handleAddSpecies} disabled={savingSpecies}>
                {savingSpecies ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Species
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

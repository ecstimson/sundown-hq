import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  Calendar,
  Plus,
  MoreVertical,
  Loader2,
  Package,
  Search,
  Download,
  X,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Drop, Animal, Species } from "@/types/database";

type AnimalWithSpecies = Animal & {
  species: Pick<Species, "common_name" | "code">;
};

type DropAnimalRow = {
  id: string;
  drop_id: string;
  animal_id: string;
  stage: string;
};

type DropAnimalWithDetails = DropAnimalRow & { animal: AnimalWithSpecies };

const STATUS_BADGE: Record<string, string> = {
  Available: "bg-sundown-green/20 text-sundown-green",
  Unlisted: "bg-orange-500/20 text-orange-400",
  Breeder: "bg-sundown-gold/20 text-sundown-gold",
  Hold: "bg-blue-500/20 text-blue-400",
  Listed: "bg-purple-500/20 text-purple-400",
  Sold: "bg-gray-600/20 text-gray-400",
};

const DROP_TYPES = ["Monthly", "Tax Season", "Black Friday", "Vault Rotation"] as const;

function generateDropId() {
  const now = new Date();
  return `DROP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DropPlanner() {
  const navigate = useNavigate();

  const [drops, setDrops] = useState<Drop[]>([]);
  const [activeDrop, setActiveDrop] = useState<Drop | null>(null);
  const [dropAnimals, setDropAnimals] = useState<DropAnimalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  const [allAnimals, setAllAnimals] = useState<AnimalWithSpecies[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [speciesList, setSpeciesList] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [speciesFilter, setSpeciesFilter] = useState("All Species");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [statusList, setStatusList] = useState<string[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    drop_date: new Date().toISOString().split("T")[0],
    drop_type: "Monthly" as (typeof DROP_TYPES)[number],
    discount_code: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  const [dropMenuOpen, setDropMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchDrops();
    fetchAllAnimals();
  }, []);

  async function fetchDrops() {
    setLoading(true);
    const { data } = await supabase
      .from("drops")
      .select("*")
      .order("drop_date", { ascending: false });
    if (data && data.length > 0) {
      setDrops(data);
      setActiveDrop(data[0]);
    }
    setLoading(false);
  }

  async function fetchAllAnimals() {
    setLoadingAll(true);
    const { data } = await supabase
      .from("animals")
      .select("*, species:species_id(common_name, code)")
      .in("status", ["Available", "Unlisted", "Hold", "Breeder"])
      .order("animal_id") as any;

    if (data) {
      const animals = data as AnimalWithSpecies[];
      setAllAnimals(animals);
      const species = [...new Set(animals.map((a) => a.species?.common_name).filter(Boolean))] as string[];
      setSpeciesList(species.sort());
      const statuses = [...new Set(animals.map((a) => a.status).filter(Boolean))] as string[];
      setStatusList(statuses.sort());
    }
    setLoadingAll(false);
  }

  const fetchDropAnimals = useCallback(async (dropId: string) => {
    setLoadingAnimals(true);
    const { data } = await supabase
      .from("drop_animals")
      .select("*, animal:animal_id(*, species:species_id(common_name, code))")
      .eq("drop_id", dropId) as any;

    if (data) {
      setDropAnimals(
        data.map((da: any) => ({
          id: da.id,
          drop_id: da.drop_id,
          animal_id: da.animal_id,
          stage: da.stage || "candidates",
          animal: da.animal,
        }))
      );
    }
    setLoadingAnimals(false);
  }, []);

  useEffect(() => {
    if (activeDrop) fetchDropAnimals(activeDrop.id);
    else setDropAnimals([]);
  }, [activeDrop, fetchDropAnimals]);

  async function createDrop() {
    setCreating(true);
    const dropId = generateDropId();
    const { data, error } = await supabase
      .from("drops")
      .insert({
        drop_id: dropId,
        drop_date: createForm.drop_date,
        drop_type: createForm.drop_type,
        discount_code: createForm.discount_code || null,
        notes: createForm.notes || null,
      } as any)
      .select()
      .single();

    if (!error && data) {
      const newDrop = data as Drop;
      setDrops((prev) => [newDrop, ...prev]);
      setActiveDrop(newDrop);
      setShowCreate(false);
      setCreateForm({ drop_date: new Date().toISOString().split("T")[0], drop_type: "Monthly", discount_code: "", notes: "" });
    }
    setCreating(false);
  }

  async function updateDropStatus(drop: Drop, status: Drop["status"]) {
    await (supabase.from("drops") as any).update({ status }).eq("id", drop.id);
    const updated = { ...drop, status };
    setDrops((prev) => prev.map((d) => (d.id === drop.id ? updated : d)));
    if (activeDrop?.id === drop.id) setActiveDrop(updated);
    setDropMenuOpen(null);
  }

  async function addToDrop(animalId: string) {
    if (!activeDrop) return;
    await supabase.from("drop_animals").insert({
      drop_id: activeDrop.id,
      animal_id: animalId,
      stage: "candidates",
    } as any);
    await fetchDropAnimals(activeDrop.id);
  }

  async function removeFromDrop(daId: string) {
    await supabase.from("drop_animals").delete().eq("id", daId);
    setDropAnimals((prev) => prev.filter((da) => da.id !== daId));
  }

  function exportShopifyCSV() {
    const animals = dropAnimals.map((da) => da.animal);
    if (animals.length === 0) return;

    const headers = [
      "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
      "Published", "Variant SKU", "Variant Grams", "Variant Inventory Qty",
      "Variant Inventory Policy", "Variant Price", "Variant Requires Shipping",
      "Image Src", "Image Alt Text", "SEO Title", "SEO Description", "Status",
    ];

    const rows = animals.map((a) => {
      const species = a.species?.common_name || "Gecko";
      const handle = `${species.toLowerCase().replace(/\s+/g, "-")}-${a.animal_id.toLowerCase()}`;
      const title = `${species}, ${a.gender} — ${a.animal_id}`;
      const body = `<p>Animal ID: ${a.animal_id}</p><p>Species: ${species}</p><p>Gender: ${a.gender}</p>${a.morph_traits ? `<p>Morph: ${a.morph_traits}</p>` : ""}${a.current_weight_g ? `<p>Weight: ${a.current_weight_g}g</p>` : ""}`;
      const tags = [a.species?.code, a.gender?.toLowerCase(), a.morph_traits, activeDrop?.drop_id].filter(Boolean).join(", ");
      return [
        handle, title, body, "Sundown Reptiles", "Animals & Pet Supplies > Live Animals",
        species, tags, "TRUE", a.animal_id, String(a.current_weight_g || 0), "1",
        "deny", String(a.price || 0), "TRUE", a.image_folder_url || "", `${species} ${a.gender} ${a.animal_id}`,
        `${species} ${a.morph_traits || ""} ${a.gender} For Sale - Sundown Reptiles`.trim(),
        `${species} for sale. ${a.morph_traits || ""} ${a.gender}. $${a.price || ""}. 20+ years experience.`.trim(),
        "active",
      ];
    });
    downloadCSV("shopify-import.csv", headers, rows);
  }

  function exportMorphMarketCSV() {
    const animals = dropAnimals.map((da) => da.animal);
    if (animals.length === 0) return;
    const headers = ["Category", "Title", "Serial", "Price", "Sex", "Maturity", "Dob", "Weight", "Traits", "Desc", "Photo_Urls", "Quantity", "Availability", "Origin", "Proven_Breeder", "Is_Negotiable"];
    const rows = animals.map((a) => {
      const species = a.species?.common_name?.toLowerCase() || "gecko";
      const title = `${a.morph_traits || ""} ${a.species?.common_name || ""}`.trim();
      let maturity = "baby";
      if (a.hatch_date) {
        const months = (Date.now() - new Date(a.hatch_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (months > 18) maturity = "adult";
        else if (months > 12) maturity = "sub-adult";
        else if (months > 4) maturity = "juvenile";
      }
      const dob = a.hatch_date ? new Date(a.hatch_date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
      return [
        species, title, a.animal_id, String(a.price || 0), (a.gender || "unsexed").toLowerCase(),
        maturity, dob, String(a.current_weight_g || ""), (a.morph_traits || "").replace(/,/g, " "),
        `${title}. ${a.gender}. ${a.current_weight_g ? a.current_weight_g + "g." : ""} Sundown Reptiles.`,
        a.image_folder_url || "", "1", "available", "domestically produced", "no", "FALSE",
      ];
    });
    downloadCSV("morphmarket-import.tsv", headers, rows, "\t");
  }

  function downloadCSV(filename: string, headers: string[], rows: string[][], sep = ",") {
    const escape = (v: string) => sep === "," ? `"${v.replace(/"/g, '""')}"` : v.replace(/\t/g, " ");
    const content = [headers.map(escape).join(sep), ...rows.map((r) => r.map(escape).join(sep))].join("\n");
    const blob = new Blob([content], { type: sep === "," ? "text/csv" : "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const dropAnimalIds = new Set(dropAnimals.map((da) => da.animal_id));

  const filteredAnimals = allAnimals.filter((a) => {
    if (dropAnimalIds.has(a.id)) return false;
    const matchSearch =
      !searchQuery ||
      a.animal_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.species?.common_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.morph_traits || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchSpecies = speciesFilter === "All Species" || a.species?.common_name === speciesFilter;
    let matchPrice = true;
    const min = priceMin ? parseFloat(priceMin) : null;
    const max = priceMax ? parseFloat(priceMax) : null;
    if (min !== null) matchPrice = !!a.price && a.price >= min;
    if (max !== null && matchPrice) matchPrice = !!a.price && a.price <= max;
    return matchSearch && matchStatus && matchSpecies && matchPrice;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">Drop Planner</h1>
          <p className="text-sundown-muted text-sm">Plan upcoming drops — select animals on the left, manage drops on the right</p>
        </div>
        <div className="flex gap-2">
          {activeDrop && dropAnimals.length > 0 && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportShopifyCSV}>
                <Download className="w-3.5 h-3.5" /> Shopify
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportMorphMarketCSV}>
                <Download className="w-3.5 h-3.5" /> MorphMarket
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
            <Calendar className="w-3.5 h-3.5" /> Schedule Drop
          </Button>
        </div>
      </div>

      {/* Drop Selector Tabs */}
      {drops.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {drops.map((drop) => (
            <button
              key={drop.id}
              onClick={() => setActiveDrop(drop)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded border whitespace-nowrap transition-colors relative ${
                activeDrop?.id === drop.id
                  ? "bg-sundown-gold/10 border-sundown-gold text-sundown-text font-bold"
                  : "bg-sundown-card border-sundown-border text-sundown-muted hover:text-sundown-text"
              }`}
            >
              {drop.drop_id} · {new Date(drop.drop_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                drop.status === "Planning" ? "bg-blue-500/20 text-blue-400"
                  : drop.status === "Prep" ? "bg-sundown-gold/20 text-sundown-gold"
                  : drop.status === "Listed" ? "bg-purple-500/20 text-purple-400"
                  : "bg-sundown-green/20 text-sundown-green"
              }`}>
                {drop.status}
              </span>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropMenuOpen(dropMenuOpen === drop.id ? null : drop.id); }}
                  className="p-0.5 rounded hover:bg-sundown-bg"
                >
                  <MoreVertical className="w-3 h-3 text-sundown-muted" />
                </button>
                {dropMenuOpen === drop.id && (
                  <div className="absolute right-0 top-6 z-20 bg-sundown-card border border-sundown-border rounded shadow-xl py-1 min-w-[140px]">
                    {(["Planning", "Prep", "Listed", "Complete"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); updateDropStatus(drop, s); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-sundown-bg ${drop.status === s ? "text-sundown-gold font-bold" : "text-sundown-text"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left: Available Animals */}
        <div className="flex-1 flex flex-col border border-sundown-border bg-sundown-card overflow-hidden">
          <div className="p-3 border-b border-sundown-border space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sundown-text">
                Available ({filteredAnimals.length})
              </h3>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sundown-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, species, morph…"
                className="h-8 w-full pl-8 pr-3 rounded border border-sundown-border bg-sundown-bg text-sm text-sundown-text"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 px-2 rounded border border-sundown-border bg-sundown-bg text-xs text-sundown-text"
              >
                <option>All</option>
                {statusList.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="h-7 px-2 rounded border border-sundown-border bg-sundown-bg text-xs text-sundown-text"
              >
                <option>All Species</option>
                {speciesList.map((s) => <option key={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-sundown-muted">$</span>
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Min"
                  className="h-7 w-16 px-2 rounded border border-sundown-border bg-sundown-bg text-xs text-sundown-text"
                />
                <span className="text-[10px] text-sundown-muted">–</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max"
                  className="h-7 w-16 px-2 rounded border border-sundown-border bg-sundown-bg text-xs text-sundown-text"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-sundown-border">
            {loadingAll ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-sundown-gold" />
              </div>
            ) : filteredAnimals.length === 0 ? (
              <p className="text-sm text-sundown-muted text-center py-8">No matching animals.</p>
            ) : (
              filteredAnimals.map((a) => {
                const statusColor = STATUS_BADGE[a.status] || "bg-sundown-muted/20 text-sundown-muted";
                return (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-sundown-bg/50 group">
                    <button
                      onClick={() => navigate(`/admin/animals/${encodeURIComponent(a.animal_id)}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-bold text-sundown-text truncate hover:text-sundown-gold">{a.animal_id}</p>
                      <p className="text-[11px] text-sundown-muted truncate">
                        {a.species?.common_name} · {a.gender}
                        {a.morph_traits ? ` · ${a.morph_traits}` : ""}
                        {a.price ? ` · $${a.price}` : ""}
                      </p>
                    </button>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${statusColor}`}>
                      {a.status}
                    </span>
                    {activeDrop && (
                      <button
                        onClick={() => addToDrop(a.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sundown-gold/10 text-sundown-muted hover:text-sundown-gold transition-all shrink-0"
                        title={`Add to ${activeDrop.drop_id}`}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Drop Contents */}
        <div className="w-[400px] flex flex-col border border-sundown-border bg-sundown-card overflow-hidden shrink-0">
          {!activeDrop ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Package className="w-10 h-10 text-sundown-muted mb-3" />
              <p className="text-sundown-text font-bold mb-1">No drop selected</p>
              <p className="text-sm text-sundown-muted mb-4">Schedule a drop to start adding animals.</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Schedule Drop
              </Button>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-sundown-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-sundown-text">{activeDrop.drop_id}</h3>
                    <p className="text-xs text-sundown-muted">
                      {new Date(activeDrop.drop_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {" · "}{activeDrop.drop_type}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sundown-muted">{dropAnimals.length} animals</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-sundown-border">
                {loadingAnimals ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-sundown-gold" />
                  </div>
                ) : dropAnimals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <p className="text-sm text-sundown-muted">
                      No animals yet. Hover an animal on the left and click <ArrowRight className="w-3 h-3 inline" /> to add it.
                    </p>
                  </div>
                ) : (
                  dropAnimals.map((da) => {
                    const statusColor = STATUS_BADGE[da.animal.status] || "bg-sundown-muted/20 text-sundown-muted";
                    return (
                      <div key={da.id} className="flex items-center gap-2 px-3 py-2 group">
                        <button
                          onClick={() => navigate(`/admin/animals/${encodeURIComponent(da.animal.animal_id)}`)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-sm font-bold text-sundown-text truncate hover:text-sundown-gold">{da.animal.animal_id}</p>
                          <p className="text-[11px] text-sundown-muted truncate">
                            {da.animal.species?.common_name} · {da.animal.gender}
                            {da.animal.morph_traits ? ` · ${da.animal.morph_traits}` : ""}
                            {da.animal.price ? ` · $${da.animal.price}` : ""}
                          </p>
                        </button>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${statusColor}`}>
                          {da.animal.status}
                        </span>
                        <button
                          onClick={() => removeFromDrop(da.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sundown-red/10 text-sundown-muted hover:text-sundown-red transition-all shrink-0"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Drop Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-md border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Schedule Drop</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-sundown-muted" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-sundown-muted uppercase mb-1 block">Drop Date</label>
                <input
                  type="date"
                  value={createForm.drop_date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, drop_date: e.target.value }))}
                  className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-sundown-muted uppercase mb-1 block">Drop Type</label>
                <select
                  value={createForm.drop_type}
                  onChange={(e) => setCreateForm((p) => ({ ...p, drop_type: e.target.value as any }))}
                  className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                >
                  {DROP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-sundown-muted uppercase mb-1 block">Discount Code</label>
                <input
                  value={createForm.discount_code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, discount_code: e.target.value }))}
                  placeholder="e.g. SPRING15"
                  className="h-10 w-full px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-sundown-muted uppercase mb-1 block">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                />
              </div>
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createDrop} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Drop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  SlidersHorizontal,
  Loader2,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { processAnimalCSV, type SpeciesEntry } from "@/lib/import/animalsCsv";
import type { Animal, Species } from "@/types/database";

type AnimalWithSpecies = Animal & { species: Pick<Species, "common_name"> };

function isAuthLockError(message: string) {
  const text = message.toLowerCase();
  return text.includes("lock broken") || (text.includes("lock") && text.includes("state"));
}

async function withAuthLockRetry<T extends { error: { message: string } | null }>(
  run: () => Promise<T>
): Promise<T> {
  const first = await run();
  if (!first.error || !isAuthLockError(first.error.message)) {
    return first;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  return run();
}

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-sundown-green text-white",
  Unlisted: "bg-orange-600 text-white",
  Breeder: "bg-sundown-gold text-black",
  Hold: "bg-blue-600 text-white",
  Listed: "bg-purple-600 text-white",
  Sold: "bg-gray-600 text-white",
  Archived: "bg-gray-800 text-gray-400",
};

export default function AdminAnimals() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<AnimalWithSpecies[]>([]);
  const [speciesList, setSpeciesList] = useState<SpeciesEntry[]>([]);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("All Species");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableError, setTableError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    species: true,
    gender: true,
    morph: true,
    status: true,
    weight: true,
    price: true,
    hatchDate: false,
    building: false,
    location: false,
    lastWeighed: false,
  });

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    skipped: number;
    errors: number;
    messages: string[];
  } | null>(null);

  // Add Animal modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    animal_id: "",
    species_id: "",
    gender: "Unsexed" as "Male" | "Female" | "Unsexed",
    morph_traits: "",
    status: "Available" as "Available" | "Hold" | "Sold" | "Listed" | "Breeder" | "Archived",
    current_weight_g: "",
    price: "",
    hatch_date: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editingAnimalId, setEditingAnimalId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    animal_id: "",
    species_id: "",
    gender: "Unsexed" as "Male" | "Female" | "Unsexed",
    morph_traits: "",
    status: "Available" as "Available" | "Hold" | "Sold" | "Listed" | "Breeder" | "Archived",
    current_weight_g: "",
    price: "",
    hatch_date: "",
    building: "" as "" | "A" | "B",
    rack_enclosure: "",
  });

  async function fetchData() {
    setLoading(true);
    setTableError(null);

    const { data: species, error: speciesErr } = await withAuthLockRetry(async () =>
      supabase
        .from("species")
        .select("id, common_name, code")
        .order("common_name")
    );
    if (speciesErr) {
      console.error("Failed to load species:", speciesErr.message);
    }
    if (species) setSpeciesList(species as SpeciesEntry[]);

    const { data, error: animalsErr } = await withAuthLockRetry(async () =>
      supabase
        .from("animals")
        .select("*, species:species_id(common_name)")
        .order("animal_id")
    );
    if (animalsErr) {
      console.error("Failed to load animals:", animalsErr.message);
      setTableError(
        isAuthLockError(animalsErr.message)
          ? "Session lock conflict detected. Close duplicate tabs and refresh."
          : animalsErr.message
      );
    }
    if (data) setAnimals(data as unknown as AnimalWithSpecies[]);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = animals
    .filter((a) => {
      const name = a.species?.common_name || "";
      const matchSearch =
        !search ||
        a.animal_id.toLowerCase().includes(search.toLowerCase()) ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        (a.morph_traits || "").toLowerCase().includes(search.toLowerCase());
      const matchSpecies = speciesFilter === "All Species" || name === speciesFilter;
      const matchStatus = statusFilter === "All Status" || a.status === statusFilter;
      return matchSearch && matchSpecies && matchStatus;
    })
;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedAnimals = filtered.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, speciesFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  function toggleColumn(column: keyof typeof visibleColumns) {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  }

  async function updateAnimalStatus(animalId: string, status: Animal["status"]) {
    setTableError(null);
    const animal = animals.find((a) => a.id === animalId);
    const history = Array.isArray(animal?.status_history) ? animal.status_history : [];
    const newHistory = [
      ...history,
      { status, changed_at: new Date().toISOString(), changed_by: null },
    ];
    const { error } = await (supabase
      .from("animals") as any)
      .update({ status, status_history: newHistory })
      .eq("id", animalId);
    if (error) {
      setTableError(error.message);
      return;
    }

    setAnimals((prev) =>
      prev.map((a) => (a.id === animalId ? { ...a, status, status_history: newHistory } : a))
    );
  }

  async function deleteAnimal(animalId: string) {
    setTableError(null);
    const { error } = await supabase.from("animals").delete().eq("id", animalId);
    if (error) {
      setTableError(error.message);
      return;
    }
    setAnimals((prev) => prev.filter((animal) => animal.id !== animalId));
    setSelected((prev) => prev.filter((id) => id !== animalId));
  }

  function openEditModal(animal: AnimalWithSpecies) {
    setEditError("");
    setEditingAnimalId(animal.id);
    setEditForm({
      animal_id: animal.animal_id ?? "",
      species_id: animal.species_id ?? "",
      gender: animal.gender ?? "Unsexed",
      morph_traits: animal.morph_traits ?? "",
      status: animal.status ?? "Available",
      current_weight_g: animal.current_weight_g != null ? String(animal.current_weight_g) : "",
      price: animal.price != null ? String(animal.price) : "",
      hatch_date: animal.hatch_date ?? "",
      building: (animal.building as "" | "A" | "B" | null) ?? "",
      rack_enclosure: animal.rack_enclosure ?? "",
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editingAnimalId) return;
    if (!editForm.animal_id.trim()) {
      setEditError("Animal ID is required.");
      return;
    }
    if (!editForm.species_id) {
      setEditError("Species is required.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    setTableError(null);

    const updates = {
      animal_id: editForm.animal_id.trim(),
      species_id: editForm.species_id,
      gender: editForm.gender,
      morph_traits: editForm.morph_traits.trim() || null,
      status: editForm.status,
      current_weight_g: editForm.current_weight_g ? parseFloat(editForm.current_weight_g) : null,
      price: editForm.price ? parseFloat(editForm.price) : null,
      hatch_date: editForm.hatch_date || null,
      building: editForm.building || null,
      rack_enclosure: editForm.rack_enclosure.trim() || null,
    };

    const { error } = await (supabase
      .from("animals") as any)
      .update(updates as any)
      .eq("id", editingAnimalId);

    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }

    setEditLoading(false);
    setShowEditModal(false);
    setEditingAnimalId(null);
    await fetchData();
  }

  // --- Import CSV ---
  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    // Re-fetch species to make sure we have latest data
    let currentSpecies = speciesList;
    if (!currentSpecies.length) {
      const { data: freshSpecies } = await supabase
        .from("species")
        .select("id, common_name, code")
        .order("common_name");
      if (freshSpecies?.length) {
        currentSpecies = freshSpecies as SpeciesEntry[];
        setSpeciesList(currentSpecies);
      }
    }

    const text = await file.text();
    const processed = processAnimalCSV(text, currentSpecies);
    const messages = [...processed.errors, ...processed.warnings];

    if (processed.errors.length > 0 || processed.records.length === 0) {
      setImportResult({
        inserted: 0,
        skipped: processed.skipped,
        errors: processed.errors.length,
        messages,
      });
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Insert in batches of 50
    let inserted = 0;
    let dbErrors = 0;
    for (let i = 0; i < processed.records.length; i += 50) {
      const batch = processed.records.slice(i, i + 50);
      const { error } = await supabase.from("animals").insert(batch as any);
      if (error) {
        for (const record of batch) {
          const { error: singleErr } = await supabase.from("animals").insert(record as any);
          if (singleErr) {
            messages.push(`Failed: ${record.animal_id} - ${singleErr.message}`);
            dbErrors++;
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    }

    setImportResult({
      inserted,
      skipped: processed.skipped,
      errors: dbErrors,
      messages,
    });
    setImporting(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (inserted > 0) fetchData();
  }

  // --- Export CSV ---
  function handleExportCSV() {
    const headers = ["Animal ID", "Species", "Gender", "Morph", "Status", "Weight (g)", "Price", "Hatch Date"];
    const csvRows = [headers.join(",")];
    for (const a of filtered) {
      csvRows.push(
        [
          `"${a.animal_id}"`,
          `"${a.species?.common_name || ""}"`,
          a.gender,
          `"${a.morph_traits || ""}"`,
          a.status,
          a.current_weight_g ?? "",
          a.price ?? "",
          a.hatch_date || "",
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sundown-animals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Add Animal ---
  async function handleAddAnimal() {
    if (!addForm.animal_id.trim()) {
      setAddError("Animal ID is required.");
      return;
    }
    if (!addForm.species_id) {
      setAddError("Species is required.");
      return;
    }

    setAddLoading(true);
    setAddError("");

    const { error } = await supabase.from("animals").insert({
      animal_id: addForm.animal_id.trim(),
      species_id: addForm.species_id,
      gender: addForm.gender,
      morph_traits: addForm.morph_traits.trim() || null,
      status: addForm.status,
      current_weight_g: addForm.current_weight_g ? parseFloat(addForm.current_weight_g) : null,
      price: addForm.price ? parseFloat(addForm.price) : null,
      hatch_date: addForm.hatch_date || null,
      listing_readiness_score: 0,
    } as any);

    if (error) {
      setAddError(error.message);
      setAddLoading(false);
      return;
    }

    setAddLoading(false);
    setShowAddModal(false);
    setAddForm({
      animal_id: "",
      species_id: "",
      gender: "Unsexed",
      morph_traits: "",
      status: "Available",
      current_weight_g: "",
      price: "",
      hatch_date: "",
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-sundown-text">Animals</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {importing ? "Importing..." : "Import CSV"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Animal
          </Button>
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (() => {
        const isError = importResult.errors > 0 || (importResult.inserted === 0 && importResult.messages.length > 0);
        const isWarning = !isError && importResult.skipped > 0;
        const bannerClass = isError
          ? "bg-sundown-card border-l-4 border-l-sundown-red"
          : isWarning
            ? "bg-sundown-card border-l-4 border-l-sundown-orange"
            : "bg-sundown-card border-l-4 border-l-sundown-green";
        const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : CheckCircle;
        const iconClass = isError ? "text-sundown-red" : isWarning ? "text-sundown-orange" : "text-sundown-green";

        return (
          <div className={`rounded-md p-4 border border-sundown-border flex items-start gap-3 ${bannerClass}`}>
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} />
            <div className="flex-1 text-sm">
              <p className="font-bold text-sundown-text">
                {importResult.inserted > 0
                  ? `Imported ${importResult.inserted} animals`
                  : "No animals were imported"}
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                {importResult.errors > 0 && `, ${importResult.errors} failed`}
              </p>
              {importResult.messages.length > 0 && (
                <details className="mt-1" open={importResult.inserted === 0}>
                  <summary className="text-sundown-muted cursor-pointer hover:text-sundown-text font-medium">
                    {importResult.messages.length} detail{importResult.messages.length !== 1 ? "s" : ""}
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto text-xs text-sundown-muted space-y-0.5">
                    {importResult.messages.map((m, i) => (
                      <p key={i}>{m}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-sundown-muted hover:text-sundown-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input
            type="text"
            placeholder="Search animals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold placeholder:text-sundown-muted"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button
              variant="outline"
              className="gap-2 h-10"
              onClick={() => setShowColumnMenu((prev) => !prev)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Columns
            </Button>
            {showColumnMenu && (
              <div className="absolute z-20 right-0 mt-2 w-56 rounded-md border border-sundown-border bg-sundown-card shadow-xl p-3 space-y-2">
                {([
                  ["species", "Species"],
                  ["gender", "Gender"],
                  ["morph", "Morph"],
                  ["status", "Status"],
                  ["weight", "Weight"],
                  ["price", "Price"],
                  ["hatchDate", "Hatch Date"],
                  ["building", "Building"],
                  ["location", "Location"],
                  ["lastWeighed", "Last Weighed"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-sundown-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="rounded border-sundown-border bg-sundown-bg checked:bg-sundown-gold"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          >
            <option>All Species</option>
            {speciesList.map((s) => (
              <option key={s.id}>{s.common_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          >
            <option>All Status</option>
            <option>Available</option>
            <option>Unlisted</option>
            <option>Breeder</option>
            <option>Hold</option>
            <option>Listed</option>
            <option>Sold</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-sundown-card border border-sundown-gold rounded-md p-3 flex items-center justify-between">
          <span className="text-sm font-bold text-sundown-gold">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs">
              Change Status
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              Assign to Drop
            </Button>
          </div>
        </div>
      )}

      {tableError && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {tableError}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-sundown-text border-b border-sundown-border bg-sundown-card">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" className="rounded border-sundown-border bg-sundown-card checked:bg-sundown-gold" />
                  </th>
                  <th className="px-4 py-3 font-bold">Animal ID</th>
                  {visibleColumns.species && <th className="px-4 py-3 font-bold">Species</th>}
                  {visibleColumns.gender && <th className="px-4 py-3 font-bold">Gender</th>}
                  {visibleColumns.morph && <th className="px-4 py-3 font-bold">Morph</th>}
                  {visibleColumns.status && <th className="px-4 py-3 font-bold">Status</th>}
                  {visibleColumns.weight && <th className="px-4 py-3 font-bold">Weight</th>}
                  {visibleColumns.price && <th className="px-4 py-3 font-bold">Price</th>}
                  {visibleColumns.hatchDate && <th className="px-4 py-3 font-bold">Hatch Date</th>}
                  {visibleColumns.building && <th className="px-4 py-3 font-bold">Building</th>}
                  {visibleColumns.location && <th className="px-4 py-3 font-bold">Location</th>}
                  {visibleColumns.lastWeighed && <th className="px-4 py-3 font-bold">Last Weighed</th>}
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sundown-border">
                {paginatedAnimals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-sundown-card transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(animal.id)}
                        onChange={() => toggleSelect(animal.id)}
                        className="rounded border-sundown-border bg-sundown-card checked:bg-sundown-gold"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <button
                        onClick={() => navigate(`/admin/animals/${encodeURIComponent(animal.animal_id)}`)}
                        className="text-sundown-gold hover:underline font-bold"
                      >
                        {animal.animal_id}
                      </button>
                    </td>
                    {visibleColumns.species && (
                      <td className="px-4 py-3 text-sundown-muted">
                        {animal.species?.common_name}
                      </td>
                    )}
                    {visibleColumns.gender && (
                      <td className="px-4 py-3 text-sundown-muted">{animal.gender}</td>
                    )}
                    {visibleColumns.morph && (
                      <td className="px-4 py-3 text-sundown-muted truncate max-w-[200px]">
                        {animal.morph_traits || "—"}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            STATUS_COLORS[animal.status] || STATUS_COLORS.Available
                          }`}
                        >
                          {animal.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.weight && (
                      <td className="px-4 py-3 text-sundown-text">
                        {animal.current_weight_g ? `${animal.current_weight_g}g` : "—"}
                      </td>
                    )}
                    {visibleColumns.price && (
                      <td className="px-4 py-3 text-sundown-text">
                        {animal.price ? `$${animal.price.toLocaleString()}` : "—"}
                      </td>
                    )}
                    {visibleColumns.hatchDate && (
                      <td className="px-4 py-3 text-sundown-text">
                        {animal.hatch_date || "—"}
                      </td>
                    )}
                    {visibleColumns.building && (
                      <td className="px-4 py-3 text-sundown-text">{animal.building || "—"}</td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-4 py-3 text-sundown-text">{animal.rack_enclosure || "—"}</td>
                    )}
                    {visibleColumns.lastWeighed && (
                      <td className="px-4 py-3 text-sundown-text">
                        {animal.last_weighed ? new Date(animal.last_weighed).toLocaleDateString() : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setActiveMenuId((prev) => (prev === animal.id ? null : animal.id))
                        }
                      >
                        <MoreHorizontal className="w-4 h-4 text-sundown-muted" />
                      </Button>
                      {activeMenuId === animal.id && (
                        <div className="absolute right-4 mt-1 z-20 w-44 rounded-md border border-sundown-border bg-sundown-card shadow-xl text-left">
                          <button
                            className="w-full px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg"
                            onClick={() => {
                              navigate(`/admin/animals/${encodeURIComponent(animal.animal_id)}`);
                              setActiveMenuId(null);
                            }}
                          >
                            View Detail
                          </button>
                          <button
                            className="w-full px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg"
                            onClick={() => {
                              openEditModal(animal);
                              setActiveMenuId(null);
                            }}
                          >
                            Edit Animal
                          </button>
                          <button
                            className="w-full px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg"
                            onClick={async () => {
                              await navigator.clipboard.writeText(animal.animal_id);
                              setActiveMenuId(null);
                            }}
                          >
                            Copy Animal ID
                          </button>
                          {(["Available", "Unlisted", "Breeder", "Hold", "Listed", "Sold"] as const).map((s) => (
                            <button
                              key={s}
                              className={`w-full px-3 py-2 text-sm hover:bg-sundown-bg ${animal.status === s ? "text-sundown-gold font-bold" : "text-sundown-text"}`}
                              onClick={async () => {
                                await updateAnimalStatus(animal.id, s);
                                setActiveMenuId(null);
                              }}
                            >
                              Set {s}
                            </button>
                          ))}
                          <button
                            className="w-full px-3 py-2 text-sm text-sundown-red hover:bg-sundown-bg"
                            onClick={async () => {
                              const confirmed = window.confirm(`Delete ${animal.animal_id}? This cannot be undone.`);
                              if (!confirmed) return;
                              await deleteAnimal(animal.id);
                              setActiveMenuId(null);
                            }}
                          >
                            Delete Animal
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-sundown-muted">
        <span>
          Showing {filtered.length === 0 ? 0 : pageStart + 1}-{Math.min(pageEnd, filtered.length)} of {filtered.length} animals
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sundown-muted">Per page</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 px-2 rounded-md border border-sundown-border bg-sundown-card text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="h-9"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-9"
          >
            Prev
          </Button>
          <span className="px-2 text-sundown-text">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-9"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="h-9"
          >
            Last
          </Button>
        </div>
      </div>

      {/* Add Animal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-sundown-card border border-sundown-border rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sundown-border">
              <h2 className="text-lg font-bold text-sundown-text">Add Animal</h2>
              <button onClick={() => setShowAddModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Animal ID *</label>
                <input
                  type="text"
                  value={addForm.animal_id}
                  onChange={(e) => setAddForm({ ...addForm, animal_id: e.target.value })}
                  placeholder="e.g. MC1 Azalea x Everest #1"
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold placeholder:text-sundown-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Species *</label>
                <select
                  value={addForm.species_id}
                  onChange={(e) => setAddForm({ ...addForm, species_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                >
                  <option value="">Select species...</option>
                  {speciesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.common_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value as "Male" | "Female" | "Unsexed" })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Unsexed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as typeof addForm.status })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  >
                    <option>Available</option>
                    <option>Unlisted</option>
                    <option>Breeder</option>
                    <option>Hold</option>
                    <option>Listed</option>
                    <option>Sold</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Morph / Traits</label>
                <input
                  type="text"
                  value={addForm.morph_traits}
                  onChange={(e) => setAddForm({ ...addForm, morph_traits: e.target.value })}
                  placeholder="e.g. Azalea x Everest"
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold placeholder:text-sundown-muted"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Weight (g)</label>
                  <input
                    type="number"
                    value={addForm.current_weight_g}
                    onChange={(e) => setAddForm({ ...addForm, current_weight_g: e.target.value })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold placeholder:text-sundown-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold placeholder:text-sundown-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Hatch Date</label>
                  <input
                    type="date"
                    value={addForm.hatch_date}
                    onChange={(e) => setAddForm({ ...addForm, hatch_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  />
                </div>
              </div>
              {addError && (
                <p className="text-sm text-sundown-red bg-sundown-red/10 px-3 py-2 rounded-md border border-sundown-red/20">{addError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-sundown-border">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddAnimal} disabled={addLoading}>
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Animal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Animal Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-sundown-card border border-sundown-border rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sundown-border">
              <h2 className="text-lg font-bold text-sundown-text">Edit Animal</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAnimalId(null);
                  setEditError("");
                }}
                className="text-sundown-muted hover:text-sundown-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Animal ID *</label>
                <input
                  type="text"
                  value={editForm.animal_id}
                  onChange={(e) => setEditForm({ ...editForm, animal_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Species *</label>
                <select
                  value={editForm.species_id}
                  onChange={(e) => setEditForm({ ...editForm, species_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                >
                  <option value="">Select species...</option>
                  {speciesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.common_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as "Male" | "Female" | "Unsexed" })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Unsexed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as typeof editForm.status })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  >
                    <option>Available</option>
                    <option>Unlisted</option>
                    <option>Breeder</option>
                    <option>Hold</option>
                    <option>Listed</option>
                    <option>Sold</option>
                    <option>Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-sundown-muted mb-1">Morph / Traits</label>
                <input
                  type="text"
                  value={editForm.morph_traits}
                  onChange={(e) => setEditForm({ ...editForm, morph_traits: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Weight (g)</label>
                  <input
                    type="number"
                    value={editForm.current_weight_g}
                    onChange={(e) => setEditForm({ ...editForm, current_weight_g: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Hatch Date</label>
                  <input
                    type="date"
                    value={editForm.hatch_date}
                    onChange={(e) => setEditForm({ ...editForm, hatch_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Building</label>
                  <select
                    value={editForm.building}
                    onChange={(e) => setEditForm({ ...editForm, building: e.target.value as "" | "A" | "B" })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  >
                    <option value="">None</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sundown-muted mb-1">Rack / Enclosure</label>
                  <input
                    type="text"
                    value={editForm.rack_enclosure}
                    onChange={(e) => setEditForm({ ...editForm, rack_enclosure: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
                  />
                </div>
              </div>
              {editError && (
                <p className="text-sm text-sundown-red bg-sundown-red/10 px-3 py-2 rounded-md border border-sundown-red/20">
                  {editError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-sundown-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAnimalId(null);
                  setEditError("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

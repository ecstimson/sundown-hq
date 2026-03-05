import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  Camera,
  Scale,
  StickyNote,
  Eye,
  Baby,
  Search,
  ArrowLeft,
  ChevronRight,
  Loader2,
  X,
  Calendar,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Animal, Species } from "@/types/database";

type AnimalWithSpecies = Animal & {
  species: Pick<Species, "common_name" | "code">;
};

const TASKS = [
  { id: "observe", label: "Log Observation", icon: Eye, desc: "Feeding, health, behavior, shedding" },
  { id: "photo", label: "Add Photo", icon: Camera, desc: "Capture or upload an image" },
  { id: "weight", label: "Update Weight", icon: Scale, desc: "Record a new weight measurement" },
  { id: "note", label: "Add Note", icon: StickyNote, desc: "Append a quick note" },
  { id: "offspring", label: "Add Offspring", icon: Baby, desc: "Register a new hatchling from this animal" },
  { id: "drop", label: "Add to Drop", icon: Calendar, desc: "Schedule this animal for an upcoming drop" },
] as const;

type TaskId = (typeof TASKS)[number]["id"];

export default function QuickAdd() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const prefix = isAdmin ? "/admin" : "/employee";
  const [step, setStep] = useState<"task" | "animal">("task");
  const [selectedTask, setSelectedTask] = useState<TaskId | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimalWithSpecies[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  function pickTask(taskId: TaskId) {
    setSelectedTask(taskId);
    setStep("animal");
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  async function searchAnimals(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(true);
    const { data } = await supabase
      .from("animals")
      .select("*, species:species_id(common_name, code)")
      .or(`animal_id.ilike.%${q.trim()}%,rack_enclosure.ilike.%${q.trim()}%,morph_traits.ilike.%${q.trim()}%`)
      .order("animal_id")
      .limit(30);
    setResults((data as unknown as AnimalWithSpecies[]) || []);
    setSearching(false);
  }

  function selectAnimal(animal: AnimalWithSpecies) {
    const id = encodeURIComponent(animal.animal_id);
    const observePath = isAdmin ? `/employee/observe` : `${prefix}/observe`;
    const animalPath = isAdmin ? `/employee/animals/${id}` : `${prefix}/animals/${id}`;
    switch (selectedTask) {
      case "observe":
        navigate(`${observePath}?id=${id}`);
        break;
      case "photo":
        navigate(`${observePath}?id=${id}&type=photo`);
        break;
      case "weight":
        navigate(`${observePath}?id=${id}&type=Weight`);
        break;
      case "note":
        navigate(`${observePath}?id=${id}&type=General+Note`);
        break;
      case "offspring":
        navigate(`${animalPath}?action=offspring`);
        break;
      case "drop":
        navigate(`${animalPath}?action=drop`);
        break;
      default:
        navigate(animalPath);
    }
  }

  const taskInfo = TASKS.find((t) => t.id === selectedTask);

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {step === "animal" ? (
          <Button variant="ghost" size="icon" onClick={() => { setStep("task"); setSelectedTask(null); }} className="-ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <X className="w-6 h-6" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold text-sundown-text">
            {step === "task" ? "Quick Add" : taskInfo?.label}
          </h1>
          <p className="text-sm text-sundown-muted">
            {step === "task" ? "What do you want to do?" : "Search by animal ID or location"}
          </p>
        </div>
      </div>

      {step === "task" ? (
        /* Step 1: Pick a task */
        <div className="border border-sundown-border rounded-md overflow-hidden divide-y divide-sundown-border">
          {TASKS.map((task) => (
            <button
              key={task.id}
              onClick={() => pickTask(task.id)}
              className="w-full p-4 flex items-center gap-4 hover:bg-sundown-card/50 transition-colors text-left"
            >
              <task.icon className="w-5 h-5 text-sundown-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sundown-text">{task.label}</p>
                <p className="text-xs text-sundown-muted">{task.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-sundown-muted flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        /* Step 2: Pick an animal */
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sundown-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => searchAnimals(e.target.value)}
              placeholder="Type animal ID or location…"
              className="w-full h-12 pl-9 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
            />
          </div>

          {searching ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-sundown-gold" />
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-y-auto border border-sundown-border rounded-md overflow-hidden divide-y divide-sundown-border">
              <p className="text-[10px] text-sundown-muted font-semibold uppercase tracking-wider px-3 py-2 bg-sundown-card/50">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => selectAnimal(animal)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-sundown-card/50 transition-colors text-left"
                >
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-sm text-sundown-text truncate">{animal.animal_id}</p>
                    <p className="text-xs text-sundown-muted truncate">
                      {animal.species?.common_name} · {animal.gender}
                      {animal.rack_enclosure ? ` · ${animal.rack_enclosure}` : ""}
                      {animal.morph_traits ? ` · ${animal.morph_traits}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                    animal.status === "Available" ? "bg-sundown-green/20 text-sundown-green"
                      : animal.status === "Unlisted" ? "bg-orange-500/20 text-orange-400"
                      : animal.status === "Breeder" ? "bg-sundown-gold/20 text-sundown-gold"
                      : animal.status === "Hold" ? "bg-blue-500/20 text-blue-400"
                      : "bg-sundown-muted/20 text-sundown-muted"
                  }`}>
                    {animal.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-sundown-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : searched && query.trim().length >= 2 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm text-sundown-muted">No animals matching "{query}"</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-md flex items-center justify-center mb-3 bg-sundown-card border border-sundown-border">
                {taskInfo && <taskInfo.icon className="w-7 h-7 text-sundown-muted" />}
              </div>
              <p className="text-sm text-sundown-muted max-w-xs">
                Start typing an animal ID or rack location to find the animal.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

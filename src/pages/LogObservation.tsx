import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const OBSERVATION_TYPES = [
  "Feeding",
  "Weight",
  "Health Concern",
  "Behavior",
  "Shedding",
  "Egg/Breeding",
  "General Note",
] as const;

const URGENCY_LEVELS = [
  {
    id: "Routine" as const,
    label: "Routine",
    color: "bg-sundown-card border-sundown-border text-sundown-muted",
  },
  {
    id: "Needs Attention" as const,
    label: "Needs Attention",
    color: "bg-sundown-orange/10 border-sundown-orange text-sundown-orange",
  },
  {
    id: "Urgent" as const,
    label: "Urgent",
    color: "bg-sundown-red/10 border-sundown-red text-sundown-red",
  },
];

export default function LogObservation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { employee, user } = useAuth();
  const animalIdParam = searchParams.get("id") || "";

  const [animalId, setAnimalId] = useState(animalIdParam);
  const [selectedType, setSelectedType] = useState<string>("General Note");
  const [details, setDetails] = useState("");
  const [urgency, setUrgency] = useState<"Routine" | "Needs Attention" | "Urgent">("Routine");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!animalId.trim()) {
      setError("Please enter an animal ID.");
      return;
    }
    if (!details.trim()) {
      setError("Please enter observation details.");
      return;
    }

    setSubmitting(true);
    setError("");

    // Look up animal UUID from animal_id
    const { data: animalResults } = await supabase
      .from("animals")
      .select("id")
      .eq("animal_id", animalId.trim())
      .limit(1);

    const animal = (animalResults as { id: string }[] | null)?.[0];

    if (!animal) {
      setError(`Animal "${animalId}" not found.`);
      setSubmitting(false);
      return;
    }

    // Map observation type for DB (Egg/Breeding -> Egg-Breeding)
    const obsType = selectedType === "Egg/Breeding" ? "Egg-Breeding" : selectedType;

    const { error: insertErr } = await supabase.from("observations").insert({
      animal_id: animal.id,
      employee_id: user?.id || "",
      employee_name: employee?.name || "Unknown",
      observation_type: obsType,
      details: details.trim(),
      urgency,
    } as any);

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-sundown-text">Log Observation</h1>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pb-20">
        {/* Animal ID */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">
            Animal ID
          </h3>
          <input
            type="text"
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            placeholder="e.g. MC1 Azalea x Everest #1"
            className="w-full h-12 px-4 rounded-xl border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
          />
        </section>

        {/* Observation Type */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">
            Observation Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {OBSERVATION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  selectedType === type
                    ? "bg-sundown-gold text-black border-sundown-gold shadow-md"
                    : "bg-sundown-card text-sundown-text border-sundown-border hover:border-sundown-gold/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* Details */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">
            Details
          </h3>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What did you observe?"
            className="w-full h-32 p-4 rounded-xl bg-sundown-card border border-sundown-border text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold resize-none text-base"
          />
        </section>

        {/* Urgency */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">
            Urgency
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {URGENCY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setUrgency(level.id)}
                className={`py-3 px-2 rounded-xl text-xs font-bold uppercase transition-all border-2 ${
                  urgency === level.id ? level.color : "bg-sundown-card border-sundown-border text-sundown-muted"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </section>

        {/* Photos */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">
            Photos
          </h3>
          <div className="flex gap-3">
            <button className="w-20 h-20 rounded-xl bg-sundown-card border border-sundown-border flex flex-col items-center justify-center text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 transition-colors">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Camera</span>
            </button>
            <button className="w-20 h-20 rounded-xl bg-sundown-card border border-sundown-border flex flex-col items-center justify-center text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 transition-colors">
              <ImageIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Gallery</span>
            </button>
          </div>
        </section>

        {error && (
          <p className="text-sm text-sundown-red bg-sundown-red/10 px-4 py-3 rounded-xl">
            {error}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-sundown-bg border-t border-sundown-border z-10">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 text-lg font-bold shadow-lg shadow-sundown-gold/20"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          Save Observation
        </Button>
      </div>
    </div>
  );
}

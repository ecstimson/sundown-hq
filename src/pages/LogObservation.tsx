import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Camera, Image as ImageIcon, CheckCircle } from "lucide-react";

const OBSERVATION_TYPES = [
  "Feeding", "Weight", "Health Concern",
  "Behavior", "Shedding", "Egg/Breeding",
  "General Note"
];

const URGENCY_LEVELS = [
  { id: "routine", label: "Routine", color: "bg-sundown-card border-sundown-border text-sundown-muted" },
  { id: "attention", label: "Needs Attention", color: "bg-sundown-orange/10 border-sundown-orange text-sundown-orange" },
  { id: "urgent", label: "Urgent", color: "bg-sundown-red/10 border-sundown-red text-sundown-red" }
];

export default function LogObservation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const animalId = searchParams.get("id") || "SR-GG-2025-0147";
  
  const [selectedType, setSelectedType] = useState("General Note");
  const [details, setDetails] = useState("");
  const [urgency, setUrgency] = useState("routine");

  const handleSubmit = () => {
    // In a real app, submit data here
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
          <span className="inline-block px-2 py-0.5 rounded-full bg-sundown-card border border-sundown-border text-xs text-sundown-muted mt-1">
            {animalId}
          </span>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pb-20">
        {/* 1. Observation Type */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Observation Type</h3>
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

        {/* 2. Details */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Details</h3>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What did you observe?"
            className="w-full h-32 p-4 rounded-xl bg-sundown-card border border-sundown-border text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold resize-none text-base"
          />
        </section>

        {/* 3. Urgency */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Urgency</h3>
          <div className="grid grid-cols-3 gap-3">
            {URGENCY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setUrgency(level.id)}
                className={`py-3 px-2 rounded-xl text-xs font-bold uppercase transition-all border-2 ${
                  urgency === level.id
                    ? level.color.replace("border-", "border-2 border-") // Active state styling logic
                    : "bg-sundown-card border-sundown-border text-sundown-muted"
                } ${urgency === level.id ? level.color : ""}`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Photos */}
        <section>
          <h3 className="text-sm font-semibold text-sundown-muted uppercase tracking-wider mb-3">Photos</h3>
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
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-sundown-bg border-t border-sundown-border z-10">
        <Button 
          onClick={handleSubmit}
          className="w-full h-14 text-lg font-bold shadow-lg shadow-sundown-gold/20"
        >
          Save Observation
        </Button>
      </div>
    </div>
  );
}

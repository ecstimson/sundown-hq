import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const newPhotos: { file: File; preview: string }[] = [];
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds 5 MB limit.`);
        continue;
      }
      if (!file.type.startsWith("image/")) continue;
      newPhotos.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadPhotos(animalIdText: string): Promise<string[]> {
    const urls: string[] = [];
    for (const { file } of photos) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${animalIdText}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("observation-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage
        .from("observation-photos")
        .getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

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

    const obsType = selectedType === "Egg/Breeding" ? "Egg-Breeding" : selectedType;

    let photoUrls: string[] = [];
    if (photos.length > 0) {
      setUploading(true);
      try {
        photoUrls = await uploadPhotos(animalId.trim());
      } catch (err: any) {
        setError(`Photo upload failed: ${err.message}`);
        setUploading(false);
        setSubmitting(false);
        return;
      }
      setUploading(false);
    }

    const { error: insertErr } = await supabase.from("observations").insert({
      animal_id: animal.id,
      employee_id: user?.id || "",
      employee_name: employee?.name || "Unknown",
      observation_type: obsType,
      details: details.trim(),
      urgency,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
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
            Photos ({photos.length}/{MAX_PHOTOS})
          </h3>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
          />
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-sundown-border">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="w-20 h-20 rounded-xl bg-sundown-card border border-sundown-border flex flex-col items-center justify-center text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 transition-colors"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Camera</span>
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="w-20 h-20 rounded-xl bg-sundown-card border border-sundown-border flex flex-col items-center justify-center text-sundown-muted hover:text-sundown-text hover:border-sundown-gold/50 transition-colors"
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Gallery</span>
                </button>
              </>
            )}
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
          disabled={submitting || uploading}
          className="w-full h-14 text-lg font-bold shadow-lg shadow-sundown-gold/20"
        >
          {(submitting || uploading) ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          {uploading ? "Uploading Photos…" : "Save Observation"}
        </Button>
      </div>
    </div>
  );
}

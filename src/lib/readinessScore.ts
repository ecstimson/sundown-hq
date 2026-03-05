import type { Animal } from "@/types/database";

export interface ScoreBreakdown {
  total: number;
  photoReady: number;
  morphFilled: number;
  weightRecent: number;
  statusAvailable: number;
  priceSet: number;
  observationRecent: number;
}

export function calculateReadinessScore(animal: Animal): ScoreBreakdown {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  const photoReady = animal.image_folder_url ? 20 : 0;
  const morphFilled = animal.morph_traits ? 15 : 0;

  let weightRecent = 0;
  if (animal.last_weighed) {
    const age = now - new Date(animal.last_weighed).getTime();
    weightRecent = age < thirtyDays ? 20 : age < thirtyDays * 2 ? 10 : 0;
  }

  const statusAvailable = animal.status === "Available" ? 15 : 0;
  const priceSet = animal.price && animal.price > 0 ? 15 : 0;

  let observationRecent = 0;
  if (animal.last_observation_date) {
    const age = now - new Date(animal.last_observation_date).getTime();
    observationRecent = age < fourteenDays ? 15 : age < thirtyDays ? 8 : 0;
  }

  const total = photoReady + morphFilled + weightRecent + statusAvailable + priceSet + observationRecent;

  return { total, photoReady, morphFilled, weightRecent, statusAvailable, priceSet, observationRecent };
}

export function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: "Ready", color: "bg-sundown-green/20 text-sundown-green" };
  if (score >= 60) return { text: "Almost", color: "bg-sundown-gold/20 text-sundown-gold" };
  if (score >= 40) return { text: "Getting There", color: "bg-sundown-orange/20 text-sundown-orange" };
  return { text: "Not Ready", color: "bg-sundown-red/20 text-sundown-red" };
}

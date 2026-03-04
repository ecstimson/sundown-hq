// Shared CSV import utilities for animal inventory — used by both UI and CLI script.

// ─── CSV Parser ───

export function parseCSVText(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < content.length && content[i + 1] === "\n") i++;
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  current.push(field);
  if (current.some((f) => f.trim())) rows.push(current);
  return rows;
}

// ─── Species Resolution ───

// Maps CSV species text (lowercased keyword) to all possible DB codes.
// The resolver tries name-based matching first, then falls back to these aliases.
const SPECIES_KEYWORD_ALIASES: Record<string, string[]> = {
  chahoua: ["CH", "MC"],
  crested: ["CG", "CC"],
  gargoyle: ["GG", "RA"],
  gargoyke: ["GG", "RA"],
  leachianus: ["LC"],
  ciliaris: ["NST"],
  "blue tree": ["BTM"],
  "green tree": ["GTM"],
  "yellow tree": ["YTM"],
  pilbara: ["PRM"],
  "abronia graminea": ["AG"],
  "abronia taeniata": ["AT"],
  "rough knob": ["RKT"],
  mourning: ["MG"],
  "chinese cave": ["CCG"],
  vieillard: ["VCG"],
};

export interface SpeciesEntry {
  id: string;
  code: string;
  common_name: string;
}

/**
 * Build a function that resolves a raw CSV species string to a DB species id.
 * Strategy: try keyword match against common_name, then try code alias lookup.
 */
export function buildSpeciesResolver(speciesList: SpeciesEntry[]) {
  const byCode = new Map<string, SpeciesEntry>();
  const byNameLower = new Map<string, SpeciesEntry>();

  for (const sp of speciesList) {
    byCode.set(sp.code.toUpperCase(), sp);
    byNameLower.set(sp.common_name.toLowerCase(), sp);
  }

  return function resolve(rawSpeciesText: string): SpeciesEntry | null {
    const normalized = rawSpeciesText.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    // 1) Direct name match (e.g. "Chahoua Gecko")
    for (const [name, sp] of byNameLower) {
      if (normalized.includes(name) || name.includes(normalized)) return sp;
    }

    // 2) Keyword alias match
    for (const [keyword, codes] of Object.entries(SPECIES_KEYWORD_ALIASES)) {
      if (normalized.includes(keyword)) {
        for (const code of codes) {
          const sp = byCode.get(code.toUpperCase());
          if (sp) return sp;
        }
      }
    }

    // 3) Direct code match (user typed the code itself)
    const asCode = byCode.get(normalized.toUpperCase());
    if (asCode) return asCode;

    return null;
  };
}

// ─── Field Normalizers ───

export function normalizeGender(raw: string): "Male" | "Female" | "Unsexed" {
  const g = raw.toLowerCase().trim();
  if (!g) return "Unsexed";

  if (g === "male" || g.startsWith("male") || g === "proh male") return "Male";

  if (
    g === "female" ||
    g === "famele" ||
    g === "femle" ||
    g === "femqle" ||
    g.startsWith("female") ||
    g.includes("prob female") ||
    g.includes("probable female")
  )
    return "Female";

  // "poss male" / "possible male" with pores → Male, otherwise Unsexed
  if (g.includes("poss male") || g.includes("possible male")) {
    return g.includes("pores seen") ? "Male" : "Unsexed";
  }

  // NPV / unsexed / no pores → Unsexed
  if (
    g === "npv" ||
    g.startsWith("unsexed") ||
    g.startsWith("no pores") ||
    g === "np" ||
    g === "`"
  )
    return "Unsexed";

  if (g.includes("male")) return "Male";
  if (g.includes("female")) return "Female";
  return "Unsexed";
}

export function parseWeight(raw: string): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes("/")) return null; // corrupted date values
  const cleaned = s.replace(/g\s*$/, "").replace(/\s/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parsePrice(raw: string): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toUpperCase();
  if (s === "HB" || s === "FS") return null;
  const kMatch = s.match(/^(\d+(?:\.\d+)?)\s*K$/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const cleaned = s.replace(/[$,`]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseDateField(raw: string): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (s.includes("1900") || s.includes("1905")) return null;
  if (s.includes("'")) return null;
  if (/^\d+\.\d+\/\d+$/.test(s)) return null;
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    const year = parseInt(y);
    if (year < 2000 || year > 2030) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function parseStatus(
  raw: string,
  price: string
): "Available" | "Hold" | "Sold" | "Listed" | "Breeder" {
  const s = raw.trim().toLowerCase();
  const p = price.trim().toUpperCase();
  if (s === "sold") return "Sold";
  if (["holdback", "hold back", "hold", "hb"].includes(s) || p === "HB") return "Hold";
  if (s === "auction" || s === "auction?") return "Available";
  if (s === "listed") return "Listed";
  if (p === "FS") return "Available";
  return "Available";
}

// ─── Header Detection ───

const ID_HEADER_VARIANTS = ["id", "animal id", "animal_id", "animalid"];
const SPECIES_HEADER_VARIANTS = ["species"];
const GENDER_HEADER_VARIANTS = ["gender", "sex"];
const WEIGHT_HEADER_VARIANTS = ["weight"];
const PRICE_HEADER_VARIANTS = ["price"];
const STATUS_HEADER_VARIANTS = ["status"];

function findCol(header: string[], variants: string[]): number {
  return header.findIndex((h) => variants.includes(h));
}

function findColIncludes(header: string[], substring: string): number {
  return header.findIndex((h) => h.includes(substring));
}

// ─── Import Processor ───

export interface AnimalRecord {
  animal_id: string;
  species_id: string;
  gender: "Male" | "Female" | "Unsexed";
  hatch_date: string | null;
  current_weight_g: number | null;
  price: number | null;
  status: "Available" | "Hold" | "Sold" | "Listed" | "Breeder";
  morph_traits: string | null;
  listing_readiness_score: number;
}

export interface ProcessResult {
  records: AnimalRecord[];
  skipped: number;
  errors: string[];
  warnings: string[];
}

/**
 * Parse a CSV string into insertable animal records.
 * Returns records + diagnostic messages. Does NOT touch the database.
 */
export function processAnimalCSV(
  csvText: string,
  speciesList: SpeciesEntry[]
): ProcessResult {
  const result: ProcessResult = { records: [], skipped: 0, errors: [], warnings: [] };

  if (!speciesList.length) {
    result.errors.push(
      "No species found in database. Seed the species table before importing animals."
    );
    return result;
  }

  const rows = parseCSVText(csvText);
  if (rows.length < 2) {
    result.errors.push("CSV is empty or has no data rows.");
    return result;
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  const resolveSpecies = buildSpeciesResolver(speciesList);

  // Detect columns
  const colId = findCol(header, ID_HEADER_VARIANTS);
  const colSpecies = findCol(header, SPECIES_HEADER_VARIANTS);
  const colGender = findCol(header, GENDER_HEADER_VARIANTS);
  const colHatchDate = findColIncludes(header, "hatch") !== -1
    ? findColIncludes(header, "hatch")
    : findColIncludes(header, "date");
  const colWeight = findCol(header, WEIGHT_HEADER_VARIANTS);
  const colPrice = findCol(header, PRICE_HEADER_VARIANTS);
  const colSalePrice = findColIncludes(header, "sale");
  const colStatus = findCol(header, STATUS_HEADER_VARIANTS);

  if (colId === -1) {
    result.errors.push(
      `Could not find an ID column in the CSV header. Expected one of: ${ID_HEADER_VARIANTS.join(", ")}. Found headers: ${header.join(", ")}`
    );
    return result;
  }

  let lastResolvedSpecies: SpeciesEntry | null = null;
  const seenIds = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    while (row.length < header.length) row.push("");

    const rawId = colId >= 0 ? row[colId].trim() : "";
    const rawSpecies = colSpecies >= 0 ? row[colSpecies].trim() : "";
    const rawGender = colGender >= 0 ? row[colGender].trim() : "";
    const rawHatchDate = colHatchDate >= 0 ? row[colHatchDate].trim() : "";
    const rawWeight = colWeight >= 0 ? row[colWeight].trim() : "";
    const rawPrice = colPrice >= 0 ? row[colPrice].trim() : "";
    const rawSalePrice = colSalePrice >= 0 ? row[colSalePrice].trim() : "";
    const rawStatus = colStatus >= 0 ? row[colStatus].trim() : "";

    if (!rawId) {
      result.skipped++;
      continue;
    }

    // Species carry-forward
    if (rawSpecies) {
      const resolved = resolveSpecies(rawSpecies);
      if (resolved) {
        lastResolvedSpecies = resolved;
      }
      // Ignore noise values like "No pics" — keep previous species
    }

    if (!lastResolvedSpecies) {
      result.warnings.push(`Row ${i + 2}: No species context for "${rawId}", skipped`);
      result.skipped++;
      continue;
    }

    // Duplicate detection (warn but still include — last wins for script, all for UI)
    const idKey = rawId.toLowerCase();
    if (seenIds.has(idKey)) {
      result.warnings.push(`Row ${i + 2}: Duplicate animal ID "${rawId}" — later row will override if using dedup mode`);
    }
    seenIds.add(idKey);

    // Extract morph traits from compound ID (e.g. "MC1 Azalea x Everest #1")
    const morphMatch = rawId.match(
      /^(?:MC|CC|RA|RL|SC|CH|GG|CG|LC|NST)\s*(?:2025[- ]?)?\d+[a-z]?\s+(.+)$/i
    );

    result.records.push({
      animal_id: rawId,
      species_id: lastResolvedSpecies.id,
      gender: normalizeGender(rawGender),
      hatch_date: parseDateField(rawHatchDate),
      current_weight_g: parseWeight(rawWeight),
      price: parsePrice(rawPrice) ?? parsePrice(rawSalePrice),
      status: parseStatus(rawStatus, rawPrice),
      morph_traits: morphMatch ? morphMatch[1].trim() : null,
      listing_readiness_score: 0,
    });
  }

  return result;
}

/**
 * Deduplicate records by animal_id (case-insensitive). Last occurrence wins.
 */
export function deduplicateRecords(records: AnimalRecord[]): AnimalRecord[] {
  const map = new Map<string, AnimalRecord>();
  for (const r of records) {
    map.set(r.animal_id.toLowerCase(), r);
  }
  return [...map.values()];
}

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseCSVText,
  buildSpeciesResolver,
  normalizeGender,
  parseWeight,
  parsePrice,
  parseDateField,
  parseStatus,
  processAnimalCSV,
  deduplicateRecords,
  type SpeciesEntry,
} from "../animalsCsv";

// --- Shared species list matching the DB seed ---
const SPECIES: SpeciesEntry[] = [
  { id: "uuid-gg", code: "GG", common_name: "Gargoyle Gecko" },
  { id: "uuid-ch", code: "CH", common_name: "Chahoua Gecko" },
  { id: "uuid-cg", code: "CG", common_name: "Crested Gecko" },
  { id: "uuid-lc", code: "LC", common_name: "Leachianus" },
  { id: "uuid-nst", code: "NST", common_name: "Northern Spiny-Tailed Gecko" },
];

// ─── CSV Parser ───

describe("parseCSVText", () => {
  it("parses simple rows", () => {
    const rows = parseCSVText("a,b,c\n1,2,3");
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCSVText('name,"price, usd",qty\nWidget,"1,200",5');
    expect(rows[1][1]).toBe("1,200");
  });

  it("handles escaped quotes", () => {
    const rows = parseCSVText('a,"say ""hello""",c');
    expect(rows[0][1]).toBe('say "hello"');
  });

  it("handles CRLF line endings", () => {
    const rows = parseCSVText("a,b\r\n1,2\r\n3,4");
    expect(rows).toHaveLength(3);
  });
});

// ─── Species Resolver ───

describe("buildSpeciesResolver", () => {
  const resolve = buildSpeciesResolver(SPECIES);

  it("resolves 'Chahoua' to the CH species", () => {
    expect(resolve("Chahoua")?.code).toBe("CH");
  });

  it("resolves 'Crested' to the CG species", () => {
    expect(resolve("Crested")?.code).toBe("CG");
  });

  it("resolves 'Gargoyle' to the GG species", () => {
    expect(resolve("Gargoyle")?.code).toBe("GG");
  });

  it("resolves 'Gargoyke' (typo) to GG", () => {
    expect(resolve("Gargoyke")?.code).toBe("GG");
  });

  it("resolves case-insensitively", () => {
    expect(resolve("chahoua")?.code).toBe("CH");
    expect(resolve("CRESTED")?.code).toBe("CG");
  });

  it("returns null for unknown species", () => {
    expect(resolve("Unknown Lizard")).toBeNull();
  });

  it("resolves by direct code", () => {
    expect(resolve("GG")?.code).toBe("GG");
  });
});

// ─── Field Normalizers ───

describe("normalizeGender", () => {
  it("normalizes standard values", () => {
    expect(normalizeGender("Male")).toBe("Male");
    expect(normalizeGender("Female")).toBe("Female");
    expect(normalizeGender("Unsexed")).toBe("Unsexed");
  });

  it("handles NPV as Unsexed", () => {
    expect(normalizeGender("NPV")).toBe("Unsexed");
    expect(normalizeGender("Unsexed NPV")).toBe("Unsexed");
  });

  it("handles typos", () => {
    expect(normalizeGender("famele")).toBe("Female");
    expect(normalizeGender("femle")).toBe("Female");
    expect(normalizeGender("femqle")).toBe("Female");
  });

  it("handles probable female", () => {
    expect(normalizeGender("Probable female")).toBe("Female");
  });

  it("treats empty as Unsexed", () => {
    expect(normalizeGender("")).toBe("Unsexed");
  });
});

describe("parseWeight", () => {
  it("parses grams with suffix", () => {
    expect(parseWeight("9.17g")).toBe(9.17);
    expect(parseWeight("12g")).toBe(12);
  });

  it("rejects date-like values", () => {
    expect(parseWeight("1/7/1900")).toBeNull();
  });

  it("handles commas", () => {
    expect(parseWeight("1,200g")).toBe(1200);
  });

  it("returns null for empty", () => {
    expect(parseWeight("")).toBeNull();
  });
});

describe("parsePrice", () => {
  it("parses plain numbers", () => {
    expect(parsePrice("6500")).toBe(6500);
  });

  it("parses K notation", () => {
    expect(parsePrice("5k")).toBe(5000);
    expect(parsePrice("2K")).toBe(2000);
  });

  it("parses comma-separated values", () => {
    expect(parsePrice("2,500")).toBe(2500);
    expect(parsePrice("15,000")).toBe(15000);
  });

  it("parses dollar sign", () => {
    expect(parsePrice("$1,200")).toBe(1200);
  });

  it("returns null for HB/FS", () => {
    expect(parsePrice("HB")).toBeNull();
    expect(parsePrice("FS")).toBeNull();
  });
});

describe("parseDateField", () => {
  it("parses M/D/YYYY format", () => {
    expect(parseDateField("9/9/2024")).toBe("2024-09-09");
    expect(parseDateField("12/25/2024")).toBe("2024-12-25");
  });

  it("rejects corrupted dates", () => {
    expect(parseDateField("1/7/1900")).toBeNull();
    expect(parseDateField("7/15/1905")).toBeNull();
  });

  it("rejects out-of-range years", () => {
    expect(parseDateField("1/1/1999")).toBeNull();
  });
});

describe("parseStatus", () => {
  it("maps sold correctly", () => {
    expect(parseStatus("Sold", "")).toBe("Sold");
    expect(parseStatus("sold", "")).toBe("Sold");
  });

  it("maps holdback variations", () => {
    expect(parseStatus("Holdback", "")).toBe("Hold");
    expect(parseStatus("hold back", "")).toBe("Hold");
    expect(parseStatus("", "HB")).toBe("Hold");
  });

  it("defaults to Available", () => {
    expect(parseStatus("", "")).toBe("Available");
    expect(parseStatus("Auction", "")).toBe("Available");
  });
});

// ─── Full CSV Processing ───

describe("processAnimalCSV", () => {
  const csvText = readFileSync(
    resolve(__dirname, "fixtures/sample-animals.csv"),
    "utf-8"
  );

  it("returns records when species list is valid", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("correctly maps Chahoua to CH species UUID", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    const mc1 = result.records.find((r) => r.animal_id.includes("MC1"));
    expect(mc1).toBeDefined();
    expect(mc1!.species_id).toBe("uuid-ch");
  });

  it("carries species forward for blank rows", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    const mc3 = result.records.find((r) => r.animal_id.includes("MC3"));
    expect(mc3).toBeDefined();
    expect(mc3!.species_id).toBe("uuid-ch");
  });

  it("switches species context correctly", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    const cc2 = result.records.find((r) => r.animal_id.includes("CC2"));
    expect(cc2).toBeDefined();
    expect(cc2!.species_id).toBe("uuid-cg");

    const ra4 = result.records.find((r) => r.animal_id.includes("RA4"));
    expect(ra4).toBeDefined();
    expect(ra4!.species_id).toBe("uuid-gg");
  });

  it("skips blank rows and counts them", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    expect(result.skipped).toBeGreaterThan(0);
  });

  it("parses comma-separated prices correctly", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    const ra4 = result.records.find((r) => r.animal_id.includes("RA4"));
    expect(ra4!.price).toBe(2500);
  });

  it("handles gender typos", () => {
    const result = processAnimalCSV(csvText, SPECIES);
    const ra5 = result.records.find((r) => r.animal_id.includes("RA5"));
    expect(ra5!.gender).toBe("Female");
  });

  it("returns error when species list is empty", () => {
    const result = processAnimalCSV(csvText, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.records).toHaveLength(0);
  });

  it("returns error for CSV with no recognizable ID column", () => {
    const badCsv = "Name,Value\nFoo,123";
    const result = processAnimalCSV(badCsv, SPECIES);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Deduplication ───

describe("deduplicateRecords", () => {
  it("keeps last occurrence by animal_id", () => {
    const records = [
      { animal_id: "MC1 Test", species_id: "a", gender: "Male" as const, hatch_date: null, current_weight_g: 5, price: 100, status: "Available" as const, morph_traits: null, listing_readiness_score: 0 },
      { animal_id: "MC1 Test", species_id: "a", gender: "Female" as const, hatch_date: null, current_weight_g: 6, price: 200, status: "Available" as const, morph_traits: null, listing_readiness_score: 0 },
    ];
    const deduped = deduplicateRecords(records);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].gender).toBe("Female");
    expect(deduped[0].price).toBe(200);
  });

  it("is case-insensitive", () => {
    const records = [
      { animal_id: "mc1 test", species_id: "a", gender: "Male" as const, hatch_date: null, current_weight_g: null, price: null, status: "Available" as const, morph_traits: null, listing_readiness_score: 0 },
      { animal_id: "MC1 Test", species_id: "a", gender: "Female" as const, hatch_date: null, current_weight_g: null, price: null, status: "Available" as const, morph_traits: null, listing_readiness_score: 0 },
    ];
    const deduped = deduplicateRecords(records);
    expect(deduped).toHaveLength(1);
  });
});

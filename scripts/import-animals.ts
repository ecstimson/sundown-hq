import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Re-use the shared import module (TS paths don't resolve in tsx scripts, so inline the path)
// We import from the source directly since tsx handles TS imports.
import {
  processAnimalCSV,
  deduplicateRecords,
  type SpeciesEntry,
} from "../src/lib/import/animalsCsv.js";

async function main() {
  const csvPath = resolve(__dirname, "../February 2025 animal inventory - Sheet1.csv");
  const content = readFileSync(csvPath, "utf-8");

  const { data: speciesList, error: speciesErr } = await supabase
    .from("species")
    .select("id, common_name, code");

  if (speciesErr || !speciesList) {
    console.error("Failed to fetch species:", speciesErr);
    process.exit(1);
  }

  console.log(
    "Species in DB:",
    speciesList.map((s: SpeciesEntry) => `${s.code}=${s.common_name}`)
  );

  const processed = processAnimalCSV(content, speciesList as SpeciesEntry[]);

  if (processed.errors.length > 0) {
    console.error("Fatal errors during CSV processing:");
    processed.errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  const animals = deduplicateRecords(processed.records);

  console.log("\n--- Import Summary ---");
  console.log(`Total data rows: ${processed.records.length + processed.skipped}`);
  console.log(`Parsed records: ${processed.records.length}`);
  console.log(`Skipped rows: ${processed.skipped}`);
  console.log(`Unique animals (after dedup): ${animals.length}`);

  if (processed.warnings.length > 0) {
    console.log(`\nWarnings (${processed.warnings.length}):`);
    processed.warnings.slice(0, 20).forEach((w) => console.log(`  ${w}`));
    if (processed.warnings.length > 20)
      console.log(`  ... and ${processed.warnings.length - 20} more`);
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < animals.length; i += BATCH_SIZE) {
    const batch = animals.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("animals").insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      for (const record of batch) {
        const { error: singleErr } = await supabase.from("animals").insert(record);
        if (singleErr) {
          console.error(`  Failed: ${record.animal_id} - ${singleErr.message}`);
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  console.log("Done!");
}

main().catch(console.error);

/**
 * sinapi-index-cadernos.ts
 *
 * Extracts text from SINAPI technical PDF notebooks, chunks them,
 * generates embeddings with MiniLM-L6-v2 (384 dims), and upserts
 * into ob_sinapi_chunks in Supabase.
 *
 * Usage:  npx tsx scripts/sinapi-index-cadernos.ts
 *         bun run scripts/sinapi-index-cadernos.ts
 *
 * Supports checkpoint/resume — saves progress to .sinapi-index-checkpoint.json
 */

import { createClient } from "@supabase/supabase-js";
import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import fs from "node:fs";
import path from "node:path";
import { glob } from "node:fs/promises";

// ── Config ─────────────────────────────────────────────────────
const PDF_GLOB = path.join(
  process.env.HOME ?? "/Users/andrefogelman",
  "sinapi-import/SINAPI-CT-*.pdf",
);
const CHUNK_WORDS = 500;
const OVERLAP_WORDS = 50;
const BATCH_SIZE = 50; // chunks per Supabase upsert
const CHECKPOINT_FILE = path.join(
  import.meta.dirname ?? ".",
  ".sinapi-index-checkpoint.json",
);
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

// ── Supabase ───────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in .env or environment.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ────────────────────────────────────────────────────
function filenameToTitle(filename: string): string {
  // "SINAPI-CT-ALVENARIA-DE-VEDACAO.pdf" → "Alvenaria de Vedação"
  const raw = filename
    .replace(/^SINAPI-CT-/, "")
    .replace(/\.pdf$/i, "")
    .replace(/-/g, " ");

  // Title case, keeping "de", "do", "da", "dos", "das", "e", "em" lowercase
  const lowerWords = new Set(["de", "do", "da", "dos", "das", "e", "em", "para", "com", "por"]);
  return raw
    .toLowerCase()
    .split(" ")
    .map((w, i) =>
      i === 0 || !lowerWords.has(w)
        ? w.charAt(0).toUpperCase() + w.slice(1)
        : w,
    )
    .join(" ")
    // Common accent fixes for Portuguese
    .replace(/\bvedacao\b/gi, "Vedação")
    .replace(/\bconclusao\b/gi, "Conclusão")
    .replace(/\bfundacao\b/gi, "Fundação")
    .replace(/\binstalacao\b/gi, "Instalação")
    .replace(/\bimpermeabilizacao\b/gi, "Impermeabilização")
    .replace(/\bdrenagem\b/gi, "Drenagem")
    .replace(/\beletrica\b/gi, "Elétrica")
    .replace(/\bhidraulica\b/gi, "Hidráulica")
    .replace(/\bmecanica\b/gi, "Mecânica")
    .replace(/\bpavimentacao\b/gi, "Pavimentação")
    .replace(/\bdemolicao\b/gi, "Demolição")
    .replace(/\bexecucao\b/gi, "Execução")
    .replace(/\bconcreto\b/gi, "Concreto")
    .replace(/\bestrutura\b/gi, "Estrutura")
    .replace(/\btubulacao\b/gi, "Tubulação")
    .replace(/\bterraplenagem\b/gi, "Terraplenagem")
    .replace(/\bsinalizacao\b/gi, "Sinalização")
    .replace(/\bprotecao\b/gi, "Proteção")
    .replace(/\bescavacao\b/gi, "Escavação")
    .replace(/\bcompactacao\b/gi, "Compactação");
}

function chunkText(
  text: string,
  chunkWords: number,
  overlapWords: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkWords) return [words.join(" ")];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start += chunkWords - overlapWords;
    if (end >= words.length) break;
  }
  return chunks;
}

// ── Checkpoint ─────────────────────────────────────────────────
interface Checkpoint {
  completed: string[];
}

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { completed: [] };
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🔧 Loading embedding model...");
  const embedder: FeatureExtractionPipeline = await pipeline(
    "feature-extraction",
    MODEL_NAME,
    { dtype: "fp32" },
  );
  console.log("✅ Model loaded");

  // Discover PDFs
  const pdfDir = path.dirname(PDF_GLOB);
  const pdfPattern = path.basename(PDF_GLOB);
  const files: string[] = [];
  const entries = fs.readdirSync(pdfDir);
  for (const entry of entries) {
    if (entry.startsWith("SINAPI-CT-") && entry.endsWith(".pdf")) {
      files.push(path.join(pdfDir, entry));
    }
  }
  files.sort();
  console.log(`📄 Found ${files.length} PDFs`);

  const checkpoint = loadCheckpoint();
  const remaining = files.filter(
    (f) => !checkpoint.completed.includes(path.basename(f)),
  );
  console.log(
    `⏩ ${checkpoint.completed.length} already done, ${remaining.length} remaining`,
  );

  // Dynamic import pdf-parse (CJS module)
  const pdfParse = (await import("pdf-parse")).default;

  for (let fi = 0; fi < remaining.length; fi++) {
    const filePath = remaining[fi];
    const filename = path.basename(filePath);
    const title = filenameToTitle(filename);

    console.log(
      `\n[${fi + 1}/${remaining.length}] ${filename} → "${title}"`,
    );

    // Extract text
    let text: string;
    try {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } catch (err: unknown) {
      console.error(`  ❌ Failed to parse PDF: ${(err as Error).message}`);
      continue;
    }

    if (!text.trim()) {
      console.log("  ⚠️  Empty text, skipping");
      checkpoint.completed.push(filename);
      saveCheckpoint(checkpoint);
      continue;
    }

    // Clean text
    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    // Chunk
    const chunks = chunkText(text, CHUNK_WORDS, OVERLAP_WORDS);
    console.log(
      `  📝 ${text.length} chars → ${chunks.length} chunks`,
    );

    // Delete existing chunks for this file (re-index support)
    const { error: delErr } = await supabase
      .from("ob_sinapi_chunks")
      .delete()
      .eq("source_file", filename);
    if (delErr) {
      console.error(`  ❌ Delete error: ${delErr.message}`);
    }

    // Generate embeddings and upsert in batches
    for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
      const batchChunks = chunks.slice(batchStart, batchStart + BATCH_SIZE);
      const rows = [];

      for (let i = 0; i < batchChunks.length; i++) {
        const chunkIndex = batchStart + i;
        const content = batchChunks[i];

        // Generate embedding
        const output = await embedder(content, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data as Float32Array).slice(0, 384);

        rows.push({
          source_file: filename,
          source_title: title,
          page_number: null, // pdf-parse doesn't give per-page easily
          chunk_index: chunkIndex,
          content,
          content_length: content.length,
          embedding: JSON.stringify(embedding),
        });
      }

      const { error: insertErr } = await supabase
        .from("ob_sinapi_chunks")
        .insert(rows);

      if (insertErr) {
        console.error(
          `  ❌ Insert error (batch ${batchStart}): ${insertErr.message}`,
        );
      } else {
        process.stdout.write(
          `  ✅ Inserted ${Math.min(batchStart + BATCH_SIZE, chunks.length)}/${chunks.length}\r`,
        );
      }
    }

    console.log(); // newline after progress
    checkpoint.completed.push(filename);
    saveCheckpoint(checkpoint);
  }

  console.log(
    `\n🎉 Done! ${checkpoint.completed.length}/${files.length} PDFs indexed.`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

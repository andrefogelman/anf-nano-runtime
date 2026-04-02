// supabase/functions/process-single-pdf/index.ts
// Processes a single PDF with user-provided instructions.
// Saves every run to ob_processing_runs for history.

import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import pdf from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LLM_BASE_URL = Deno.env.get("ANTHROPIC_BASE_URL") || "https://king.taile4c10f.ts.net";
const LLM_AUTH_TOKEN = Deno.env.get("ANTHROPIC_AUTH_TOKEN") || "sk-proxy-passthrough";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function callClaude(system: string, userContent: string): Promise<string> {
  const MAX_RETRIES = 3;
  const DELAYS = [10_000, 30_000, 60_000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${LLM_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LLM_AUTH_TOKEN,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      console.log(`Rate limited, retrying in ${DELAYS[attempt] / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAYS[attempt]));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
  throw new Error("Max retries exceeded");
}

function parseJsonSafe(text: string): Record<string, unknown> | null {
  // Try raw JSON
  try { return JSON.parse(text); } catch { /* ignore */ }
  // Try extracting from markdown code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch { /* ignore */ }
  }
  // Try finding JSON object in text
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* ignore */ }
  }
  return null;
}

async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<Array<{ page: number; text: string }>> {
  const buffer = Buffer.from(pdfBuffer);
  const data = await pdf(buffer);
  const totalPages = data.numpages || 1;
  if (totalPages === 1) {
    return [{ page: 1, text: data.text || "" }];
  }
  const rawPages = data.text.split(/\f/);
  const pages: Array<{ page: number; text: string }> = [];
  for (let i = 0; i < Math.max(rawPages.length, totalPages); i++) {
    pages.push({ page: i + 1, text: rawPages[i]?.trim() || "" });
  }
  return pages;
}

const SYSTEM_PROMPT = `Você é um engenheiro civil orçamentista senior especialista em levantamento de quantitativos para construção civil brasileira.

Você recebe texto extraído de um PDF de projeto de construção e uma instrução do usuário dizendo o que levantar.

## REGRAS FUNDAMENTAIS

1. SEMPRE produza itens com quantidades numéricas. Nunca retorne lista vazia.
2. Se o texto do PDF contém dimensões, cotas ou medidas, USE-AS para calcular quantidades.
3. Se o texto não tem dimensões claras mas menciona ambientes ou elementos, ESTIME com base em padrões típicos de construção e marque confidence baixo.
4. Para cada item, SEMPRE inclua:
   - descricao clara e específica
   - quantidade numérica > 0 (OBRIGATÓRIO)
   - unidade correta (m², m³, m, kg, un, vb, pt, cx, pç)
   - memorial_calculo mostrando como chegou no número
   - ambiente de onde veio a medição

5. Regras de cálculo:
   - Parede: perímetro x pé-direito, descontando vãos maiores que 2m²
   - Piso: comprimento x largura do ambiente
   - Forro: mesma área do piso (salvo indicação contrária)
   - Pintura: área de parede (2 demãos = mesma metragem, não multiplicar)
   - Rodapé: perímetro do ambiente descontando portas
   - Demolição: especificar se é parede (m²), piso (m²) ou forro (m²)
   - Tubulação: comprimento em metros por diâmetro
   - Pontos elétricos: contagem por tipo (iluminação, TUG, TUE)

6. Se o texto estiver confuso ou incompleto:
   - Extraia O QUE FOR POSSÍVEL com as informações disponíveis
   - Use pé-direito padrão de 2,80m quando não especificado
   - Marque confidence < 0.7 e explique em needs_review

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO)

Responda EXCLUSIVAMENTE com JSON, sem texto antes ou depois:

{
  "classificacao": {
    "tipo": "arquitetonico-planta-baixa | estrutural-forma | hidraulico-agua-fria | eletrico-pontos | quadro-acabamentos | outro",
    "prancha": "ARQ-01 ou UNKNOWN",
    "pavimento": "terreo | superior | subsolo | cobertura | indefinido"
  },
  "itens": [
    {
      "descricao": "Revestimento cerâmico piso - Sala",
      "quantidade": 14.70,
      "unidade": "m²",
      "memorial_calculo": "Sala: 3,50 x 4,20 = 14,70 m²",
      "ambiente": "Sala",
      "disciplina": "arquitetonico",
      "confidence": 0.85
    }
  ],
  "needs_review": [
    {
      "item": "Revestimento cerâmico piso - Sala",
      "motivo": "Dimensão da largura inferida da planta, confirmar cota"
    }
  ],
  "resumo": "Resumo do levantamento em português explicando o que foi encontrado e calculado"
}

IMPORTANTE: O array "itens" NUNCA pode estar vazio. Se não encontrar dados suficientes, crie itens com as melhores estimativas possíveis e confidence baixo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: CORS_HEADERS,
    });
  }

  let runId: string | null = null;

  try {
    const { project_id, file_id, prompt } = await req.json();

    if (!project_id || !file_id || !prompt) {
      return new Response(
        JSON.stringify({ error: "project_id, file_id, and prompt are required" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Create processing run record
    const { data: run, error: runErr } = await supabase
      .from("ob_processing_runs")
      .insert({
        project_id,
        file_id,
        prompt,
        status: "processing",
      })
      .select("id")
      .single();

    if (runErr) {
      console.error("Failed to create run:", runErr);
    } else {
      runId = run.id;
    }

    // Get file info
    const { data: fileData, error: fileErr } = await supabase
      .from("ob_project_files")
      .select("storage_path, filename, disciplina")
      .eq("id", file_id)
      .single();

    if (fileErr || !fileData) {
      throw new Error(`File not found: ${fileErr?.message}`);
    }

    // Download PDF
    const { data: pdfBlob, error: dlErr } = await supabase.storage
      .from("project-pdfs")
      .download(fileData.storage_path);

    if (dlErr || !pdfBlob) {
      throw new Error(`Download failed: ${dlErr?.message}`);
    }

    // Extract text
    const pdfBuffer = await pdfBlob.arrayBuffer();
    const pages = await extractTextFromPdf(pdfBuffer);
    const allText = pages.map((p) => `--- PÁGINA ${p.page} ---\n${p.text}`).join("\n\n");

    console.log(`[${file_id}] Extracted ${pages.length} pages, ${allText.length} chars`);

    // If text is very short, warn the user
    const textTooShort = allText.trim().length < 100;

    // Process with Claude
    const userMessage = `ARQUIVO: ${fileData.filename}
DISCIPLINA: ${fileData.disciplina || "auto-detectar"}
PÁGINAS: ${pages.length}
CARACTERES EXTRAÍDOS: ${allText.length}
${textTooShort ? "\nAVISO: Muito pouco texto foi extraído deste PDF. Pode ser um PDF escaneado (imagem). Faça o melhor possível com o que tem." : ""}

INSTRUÇÃO DO USUÁRIO:
${prompt}

TEXTO EXTRAÍDO DO PDF:
${allText.slice(0, 12000)}`;

    const response = await callClaude(SYSTEM_PROMPT, userMessage);
    const parsed = parseJsonSafe(response);

    const items = (parsed?.itens as any[]) || [];
    const needsReview = (parsed?.needs_review as any[]) || [];
    const summary = (parsed?.resumo as string) || response;

    // Save processing run
    if (runId) {
      await supabase.from("ob_processing_runs").update({
        status: "done",
        summary,
        items,
        needs_review: needsReview,
        raw_response: parsed || { raw_text: response },
        pages_processed: pages.length,
      }).eq("id", runId);
    }

    // Update file status
    await supabase
      .from("ob_project_files")
      .update({ status: "done" })
      .eq("id", file_id);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        summary,
        items_count: items.length,
        review_count: needsReview.length,
        pages_processed: pages.length,
        text_chars: allText.length,
        structured_data: parsed,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Edge function error:", err);

    // Save error to run
    if (runId) {
      await supabase.from("ob_processing_runs").update({
        status: "error",
        error_message: (err as Error).message,
      }).eq("id", runId);
    }

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
